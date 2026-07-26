"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Assessment, FleetSelection, Skill } from "@/lib/types";

const choices = {
  runtimes: ["Hermes", "Claude Code", "Codex", "Cursor"],
  models: ["Claude", "GPT", "Gemini", "Local models"],
  tools: ["filesystem", "browser", "Playwright", "GitHub", "shell"]
};

const emptyFleet: FleetSelection = { runtimes: [], models: [], tools: [], policy: "balanced" };

function normalizeFleet(value: unknown): FleetSelection {
  if (!value || typeof value !== "object") return emptyFleet;
  const candidate = value as Partial<FleetSelection>;
  const normalize = (group: keyof typeof choices) =>
    Array.isArray(candidate[group])
      ? choices[group].filter((choice) => candidate[group]!.includes(choice))
      : [];
  const policy = ["strict", "balanced", "experimental"].includes(candidate.policy || "")
    ? candidate.policy as FleetSelection["policy"]
    : "balanced";
  return { runtimes: normalize("runtimes"), models: normalize("models"), tools: normalize("tools"), policy };
}

export function AskDev({ skill }: { skill: Skill }) {
  const titleId = useId();
  const descriptionId = useId();
  const statusId = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const result = useRef<HTMLDivElement>(null);
  const requestController = useRef<AbortController>(null);
  const [open, setOpen] = useState(false);
  const [fleet, setFleet] = useState<FleetSelection>(emptyFleet);
  const [assessment, setAssessment] = useState<Assessment>();
  const [receipt, setReceipt] = useState("");
  const [remaining, setRemaining] = useState<number>();
  const [loading, setLoading] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [resetAt, setResetAt] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("atlantys-capability-chips");
    if (saved) {
      try { setFleet(normalizeFleet(JSON.parse(saved))); } catch { setFleet(emptyFleet); }
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const background = document.querySelectorAll<HTMLElement>(".atlantys-ticker, .site-header, main, .site-footer");
    const previousOverflow = document.body.style.overflow;
    background.forEach((element) => {
      element.inert = true;
      element.setAttribute("aria-hidden", "true");
    });
    document.body.style.overflow = "hidden";
    dialog.current?.querySelector<HTMLElement>("button")?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeDialog();
        return;
      }
      if (event.key !== "Tab" || !dialog.current) return;
      const focusable = [...dialog.current.querySelectorAll<HTMLElement>(
        'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])'
      )].filter((element) => !element.hidden);
      const first = focusable[0];
      const last = focusable.at(-1);
      if (!first || !last) return;
      if (!dialog.current.contains(document.activeElement)) {
        event.preventDefault();
        first.focus();
        return;
      }
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("keydown", handleKey);
      background.forEach((element) => {
        element.inert = false;
        element.removeAttribute("aria-hidden");
      });
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => () => requestController.current?.abort(), []);

  function closeDialog() {
    requestController.current?.abort();
    setLoading(false);
    setSharing(false);
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
    requestController.current?.abort();
    const controller = new AbortController();
    requestController.current = controller;
    setLoading(true);
    setError("");
    setResetAt("");
    setAssessment(undefined);
    setReceipt("");
    try {
      const response = await fetch("/api/assess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skillId: skill.id, fleet }),
        signal: controller.signal
      });
      const body = await response.json().catch(() => ({}));
      if (response.status === 429) {
        setResetAt(typeof body.resetAt === "string" ? body.resetAt : "");
        throw new Error(body.error || "Three daily checks used.");
      }
      if (!response.ok) throw new Error(body.error || "Assessment failed.");
      if (!body.assessment || typeof body.receipt !== "string") {
        throw new Error("Assessment returned an invalid response.");
      }
      setAssessment(body.assessment);
      setReceipt(body.receipt);
      setRemaining(body.remaining);
      window.requestAnimationFrame(() => result.current?.focus());
    } catch (requestError) {
      if (controller.signal.aborted) return;
      setError(requestError instanceof Error ? requestError.message : "Assessment failed.");
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }

  async function share() {
    if (!assessment || !receipt || sharing) return;
    setSharing(true);
    setError("");
    try {
      const response = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receipt })
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Could not create share card.");
      window.location.assign(body.url);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not create share card.");
    } finally {
      setSharing(false);
    }
  }

  const modal = open ? (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && closeDialog()}>
      <div
        className="modal"
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        aria-busy={loading || sharing}
      >
        <div className="modal-head">
          <div><span className="eyebrow">Ask Dev · zero-signup fleet check</span><h2 id={titleId}>Will {skill.name} survive the descent?</h2></div>
          <button className="icon-button" aria-label="Close Ask Dev" onClick={closeDialog}>×</button>
        </div>
        <p className="privacy-note" id={descriptionId}>Select capability names only—never API keys, prompts, client data, memories, or private repository content. Selections are stored only in this browser, sent transiently for this check, and never persisted or shared. When hosted assessment is enabled, the named selections and public skill evidence are processed by the configured model provider.</p>
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
        {!fleet.runtimes.length && <p className="privacy-note">Choose at least one runtime to begin.</p>}
        <button className="primary-button" disabled={loading || !fleet.runtimes.length} onClick={assess}>
          {loading ? "Scanning public evidence…" : error ? "Retry Ask Dev" : "Ask Dev"}
        </button>
        <p className="sr-only" id={statusId} role="status" aria-live="polite">
          {loading ? "Scanning public evidence." : sharing ? "Creating privacy-safe share card." : ""}
        </p>
        {error && (
          <div className="error-text" role="alert">
            <p>{error}</p>
            {resetAt && <p>Try again after {new Date(resetAt).toLocaleString()}.</p>}
          </div>
        )}
        {assessment && (
          <div className="assessment-result" ref={result} tabIndex={-1} aria-live="polite" aria-atomic="true">
            <span className="eyebrow">Explainable result · {Math.round(assessment.confidence * 100)}% confidence</span>
            <h3 className={`verdict ${assessment.verdict}`}>{assessment.verdict}</h3>
            <p>{assessment.explanation}</p>
            {!!assessment.incompatibilities.length && <div className="result-list"><strong>Compatibility boundaries</strong><ul>{assessment.incompatibilities.map((item) => <li key={item}>{item}</li>)}</ul></div>}
            {!!assessment.permissionConcerns.length && <div className="result-list"><strong>Permission concerns</strong><ul>{assessment.permissionConcerns.map((item) => <li key={item}>{item}</li>)}</ul></div>}
            {!!assessment.missingInformation.length && <div className="result-list"><strong>Unknowns</strong><ul>{assessment.missingInformation.map((item) => <li key={item}>{item}</li>)}</ul></div>}
            <p><strong>Next:</strong> {assessment.recommendedAction}</p>
            <p className="privacy-note">{remaining} anonymous checks remain today. Share cards exclude your selected fleet capabilities.</p>
            <button className="secondary-button" disabled={sharing} onClick={share}>
              {sharing ? "Creating safe share card…" : "Create safe share card"}
            </button>
          </div>
        )}
      </div>
    </div>
  ) : null;

  return (
    <>
      <button className="primary-button" ref={trigger} onClick={() => setOpen(true)}>Ask Dev</button>
      {modal && createPortal(modal, document.body)}
    </>
  );
}
