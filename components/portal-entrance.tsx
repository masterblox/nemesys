"use client";

import { useEffect, useRef, useState } from "react";

const sessionKey = "atlantys.portalIntroSeen.v1";

export function PortalEntrance() {
  const [open, setOpen] = useState(true);
  const [ready, setReady] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const skipButton = useRef<HTMLButtonElement>(null);
  const portal = useRef<HTMLDivElement>(null);
  const leaveTimer = useRef<number>(undefined);

  useEffect(() => {
    const url = new URL(window.location.href);
    const replayRequested = url.searchParams.get("gate") === "1";
    if (sessionStorage.getItem(sessionKey) === "true" && !replayRequested) setOpen(false);
    if (replayRequested) {
      url.searchParams.delete("gate");
      window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
    }
    setReady(true);
    const replay = () => {
      setLeaving(false);
      setOpen(true);
      setReady(true);
    };
    window.addEventListener("atlantys:open-gate", replay);
    return () => {
      window.removeEventListener("atlantys:open-gate", replay);
      if (leaveTimer.current) window.clearTimeout(leaveTimer.current);
    };
  }, []);

  useEffect(() => {
    const background = document.querySelectorAll<HTMLElement>(".atlantys-ticker, .site-header, .atlantys-home, .site-footer");
    const restore = () => background.forEach((element) => {
      element.inert = false;
      element.removeAttribute("aria-hidden");
    });
    if (open && ready) {
      background.forEach((element) => {
        element.inert = true;
        element.setAttribute("aria-hidden", "true");
      });
      skipButton.current?.focus();
      const handleKey = (event: KeyboardEvent) => {
        if (event.key === "Escape") {
          enter();
          return;
        }
        if (event.key !== "Tab" || !portal.current) return;
        const controls = [...portal.current.querySelectorAll<HTMLButtonElement>("button:not(:disabled)")];
        const first = controls[0];
        const last = controls.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      };
      document.addEventListener("keydown", handleKey);
      return () => {
        document.removeEventListener("keydown", handleKey);
        restore();
      };
    } else {
      restore();
    }
    return restore;
  }, [open, ready]);

  function enter() {
    if (leaving) return;
    sessionStorage.setItem(sessionKey, "true");
    setLeaving(true);
    const reduceMotion = typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const delay = reduceMotion ? 160 : 850;
    leaveTimer.current = window.setTimeout(() => {
      setOpen(false);
      setLeaving(false);
      document.querySelector("#surface")?.scrollIntoView({ block: "start" });
      window.requestAnimationFrame(() => document.querySelector<HTMLElement>("#main")?.focus());
    }, delay);
  }

  if (!open) return null;

  return (
    <div ref={portal} className={`portal-entrance ${ready ? "is-ready" : "is-pending"} ${leaving ? "is-leaving" : ""}`} role="dialog" aria-modal="true" aria-labelledby="portal-title">
      <button className="portal-skip" ref={skipButton} type="button" onClick={enter}>Skip intro</button>
      <div className="portal-copy">
        <span>Public agent registry · gateway D-137</span>
        <h1 id="portal-title">Every update is<br />a new <em>current.</em></h1>
        <p>Cross into Atlantys to inspect public skills, revisions, audits, creator activity, and fleet compatibility.</p>
        <button className="portal-enter" type="button" onClick={enter}>Enter Atlantys <span aria-hidden="true">→</span></button>
      </div>
      <div className="portal-fluid" aria-hidden="true">
        <picture>
          <source media="(prefers-reduced-motion: reduce)" srcSet="/atlantys/portal-show-poster.webp" />
          <img src="/atlantys/portal-show-loop-12fps-480.webp" alt="" />
        </picture>
        <i />
        <i />
      </div>
    </div>
  );
}
