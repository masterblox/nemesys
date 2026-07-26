// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Skill } from "@/lib/types";
import { demoCatalog } from "@/lib/demo-data";

const mocks = vi.hoisted(() => ({
  getSkill: vi.fn(),
  createShareCard: vi.fn()
}));

vi.mock("@/lib/catalog", () => ({ getSkill: mocks.getSkill }));
vi.mock("@/lib/share-store", () => ({ createShareCard: mocks.createShareCard }));

import { signAssessmentReceipt } from "@/lib/assessment-receipt";
import { POST } from "@/app/api/share/route";

const skill = demoCatalog.skills[0];

function shareRequest(body: unknown) {
  return new Request("http://localhost/api/share", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  }) as Parameters<typeof POST>[0];
}

describe("share route receipt boundary", () => {
  beforeEach(() => {
    process.env.ASSESSMENT_SIGNING_SECRET = "share-route-test-secret";
    mocks.getSkill.mockReset().mockResolvedValue(skill);
    mocks.createShareCard.mockReset().mockResolvedValue({ id: "privacy-safe-card" });
  });

  afterEach(() => {
    delete process.env.ASSESSMENT_SIGNING_SECRET;
  });

  it("rejects the legacy client-forgeable skill and verdict body", async () => {
    const response = await POST(shareRequest({ skillId: skill.id, verdict: "fits" }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Invalid share request." });
    expect(mocks.getSkill).not.toHaveBeenCalled();
    expect(mocks.createShareCard).not.toHaveBeenCalled();
  });

  it("creates a card with the exact verdict from a valid signed receipt", async () => {
    const receipt = await signAssessmentReceipt(skill, "blocked");
    const response = await POST(shareRequest({ receipt }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ url: "/share/privacy-safe-card" });
    expect(mocks.getSkill).toHaveBeenCalledWith(skill.creator, skill.repository, skill.slug);
    expect(mocks.createShareCard).toHaveBeenCalledWith(skill, "blocked");
  });

  it("rejects a valid receipt after its public evidence changes", async () => {
    const receipt = await signAssessmentReceipt(skill, "fits");
    const changedSkill: Skill = {
      ...skill,
      audits: [{
        ...skill.audits[0],
        status: "fail",
        riskLevel: "critical",
        summary: "A new public audit now blocks this skill."
      }]
    };
    mocks.getSkill.mockResolvedValue(changedSkill);

    const response = await POST(shareRequest({ receipt }));

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: "Public evidence changed. Run Ask Dev again before sharing."
    });
    expect(mocks.createShareCard).not.toHaveBeenCalled();
  });
});
