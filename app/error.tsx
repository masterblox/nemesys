"use client";

import { AppState } from "@/components/app-state";

export default function ErrorState({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <AppState
      eyebrow="Signal interrupted"
      title="The current broke."
      message="Atlantys could not load this public evidence. Your private capability selections were not involved."
      action={<button className="primary-button" onClick={reset}>Retry transmission</button>}
    />
  );
}
