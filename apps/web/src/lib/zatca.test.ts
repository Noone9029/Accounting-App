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
  zatcaSdkCanAttemptLabel,
  zatcaSdkReadinessLabel,
  zatcaSdkReadinessPath,
  zatcaSdkValidateXmlDryRunPath,
  zatcaSdkValidateXmlLocalPath,
  zatcaSdkValidateReferenceFixturePath,
  zatcaInvoiceSdkValidatePath,
  zatcaInvoiceHashComparePath,
  zatcaSdkExecutionLabel,
  zatcaSdkValidationResultLabel,
  zatcaHashComparisonLabel,
  zatcaHashModeLabel,
  shouldShowZatcaHashMismatchWarning,
  zatcaHashChainResetPlanPath,
  zatcaResetPlanWarningLabel,
  shouldShowZatcaSdkLocalOnlyWarning,
  zatcaStatusLabel,
  zatcaXmlValidationLabel,
  shouldShowZatcaSdkWarning,
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
    expect(zatcaSdkReadinessPath()).toBe("/zatca-sdk/readiness");
    expect(zatcaSdkValidateXmlDryRunPath()).toBe("/zatca-sdk/validate-xml-dry-run");
    expect(zatcaSdkValidateXmlLocalPath()).toBe("/zatca-sdk/validate-xml-local");
    expect(zatcaSdkValidateReferenceFixturePath()).toBe("/zatca-sdk/validate-reference-fixture");
    expect(zatcaInvoiceSdkValidatePath("invoice-1")).toBe("/sales-invoices/invoice-1/zatca/sdk-validate");
    expect(zatcaInvoiceHashComparePath("invoice-1")).toBe("/sales-invoices/invoice-1/zatca/hash-compare");
    expect(zatcaHashChainResetPlanPath()).toBe("/zatca/hash-chain-reset-plan");
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

  it("formats SDK readiness helpers", () => {
    expect(zatcaSdkReadinessLabel(true)).toBe("Found");
    expect(zatcaSdkReadinessLabel(false)).toBe("Missing");
    expect(zatcaSdkCanAttemptLabel(true)).toBe("Dry-run ready");
    expect(zatcaSdkCanAttemptLabel(false)).toBe("Blocked");
    expect(shouldShowZatcaSdkWarning(null)).toBe(true);
    expect(shouldShowZatcaSdkWarning({ canAttemptSdkValidation: true, warnings: [] })).toBe(false);
    expect(shouldShowZatcaSdkWarning({ canAttemptSdkValidation: true, warnings: ["Java version mismatch"] })).toBe(true);
  });

  it("formats local SDK execution and validation results", () => {
    expect(zatcaSdkExecutionLabel(false)).toBe("Disabled");
    expect(zatcaSdkExecutionLabel(true)).toBe("Enabled locally");
    expect(zatcaSdkValidationResultLabel(null)).toBe("Not run");
    expect(zatcaSdkValidationResultLabel({ disabled: true, success: false })).toBe("Disabled");
    expect(zatcaSdkValidationResultLabel({ disabled: false, success: true })).toBe("Passed");
    expect(zatcaSdkValidationResultLabel({ disabled: false, success: false })).toBe("Failed");
    expect(shouldShowZatcaSdkLocalOnlyWarning(null)).toBe(true);
    expect(shouldShowZatcaSdkLocalOnlyWarning({ localOnly: true, officialValidationAttempted: false })).toBe(true);
    expect(shouldShowZatcaSdkLocalOnlyWarning({ localOnly: true, officialValidationAttempted: true })).toBe(true);
  });

  it("formats hash mode and SDK hash comparison helpers", () => {
    expect(zatcaHashModeLabel("LOCAL_DETERMINISTIC")).toBe("Local deterministic");
    expect(zatcaHashModeLabel("SDK_GENERATED")).toBe("SDK generated");
    expect(zatcaHashModeLabel("unknown")).toBe("Local deterministic");
    expect(zatcaHashComparisonLabel("MATCH")).toBe("Match");
    expect(zatcaHashComparisonLabel("MISMATCH")).toBe("Mismatch");
    expect(zatcaHashComparisonLabel("BLOCKED")).toBe("Blocked");
    expect(zatcaHashComparisonLabel("NOT_AVAILABLE")).toBe("Not available");
    expect(shouldShowZatcaHashMismatchWarning({ hashComparisonStatus: "MISMATCH" })).toBe(true);
    expect(shouldShowZatcaHashMismatchWarning({ hashComparisonStatus: "MATCH" })).toBe(false);
    expect(zatcaResetPlanWarningLabel(true)).toContain("dry run");
  });
});
