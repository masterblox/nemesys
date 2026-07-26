import { fireEvent, render, screen } from "@testing-library/react";
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
});
