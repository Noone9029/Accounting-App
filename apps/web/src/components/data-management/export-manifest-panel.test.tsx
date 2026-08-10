import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";

import { ExportManifestPanel } from "./export-manifest-panel";
import type { DataExportManifest } from "@/lib/types";

describe("ExportManifestPanel", () => {
  it("renders a plan-only manifest without exposing tenant payloads or unsafe actions", () => {
    render(<ExportManifestPanel manifest={manifestFixture()} />);

    expect(screen.getByText("Data export manifest")).toBeInTheDocument();
    expect(screen.getByText("Plan only")).toBeInTheDocument();
    expect(screen.getByText("No export started")).toBeInTheDocument();
    expect(screen.getByText("No backup or restore")).toBeInTheDocument();
    expect(screen.getByText("Chart of accounts")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("Generated document metadata")).toBeInTheDocument();
    expect(screen.getByText("9")).toBeInTheDocument();
    expect(document.body).toHaveTextContent("PDF/base64 content");
    expect(document.body).toHaveTextContent("object storage payloads");
    expect(screen.getByText(/Full tenant archive download is not implemented/i)).toBeInTheDocument();
    expect(screen.getByText(/does not export tenant data/i)).toBeInTheDocument();

    expect(document.body).not.toHaveTextContent("postgresql://");
    expect(document.body).not.toHaveTextContent("service_role");
    expect(document.body).not.toHaveTextContent("S3_SECRET_ACCESS_KEY");
    expect(document.body).not.toHaveTextContent("<Invoice");
    expect(document.body).not.toHaveTextContent("signed-url-token");
    expect(screen.queryByRole("button", { name: /download|export|import|restore|backup/i })).not.toBeInTheDocument();
  });

  it("renders an empty scope state as metadata planning only", () => {
    render(<ExportManifestPanel manifest={{ ...manifestFixture(), scopes: [] }} />);

    expect(screen.getByText("No export scopes planned")).toBeInTheDocument();
    expect(screen.getByText("Metadata planning can continue after export scopes are approved.")).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent(/production data portability/i);
  });
});

function manifestFixture(): DataExportManifest {
  return {
    manifestVersion: "2026-06-20.openbooks-adoption.export-manifest.v1",
    generatedAt: "2026-06-20T18:00:00.000Z",
    organizationId: "org-1",
    status: "PLAN_ONLY",
    mode: "METADATA_MANIFEST_ONLY",
    exportNotStarted: true,
    scopes: [
      {
        key: "accounts",
        label: "Chart of accounts",
        permission: "accounts.view",
        requiresPermission: "accounts.view",
        exportFormat: "json",
        includes: ["account code", "name", "type", "posting flags"],
        excludes: ["journal-line balances", "period close proof"],
        state: "PLANNED",
        recordCount: 12,
        samplePayload: "postgresql://service_role:S3_SECRET_ACCESS_KEY@example.test",
      } as DataExportManifest["scopes"][number],
      {
        key: "generatedDocuments",
        label: "Generated document metadata",
        permission: "generatedDocuments.view",
        requiresPermission: "generatedDocuments.view",
        exportFormat: "json",
        includes: ["document type", "source reference", "filename", "status", "hash and size metadata"],
        excludes: ["PDF/base64 content", "object storage payloads", "signed URLs"],
        state: "PLANNED",
        recordCount: 9,
        documentPayload: "<Invoice signed-url-token>",
      } as DataExportManifest["scopes"][number],
    ],
    blockedActions: [
      { action: "downloadFullArchive", reason: "Full tenant archive download is not implemented in this planning slice." },
      { action: "importData", reason: "Import remains design-only until schema mapping, validation, and audit requirements are approved." },
      { action: "backupRestore", reason: "Backup and restore proof remains separate from this metadata manifest." },
    ],
    notes: [
      "This export manifest is read-only planning metadata and does not export tenant data.",
      "This endpoint does not perform backup, restore, import, provider sync, file generation, signed URL creation, email sending, or compliance submission.",
    ],
  };
}
