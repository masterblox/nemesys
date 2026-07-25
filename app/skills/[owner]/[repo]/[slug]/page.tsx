import Link from "next/link";
import { notFound } from "next/navigation";
import { AskDev } from "@/components/ask-dev";
import { getSkill } from "@/lib/catalog";

export const revalidate = 300;

export default async function SkillPage({ params }: { params: Promise<{ owner: string; repo: string; slug: string }> }) {
  const { owner, repo, slug } = await params;
  const skill = await getSkill(owner, repo, slug);
  if (!skill) notFound();
  const latest = skill.revisions[0];
  return (
    <main className="detail-shell" id="main">
      <Link className="back-link" href="/">← RETURN TO PUBLIC RADAR</Link>
      <section className="detail-hero">
        <div>
          <span className="eyebrow">Verified public skill · {skill.source}</span>
          <h1>{skill.name}</h1>
          <p>{skill.description}</p>
          <div className="detail-meta">
            <span>{skill.installs.toLocaleString()} installs</span><span>•</span>
            <span>risk {skill.riskLevel}</span><span>•</span>
            <span>audit {skill.auditStatus}</span>
          </div>
        </div>
        <div className="detail-actions">
          <AskDev skill={skill} />
          <a className="secondary-button" href={skill.sourceUrl} target="_blank" rel="noreferrer">Open public source ↗</a>
        </div>
      </section>
      <div className="detail-grid">
        <div>
          <section className="detail-panel">
            <span className="section-kicker">Latest transmission</span>
            <h2>{latest?.summary || "No revision history yet"}</h2>
            {latest?.diff ? (
              <div className="diff-view">
                {latest.diff.split("\n").map((line, index) => <div className={line.startsWith("+") ? "add" : ""} key={`${line}-${index}`}>{line}</div>)}
              </div>
            ) : <p>Historical diff will appear after the next content-hash change.</p>}
          </section>
          <section className="detail-panel">
            <h2>Revision history</h2>
            {skill.revisions.map((revision) => (
              <div className="audit-row" key={revision.id}>
                <div><strong>{revision.summary}</strong><p className="mono">{new Date(revision.detectedAt).toLocaleString()}</p></div>
                <a href={revision.sourceUrl} target="_blank" rel="noreferrer">Source ↗</a>
              </div>
            ))}
          </section>
        </div>
        <aside>
          <section className="detail-panel">
            <h2>Install</h2>
            <code className="install-command">npx skills add {skill.source}@{skill.slug}</code>
          </section>
          <section className="detail-panel">
            <h2>Compatibility evidence</h2>
            <div className="tag-list">{[...skill.runtime, ...skill.models, ...skill.tools].map((tag) => <span className="tag" key={tag}>{tag}</span>)}</div>
          </section>
          <section className="detail-panel">
            <h2>Declared permissions</h2>
            {skill.permissions.length ? <ul className="result-list">{skill.permissions.map((permission) => <li key={permission}>{permission}</li>)}</ul> : <p className="error-text">Not declared</p>}
          </section>
          <section className="detail-panel">
            <h2>Public audits</h2>
            {skill.audits.length ? skill.audits.map((audit) => (
              <div className="audit-row" key={audit.provider}>
                <div><strong>{audit.provider}</strong><p>{audit.summary}</p></div>
                <span className={`status-pill ${audit.status}`}>{audit.status}</span>
              </div>
            )) : <p>No public audit available. Treat this as missing evidence.</p>}
          </section>
          <section className="detail-panel">
            <h2>Attribution</h2>
            <p><Link href={`/creators/${skill.creator}`}>Creator: {skill.creator}</Link></p>
            <p><Link href={`/repositories/${skill.creator}/${skill.repository}`}>Repository: {skill.source}</Link></p>
          </section>
        </aside>
      </div>
    </main>
  );
}
