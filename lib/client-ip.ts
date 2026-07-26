import { isIP } from "node:net";
import type { NextRequest } from "next/server";

const supportedHeaders = new Set(["x-forwarded-for", "x-real-ip", "cf-connecting-ip"]);

function normalizedIp(value: string) {
  const candidate = value.trim().replace(/^\[|\]$/g, "").toLowerCase();
  return candidate.length <= 64 && isIP(candidate) ? candidate : null;
}

export function trustedClientIp(request: Pick<NextRequest, "headers">) {
  const configured = process.env.TRUSTED_PROXY_HEADER?.toLowerCase();
  if (!configured || !supportedHeaders.has(configured)) return null;
  const raw = request.headers.get(configured);
  if (!raw || raw.length > 1024) return null;

  if (configured !== "x-forwarded-for") return normalizedIp(raw);

  const hops = Number.parseInt(process.env.TRUSTED_PROXY_HOPS || "1", 10);
  if (!Number.isSafeInteger(hops) || hops < 1 || hops > 10) return null;
  const chain = raw.split(",").map((part) => part.trim());
  if (chain.length > 20) return null;
  const candidate = chain.at(-hops);
  return candidate ? normalizedIp(candidate) : null;
}
