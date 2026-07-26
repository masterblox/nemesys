import { hasDatabase, withTransaction } from "./db";
import { hashIdentifier } from "./security";

const localLimits = new Map<string, { count: number; expiresAt: number }>();
const dailyLimit = 3;
const windowMs = 24 * 60 * 60 * 1000;

function keysFor(deviceId: string, ip: string | null) {
  return [
    hashIdentifier(`assessment:device:${deviceId}`),
    ...(ip ? [hashIdentifier(`assessment:ip:${ip}`)] : [])
  ];
}

function cleanupLocal(now: number) {
  for (const [key, value] of localLimits) {
    if (value.expiresAt <= now) localLimits.delete(key);
  }
}

export async function consumeAssessment(deviceId: string, ip: string | null) {
  const keys = keysFor(deviceId, ip);
  const now = Date.now();
  const expiresAt = new Date(now + windowMs);
  if (!hasDatabase()) {
    cleanupLocal(now);
    const current = keys.map((key) => localLimits.get(key)).filter((entry) => entry && entry.expiresAt > now);
    const blocked = current.find((entry) => entry!.count >= dailyLimit);
    if (blocked) {
      return { allowed: false, remaining: 0, resetAt: new Date(blocked.expiresAt).toISOString() };
    }
    const updated = keys.map((key) => {
      const entry = localLimits.get(key);
      const next = !entry || entry.expiresAt <= now
        ? { count: 1, expiresAt: expiresAt.getTime() }
        : { ...entry, count: entry.count + 1 };
      localLimits.set(key, next);
      return next;
    });
    return {
      allowed: true,
      remaining: Math.max(0, dailyLimit - Math.max(...updated.map((entry) => entry.count))),
      resetAt: new Date(Math.min(...updated.map((entry) => entry.expiresAt))).toISOString()
    };
  }
  return withTransaction(async (client) => {
    const existing = await client.query<{ key_hash: string; count: number; expires_at: string }>(
      `SELECT key_hash, count, expires_at
       FROM assessment_limits WHERE key_hash = ANY($1::text[]) FOR UPDATE`,
      [keys]
    );
    const active = existing.rows.filter((row) => new Date(row.expires_at).getTime() > now);
    const blocked = active.find((row) => row.count >= dailyLimit);
    if (blocked) {
      return { allowed: false, remaining: 0, resetAt: new Date(blocked.expires_at).toISOString() };
    }
    const rows = [];
    for (const key of keys) {
      const result = await client.query<{ count: number; expires_at: string }>(
        `INSERT INTO assessment_limits (key_hash, count, expires_at)
         VALUES ($1, 1, $2)
         ON CONFLICT (key_hash) DO UPDATE SET
           count = CASE WHEN assessment_limits.expires_at <= now() THEN 1 ELSE assessment_limits.count + 1 END,
           expires_at = CASE WHEN assessment_limits.expires_at <= now() THEN EXCLUDED.expires_at ELSE assessment_limits.expires_at END
         RETURNING count, expires_at`,
        [key, expiresAt]
      );
      rows.push(result.rows[0]);
    }
    await client.query(`DELETE FROM assessment_limits WHERE expires_at <= now()`);
    const highestCount = Math.max(...rows.map((row) => row.count));
    return {
      allowed: highestCount <= dailyLimit,
      remaining: Math.max(0, dailyLimit - highestCount),
      resetAt: new Date(Math.min(...rows.map((row) => new Date(row.expires_at).getTime()))).toISOString()
    };
  });
}

export function resetLocalAssessmentLimitsForTests() {
  localLimits.clear();
}
