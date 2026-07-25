import Link from "next/link";
import { CuratorInbox } from "@/components/curator-inbox";
import { curatorIdentity, curatorInbox } from "@/lib/curator";
import { hasDatabase } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function CuratorPage() {
  const identity = await curatorIdentity();
  const items = identity ? await curatorInbox() : [];
  return (
    <main className="curator-shell" id="main">
      <Link className="back-link" href="/">← PUBLIC RADAR</Link>
      <span className="eyebrow">Private signal desk</span>
      <h1>Curator inbox.</h1>
      {!hasDatabase() ? (
        <section className="detail-panel">
          <h2>Database setup required</h2>
          <p>Apply <code>db/schema.sql</code> to PostgreSQL and configure <code>DATABASE_URL</code>. The public demo never exposes curator fixtures.</p>
        </section>
      ) : !identity ? (
        <section className="detail-panel">
          <h2>Carlos-only access</h2>
          <p>Connect the allowlisted X account. OAuth requests only bookmark, post, user, and offline read scopes.</p>
          <a className="primary-button" href="/api/x/connect">Connect X securely</a>
        </section>
      ) : (
        <>
          <p className="hero-copy">Signed in as X user <span className="mono">{identity}</span>. Bookmarks remain private until explicitly approved.</p>
          <CuratorInbox initialItems={items} />
        </>
      )}
    </main>
  );
}
