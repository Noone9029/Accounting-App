import { truncateHash, zatcaInvoiceQrPath, zatcaInvoiceXmlPath, zatcaStatusLabel } from "./zatca";

describe("ZATCA helpers", () => {
  it("truncates long hashes", () => {
    expect(truncateHash("abcdefghijklmnopqrstuvwxyz", 4)).toBe("abcd...wxyz");
    expect(truncateHash(null)).toBe("-");
  });

  it("formats status labels", () => {
    expect(zatcaStatusLabel("XML_GENERATED")).toBe("XML GENERATED");
  });

  it("builds invoice XML and QR paths", () => {
    expect(zatcaInvoiceXmlPath("invoice-1")).toBe("/sales-invoices/invoice-1/zatca/xml");
    expect(zatcaInvoiceQrPath("invoice-1")).toBe("/sales-invoices/invoice-1/zatca/qr");
  });
});
