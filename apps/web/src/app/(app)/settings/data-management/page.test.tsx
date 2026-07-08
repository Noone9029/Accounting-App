import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import DataManagementSettingsPage from "./page";

describe("settings data management page", () => {
  it("renders a read-only import/export planning surface", () => {
    render(<DataManagementSettingsPage />);

    expect(screen.getByRole("heading", { level: 1, name: "Data management" })).toBeInTheDocument();
    expect(screen.getByText(/metadata-only planning view/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Export readiness" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Import readiness" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Backup and restore boundaries" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Storage readiness" })).toHaveAttribute("href", "/settings/storage");
    expect(screen.getByRole("link", { name: "Generated documents" })).toHaveAttribute("href", "/documents");
    expect(screen.getByRole("link", { name: "Audit logs" })).toHaveAttribute("href", "/settings/audit-logs");
  });

  it("does not claim enabled mutations, provider storage, backups, imports, exports, or compliance readiness", () => {
    render(<DataManagementSettingsPage />);

    expect(screen.getByText(/No export job is started from this page/i)).toBeInTheDocument();
    expect(screen.getByText(/No import parser, write path, or schema migration runs from this page/i)).toBeInTheDocument();
    expect(screen.getByText(/No backup or restore action is available here/i)).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/production[- ]ready|provider enabled|backup enabled|restore enabled|import enabled|export enabled/i);
    expect(document.body.textContent).not.toMatch(/\b(ZATCA|UAE|Peppol)\b.{0,80}\b(compliant|certified|approved|enabled|implemented|proven)\b/i);
  });
});
