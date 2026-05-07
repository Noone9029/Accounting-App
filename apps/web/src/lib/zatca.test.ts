import { getZatcaProfileMissingFields, truncateHash, zatcaEgsCsrDownloadPath, zatcaInvoiceQrPath, zatcaInvoiceXmlPath, zatcaStatusLabel } from "./zatca";

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
    expect(zatcaEgsCsrDownloadPath("egs-1")).toBe("/zatca/egs-units/egs-1/csr/download");
  });

  it("detects profile readiness fields", () => {
    expect(getZatcaProfileMissingFields({ sellerName: "", vatNumber: "300", city: null, countryCode: "SA" })).toEqual(["sellerName", "city"]);
    expect(getZatcaProfileMissingFields({ sellerName: "Seller", vatNumber: "300", city: "Riyadh", countryCode: "SA" })).toEqual([]);
  });
});
