import { describe, expect, it } from "vitest";
import { decryptToken, encryptToken, signDeviceId, verifyDeviceId } from "@/lib/security";

describe("privacy controls", () => {
  it("encrypts curator tokens with authenticated encryption", () => {
    const encrypted = encryptToken("x-secret-token");
    expect(encrypted).not.toContain("x-secret-token");
    expect(decryptToken(encrypted)).toBe("x-secret-token");
  });

  it("rejects tampered signed device identifiers", () => {
    const signed = signDeviceId("device-123");
    expect(verifyDeviceId(signed)).toBe("device-123");
    expect(verifyDeviceId(`${signed}tampered`)).toBeNull();
  });
});
