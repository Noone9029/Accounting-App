import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { DEFAULT_ROLE_PERMISSIONS, PERMISSIONS, hasPermission, normalizePermissions } from "@ledgerbyte/shared";

describe("sales invoice document delivery persistence contract", () => {
  const schema = readFileSync(resolve(__dirname, "../../prisma/schema.prisma"), "utf8");

  it("defines a dedicated sales invoice send permission", () => {
    expect(PERMISSIONS.salesInvoices.send).toBe("salesInvoices.send");
    expect(hasPermission({ permissions: normalizePermissions([PERMISSIONS.salesInvoices.send]) }, PERMISSIONS.salesInvoices.send)).toBe(true);
    expect(DEFAULT_ROLE_PERMISSIONS.Owner).toContain(PERMISSIONS.salesInvoices.send);
    expect(DEFAULT_ROLE_PERMISSIONS.Admin).toContain(PERMISSIONS.salesInvoices.send);
    expect(DEFAULT_ROLE_PERMISSIONS.Accountant).toContain(PERMISSIONS.salesInvoices.send);
    expect(DEFAULT_ROLE_PERMISSIONS.Sales).toContain(PERMISSIONS.salesInvoices.send);
    expect(DEFAULT_ROLE_PERMISSIONS.Viewer).not.toContain(PERMISSIONS.salesInvoices.send);
    expect(DEFAULT_ROLE_PERMISSIONS.Purchases).not.toContain(PERMISSIONS.salesInvoices.send);
  });

  it("stores tenant-scoped delivery source and idempotency metadata without PDF bytes", () => {
    expect(schema).toContain("salesInvoiceId");
    expect(schema).toContain("requestedById");
    expect(schema).toContain("idempotencyKeyHash");
    expect(schema).toContain("requestHash");
    expect(schema).toContain("@@unique([organizationId, idempotencyKeyHash])");
    expect(schema).not.toMatch(/emailDeliveryPdf|pdfBytes|attachmentContentBase64/i);
  });
});
