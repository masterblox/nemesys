"use client";

import { useEffect, useRef, useState } from "react";

const sessionKey = "atlantis.portalIntroSeen.v1";

export function PortalEntrance() {
  const [open, setOpen] = useState(true);
  const [ready, setReady] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const skipButton = useRef<HTMLButtonElement>(null);

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
    window.addEventListener("atlantis:open-gate", replay);
    return () => window.removeEventListener("atlantis:open-gate", replay);
  }, []);

  useEffect(() => {
    const background = document.querySelectorAll<HTMLElement>(".atlantis-ticker, .site-header, .atlantis-home, .site-footer");
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
    } else {
      restore();
    }
    return restore;
  }, [open, ready]);

  function enter() {
    sessionStorage.setItem(sessionKey, "true");
    setLeaving(true);
    window.setTimeout(() => {
      setOpen(false);
      setLeaving(false);
      document.querySelector("#surface")?.scrollIntoView({ block: "start" });
      window.requestAnimationFrame(() => document.querySelector<HTMLElement>("#main")?.focus());
    }, 850);
  }

  if (!open) return null;

  return (
    <div className={`portal-entrance ${ready ? "is-ready" : "is-pending"} ${leaving ? "is-leaving" : ""}`} role="dialog" aria-modal="true" aria-labelledby="portal-title">
      <button className="portal-skip" ref={skipButton} type="button" onClick={enter}>Skip intro</button>
      <div className="portal-copy">
        <span>Public agent registry · gateway D-137</span>
        <h1 id="portal-title">Every update is<br />a new <em>current.</em></h1>
        <p>Cross into Atlantis to inspect public skills, revisions, audits, creator activity, and fleet compatibility.</p>
        <button className="portal-enter" type="button" onClick={enter}>Enter Atlantis <span aria-hidden="true">→</span></button>
      </div>
      <div className="portal-fluid" aria-hidden="true">
        <picture>
          <source media="(prefers-reduced-motion: reduce)" srcSet="/atlantis/portal-show-poster.webp" />
          <img src="/atlantis/portal-show-loop-12fps-480.webp" alt="" />
        </picture>
        <i />
        <i />
      </div>
    </div>
  );
}
