import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AskDev } from "@/components/ask-dev";
import { demoCatalog } from "@/lib/demo-data";
import type { Assessment } from "@/lib/types";

const assessment: Assessment = {
  verdict: "fits",
  explanation: "Compatible.",
  matchedCapabilities: ["Codex"],
  incompatibilities: [],
  permissionConcerns: [],
  missingInformation: [],
  confidence: 0.9,
  recommendedAction: "Test safely."
};

function response(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(body)
  } as unknown as Response;
}

function openAskDev() {
  render(
    <>
      <header className="site-header">Header</header>
      <main>Page</main>
      <AskDev skill={demoCatalog.skills[0]} />
      <footer className="site-footer">Footer</footer>
    </>
  );
  fireEvent.click(screen.getByRole("button", { name: "Ask Dev" }));
}

describe("Ask Dev hardened interaction", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.style.overflow = "";
  });

  it("normalizes corrupt and unknown local capability selections", async () => {
    localStorage.setItem("atlantys-capability-chips", JSON.stringify({
      runtimes: "Codex",
      models: ["GPT", "Private customer model"],
      tools: [null, "shell", "unknown-tool"],
      policy: "unlimited",
      prompt: "must never be retained"
    }));
    openAskDev();

    await waitFor(() => expect(screen.getByRole("button", { name: "GPT" })).toHaveAttribute("aria-pressed", "true"));
    expect(screen.getByRole("button", { name: "shell" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Codex" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "balanced" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByText(/Private customer model|must never be retained/)).not.toBeInTheDocument();
  });

  it("states the transient processing and persistence boundary accurately", () => {
    openAskDev();
    expect(screen.getByText(/sent transiently for this check, and never persisted or shared/i)).toBeInTheDocument();
    expect(screen.getByText(/processed by the configured model provider/i)).toBeInTheDocument();
  });

  it("traps focus, closes on Escape, restores focus, and makes the page inert", async () => {
    openAskDev();
    const close = screen.getByRole("button", { name: "Close Ask Dev" });
    await waitFor(() => expect(close).toHaveFocus());
    expect(document.querySelector("main")).toHaveAttribute("aria-hidden", "true");
    expect(document.body.style.overflow).toBe("hidden");

    fireEvent.keyDown(document, { key: "Escape" });

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await act(async () => {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    });
    expect(screen.getByRole("button", { name: "Ask Dev" })).toHaveFocus();
    expect(document.querySelector("main")).not.toHaveAttribute("aria-hidden");
    expect(document.body.style.overflow).toBe("");
  });

  it("announces loading and sends only the selected public capability names", async () => {
    let finish!: (value: Response) => void;
    const pending = new Promise<Response>((resolve) => { finish = resolve; });
    vi.mocked(fetch).mockReturnValueOnce(pending);
    openAskDev();
    const dialog = screen.getByRole("dialog");
    fireEvent.click(screen.getByRole("button", { name: "Codex" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Ask Dev" }));

    expect(screen.getByRole("button", { name: /Scanning public evidence/ })).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent("Scanning public evidence.");
    const requestBody = JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string);
    expect(requestBody).toEqual({
      skillId: demoCatalog.skills[0].id,
      fleet: { runtimes: ["Codex"], models: [], tools: [], policy: "balanced" }
    });

    finish(response(200, { assessment, receipt: "signed-receipt", remaining: 2 }));
    await waitFor(() => expect(screen.getByText("fits")).toBeInTheDocument());
  });

  it("shows a distinct rate-limit reset and lets the user retry", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(response(429, {
      error: "Three daily checks used.",
      resetAt: "2026-07-27T00:00:00.000Z"
    }));
    openAskDev();
    const dialog = screen.getByRole("dialog");
    fireEvent.click(screen.getByRole("button", { name: "Codex" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Ask Dev" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Three daily checks used.");
    expect(screen.getByRole("alert")).toHaveTextContent(/Try again after/);
    expect(screen.getByRole("button", { name: "Retry Ask Dev" })).toBeEnabled();
  });

  it("creates a share with only the signed receipt", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(response(200, { assessment, receipt: "signed-receipt", remaining: 2 }))
      .mockResolvedValueOnce(response(500, { error: "Share temporarily unavailable." }));
    openAskDev();
    const dialog = screen.getByRole("dialog");
    fireEvent.click(screen.getByRole("button", { name: "Codex" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Ask Dev" }));
    fireEvent.click(await screen.findByRole("button", { name: "Create safe share card" }));

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
    const shareRequest = vi.mocked(fetch).mock.calls[1];
    expect(shareRequest[0]).toBe("/api/share");
    expect(JSON.parse(shareRequest[1]!.body as string)).toEqual({ receipt: "signed-receipt" });
    expect(screen.getByRole("alert")).toHaveTextContent("Share temporarily unavailable.");
  });
});
