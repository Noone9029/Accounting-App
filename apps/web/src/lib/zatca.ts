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

export function zatcaEgsCsrDownloadPath(egsUnitId: string): string {
  return `/zatca/egs-units/${encodeURIComponent(egsUnitId)}/csr/download`;
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

export function shouldShowZatcaRealNetworkWarning(config: Pick<ZatcaAdapterConfigSummary, "effectiveRealNetworkEnabled"> | null | undefined): boolean {
  return !config?.effectiveRealNetworkEnabled;
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
