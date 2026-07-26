"use client";

import { useState } from "react";
import type { Skill } from "@/lib/types";

function updateLabel(skill: Skill) {
  const revision = skill.revisions[0];
  return revision ? revision.contentHash.slice(0, 7).toUpperCase() : "INDEXED";
}

export function AtlantysTicker({ skills }: { skills: Skill[] }) {
  const [paused, setPaused] = useState(false);
  const visible = skills.slice(0, 8);

  return (
    <aside className="atlantys-ticker" aria-label="Interdimensional Cable public update ticker">
      <div className="ticker-station">
        <i aria-hidden="true" />
        <span>INTERDIMENSIONAL CABLE</span>
        <b>ATLANTYS CURRENT</b>
      </div>
      <div className="ticker-window">
        <div className={`ticker-track ${paused ? "is-paused" : ""}`}>
          {[0, 1].map((copy) => (
            <div className="ticker-copy" aria-hidden={copy === 1} key={copy}>
              {visible.map((skill) => (
                <span className="ticker-item" key={`${copy}-${skill.id}`}>
                  <strong>{skill.name}</strong>
                  <b>{updateLabel(skill)}</b>
                  <em>{skill.riskLevel} risk</em>
                  <i>◆</i>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
      <button
        type="button"
        onClick={() => setPaused((value) => !value)}
        aria-label={paused ? "Resume ticker" : "Pause ticker"}
        aria-pressed={paused}
      >
        {paused ? "▶" : "Ⅱ"}
      </button>
    </aside>
  );
}
