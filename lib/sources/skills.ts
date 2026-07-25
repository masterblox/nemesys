import crypto from "node:crypto";
import { diffLines } from "diff";
import YAML from "yaml";
import { hasDatabase, query, withTransaction } from "../db";

interface SkillsListItem {
  id: string;
  slug: string;
  name: string;
  source: string;
  installs: number;
  sourceType: string;
  installUrl: string | null;
  url: string;
  isDuplicate?: boolean;
}

interface SkillDetail {
  id: string;
  source: string;
  slug: string;
  installs: number;
  hash: string | null;
  files: Array<{ path: string; contents: string }> | null;
}

interface AuditResult {
  provider: string;
  status: "pass" | "warn" | "fail";
  summary: string;
  auditedAt?: string;
  riskLevel?: string;
}

function skillsHeaders() {
  const token = process.env.VERCEL_OIDC_TOKEN;
  return {
    Accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

async function skillsFetch<T>(path: string): Promise<T> {
  const response = await fetch(`https://skills.sh${path}`, {
    headers: skillsHeaders(),
    cache: "no-store"
  });
  if (!response.ok) throw new Error(`Skills.sh ${path} returned HTTP ${response.status}`);
  return response.json() as Promise<T>;
}

export async function fetchPublicSkills(limit = 500) {
  const response = await skillsFetch<{ data: SkillsListItem[] }>(
    `/api/v1/skills?view=all-time&page=0&per_page=${Math.min(limit, 500)}`
  );
  return response.data.filter((skill) => !skill.isDuplicate && skill.sourceType === "github");
}

export async function fetchSkillDetail(id: string) {
  return skillsFetch<SkillDetail>(`/api/v1/skills/${id}`);
}

export async function fetchSkillAudits(id: string) {
  try {
    const response = await skillsFetch<{ audits: AuditResult[] }>(`/api/v1/skills/audit/${id}`);
    return response.audits;
  } catch (error) {
    if (error instanceof Error && error.message.includes("HTTP 404")) return [];
    throw error;
  }
}

async function githubRepository(source: string) {
  const response = await fetch(`https://api.github.com/repos/${source}`, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "nemesys-radar",
      ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {})
    },
    cache: "no-store"
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`GitHub repository ${source} returned HTTP ${response.status}`);
  const repository = await response.json();
  if (repository.private) return null;
  return repository as {
    html_url: string;
    description: string | null;
    stargazers_count: number;
    default_branch: string;
    pushed_at: string;
    owner: { login: string; avatar_url: string; html_url: string };
  };
}

function frontmatter(content: string) {
  const match = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/m.exec(content);
  if (!match) return { metadata: {} as Record<string, unknown>, body: content };
  try {
    return { metadata: (YAML.parse(match[1]) || {}) as Record<string, unknown>, body: match[2] };
  } catch {
    return { metadata: {} as Record<string, unknown>, body: match[2] };
  }
}

function values(metadata: Record<string, unknown>, key: string) {
  const value = metadata[key];
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string");
  if (typeof value === "string") return [value];
  return [];
}

function readableDiff(previous: string, current: string) {
  return diffLines(previous, current)
    .filter((part) => part.added || part.removed)
    .map((part) => `${part.added ? "+" : "-"} ${part.value.trim()}`)
    .join("\n")
    .slice(0, 20_000);
}

function revisionSummary(previous: string, current: string) {
  const changed = diffLines(previous, current).filter((part) => part.added || part.removed);
  const additions = changed.filter((part) => part.added).reduce((sum, part) => sum + part.count!, 0);
  const removals = changed.filter((part) => part.removed).reduce((sum, part) => sum + part.count!, 0);
  return previous
    ? `Public skill content changed: ${additions} lines added, ${removals} removed.`
    : "First public snapshot indexed by Nemesys.";
}

export async function syncPublicCatalog() {
  if (!hasDatabase()) throw new Error("Catalog sync requires DATABASE_URL");
  const catalog = await fetchPublicSkills();
  const detailLimit = Number(process.env.SYNC_DETAIL_LIMIT || 100);
  let indexed = 0;
  let revised = 0;
  let skipped = 0;

  for (const item of catalog.slice(0, detailLimit)) {
    const repository = await githubRepository(item.source);
    if (!repository) {
      skipped += 1;
      continue;
    }
    const detail = await fetchSkillDetail(item.id);
    const skillFile = detail.files?.find((file) => /(^|\/)SKILL\.md$/i.test(file.path));
    if (!skillFile) {
      skipped += 1;
      continue;
    }
    const content = skillFile.contents;
    const hash = detail.hash || crypto.createHash("sha256").update(content).digest("hex");
    const { metadata, body } = frontmatter(content);
    const description =
      (typeof metadata.description === "string" && metadata.description) ||
      body.split("\n").find((line) => line.trim() && !line.startsWith("#"))?.trim() ||
      repository.description ||
      "Public agent skill";
    const owner = item.source.split("/")[0];
    const audits = await fetchSkillAudits(item.id);

    await withTransaction(async (client) => {
      await client.query(
        `INSERT INTO creators (handle, display_name, avatar_url, github_url, verified_links)
         VALUES ($1, $1, $2, $3, $4)
         ON CONFLICT (handle) DO UPDATE SET avatar_url = EXCLUDED.avatar_url,
           github_url = EXCLUDED.github_url, verified_links = EXCLUDED.verified_links, updated_at = now()`,
        [owner, repository.owner.avatar_url, repository.owner.html_url, JSON.stringify([repository.owner.html_url])]
      );
      const creatorResult = await client.query<{ id: string }>("SELECT id FROM creators WHERE handle = $1", [owner]);
      const repositoryResult = await client.query<{ id: string }>(
        `INSERT INTO repositories
           (creator_id, source, url, description, stars, default_branch, last_public_push, is_public, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7, true, $8)
         ON CONFLICT (source) DO UPDATE SET description = EXCLUDED.description, stars = EXCLUDED.stars,
           default_branch = EXCLUDED.default_branch, last_public_push = EXCLUDED.last_public_push,
           is_public = true, metadata = EXCLUDED.metadata, updated_at = now()
         RETURNING id`,
        [
          creatorResult.rows[0].id,
          item.source,
          repository.html_url,
          repository.description,
          repository.stargazers_count,
          repository.default_branch,
          repository.pushed_at,
          JSON.stringify({ skillsSh: item.url })
        ]
      );
      const previousResult = await client.query<{ current_hash: string | null; current_content: string | null }>(
        "SELECT current_hash, current_content FROM skills WHERE id = $1",
        [item.id]
      );
      const previous = previousResult.rows[0];
      await client.query(
        `INSERT INTO skills
           (id, slug, name, source, repository_id, description, installs, runtime, models, tools,
            permissions, risk_level, source_url, install_url, current_hash, current_content,
            audit_status, is_public, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, true, now())
         ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description,
           installs = EXCLUDED.installs, runtime = EXCLUDED.runtime, models = EXCLUDED.models,
           tools = EXCLUDED.tools, permissions = EXCLUDED.permissions, risk_level = EXCLUDED.risk_level,
           current_hash = EXCLUDED.current_hash, current_content = EXCLUDED.current_content,
           audit_status = EXCLUDED.audit_status, is_public = true, updated_at = now()`,
        [
          item.id,
          item.slug,
          item.name,
          item.source,
          repositoryResult.rows[0].id,
          description,
          item.installs,
          values(metadata, "runtime"),
          values(metadata, "models"),
          values(metadata, "tools"),
          values(metadata, "permissions"),
          typeof metadata.risk_level === "string" ? metadata.risk_level : "unknown",
          item.url,
          item.installUrl,
          hash,
          content,
          audits.some((audit) => audit.status === "fail")
            ? "fail"
            : audits.some((audit) => audit.status === "warn")
              ? "warn"
              : audits.length
                ? "pass"
                : "unknown"
        ]
      );
      if (!previous || previous.current_hash !== hash) {
        await client.query(
          `INSERT INTO revisions
             (skill_id, content_hash, previous_hash, summary, diff, source_url)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (skill_id, content_hash) DO NOTHING`,
          [
            item.id,
            hash,
            previous?.current_hash,
            revisionSummary(previous?.current_content || "", content),
            readableDiff(previous?.current_content || "", content),
            item.url
          ]
        );
        revised += 1;
      }
      for (const audit of audits) {
        await client.query(
          `INSERT INTO audits (skill_id, provider, status, risk_level, summary, audited_at, raw)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (skill_id, provider) DO UPDATE SET status = EXCLUDED.status,
             risk_level = EXCLUDED.risk_level, summary = EXCLUDED.summary,
             audited_at = EXCLUDED.audited_at, raw = EXCLUDED.raw`,
          [
            item.id,
            audit.provider,
            audit.status,
            audit.riskLevel?.toLowerCase(),
            audit.summary,
            audit.auditedAt || null,
            JSON.stringify(audit)
          ]
        );
      }
    });
    indexed += 1;
  }
  await query(
    `INSERT INTO sync_state (key, value) VALUES ('catalog:last-run', $1)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
    [JSON.stringify({ indexed, revised, skipped, at: new Date().toISOString() })]
  );
  return { indexed, revised, skipped };
}
