import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";

import ReportPacksPage from "./page";

describe("ReportPacksPage", () => {
  it("renders a read-only report pack planning surface", () => {
    render(<ReportPacksPage />);

    expect(screen.getByRole("heading", { name: "Report packs" })).toBeInTheDocument();
    expect(screen.getByText("Planning-only")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Pack contents" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Generation boundary" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Review workflow" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open reports" })).toHaveAttribute("href", "/reports");
    expect(screen.getByRole("link", { name: "Review generated documents" })).toHaveAttribute("href", "/documents");
  });

  it("does not expose generation, scheduling, storage, provider, or compliance claims", () => {
    render(<ReportPacksPage />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByText(/generate report pack/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/schedule/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/storage provider/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/production-ready/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/zatca|uae|peppol/i)).not.toBeInTheDocument();
  });
});
