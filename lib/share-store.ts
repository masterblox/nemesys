import { hasDatabase, query } from "./db";
import type { Skill, Verdict } from "./types";
import { randomToken } from "./security";

export interface ShareCard {
  id: string;
  skillId: string;
  skillName: string;
  verdict: Verdict;
  explanation: string;
  publicReasons: string[];
  sourceUrl: string;
  createdAt: string;
}

const localShares = new Map<string, ShareCard>();
const safeExplanations: Record<Verdict, string> = {
  fits: "Public evidence indicates a good compatibility path, with isolated testing still recommended.",
  review: "Public evidence indicates this skill needs a closer permission or compatibility review.",
  blocked: "Public evidence contains a compatibility or safety blocker that should be resolved before installation."
};

export async function createShareCard(skill: Skill, verdict: Verdict) {
  const id = randomToken(9);
  const publicReasons = [
    `Public audit status: ${skill.auditStatus}`,
    `Declared risk: ${skill.riskLevel}`,
    skill.revisions[0]?.summary || "No recent public revision summary"
  ];
  const card: ShareCard = {
    id,
    skillId: skill.id,
    skillName: skill.name,
    verdict,
    explanation: safeExplanations[verdict],
    publicReasons,
    sourceUrl: skill.sourceUrl,
    createdAt: new Date().toISOString()
  };
  if (!hasDatabase()) {
    localShares.set(id, card);
    return card;
  }
  await query(
    `INSERT INTO share_cards (id, skill_id, verdict, explanation, public_reasons, source_url)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [id, skill.id, verdict, card.explanation, JSON.stringify(publicReasons), skill.sourceUrl]
  );
  return card;
}

export async function getShareCard(id: string) {
  if (!hasDatabase()) return localShares.get(id);
  const result = await query<{
    id: string;
    skill_id: string;
    skill_name: string;
    verdict: Verdict;
    explanation: string;
    public_reasons: string[];
    source_url: string;
    created_at: string;
  }>(
    `SELECT sc.id, sc.skill_id, s.name AS skill_name, sc.verdict, sc.explanation,
            sc.public_reasons, sc.source_url, sc.created_at
     FROM share_cards sc JOIN skills s ON s.id = sc.skill_id WHERE sc.id = $1`,
    [id]
  );
  const row = result.rows[0];
  return row
    ? {
        id: row.id,
        skillId: row.skill_id,
        skillName: row.skill_name,
        verdict: row.verdict,
        explanation: row.explanation,
        publicReasons: row.public_reasons,
        sourceUrl: row.source_url,
        createdAt: row.created_at
      }
    : undefined;
}
