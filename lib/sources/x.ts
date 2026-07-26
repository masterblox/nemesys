import { decryptToken, encryptToken } from "../security";
import { hasDatabase, query } from "../db";

interface XTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
}

export function xAuthorizationUrl(state: string, challenge: string) {
  const url = new URL("https://x.com/i/oauth2/authorize");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", process.env.X_CLIENT_ID || "");
  url.searchParams.set("redirect_uri", process.env.X_REDIRECT_URI || "");
  url.searchParams.set("scope", "bookmark.read tweet.read users.read offline.access");
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("code_challenge_method", "S256");
  return url.toString();
}

export async function exchangeXCode(code: string, verifier: string) {
  const body = new URLSearchParams({
    code,
    grant_type: "authorization_code",
    redirect_uri: process.env.X_REDIRECT_URI || "",
    code_verifier: verifier
  });
  const authorization = Buffer.from(`${process.env.X_CLIENT_ID}:${process.env.X_CLIENT_SECRET}`).toString("base64");
  const response = await fetch("https://api.x.com/2/oauth2/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${authorization}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body
  });
  if (!response.ok) throw new Error(`X token exchange returned HTTP ${response.status}`);
  return response.json() as Promise<XTokenResponse>;
}

export async function xMe(accessToken: string) {
  const response = await fetch("https://api.x.com/2/users/me?user.fields=username,name", {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store"
  });
  if (!response.ok) throw new Error(`X user lookup returned HTTP ${response.status}`);
  const body = await response.json();
  return body.data as { id: string; username: string; name: string };
}

export async function saveXConnection(user: { id: string; username: string }, tokens: XTokenResponse) {
  if (!hasDatabase()) throw new Error("X connection requires DATABASE_URL");
  await query(
    `INSERT INTO curator_connections
       (provider, external_user_id, encrypted_access_token, encrypted_refresh_token, expires_at, metadata)
     VALUES ('x', $1, $2, $3, $4, $5)
     ON CONFLICT (provider) DO UPDATE SET external_user_id = EXCLUDED.external_user_id,
       encrypted_access_token = EXCLUDED.encrypted_access_token,
       encrypted_refresh_token = EXCLUDED.encrypted_refresh_token,
       expires_at = EXCLUDED.expires_at, metadata = EXCLUDED.metadata, updated_at = now()`,
    [
      user.id,
      encryptToken(tokens.access_token),
      tokens.refresh_token ? encryptToken(tokens.refresh_token) : null,
      tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null,
      JSON.stringify({ username: user.username })
    ]
  );
}

async function refreshXConnection(row: {
  external_user_id: string;
  encrypted_access_token: string;
  encrypted_refresh_token: string | null;
  expires_at: string | null;
  metadata: { username?: string };
}) {
  if (!row.expires_at || new Date(row.expires_at).getTime() > Date.now() + 5 * 60 * 1000) return row;
  if (!row.encrypted_refresh_token) throw new Error("X authorization expired and no refresh token is available");
  const body = new URLSearchParams({
    refresh_token: decryptToken(row.encrypted_refresh_token),
    grant_type: "refresh_token",
    client_id: process.env.X_CLIENT_ID || ""
  });
  const authorization = Buffer.from(`${process.env.X_CLIENT_ID}:${process.env.X_CLIENT_SECRET}`).toString("base64");
  const response = await fetch("https://api.x.com/2/oauth2/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${authorization}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body
  });
  if (!response.ok) throw new Error(`X token refresh returned HTTP ${response.status}`);
  const tokens = await response.json() as XTokenResponse;
  await saveXConnection(
    { id: row.external_user_id, username: row.metadata.username || "" },
    { ...tokens, refresh_token: tokens.refresh_token || decryptToken(row.encrypted_refresh_token) }
  );
  return {
    ...row,
    encrypted_access_token: encryptToken(tokens.access_token),
    encrypted_refresh_token: encryptToken(tokens.refresh_token || decryptToken(row.encrypted_refresh_token)),
    expires_at: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000).toISOString() : null
  };
}

function links(text: string) {
  return [...text.matchAll(/https?:\/\/[^\s)]+/g)].map((match) => match[0]);
}

export async function syncXBookmarks() {
  if (!hasDatabase()) throw new Error("X bookmark sync requires DATABASE_URL");
  const connection = await query<{
    external_user_id: string;
    encrypted_access_token: string;
    encrypted_refresh_token: string | null;
    expires_at: string | null;
    metadata: { username?: string };
  }>(
    `SELECT external_user_id, encrypted_access_token, encrypted_refresh_token, expires_at, metadata
     FROM curator_connections WHERE provider = 'x'`
  );
  if (!connection.rows[0]) throw new Error("X is not connected");
  const activeConnection = await refreshXConnection(connection.rows[0]);
  const today = new Date().toISOString().slice(0, 10);
  const usageKey = `x:reads:${today}`;
  const usage = await query<{ value: { count?: number } }>("SELECT value FROM sync_state WHERE key = $1", [usageKey]);
  const used = Number(usage.rows[0]?.value?.count || 0);
  const dailyLimit = Number(process.env.X_DAILY_READ_LIMIT || 500);
  if (used >= dailyLimit) throw new Error("X daily read budget reached; synchronization stopped");

  let paginationToken: string | undefined;
  let fetched = 0;
  let inserted = 0;
  do {
    const pageSize = Math.min(100, dailyLimit - used - fetched);
    if (pageSize < 5) break;
    const url = new URL(`https://api.x.com/2/users/${activeConnection.external_user_id}/bookmarks`);
    url.searchParams.set("max_results", String(pageSize));
    url.searchParams.set("tweet.fields", "created_at,author_id,public_metrics,entities");
    url.searchParams.set("expansions", "author_id");
    url.searchParams.set("user.fields", "username,name");
    if (paginationToken) url.searchParams.set("pagination_token", paginationToken);
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${decryptToken(activeConnection.encrypted_access_token)}` },
      cache: "no-store"
    });
    if (response.status === 401) throw new Error("X authorization was revoked or expired");
    if (response.status === 402 || response.status === 429) {
      throw new Error("X credits or rate limit exhausted; synchronization stopped");
    }
    if (!response.ok) throw new Error(`X bookmarks returned HTTP ${response.status}`);
    const body = await response.json();
    const users = new Map<string, string>(
      (body.includes?.users || []).map((user: { id: string; username: string }) => [user.id, user.username])
    );
    let pageInserted = 0;
    for (const post of body.data || []) {
      const result = await query(
        `INSERT INTO curator_inbox
           (provider, external_id, source_url, original_text, author_handle, resolved_links)
         VALUES ('x', $1, $2, $3, $4, $5)
         ON CONFLICT (provider, external_id) DO NOTHING`,
        [
          post.id,
          `https://x.com/${users.get(post.author_id) || "i"}/status/${post.id}`,
          post.text,
          users.get(post.author_id) || null,
          JSON.stringify(links(post.text))
        ]
      );
      pageInserted += result.rowCount || 0;
    }
    const count = (body.data || []).length;
    fetched += count;
    inserted += pageInserted;
    paginationToken = body.meta?.next_token;
    if (!count || pageInserted === 0) break;
  } while (paginationToken && fetched < dailyLimit - used);

  await query(
    `INSERT INTO sync_state (key, value) VALUES ($1, $2)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
    [usageKey, JSON.stringify({ count: used + fetched, estimatedUsd: (used + fetched) * 0.001 })]
  );
  return { fetched, inserted, remainingBudget: dailyLimit - used - fetched };
}
