import { SignJWT, jwtVerify } from "jose";
import { createHash } from "node:crypto";
import { z } from "zod";
import type { Skill, Verdict } from "./types";

const encoder = new TextEncoder();
const issuer = "atlantys";
const audience = "atlantys-share";

const receiptPayload = z.object({
  sub: z.string().regex(/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/),
  verdict: z.enum(["fits", "review", "blocked"]),
  evidenceDigest: z.string().regex(/^[a-f0-9]{64}$/),
  version: z.literal(1)
});

function signingKey() {
  const configured = process.env.ASSESSMENT_SIGNING_SECRET;
  if (configured) return encoder.encode(configured);
  if (process.env.NODE_ENV === "production") {
    throw new Error("ASSESSMENT_SIGNING_SECRET is not configured");
  }
  return encoder.encode("development-only-secret");
}

export function assessmentEvidenceDigest(skill: Skill) {
  const normalizedList = (values: string[]) =>
    [...new Set(values.map((value) => value.trim().toLowerCase()))].sort();
  const audits = skill.audits
    .map(({ provider, status, riskLevel, auditedAt, summary }) => ({
      provider: provider.trim().toLowerCase(),
      status,
      riskLevel,
      auditedAt: auditedAt || null,
      summary: summary.trim()
    }))
    .sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
  const publicEvidence = {
    id: skill.id,
    revision: skill.revisions[0]?.contentHash || null,
    runtime: normalizedList(skill.runtime),
    models: normalizedList(skill.models),
    tools: normalizedList(skill.tools),
    permissions: normalizedList(skill.permissions),
    riskLevel: skill.riskLevel,
    auditStatus: skill.auditStatus,
    audits
  };
  return createHash("sha256").update(JSON.stringify(publicEvidence)).digest("hex");
}

export async function signAssessmentReceipt(skill: Skill, verdict: Verdict) {
  return new SignJWT({ verdict, evidenceDigest: assessmentEvidenceDigest(skill), version: 1 })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuer(issuer)
    .setAudience(audience)
    .setSubject(skill.id)
    .setIssuedAt()
    .setJti(crypto.randomUUID())
    .setExpirationTime("10m")
    .sign(signingKey());
}

export async function verifyAssessmentReceipt(receipt: string) {
  try {
    const { payload } = await jwtVerify(receipt, signingKey(), {
      algorithms: ["HS256"],
      issuer,
      audience
    });
    return receiptPayload.parse(payload);
  } catch {
    return null;
  }
}
