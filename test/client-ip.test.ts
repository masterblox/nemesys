import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { trustedClientIp } from "@/lib/client-ip";

function request(headers: Record<string, string>) {
  return { headers: new Headers(headers) };
}

describe("trusted client IP parsing", () => {
  beforeEach(() => {
    delete process.env.TRUSTED_PROXY_HEADER;
    delete process.env.TRUSTED_PROXY_HOPS;
  });

  afterEach(() => {
    delete process.env.TRUSTED_PROXY_HEADER;
    delete process.env.TRUSTED_PROXY_HOPS;
  });

  it("ignores forwarding headers unless a supported header is explicitly trusted", () => {
    expect(trustedClientIp(request({ "x-forwarded-for": "198.51.100.10" }))).toBeNull();
    process.env.TRUSTED_PROXY_HEADER = "authorization";
    expect(trustedClientIp(request({ authorization: "198.51.100.10" }))).toBeNull();
  });

  it("selects the configured hop from the trusted end of a forwarding chain", () => {
    process.env.TRUSTED_PROXY_HEADER = "x-forwarded-for";
    process.env.TRUSTED_PROXY_HOPS = "2";
    expect(
      trustedClientIp(request({ "x-forwarded-for": "203.0.113.9, 198.51.100.4, 192.0.2.7" }))
    ).toBe("198.51.100.4");
  });

  it("does not let an attacker-controlled leftmost value override the trusted hop", () => {
    process.env.TRUSTED_PROXY_HEADER = "x-forwarded-for";
    process.env.TRUSTED_PROXY_HOPS = "1";
    expect(
      trustedClientIp(request({ "x-forwarded-for": "6.6.6.6, 192.0.2.7" }))
    ).toBe("192.0.2.7");
  });

  it.each([
    ["malformed addresses", "not-an-ip", null],
    ["ports appended to addresses", "198.51.100.2:1234", null],
    ["valid IPv4", "198.51.100.2", "198.51.100.2"],
    ["bracketed IPv6", "[2001:DB8::1]", "2001:db8::1"]
  ])("handles %s safely", (_label, value, expected) => {
    process.env.TRUSTED_PROXY_HEADER = "cf-connecting-ip";
    expect(trustedClientIp(request({ "cf-connecting-ip": value }))).toBe(expected);
  });

  it("rejects malformed hop configuration and an undersized chain", () => {
    process.env.TRUSTED_PROXY_HEADER = "x-forwarded-for";
    process.env.TRUSTED_PROXY_HOPS = "eleven";
    expect(trustedClientIp(request({ "x-forwarded-for": "198.51.100.2" }))).toBeNull();
    process.env.TRUSTED_PROXY_HOPS = "2";
    expect(trustedClientIp(request({ "x-forwarded-for": "198.51.100.2" }))).toBeNull();
  });
});
