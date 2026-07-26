import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AtlantysTicker } from "@/components/atlantys-ticker";
import { PortalEntrance } from "@/components/portal-entrance";
import { demoCatalog } from "@/lib/demo-data";

describe("Atlantys canonical experience", () => {
  beforeEach(() => {
    sessionStorage.clear();
    window.history.replaceState({}, "", "/");
  });

  it("shows the portal once and records completion in session storage", () => {
    vi.useFakeTimers();
    render(<PortalEntrance />);
    expect(screen.getByRole("dialog", { name: /Every update is/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Enter Atlantys/i }));
    expect(sessionStorage.getItem("atlantys.portalIntroSeen.v1")).toBe("true");
    expect(screen.getByRole("dialog")).toHaveClass("is-leaving");
    act(() => vi.advanceTimersByTime(900));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    vi.useRealTimers();
  });

  it("skips the automatic entrance after it has been seen and supports replay", async () => {
    sessionStorage.setItem("atlantys.portalIntroSeen.v1", "true");
    render(<PortalEntrance />);
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    act(() => window.dispatchEvent(new Event("atlantys:open-gate")));
    expect(screen.getByRole("dialog", { name: /Every update is/i })).toBeInTheDocument();
  });

  it("honors a gate replay deep link without clearing the session preference", () => {
    sessionStorage.setItem("atlantys.portalIntroSeen.v1", "true");
    window.history.replaceState({}, "", "/?gate=1");
    render(<PortalEntrance />);
    expect(screen.getByRole("dialog", { name: /Every update is/i })).toBeInTheDocument();
    expect(window.location.search).toBe("");
    expect(sessionStorage.getItem("atlantys.portalIntroSeen.v1")).toBe("true");
  });

  it("lets visitors pause the real public update ticker", () => {
    render(<AtlantysTicker skills={demoCatalog.skills} />);
    const button = screen.getByRole("button", { name: "Pause ticker" });
    fireEvent.click(button);
    expect(screen.getByRole("button", { name: "Resume ticker" })).toHaveAttribute("aria-pressed", "true");
  });
});
