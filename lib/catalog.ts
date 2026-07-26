import { demoCatalog, findDemoSkill } from "./demo-data";
import { hasDatabase, query } from "./db";
import type { Audit, CatalogSnapshot, Revision, Signal, Skill } from "./types";

interface SkillRow {
  id: string;
  slug: string;
  name: string;
  source: string;
  description: string;
  installs: number;
  runtime: string[];
  models: string[];
  tools: string[];
  permissions: string[];
  risk_level: Skill["riskLevel"];
  audit_status: Skill["auditStatus"];
  source_url: string;
  install_url: string;
  updated_at: string;
}

function creatorAndRepository(source: string) {
  const [creator = source, repository = ""] = source.split("/");
  return { creator, repository };
}

async function revisionsFor(skillId: string): Promise<Revision[]> {
  const result = await query<{
    id: string;
    content_hash: string;
    previous_hash: string | null;
    summary: string;
    diff: string;
    detected_at: string;
    source_url: string;
  }>(
    `SELECT id, content_hash, previous_hash, summary, diff, detected_at, source_url
     FROM revisions WHERE skill_id = $1 ORDER BY detected_at DESC LIMIT 20`,
    [skillId]
  );
  return result.rows.map((row) => ({
    id: row.id,
    contentHash: row.content_hash,
    previousHash: row.previous_hash || undefined,
    summary: row.summary,
    diff: row.diff,
    detectedAt: row.detected_at,
    sourceUrl: row.source_url
  }));
}

async function auditsFor(skillId: string): Promise<Audit[]> {
  const result = await query<{
    provider: string;
    status: Audit["status"];
    risk_level: Audit["riskLevel"];
    summary: string;
    audited_at: string | null;
  }>(
    `SELECT provider, status, risk_level, summary, audited_at
     FROM audits WHERE skill_id = $1 ORDER BY audited_at DESC NULLS LAST`,
    [skillId]
  );
  return result.rows.map((row) => ({
    provider: row.provider,
    status: row.status,
    riskLevel: row.risk_level || "unknown",
    summary: row.summary,
    auditedAt: row.audited_at || undefined
  }));
}

async function hydrateSkill(row: SkillRow): Promise<Skill> {
  const { creator, repository } = creatorAndRepository(row.source);
  const [revisions, audits] = await Promise.all([revisionsFor(row.id), auditsFor(row.id)]);
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    source: row.source,
    creator,
    repository,
    description: row.description,
    installs: row.installs,
    runtime: row.runtime,
    models: row.models,
    tools: row.tools,
    permissions: row.permissions,
    riskLevel: row.risk_level,
    auditStatus: row.audit_status,
    sourceUrl: row.source_url,
    installUrl: row.install_url,
    updatedAt: row.updated_at,
    revisions,
    audits,
    tags: [...row.runtime, ...row.tools].map((tag) => tag.toLowerCase())
  };
}

export async function getCatalog(): Promise<CatalogSnapshot> {
  if (!hasDatabase()) return demoCatalog;
  const [skillResult, signalResult] = await Promise.all([
    query<SkillRow>(
      `SELECT id, slug, name, source, description, installs, runtime, models, tools,
              permissions, risk_level, audit_status, source_url, install_url, updated_at
       FROM skills WHERE is_public = true ORDER BY updated_at DESC LIMIT 100`
    ),
    query<{
      id: string;
      kind: Signal["kind"];
      title: string;
      summary: string;
      source_url: string;
      creator_handle: string | null;
      verification_status: Signal["verificationStatus"];
      buzz_score: number;
      published_at: string;
    }>(
      `SELECT id, kind, title, summary, source_url, creator_handle,
              verification_status, buzz_score, published_at
       FROM signals ORDER BY published_at DESC LIMIT 50`
    )
  ]);
  const skills = await Promise.all(skillResult.rows.map(hydrateSkill));
  const signals = signalResult.rows.map((row) => ({
    id: row.id,
    kind: row.kind,
    title: row.title,
    summary: row.summary,
    sourceUrl: row.source_url,
    creator: row.creator_handle || undefined,
    verificationStatus: row.verification_status,
    buzzScore: row.buzz_score,
    publishedAt: row.published_at
  }));
  return { skills, signals };
}

export async function getSkill(owner: string, repo: string, slug: string): Promise<Skill | undefined> {
  if (!hasDatabase()) return findDemoSkill(owner, repo, slug);
  const id = `${owner}/${repo}/${slug}`;
  const result = await query<SkillRow>(
    `SELECT id, slug, name, source, description, installs, runtime, models, tools,
            permissions, risk_level, audit_status, source_url, install_url, updated_at
     FROM skills WHERE id = $1 AND is_public = true`,
    [id]
  );
  return result.rows[0] ? hydrateSkill(result.rows[0]) : undefined;
}

export async function getCreator(handle: string) {
  const catalog = await getCatalog();
  const skills = catalog.skills.filter((skill) => skill.creator === handle);
  return skills.length ? { handle, skills } : undefined;
}

export async function getRepository(owner: string, repo: string) {
  const catalog = await getCatalog();
  const skills = catalog.skills.filter((skill) => skill.source === `${owner}/${repo}`);
  return skills.length ? { owner, repo, skills } : undefined;
}
