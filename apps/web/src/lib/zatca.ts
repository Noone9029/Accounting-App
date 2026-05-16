import type { Contact, ZatcaReadinessCheck, ZatcaReadinessSection, ZatcaReadinessStatus } from "@/lib/types";

export function truncateHash(value: string | null | undefined, size = 12): string {
  if (!value) {
    return "-";
  }
  return value.length <= size * 2 ? value : `${value.slice(0, size)}...${value.slice(-size)}`;
}

export function zatcaStatusLabel(value: string | null | undefined): string {
  return value ? value.replaceAll("_", " ") : "NOT SUBMITTED";
}

export function zatcaInvoiceXmlPath(invoiceId: string): string {
  return `/sales-invoices/${encodeURIComponent(invoiceId)}/zatca/xml`;
}

export function zatcaInvoiceXmlValidationPath(invoiceId: string): string {
  return `/sales-invoices/${encodeURIComponent(invoiceId)}/zatca/xml-validation`;
}

export function zatcaInvoiceReadinessPath(invoiceId: string): string {
  return `/sales-invoices/${encodeURIComponent(invoiceId)}/zatca/readiness`;
}

export function zatcaInvoiceSigningPlanPath(invoiceId: string): string {
  return `/sales-invoices/${encodeURIComponent(invoiceId)}/zatca/signing-plan`;
}

export function zatcaInvoiceQrPath(invoiceId: string): string {
  return `/sales-invoices/${encodeURIComponent(invoiceId)}/zatca/qr`;
}

export function zatcaInvoiceComplianceCheckPath(invoiceId: string): string {
  return `/sales-invoices/${encodeURIComponent(invoiceId)}/zatca/compliance-check`;
}

export function zatcaInvoiceClearancePath(invoiceId: string): string {
  return `/sales-invoices/${encodeURIComponent(invoiceId)}/zatca/clearance`;
}

export function zatcaInvoiceReportingPath(invoiceId: string): string {
  return `/sales-invoices/${encodeURIComponent(invoiceId)}/zatca/reporting`;
}

export function zatcaSdkReadinessPath(): string {
  return "/zatca-sdk/readiness";
}

export function zatcaSdkValidateXmlDryRunPath(): string {
  return "/zatca-sdk/validate-xml-dry-run";
}

export function zatcaSdkValidateXmlLocalPath(): string {
  return "/zatca-sdk/validate-xml-local";
}

export function zatcaSdkValidateReferenceFixturePath(): string {
  return "/zatca-sdk/validate-reference-fixture";
}

export function zatcaInvoiceSdkValidatePath(invoiceId: string): string {
  return `/sales-invoices/${encodeURIComponent(invoiceId)}/zatca/sdk-validate`;
}

export function zatcaInvoiceHashComparePath(invoiceId: string): string {
  return `/sales-invoices/${encodeURIComponent(invoiceId)}/zatca/hash-compare`;
}

export function zatcaHashChainResetPlanPath(): string {
  return "/zatca/hash-chain-reset-plan";
}

export function zatcaEgsSdkHashModeEnablePath(egsUnitId: string): string {
  return `/zatca/egs-units/${encodeURIComponent(egsUnitId)}/enable-sdk-hash-mode`;
}

export function zatcaEgsCsrDownloadPath(egsUnitId: string): string {
  return `/zatca/egs-units/${encodeURIComponent(egsUnitId)}/csr/download`;
}

export function zatcaEgsCsrPlanPath(egsUnitId: string): string {
  return `/zatca/egs-units/${encodeURIComponent(egsUnitId)}/csr-plan`;
}

export function zatcaEgsCsrFieldsPath(egsUnitId: string): string {
  return `/zatca/egs-units/${encodeURIComponent(egsUnitId)}/csr-fields`;
}

export type ZatcaAdapterMode = "mock" | "sandbox-disabled" | "sandbox";

export interface ZatcaAdapterConfigSummary {
  mode: ZatcaAdapterMode;
  realNetworkEnabled: boolean;
  sandboxBaseUrlConfigured: boolean;
  simulationBaseUrlConfigured: boolean;
  productionBaseUrlConfigured: boolean;
  effectiveRealNetworkEnabled: boolean;
  invalidMode?: string;
}

export function zatcaAdapterModeLabel(mode: ZatcaAdapterMode | string | null | undefined): string {
  if (mode === "sandbox-disabled") {
    return "Sandbox disabled";
  }
  if (mode === "sandbox") {
    return "Sandbox scaffold";
  }
  return "Mock";
}

export function zatcaChecklistStatusBadgeClass(status: string): string {
  if (status === "DONE_LOCAL") {
    return "bg-emerald-50 text-emerald-700";
  }
  if (status === "MOCK_ONLY" || status === "SKELETON") {
    return "bg-amber-50 text-amber-700";
  }
  if (status === "NOT_STARTED") {
    return "bg-rose-50 text-rosewood";
  }
  return "bg-slate-100 text-slate-700";
}

export function zatcaChecklistRiskBadgeClass(riskLevel: string): string {
  if (riskLevel === "CRITICAL") {
    return "bg-rose-50 text-rosewood";
  }
  if (riskLevel === "HIGH") {
    return "bg-amber-50 text-amber-700";
  }
  if (riskLevel === "MEDIUM") {
    return "bg-sky-50 text-sky-700";
  }
  return "bg-slate-100 text-slate-700";
}

export function zatcaXmlValidationLabel(valid: boolean | null | undefined): string {
  if (valid === true) {
    return "Valid locally";
  }
  if (valid === false) {
    return "Invalid locally";
  }
  return "Not checked";
}

export function shouldShowZatcaLocalOnlyWarning(result: { localOnly?: boolean; officialValidation?: boolean } | null | undefined): boolean {
  return !result || result.localOnly === true || result.officialValidation !== true;
}

export function zatcaReadinessLabel(value: boolean): string {
  return value ? "Ready locally" : "Blocked";
}

export function zatcaReadinessStatusLabel(status: ZatcaReadinessStatus | null | undefined): string {
  if (status === "READY") {
    return "Ready";
  }
  if (status === "WARNINGS") {
    return "Warnings";
  }
  return "Blocked";
}

export function zatcaReadinessStatusBadgeClass(status: ZatcaReadinessStatus | null | undefined): string {
  if (status === "READY") {
    return "bg-emerald-50 text-emerald-700";
  }
  if (status === "WARNINGS") {
    return "bg-amber-50 text-amber-700";
  }
  return "bg-rose-50 text-rosewood";
}

export function shouldShowZatcaRealNetworkWarning(config: Pick<ZatcaAdapterConfigSummary, "effectiveRealNetworkEnabled"> | null | undefined): boolean {
  return !config?.effectiveRealNetworkEnabled;
}

export function zatcaSdkReadinessLabel(value: boolean): string {
  return value ? "Found" : "Missing";
}

export function zatcaSdkCanAttemptLabel(value: boolean): string {
  return value ? "Dry-run ready" : "Blocked";
}

export function zatcaSdkExecutionLabel(value: boolean): string {
  return value ? "Enabled locally" : "Disabled";
}

export function zatcaSdkValidationResultLabel(result: { disabled?: boolean; success?: boolean } | null | undefined): string {
  if (!result) {
    return "Not run";
  }
  if (result.disabled) {
    return "Disabled";
  }
  return result.success ? "Passed" : "Failed";
}

export function zatcaHashModeLabel(value: string | null | undefined): string {
  if (value === "SDK_GENERATED") {
    return "SDK generated";
  }
  return "Local deterministic";
}

export function zatcaHashComparisonLabel(value: string | null | undefined): string {
  if (value === "MATCH") {
    return "Match";
  }
  if (value === "MISMATCH") {
    return "Mismatch";
  }
  if (value === "BLOCKED") {
    return "Blocked";
  }
  return "Not available";
}

export function shouldShowZatcaHashMismatchWarning(result: { hashComparisonStatus?: string | null } | null | undefined): boolean {
  return result?.hashComparisonStatus === "MISMATCH";
}

export function zatcaResetPlanWarningLabel(dryRunOnly: boolean): string {
  return dryRunOnly ? "This is a dry run; no ZATCA hash-chain metadata is reset." : "Reset execution is not implemented.";
}

export function canEnableZatcaSdkHashMode(unit: { canEnableSdkHashMode?: boolean; enableSdkHashModeBlockers?: string[] | null } | null | undefined): boolean {
  return Boolean(unit?.canEnableSdkHashMode && (unit.enableSdkHashModeBlockers?.length ?? 0) === 0);
}

export function zatcaSdkHashModeEnableBlockerLabel(blockers: string[] | null | undefined): string {
  return blockers?.length ? blockers.join("; ") : "No blockers";
}

export function shouldShowZatcaSdkLocalOnlyWarning(result: { localOnly?: boolean; officialValidationAttempted?: boolean } | null | undefined): boolean {
  return !result || result.localOnly === true || result.officialValidationAttempted !== true;
}

export function shouldShowZatcaSdkWarning(readiness: { warnings?: string[]; canAttemptSdkValidation?: boolean } | null | undefined): boolean {
  return !readiness || !readiness.canAttemptSdkValidation || (readiness.warnings?.length ?? 0) > 0;
}

export function getZatcaProfileMissingFields(profile: {
  sellerName?: string | null;
  vatNumber?: string | null;
  city?: string | null;
  countryCode?: string | null;
}): string[] {
  return [
    ["sellerName", profile.sellerName],
    ["vatNumber", profile.vatNumber],
    ["city", profile.city],
    ["countryCode", profile.countryCode],
  ]
    .filter(([, value]) => !String(value ?? "").trim())
    .map(([field]) => String(field));
}

export function buildContactBuyerAddressReadiness(contact: Pick<Contact, "addressLine1" | "buildingNumber" | "district" | "city" | "postalCode" | "countryCode" | "taxNumber">): ZatcaReadinessSection {
  const checks: ZatcaReadinessCheck[] = [];
  const countryCode = contact.countryCode?.trim().toUpperCase() || "SA";
  const isSaudiBuyer = countryCode === "SA";

  if (!isSaudiBuyer) {
    checks.push({
      code: "ZATCA_BUYER_NON_SA_ADDRESS_CONTEXT",
      severity: "INFO",
      field: "buyer.countryCode",
      message: "This contact is not marked as a Saudi buyer; Saudi buyer postal-address checks are invoice-specific.",
      sourceRule: "BR-KSA-10",
      fixHint: "Review the generated invoice readiness when this buyer is used on a standard invoice.",
    });
    return createFrontendReadinessSection("BUYER_CONTACT", checks);
  }

  addFrontendRequiredCheck(checks, contact.addressLine1, {
    code: "ZATCA_BUYER_STREET_MISSING",
    field: "buyer.addressLine1",
    message: "Buyer street name is required for a clean Saudi standard invoice postal address.",
    sourceRule: "BR-KSA-63",
    fixHint: "Add the buyer street name on the contact address.",
  });
  addFrontendRequiredCheck(checks, contact.buildingNumber, {
    code: "ZATCA_BUYER_BUILDING_NUMBER_MISSING",
    field: "buyer.buildingNumber",
    message: "Buyer building number is required for a clean Saudi standard invoice postal address.",
    sourceRule: "BR-KSA-63",
    fixHint: "Add the real buyer building number. Saudi national-address building numbers are usually 4 digits.",
  });
  addFrontendRequiredCheck(checks, contact.district, {
    code: "ZATCA_BUYER_DISTRICT_MISSING",
    field: "buyer.district",
    message: "Buyer district is required for a clean Saudi standard invoice postal address.",
    sourceRule: "BR-KSA-63",
    fixHint: "Add the buyer district on the contact address.",
  });
  addFrontendRequiredCheck(checks, contact.city, {
    code: "ZATCA_BUYER_CITY_MISSING",
    field: "buyer.city",
    message: "Buyer city is required for a clean Saudi standard invoice postal address.",
    sourceRule: "BR-KSA-63",
    fixHint: "Add the buyer city on the contact address.",
  });
  addFrontendRequiredCheck(checks, contact.postalCode, {
    code: "ZATCA_BUYER_POSTAL_CODE_MISSING",
    field: "buyer.postalCode",
    message: "Buyer postal code is required for a clean Saudi standard invoice postal address.",
    sourceRule: "BR-KSA-63",
    fixHint: "Add the buyer postal code on the contact address.",
  });
  addFrontendRequiredCheck(checks, contact.countryCode, {
    code: "ZATCA_BUYER_COUNTRY_CODE_MISSING",
    field: "buyer.countryCode",
    message: "Buyer country code is required for a clean Saudi standard invoice postal address.",
    sourceRule: "BR-KSA-63",
    fixHint: "Set the buyer country code to SA for Saudi buyers.",
  });

  const postalCode = contact.postalCode?.trim() ?? "";
  if (postalCode && !/^[0-9]{5}$/.test(postalCode)) {
    checks.push({
      code: "ZATCA_BUYER_POSTAL_CODE_INVALID",
      severity: "WARNING",
      field: "buyer.postalCode",
      message: "Saudi buyer postal code should be 5 digits for clean SDK validation.",
      sourceRule: "BR-KSA-67",
      fixHint: "Use the 5-digit Saudi postal code from the buyer national address.",
    });
  }

  const taxNumber = contact.taxNumber?.trim() ?? "";
  if (taxNumber && (!/^[0-9]{15}$/.test(taxNumber) || !taxNumber.startsWith("3") || !taxNumber.endsWith("3"))) {
    checks.push({
      code: "ZATCA_BUYER_VAT_NUMBER_INVALID",
      severity: "ERROR",
      field: "buyer.taxNumber",
      message: "Buyer VAT number, when provided, must be 15 digits and start/end with 3.",
      sourceRule: "BR-KSA-44",
      fixHint: "Use the buyer VAT number exactly as registered or leave it blank if not applicable.",
    });
  }

  return createFrontendReadinessSection("BUYER_CONTACT", checks);
}

function createFrontendReadinessSection(scope: ZatcaReadinessSection["scope"], checks: ZatcaReadinessCheck[]): ZatcaReadinessSection {
  return {
    scope,
    status: deriveFrontendReadinessStatus(checks),
    checks,
  };
}

function deriveFrontendReadinessStatus(checks: ZatcaReadinessCheck[]): ZatcaReadinessStatus {
  if (checks.some((check) => check.severity === "ERROR")) {
    return "BLOCKED";
  }
  if (checks.some((check) => check.severity === "WARNING")) {
    return "WARNINGS";
  }
  return "READY";
}

function addFrontendRequiredCheck(
  checks: ZatcaReadinessCheck[],
  value: string | null | undefined,
  check: Omit<ZatcaReadinessCheck, "severity">,
) {
  if (!String(value ?? "").trim()) {
    checks.push({ ...check, severity: "ERROR" });
  }
}
