"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { Assessment, FleetSelection, Skill } from "@/lib/types";

const choices = {
  runtimes: ["Hermes", "Claude Code", "Codex", "Cursor"],
  models: ["Claude", "GPT", "Gemini", "Local models"],
  tools: ["filesystem", "browser", "Playwright", "GitHub", "shell"]
};

const emptyFleet: FleetSelection = { runtimes: [], models: [], tools: [], policy: "balanced" };

export function AskDev({ skill }: { skill: Skill }) {
  const titleId = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLElement>(null);
  const [open, setOpen] = useState(false);
  const [fleet, setFleet] = useState<FleetSelection>(emptyFleet);
  const [assessment, setAssessment] = useState<Assessment>();
  const [remaining, setRemaining] = useState<number>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("atlantys-capability-chips");
    if (saved) {
      try { setFleet(JSON.parse(saved)); } catch { /* Ignore corrupt browser-local state. */ }
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    dialog.current?.querySelector<HTMLElement>("button")?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeDialog();
        return;
      }
      if (event.key !== "Tab" || !dialog.current) return;
      const focusable = [...dialog.current.querySelectorAll<HTMLElement>("button:not(:disabled), a[href], input, select")];
      const first = focusable[0];
      const last = focusable.at(-1);
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  function closeDialog() {
    setOpen(false);
    window.requestAnimationFrame(() => trigger.current?.focus());
  }

  function toggle(group: "runtimes" | "models" | "tools", value: string) {
    setFleet((current) => {
      const selected = current[group].includes(value)
        ? current[group].filter((item) => item !== value)
        : [...current[group], value];
      const next = { ...current, [group]: selected };
      localStorage.setItem("atlantys-capability-chips", JSON.stringify(next));
      return next;
    });
  }

  async function assess() {
    setLoading(true);
    setError("");
    setAssessment(undefined);
    try {
      const response = await fetch("/api/assess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skillId: skill.id, fleet })
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Assessment failed.");
      setAssessment(body.assessment);
      setRemaining(body.remaining);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Assessment failed.");
    } finally {
      setLoading(false);
    }
  }

  async function share() {
    if (!assessment) return;
    const response = await fetch("/api/share", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ skillId: skill.id, verdict: assessment.verdict })
    });
    const body = await response.json();
    if (response.ok) window.location.assign(body.url);
    else setError(body.error || "Could not create share card.");
  }

  return (
    <>
      <button className="primary-button" ref={trigger} onClick={() => setOpen(true)}>Ask Dev</button>
      {open && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && closeDialog()}>
          <section className="modal" ref={dialog} role="dialog" aria-modal="true" aria-labelledby={titleId}>
            <div className="modal-head">
              <div><span className="eyebrow">Ask Dev · zero-signup fleet check</span><h2 id={titleId}>Will {skill.name} survive the descent?</h2></div>
              <button className="icon-button" aria-label="Close Ask Dev" onClick={closeDialog}>×</button>
            </div>
            <p className="privacy-note">Select capability names only. Never enter API keys, prompts, client data, memories, or private repository content. These chips stay in this browser.</p>
            {(Object.keys(choices) as Array<keyof typeof choices>).map((group) => (
              <fieldset className="chip-group" key={group}>
                <legend>{group}</legend>
                <div className="chips">
                  {choices[group].map((value) => (
                    <button
                      className={`chip ${fleet[group].includes(value) ? "active" : ""}`}
                      aria-pressed={fleet[group].includes(value)}
                      onClick={() => toggle(group, value)}
                      type="button"
                      key={value}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </fieldset>
            ))}
            <fieldset className="chip-group">
              <legend>Policy tolerance</legend>
              <div className="chips">
                {(["strict", "balanced", "experimental"] as const).map((value) => (
                  <button
                    className={`chip ${fleet.policy === value ? "active" : ""}`}
                    aria-pressed={fleet.policy === value}
                    onClick={() => {
                      const next = { ...fleet, policy: value };
                      setFleet(next);
                      localStorage.setItem("atlantys-capability-chips", JSON.stringify(next));
                    }}
                    type="button"
                    key={value}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </fieldset>
            <button className="primary-button" disabled={loading || !fleet.runtimes.length} onClick={assess}>
              {loading ? "Scanning public evidence…" : "Ask Dev"}
            </button>
            {error && <p className="error-text" role="alert">{error}</p>}
            {assessment && (
              <div className="assessment-result" aria-live="polite">
                <span className="eyebrow">Explainable result · {Math.round(assessment.confidence * 100)}% confidence</span>
                <h3 className={`verdict ${assessment.verdict}`}>{assessment.verdict}</h3>
                <p>{assessment.explanation}</p>
                {!!assessment.incompatibilities.length && <div className="result-list"><strong>Compatibility boundaries</strong><ul>{assessment.incompatibilities.map((item) => <li key={item}>{item}</li>)}</ul></div>}
                {!!assessment.permissionConcerns.length && <div className="result-list"><strong>Permission concerns</strong><ul>{assessment.permissionConcerns.map((item) => <li key={item}>{item}</li>)}</ul></div>}
                {!!assessment.missingInformation.length && <div className="result-list"><strong>Unknowns</strong><ul>{assessment.missingInformation.map((item) => <li key={item}>{item}</li>)}</ul></div>}
                <p><strong>Next:</strong> {assessment.recommendedAction}</p>
                <p className="privacy-note">{remaining} anonymous checks remain today. Share cards exclude your selected fleet capabilities.</p>
                <button className="secondary-button" onClick={share}>Create safe share card</button>
              </div>
            )}
          </section>
        </div>
      )}
    </>
  );
}
