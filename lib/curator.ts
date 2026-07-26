import { cookies } from "next/headers";
import { hasDatabase, query, withTransaction } from "./db";
import { verifyCuratorSession } from "./security";

export interface InboxItem {
  id: string;
  provider: string;
  externalId: string;
  sourceUrl: string;
  originalText: string;
  authorHandle?: string;
  resolvedLinks: string[];
  status: "pending" | "approved" | "rejected" | "merged";
  fetchedAt: string;
}

export async function curatorIdentity() {
  const store = await cookies();
  return verifyCuratorSession(store.get("atlantys_curator")?.value);
}

export async function curatorInbox(): Promise<InboxItem[]> {
  if (!hasDatabase()) return [];
  const result = await query<{
    id: string;
    provider: string;
    external_id: string;
    source_url: string;
    original_text: string;
    author_handle: string | null;
    resolved_links: string[];
    status: InboxItem["status"];
    fetched_at: string;
  }>(
    `SELECT id, provider, external_id, source_url, original_text, author_handle,
            resolved_links, status, fetched_at
     FROM curator_inbox ORDER BY fetched_at DESC LIMIT 100`
  );
  return result.rows.map((row) => ({
    id: row.id,
    provider: row.provider,
    externalId: row.external_id,
    sourceUrl: row.source_url,
    originalText: row.original_text,
    authorHandle: row.author_handle || undefined,
    resolvedLinks: row.resolved_links,
    status: row.status,
    fetchedAt: row.fetched_at
  }));
}

export async function decideInboxItem(id: string, decision: "approved" | "rejected", note = "") {
  return withTransaction(async (client) => {
    const result = await client.query<{
      source_url: string;
      original_text: string;
      author_handle: string | null;
      resolved_links: string[];
    }>(
      `UPDATE curator_inbox SET status = $2, decision_note = $3, decided_at = now()
       WHERE id = $1 AND status = 'pending'
       RETURNING source_url, original_text, author_handle, resolved_links`,
      [id, decision, note]
    );
    const item = result.rows[0];
    if (!item) throw new Error("Pending inbox item not found");
    if (decision === "approved") {
      const repository = item.resolved_links.find((link) => /^https:\/\/github\.com\/[^/]+\/[^/]+/.test(link));
      const title = item.original_text.replace(/\s+/g, " ").trim().slice(0, 120);
      await client.query(
        `INSERT INTO signals
           (kind, title, summary, source_url, creator_handle, repository_source,
            verification_status, buzz_score)
         VALUES ('x', $1, $2, $3, $4, $5, $6, 50)
         ON CONFLICT (source_url) DO NOTHING`,
        [
          title,
          item.original_text.slice(0, 600),
          item.source_url,
          item.author_handle,
          repository ? repository.replace("https://github.com/", "").split("/").slice(0, 2).join("/") : null,
          repository ? "linked" : "unverified"
        ]
      );
    }
    return { id, decision };
  });
}
