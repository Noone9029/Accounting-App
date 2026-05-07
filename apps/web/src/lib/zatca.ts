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

export function zatcaInvoiceQrPath(invoiceId: string): string {
  return `/sales-invoices/${encodeURIComponent(invoiceId)}/zatca/qr`;
}

export function zatcaEgsCsrDownloadPath(egsUnitId: string): string {
  return `/zatca/egs-units/${encodeURIComponent(egsUnitId)}/csr/download`;
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
