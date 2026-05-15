import {
  auditActionLabel,
  auditEntityTypeLabel,
  auditLogSummary,
  auditRetentionDaysLabel,
  buildAuditLogExportPath,
  buildAuditLogQuery,
  retentionPreviewSummary,
  sanitizeMetadataForDisplay,
} from "./audit-logs";

describe("audit log helpers", () => {
  it("labels audit actions and entity types", () => {
    expect(auditActionLabel("SALES_INVOICE_FINALIZED")).toBe("Sales invoice finalized");
    expect(auditActionLabel("NUMBER_SEQUENCE_UPDATED")).toBe("Number sequence updated");
    expect(auditActionLabel("CUSTOM_EVENT_NAME")).toBe("CUSTOM EVENT NAME");
    expect(auditEntityTypeLabel("InventoryVarianceProposal")).toBe("Inventory Variance Proposal");
    expect(auditEntityTypeLabel("NumberSequence")).toBe("Number Sequence");
    expect(auditEntityTypeLabel("CustomEntity")).toBe("Custom Entity");
  });

  it("redacts sensitive metadata for display", () => {
    expect(
      sanitizeMetadataForDisplay({
        email: "user@example.com",
        password: "Password123!",
        nested: { tokenHash: "hash", contentBase64: "payload" },
      }),
    ).toEqual({
      email: "user@example.com",
      password: "[REDACTED]",
      nested: { tokenHash: "[REDACTED]", contentBase64: "[REDACTED]" },
    });
  });

  it("builds filter URLs without empty values", () => {
    expect(buildAuditLogQuery({ action: "ATTACHMENT_UPLOADED", search: " support ", entityType: "" })).toBe(
      "/audit-logs?action=ATTACHMENT_UPLOADED&search=support",
    );
    expect(buildAuditLogExportPath({ action: "COGS_POSTED", from: "2026-05-01" })).toBe(
      "/audit-logs/export.csv?action=COGS_POSTED&from=2026-05-01",
    );
  });

  it("summarizes common reference fields", () => {
    expect(auditLogSummary({ invoiceNumber: "INV-000001" }, null)).toBe("INV-000001");
    expect(auditLogSummary(null, { filename: "support.csv" })).toBe("support.csv");
    expect(auditLogSummary(null, null)).toBe("No reference captured");
  });

  it("formats retention labels and preview summaries", () => {
    expect(auditRetentionDaysLabel(2555)).toBe("2555 days (7 years)");
    expect(auditRetentionDaysLabel(400)).toBe("400 days (1.1 years)");
    expect(retentionPreviewSummary(0)).toBe("No audit logs are older than the current cutoff.");
    expect(retentionPreviewSummary(2)).toBe("2 audit logs would be eligible in a dry run.");
  });
});
