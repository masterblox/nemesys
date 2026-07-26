export type Verdict = "fits" | "review" | "blocked";
export type RiskLevel = "none" | "low" | "medium" | "high" | "critical" | "unknown";

export interface Audit {
  provider: string;
  status: "pass" | "warn" | "fail" | "unknown";
  riskLevel: RiskLevel;
  summary: string;
  auditedAt?: string;
}

export interface Revision {
  id: string;
  contentHash: string;
  previousHash?: string;
  summary: string;
  diff: string;
  detectedAt: string;
  sourceUrl: string;
}

export interface Skill {
  id: string;
  slug: string;
  name: string;
  source: string;
  creator: string;
  repository: string;
  description: string;
  installs: number;
  runtime: string[];
  models: string[];
  tools: string[];
  permissions: string[];
  riskLevel: RiskLevel;
  auditStatus: Audit["status"];
  sourceUrl: string;
  installUrl: string;
  updatedAt: string;
  revisions: Revision[];
  audits: Audit[];
  tags: string[];
}

export interface Signal {
  id: string;
  kind: "x" | "news" | "repository";
  title: string;
  summary: string;
  sourceUrl: string;
  creator?: string;
  verificationStatus: "unverified" | "linked" | "verified";
  buzzScore: number;
  publishedAt: string;
}

export interface FleetSelection {
  runtimes: string[];
  models: string[];
  tools: string[];
  policy: "strict" | "balanced" | "experimental";
}

export interface Assessment {
  verdict: Verdict;
  explanation: string;
  matchedCapabilities: string[];
  incompatibilities: string[];
  permissionConcerns: string[];
  missingInformation: string[];
  confidence: number;
  recommendedAction: string;
}

export interface CatalogSnapshot {
  skills: Skill[];
  signals: Signal[];
}
