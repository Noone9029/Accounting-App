import type { UaePintAeDocumentType, UaePintAePredefinedEndpointScenario } from "./types";

export const UAE_PINT_AE_CUSTOMIZATION_ID = "urn:peppol:pint:billing-1@ae-1" as const;
export const UAE_PINT_AE_PROFILE_ID = "urn:peppol:bis:billing" as const;
export const UAE_ELECTRONIC_ADDRESS_SCHEME_ID = "0235" as const;

export const UAE_PINT_AE_READINESS_CUSTOMIZATION_ID = "urn:peppol:pint:ae:billing-1@ledgerbyte-readiness" as const;

export const UAE_PINT_AE_DOCUMENT_TYPE_CODES: Partial<Record<UaePintAeDocumentType, string>> = {
  "tax-invoice": "380",
  "credit-note": "381",
  "tax-credit-note": "381",
};

// TODO(source-required): encode these only after current official UAE/OpenPeppol values are present in repo evidence.
export const UAE_PINT_AE_PREDEFINED_ENDPOINT_VALUES: Partial<Record<UaePintAePredefinedEndpointScenario, string>> = {};

// TODO(source-required): encode these only after current official UAE/OpenPeppol transaction flag mappings are present in repo evidence.
export const UAE_PINT_AE_TRANSACTION_TYPE_FLAG_VALUES: Partial<Record<string, string>> = {};

export function normalizeUaeDigits(value: string | null | undefined): string {
  return String(value ?? "").replace(/\D/g, "");
}

export function deriveUaePintAeEndpointId(tin: string | null | undefined): string {
  const normalized = normalizeUaeDigits(tin);
  if (!/^\d{10}$/.test(normalized)) {
    throw new Error("UAE TIN must be exactly 10 digits to derive a PINT-AE endpoint identifier.");
  }
  return `${UAE_ELECTRONIC_ADDRESS_SCHEME_ID}${normalized}`;
}

export function isValidUaeTin(value: string | null | undefined): boolean {
  return /^\d{10}$/.test(normalizeUaeDigits(value));
}

export function isValidUaeTrn(value: string | null | undefined): boolean {
  return /^\d{15}$/.test(normalizeUaeDigits(value));
}

export function isValidUaePintAeEndpointId(value: string | null | undefined): boolean {
  return /^0235\d{10}$/.test(String(value ?? "").trim());
}

export function resolveUaePintAeEndpointId(input: { endpointId?: string | null; peppolParticipantId?: string | null; tin?: string | null }): string {
  return String(input.endpointId ?? input.peppolParticipantId ?? (isValidUaeTin(input.tin) ? deriveUaePintAeEndpointId(input.tin) : "")).trim();
}
