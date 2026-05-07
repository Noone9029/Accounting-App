import {
  getZatcaProfileMissingFields,
  shouldShowZatcaRealNetworkWarning,
  truncateHash,
  zatcaAdapterModeLabel,
  zatcaEgsCsrDownloadPath,
  zatcaInvoiceClearancePath,
  zatcaInvoiceComplianceCheckPath,
  zatcaInvoiceQrPath,
  zatcaInvoiceReportingPath,
  zatcaInvoiceXmlPath,
  zatcaStatusLabel,
} from "./zatca";

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
    expect(zatcaInvoiceComplianceCheckPath("invoice-1")).toBe("/sales-invoices/invoice-1/zatca/compliance-check");
    expect(zatcaInvoiceClearancePath("invoice-1")).toBe("/sales-invoices/invoice-1/zatca/clearance");
    expect(zatcaInvoiceReportingPath("invoice-1")).toBe("/sales-invoices/invoice-1/zatca/reporting");
    expect(zatcaEgsCsrDownloadPath("egs-1")).toBe("/zatca/egs-units/egs-1/csr/download");
  });

  it("formats adapter mode and warning state", () => {
    expect(zatcaAdapterModeLabel("mock")).toBe("Mock");
    expect(zatcaAdapterModeLabel("sandbox-disabled")).toBe("Sandbox disabled");
    expect(zatcaAdapterModeLabel("sandbox")).toBe("Sandbox scaffold");
    expect(shouldShowZatcaRealNetworkWarning(null)).toBe(true);
    expect(shouldShowZatcaRealNetworkWarning({ effectiveRealNetworkEnabled: false })).toBe(true);
    expect(shouldShowZatcaRealNetworkWarning({ effectiveRealNetworkEnabled: true })).toBe(false);
  });

  it("detects profile readiness fields", () => {
    expect(getZatcaProfileMissingFields({ sellerName: "", vatNumber: "300", city: null, countryCode: "SA" })).toEqual(["sellerName", "city"]);
    expect(getZatcaProfileMissingFields({ sellerName: "Seller", vatNumber: "300", city: "Riyadh", countryCode: "SA" })).toEqual([]);
  });
});
