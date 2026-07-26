"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { CatalogSnapshot, Skill } from "@/lib/types";

function compactNumber(value: number) {
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function age(value: string) {
  const hours = Math.max(1, Math.round((Date.now() - new Date(value).getTime()) / 3_600_000));
  return hours < 24 ? `${hours}H AGO` : `${Math.round(hours / 24)}D AGO`;
}

function skillPath(skill: Skill) {
  return `/skills/${skill.id}`;
}

export function RadarDashboard({ catalog }: { catalog: CatalogSnapshot }) {
  const [query, setQuery] = useState("");
  const [runtime, setRuntime] = useState("all");
  const [risk, setRisk] = useState("all");
  const [audit, setAudit] = useState("all");
  const skills = useMemo(
    () =>
      catalog.skills.filter((skill) => {
        const text = `${skill.name} ${skill.description} ${skill.source} ${skill.tags.join(" ")}`.toLowerCase();
        return (
          text.includes(query.toLowerCase()) &&
          (runtime === "all" || skill.runtime.includes(runtime)) &&
          (risk === "all" || skill.riskLevel === risk) &&
          (audit === "all" || skill.auditStatus === audit)
        );
      }),
    [catalog.skills, query, runtime, risk, audit]
  );
  const runtimes = [...new Set(catalog.skills.flatMap((skill) => skill.runtime))].sort();

  return (
    <>
      <section className="radar-panel" id="discover" aria-labelledby="updates-title">
        <div className="filter-bar" role="search">
          <input
            aria-label="Search public skills"
            placeholder="Search skills, creators, tools…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <select aria-label="Filter by runtime" value={runtime} onChange={(event) => setRuntime(event.target.value)}>
            <option value="all">All runtimes</option>
            {runtimes.map((item) => <option key={item}>{item}</option>)}
          </select>
          <select aria-label="Filter by risk" value={risk} onChange={(event) => setRisk(event.target.value)}>
            <option value="all">All risk levels</option>
            <option value="low">Low risk</option>
            <option value="medium">Medium risk</option>
            <option value="high">High risk</option>
          </select>
          <select aria-label="Filter by audit" value={audit} onChange={(event) => setAudit(event.target.value)}>
            <option value="all">Any audit status</option>
            <option value="pass">Audit passed</option>
            <option value="warn">Review advised</option>
            <option value="unknown">Not audited</option>
          </select>
        </div>
        <div className="skill-grid" aria-live="polite">
          {skills.map((skill) => (
            <article className="skill-card" key={skill.id}>
              <div className="card-top">
                <span className="source-avatar" aria-hidden="true">{skill.creator.slice(0, 2).toUpperCase()}</span>
                <span className={`status-pill ${skill.auditStatus}`}>{skill.auditStatus === "pass" ? "audit passed" : skill.auditStatus}</span>
              </div>
              <span className="card-source mono">{skill.source}</span>
              <h3>{skill.name}</h3>
              <p>{skill.description}</p>
              {skill.revisions[0] && <div className="update-note">{skill.revisions[0].summary}</div>}
              <div className="skill-meta">
                <span>{compactNumber(skill.installs)} installs</span>
                <span>{skill.riskLevel} risk</span>
                <span>{age(skill.updatedAt)}</span>
              </div>
              <Link className="card-link" href={skillPath(skill)} aria-label={`Open ${skill.name}`} />
            </article>
          ))}
          {!skills.length && <article className="skill-card"><h3>No transmissions found</h3><p>Try a broader query or clear one of the filters.</p></article>}
        </div>
      </section>

      <section className="signals-section" id="signals" aria-labelledby="signals-title">
        <div className="section-head">
          <div><span className="section-kicker">Community signal desk</span><h2 id="signals-title">Alpha, with receipts.</h2></div>
          <p>Signals are posts, news, and repositories worth watching. They stay clearly unverified until linked to an installable public skill.</p>
        </div>
        <div className="signal-grid">
          {catalog.signals.map((signal) => (
            <article className="signal-card" key={signal.id}>
              <div>
                <div className="signal-meta">
                  <span className={`kind-pill ${signal.verificationStatus}`}>{signal.verificationStatus}</span>
                  <span className="mono">{age(signal.publishedAt)}</span>
                </div>
                <h3>{signal.title}</h3>
                <p>{signal.summary}</p>
              </div>
              <div>
                <div className="signal-meta"><span>{signal.creator || "public source"}</span><span>BUZZ {signal.buzzScore}</span></div>
                <div className="buzz-meter" aria-label={`Buzz score ${signal.buzzScore} out of 100`}><i style={{ width: `${signal.buzzScore}%` }} /></div>
                <a className="signal-source" href={signal.sourceUrl} target="_blank" rel="noreferrer">Inspect attributed source ↗</a>
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
