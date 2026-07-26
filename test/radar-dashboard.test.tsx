import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RadarDashboard } from "@/components/radar-dashboard";
import { demoCatalog } from "@/lib/demo-data";

describe("community radar", () => {
  it("searches public catalog cards without mixing signal data", () => {
    render(<RadarDashboard catalog={demoCatalog} />);
    fireEvent.change(screen.getByLabelText("Search public skills"), { target: { value: "gdpr" } });
    expect(screen.getByRole("heading", { name: "GDPR Data Handling" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "React Best Practices" })).not.toBeInTheDocument();
  });

  it("labels unverified signals explicitly", () => {
    render(<RadarDashboard catalog={demoCatalog} />);
    expect(screen.getByText("unverified")).toBeInTheDocument();
  });

  it("shows at most three unique tags without changing the card link name", () => {
    const catalog = {
      ...demoCatalog,
      skills: [
        {
          ...demoCatalog.skills[0],
          tags: ["react", "performance", "react", "next.js", "server components"]
        }
      ],
      signals: []
    };
    render(<RadarDashboard catalog={catalog} />);

    const card = screen.getByRole("heading", { name: "React Best Practices" }).closest("article");
    expect(card).not.toBeNull();
    const tags = within(card!).getByLabelText("Skill tags");
    expect([...tags.querySelectorAll(".tag")].map((tag) => tag.textContent)).toEqual([
      "react",
      "performance",
      "next.js"
    ]);
    expect(within(card!).getByRole("link", { name: "Open React Best Practices" })).toHaveAttribute(
      "href",
      `/skills/${demoCatalog.skills[0].id}`
    );
  });

  it("keeps the visual card cue out of the accessibility tree", () => {
    render(<RadarDashboard catalog={demoCatalog} />);

    const cue = screen.getAllByText("Inspect anatomy")[0];
    expect(cue).toHaveAttribute("aria-hidden", "true");
    expect(screen.queryByRole("link", { name: "Inspect anatomy" })).not.toBeInTheDocument();
  });
});
