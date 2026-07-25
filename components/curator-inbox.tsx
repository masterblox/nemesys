"use client";

import { useState } from "react";
import type { InboxItem } from "@/lib/curator";

export function CuratorInbox({ initialItems }: { initialItems: InboxItem[] }) {
  const [items, setItems] = useState(initialItems);
  const [message, setMessage] = useState("");

  async function decide(id: string, decision: "approved" | "rejected") {
    setMessage("");
    const response = await fetch("/api/curator/inbox", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, decision })
    });
    const body = await response.json();
    if (!response.ok) {
      setMessage(body.error || "Decision failed.");
      return;
    }
    setItems((current) => current.map((item) => item.id === id ? { ...item, status: decision } : item));
    setMessage(decision === "approved" ? "Signal published to the community feed." : "Signal kept private and rejected.");
  }

  async function sync() {
    setMessage("Syncing bookmarks within the configured read budget…");
    const response = await fetch("/api/curator/sync", { method: "POST" });
    const body = await response.json();
    setMessage(response.ok ? `Fetched ${body.fetched}; ${body.inserted} new inbox items.` : body.error);
    if (response.ok) window.location.reload();
  }

  return (
    <>
      <div className="hero-actions">
        <button className="primary-button" onClick={sync}>Sync X bookmarks</button>
        <span className="privacy-note">Nothing publishes without your approval.</span>
      </div>
      {message && <p role="status">{message}</p>}
      <div className="inbox-list">
        {items.map((item) => (
          <article className="inbox-card" key={item.id}>
            <div className="signal-meta">
              <span className={`kind-pill ${item.status === "pending" ? "unverified" : ""}`}>{item.status}</span>
              <a href={item.sourceUrl} target="_blank" rel="noreferrer">@{item.authorHandle || "source"} ↗</a>
            </div>
            <blockquote>{item.originalText}</blockquote>
            {!!item.resolvedLinks.length && <div className="tag-list">{item.resolvedLinks.map((link) => <a className="tag" href={link} target="_blank" rel="noreferrer" key={link}>{new URL(link).hostname}</a>)}</div>}
            {item.status === "pending" && (
              <div className="inbox-actions">
                <button className="primary-button" onClick={() => decide(item.id, "approved")}>Approve signal</button>
                <button className="ghost-button" onClick={() => decide(item.id, "rejected")}>Reject</button>
              </div>
            )}
          </article>
        ))}
        {!items.length && <article className="inbox-card"><h2>Inbox clear</h2><p>Connect X or sync bookmarks to stage private discoveries here.</p></article>}
      </div>
    </>
  );
}
