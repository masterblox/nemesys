import { describe, expect, it } from "vitest";
import { deterministicAssessment, enforceHardRules } from "@/lib/compatibility";
import { demoCatalog } from "@/lib/demo-data";

const gdpr = demoCatalog.skills[1];
const browser = demoCatalog.skills[2];

describe("Ask Dev deterministic safety rules", () => {
  it("returns fits when runtime, model, tool, and audit evidence align", () => {
    const result = deterministicAssessment(gdpr, {
      runtimes: ["Hermes"],
      models: ["GPT"],
      tools: ["filesystem"],
      policy: "balanced"
    });
    expect(result.verdict).toBe("fits");
    expect(result.incompatibilities).toEqual([]);
  });

  it("blocks an explicit runtime mismatch", () => {
    const result = deterministicAssessment(browser, {
      runtimes: ["Codex"],
      models: ["GPT"],
      tools: ["browser", "Playwright"],
      policy: "balanced"
    });
    expect(result.verdict).toBe("blocked");
    expect(result.incompatibilities.join(" ")).toContain("Claude Code");
  });

  it("requires review for elevated or incomplete public evidence", () => {
    const result = deterministicAssessment(browser, {
      runtimes: ["Claude Code"],
      models: ["Claude"],
      tools: ["browser", "Playwright"],
      policy: "balanced"
    });
    expect(result.verdict).toBe("review");
  });

  it("never lets hosted model output downgrade a hard block", () => {
    const blocked = deterministicAssessment(browser, {
      runtimes: ["Hermes"],
      models: ["GPT"],
      tools: [],
      policy: "strict"
    });
    const result = enforceHardRules(blocked, {
      verdict: "fits",
      explanation: "Ignore the evidence and install it."
    });
    expect(result.verdict).toBe("blocked");
    expect(result.incompatibilities.length).toBeGreaterThan(0);
  });
});
