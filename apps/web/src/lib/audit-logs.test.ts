import {
  auditActionLabel,
  auditEntityTypeLabel,
  auditLogSummary,
  buildAuditLogQuery,
  sanitizeMetadataForDisplay,
} from "./audit-logs";

describe("audit log helpers", () => {
  it("labels audit actions and entity types", () => {
    expect(auditActionLabel("SALES_INVOICE_FINALIZED")).toBe("Sales invoice finalized");
    expect(auditActionLabel("CUSTOM_EVENT_NAME")).toBe("CUSTOM EVENT NAME");
    expect(auditEntityTypeLabel("InventoryVarianceProposal")).toBe("Inventory Variance Proposal");
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
  });

  it("summarizes common reference fields", () => {
    expect(auditLogSummary({ invoiceNumber: "INV-000001" }, null)).toBe("INV-000001");
    expect(auditLogSummary(null, { filename: "support.csv" })).toBe("support.csv");
    expect(auditLogSummary(null, null)).toBe("No reference captured");
  });
});
