import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { consumeAssessment, resetLocalAssessmentLimitsForTests } from "@/lib/rate-limit";

describe("local assessment rate limiter", () => {
  beforeEach(() => {
    delete process.env.DATABASE_URL;
    process.env.ASSESSMENT_SIGNING_SECRET = "rate-limit-test-secret";
    resetLocalAssessmentLimitsForTests();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-26T00:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
    resetLocalAssessmentLimitsForTests();
    delete process.env.ASSESSMENT_SIGNING_SECRET;
  });

  it("allows exactly three checks per device and rejects the fourth", async () => {
    await expect(consumeAssessment("device-a", null)).resolves.toMatchObject({ allowed: true, remaining: 2 });
    await expect(consumeAssessment("device-a", null)).resolves.toMatchObject({ allowed: true, remaining: 1 });
    await expect(consumeAssessment("device-a", null)).resolves.toMatchObject({ allowed: true, remaining: 0 });
    await expect(consumeAssessment("device-a", null)).resolves.toMatchObject({ allowed: false, remaining: 0 });
  });

  it("uses the IP bucket to prevent cookie rotation from resetting the limit", async () => {
    const ip = "198.51.100.42";
    await expect(consumeAssessment("rotated-cookie-1", ip)).resolves.toMatchObject({ allowed: true });
    await expect(consumeAssessment("rotated-cookie-2", ip)).resolves.toMatchObject({ allowed: true });
    await expect(consumeAssessment("rotated-cookie-3", ip)).resolves.toMatchObject({ allowed: true });
    await expect(consumeAssessment("rotated-cookie-4", ip)).resolves.toMatchObject({
      allowed: false,
      remaining: 0
    });
  });

  it("starts a fresh window after the reset time", async () => {
    await consumeAssessment("device-a", "2001:db8::1");
    await consumeAssessment("device-a", "2001:db8::1");
    const third = await consumeAssessment("device-a", "2001:db8::1");
    expect(third.resetAt).toBe("2026-07-27T00:00:00.000Z");

    vi.setSystemTime(new Date("2026-07-27T00:00:00.001Z"));
    await expect(consumeAssessment("device-a", "2001:db8::1")).resolves.toMatchObject({
      allowed: true,
      remaining: 2
    });
  });
});
