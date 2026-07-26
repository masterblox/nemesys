import type { CatalogSnapshot } from "./types";

const now = new Date();
const hoursAgo = (hours: number) => new Date(now.getTime() - hours * 3_600_000).toISOString();

export const demoCatalog: CatalogSnapshot = {
  skills: [
    {
      id: "vercel-labs/agent-skills/vercel-react-best-practices",
      slug: "vercel-react-best-practices",
      name: "React Best Practices",
      source: "vercel-labs/agent-skills",
      creator: "vercel-labs",
      repository: "agent-skills",
      description: "Production guidance for fast, resilient React and Next.js applications.",
      installs: 578700,
      runtime: ["Claude Code", "Codex", "Cursor"],
      models: ["Any"],
      tools: ["filesystem"],
      permissions: ["Read project files"],
      riskLevel: "low",
      auditStatus: "pass",
      sourceUrl: "https://skills.sh/vercel-labs/agent-skills/vercel-react-best-practices",
      installUrl: "https://github.com/vercel-labs/agent-skills",
      updatedAt: hoursAgo(2),
      tags: ["react", "next.js", "performance"],
      audits: [
        {
          provider: "Community audit",
          status: "pass",
          riskLevel: "low",
          summary: "Instruction-only skill with bounded project read access.",
          auditedAt: hoursAgo(14)
        }
      ],
      revisions: [
        {
          id: "rev-react-2",
          contentHash: "b7128c4",
          previousHash: "98af211",
          summary: "Added React Server Components caching and hydration guidance.",
          diff: "+ Prefer request memoization for repeated server reads.\n+ Isolate client boundaries around interactive islands.\n- Treat every route as fully dynamic.",
          detectedAt: hoursAgo(2),
          sourceUrl: "https://github.com/vercel-labs/agent-skills"
        }
      ]
    },
    {
      id: "wshobson/agents/gdpr-data-handling",
      slug: "gdpr-data-handling",
      name: "GDPR Data Handling",
      source: "wshobson/agents",
      creator: "wshobson",
      repository: "agents",
      description: "Operational patterns for privacy-aware handling of personal data.",
      installs: 12000,
      runtime: ["Claude Code", "Codex", "Hermes"],
      models: ["Any"],
      tools: ["filesystem"],
      permissions: ["Read supplied context", "Write reports"],
      riskLevel: "low",
      auditStatus: "pass",
      sourceUrl: "https://skills.sh/wshobson/agents/gdpr-data-handling",
      installUrl: "https://github.com/wshobson/agents",
      updatedAt: hoursAgo(6),
      tags: ["privacy", "gdpr", "compliance"],
      audits: [
        {
          provider: "Skills ecosystem",
          status: "pass",
          riskLevel: "low",
          summary: "No executable code or external network requirement detected.",
          auditedAt: hoursAgo(20)
        }
      ],
      revisions: [
        {
          id: "rev-gdpr-4",
          contentHash: "c18ae24",
          previousHash: "73b19fe",
          summary: "Clarified breach notification timelines and evidence handling.",
          diff: "+ Record the decision clock and responsible authority.\n+ Preserve a minimal evidence trail without copying personal data.",
          detectedAt: hoursAgo(6),
          sourceUrl: "https://github.com/wshobson/agents"
        }
      ]
    },
    {
      id: "anthropics/skills/webapp-testing",
      slug: "webapp-testing",
      name: "Web App Testing",
      source: "anthropics/skills",
      creator: "anthropics",
      repository: "skills",
      description: "Browser-led testing workflows for modern web applications.",
      installs: 121300,
      runtime: ["Claude Code"],
      models: ["Claude"],
      tools: ["Playwright", "browser"],
      permissions: ["Launch browser", "Access local development server"],
      riskLevel: "medium",
      auditStatus: "warn",
      sourceUrl: "https://skills.sh/anthropics/skills/webapp-testing",
      installUrl: "https://github.com/anthropics/skills",
      updatedAt: hoursAgo(11),
      tags: ["testing", "browser", "qa"],
      audits: [
        {
          provider: "Capability review",
          status: "warn",
          riskLevel: "medium",
          summary: "Browser automation can interact with authenticated local sessions.",
          auditedAt: hoursAgo(10)
        }
      ],
      revisions: [
        {
          id: "rev-webtest-8",
          contentHash: "fa1131d",
          previousHash: "e921b61",
          summary: "Expanded authenticated-state safety checks.",
          diff: "+ Confirm the target environment before using stored browser sessions.\n+ Avoid destructive actions unless explicitly requested.",
          detectedAt: hoursAgo(11),
          sourceUrl: "https://github.com/anthropics/skills"
        }
      ]
    }
  ],
  signals: [
    {
      id: "signal-portal-1",
      kind: "x",
      title: "New browser-agent benchmark is getting traction",
      summary: "A creator thread links a reproducible benchmark repository. It is promising, but not yet packaged as an installable skill.",
      sourceUrl: "https://x.com/",
      creator: "@community",
      verificationStatus: "unverified",
      buzzScore: 87,
      publishedAt: hoursAgo(1)
    },
    {
      id: "signal-portal-2",
      kind: "repository",
      title: "Public agent security checklist updated",
      summary: "A repository revision adds prompt-injection boundaries and credential-handling guidance.",
      sourceUrl: "https://github.com/",
      creator: "open-source",
      verificationStatus: "linked",
      buzzScore: 64,
      publishedAt: hoursAgo(4)
    }
  ]
};

export function findDemoSkill(owner: string, repo: string, slug: string) {
  return demoCatalog.skills.find((skill) => skill.id === `${owner}/${repo}/${slug}`);
}
