import { hasDatabase, query } from "./db";
import { hashIdentifier } from "./security";

const localLimits = new Map<string, { count: number; expiresAt: number }>();

export async function consumeAssessment(deviceId: string, ip: string) {
  const key = hashIdentifier(`${deviceId}:${ip}`);
  const now = Date.now();
  const expiresAt = new Date(now + 24 * 60 * 60 * 1000);
  if (!hasDatabase()) {
    const current = localLimits.get(key);
    if (!current || current.expiresAt <= now) {
      localLimits.set(key, { count: 1, expiresAt: expiresAt.getTime() });
      return { allowed: true, remaining: 2, resetAt: expiresAt.toISOString() };
    }
    if (current.count >= 3) {
      return { allowed: false, remaining: 0, resetAt: new Date(current.expiresAt).toISOString() };
    }
    current.count += 1;
    return { allowed: true, remaining: 3 - current.count, resetAt: new Date(current.expiresAt).toISOString() };
  }
  const result = await query<{ count: number; expires_at: string }>(
    `INSERT INTO assessment_limits (key_hash, count, expires_at)
     VALUES ($1, 1, $2)
     ON CONFLICT (key_hash) DO UPDATE SET
       count = CASE WHEN assessment_limits.expires_at <= now() THEN 1 ELSE assessment_limits.count + 1 END,
       expires_at = CASE WHEN assessment_limits.expires_at <= now() THEN EXCLUDED.expires_at ELSE assessment_limits.expires_at END
     RETURNING count, expires_at`,
    [key, expiresAt]
  );
  const row = result.rows[0];
  return { allowed: row.count <= 3, remaining: Math.max(0, 3 - row.count), resetAt: row.expires_at };
}
