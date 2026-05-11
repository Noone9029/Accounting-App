import {
  getZatcaProfileMissingFields,
  shouldShowZatcaRealNetworkWarning,
  shouldShowZatcaLocalOnlyWarning,
  truncateHash,
  zatcaAdapterModeLabel,
  zatcaChecklistRiskBadgeClass,
  zatcaChecklistStatusBadgeClass,
  zatcaEgsCsrDownloadPath,
  zatcaInvoiceClearancePath,
  zatcaInvoiceComplianceCheckPath,
  zatcaInvoiceQrPath,
  zatcaInvoiceReportingPath,
  zatcaInvoiceXmlValidationPath,
  zatcaInvoiceXmlPath,
  zatcaReadinessLabel,
  zatcaStatusLabel,
  zatcaXmlValidationLabel,
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
    expect(zatcaInvoiceXmlValidationPath("invoice-1")).toBe("/sales-invoices/invoice-1/zatca/xml-validation");
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

  it("formats checklist badges and readiness labels", () => {
    expect(zatcaChecklistStatusBadgeClass("DONE_LOCAL")).toContain("emerald");
    expect(zatcaChecklistStatusBadgeClass("NOT_STARTED")).toContain("rose");
    expect(zatcaChecklistRiskBadgeClass("CRITICAL")).toContain("rose");
    expect(zatcaChecklistRiskBadgeClass("HIGH")).toContain("amber");
    expect(zatcaReadinessLabel(true)).toBe("Ready locally");
    expect(zatcaReadinessLabel(false)).toBe("Blocked");
  });

  it("formats local XML validation labels and warnings", () => {
    expect(zatcaXmlValidationLabel(true)).toBe("Valid locally");
    expect(zatcaXmlValidationLabel(false)).toBe("Invalid locally");
    expect(zatcaXmlValidationLabel(null)).toBe("Not checked");
    expect(shouldShowZatcaLocalOnlyWarning(null)).toBe(true);
    expect(shouldShowZatcaLocalOnlyWarning({ localOnly: true, officialValidation: false })).toBe(true);
    expect(shouldShowZatcaLocalOnlyWarning({ localOnly: false, officialValidation: true })).toBe(false);
  });
});
