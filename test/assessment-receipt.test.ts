// @vitest-environment node

import { decodeJwt, SignJWT } from "jose";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  assessmentEvidenceDigest,
  signAssessmentReceipt,
  verifyAssessmentReceipt
} from "@/lib/assessment-receipt";
import { demoCatalog } from "@/lib/demo-data";

const secret = "receipt-test-secret-with-enough-entropy";
const skill = demoCatalog.skills[0];

describe("assessment receipts", () => {
  beforeEach(() => {
    process.env.ASSESSMENT_SIGNING_SECRET = secret;
  });

  afterEach(() => {
    delete process.env.ASSESSMENT_SIGNING_SECRET;
  });

  it("accepts an authentic receipt for the assessed skill and verdict", async () => {
    const receipt = await signAssessmentReceipt(skill, "review");

    await expect(verifyAssessmentReceipt(receipt)).resolves.toEqual({
      sub: skill.id,
      verdict: "review",
      evidenceDigest: assessmentEvidenceDigest(skill),
      version: 1
    });
  });

  it("rejects a tampered receipt", async () => {
    const receipt = await signAssessmentReceipt(skill, "blocked");
    const [header, payload, signature] = receipt.split(".");
    const altered = `${header}.${payload.slice(0, -1)}${payload.endsWith("a") ? "b" : "a"}.${signature}`;

    await expect(verifyAssessmentReceipt(altered)).resolves.toBeNull();
  });

  it("rejects an expired receipt", async () => {
    const expired = await new SignJWT({
      verdict: "fits",
      evidenceDigest: assessmentEvidenceDigest(skill),
      version: 1
    })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setIssuer("atlantys")
      .setAudience("atlantys-share")
      .setSubject(skill.id)
      .setIssuedAt(1)
      .setExpirationTime(2)
      .sign(Buffer.from(secret));

    await expect(verifyAssessmentReceipt(expired)).resolves.toBeNull();
  });

  it("contains only privacy-safe identifiers, not fleet or prompt data", async () => {
    const receipt = await signAssessmentReceipt(skill, "fits");
    const payload = decodeJwt(receipt);
    const serialized = JSON.stringify(payload);

    expect(Object.keys(payload).sort()).toEqual(
      ["aud", "evidenceDigest", "exp", "iat", "iss", "jti", "sub", "verdict", "version"].sort()
    );
    expect(serialized).not.toMatch(/fleet|runtime|model|tool|policy|prompt|private|secret/i);
  });

  it("binds the receipt to the exact public evidence snapshot", async () => {
    const receipt = await signAssessmentReceipt(skill, "fits");
    const verified = await verifyAssessmentReceipt(receipt);
    const changedSkill = {
      ...skill,
      revisions: [{ ...skill.revisions[0], contentHash: "changed-public-revision" }]
    };

    expect(verified?.evidenceDigest).toBe(assessmentEvidenceDigest(skill));
    expect(verified?.evidenceDigest).not.toBe(assessmentEvidenceDigest(changedSkill));
  });

  it("canonicalizes set-like evidence while preserving meaningful audit changes", () => {
    const secondAudit = {
      provider: "Second reviewer",
      status: "warn" as const,
      riskLevel: "medium" as const,
      summary: "Manual review is still required.",
      auditedAt: "2026-07-20T00:00:00.000Z"
    };
    const baseline = {
      ...skill,
      runtime: ["Claude Code", "Codex"],
      models: ["Any", "GPT"],
      tools: ["filesystem", "GitHub"],
      permissions: ["Read project files", "Write reports"],
      audits: [skill.audits[0], secondAudit]
    };
    const reorderedEquivalent = {
      ...baseline,
      runtime: ["codex", "CLAUDE CODE", "Codex"],
      models: ["gpt", "ANY", "Any"],
      tools: ["github", "FILESYSTEM", "GitHub"],
      permissions: ["write reports", "READ PROJECT FILES", "Write reports"],
      audits: [secondAudit, skill.audits[0]]
    };

    expect(assessmentEvidenceDigest(reorderedEquivalent)).toBe(assessmentEvidenceDigest(baseline));
    expect(assessmentEvidenceDigest({
      ...baseline,
      audits: [{ ...baseline.audits[0], summary: "The public finding changed." }, secondAudit]
    })).not.toBe(assessmentEvidenceDigest(baseline));
    expect(assessmentEvidenceDigest({
      ...baseline,
      audits: [{ ...baseline.audits[0], auditedAt: "2026-07-21T00:00:00.000Z" }, secondAudit]
    })).not.toBe(assessmentEvidenceDigest(baseline));
    expect(assessmentEvidenceDigest({
      ...baseline,
      audits: [{ ...baseline.audits[0], status: "fail" as const }, secondAudit]
    })).not.toBe(assessmentEvidenceDigest(baseline));
  });
});
