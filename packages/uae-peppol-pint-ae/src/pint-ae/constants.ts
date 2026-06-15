import type { UaePintAeDocumentInput, UaePintAeDocumentType, UaePintAePredefinedEndpointScenario, UaePintAeTransactionTypeFlag } from "./types";

export const UAE_PINT_AE_CUSTOMIZATION_ID = "urn:peppol:pint:billing-1@ae-1" as const;
export const UAE_PINT_AE_PROFILE_ID = "urn:peppol:bis:billing" as const;
export const UAE_ELECTRONIC_ADDRESS_SCHEME_ID = "0235" as const;

export const UAE_PINT_AE_READINESS_CUSTOMIZATION_ID = "urn:peppol:pint:ae:billing-1@ledgerbyte-readiness" as const;

export const UAE_PINT_AE_DOCUMENT_TYPE_CODES: Partial<Record<UaePintAeDocumentType, string>> = {
  "tax-invoice": "380",
  "commercial-invoice": "380",
  "credit-note": "381",
  "tax-credit-note": "381",
};

export const UAE_PINT_AE_PREDEFINED_ENDPOINT_VALUES: Record<UaePintAePredefinedEndpointScenario, string> = {
  "deemed-supply": "9900000097",
  "export-receiver-not-registered": "9900000099",
  "buyer-not-subject": "9900000098",
};

export const UAE_PINT_AE_TRANSACTION_TYPE_FLAG_VALUES: Partial<Record<UaePintAeTransactionTypeFlag, string>> = {
  "free-trade-zone": "10000000",
  "deemed-supply": "01000000",
  "profit-margin-scheme": "00100000",
  "summary-invoice": "00010000",
  "continuous-supply": "00001000",
  "agent-billing": "00000100",
  "e-commerce": "00000010",
  exports: "00000001",
};

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

export function isValidUaePintAePredefinedEndpointValue(value: string | null | undefined): boolean {
  return Object.values(UAE_PINT_AE_PREDEFINED_ENDPOINT_VALUES).includes(String(value ?? "").trim());
}

export function resolveUaePintAeEndpointId(input: { endpointId?: string | null; peppolParticipantId?: string | null; tin?: string | null }): string {
  return String(input.endpointId ?? input.peppolParticipantId ?? (isValidUaeTin(input.tin) ? deriveUaePintAeEndpointId(input.tin) : "")).trim();
}

export function resolveUaePintAeBuyerEndpointId(input: Pick<UaePintAeDocumentInput, "buyer" | "predefinedEndpointScenario">): string {
  return input.predefinedEndpointScenario ? UAE_PINT_AE_PREDEFINED_ENDPOINT_VALUES[input.predefinedEndpointScenario] : resolveUaePintAeEndpointId(input.buyer);
}

export function buildUaePintAeTransactionTypeFlagCode(flags: readonly UaePintAeTransactionTypeFlag[] | null | undefined): string {
  const positions = Array.from("00000000");
  for (const flag of flags ?? []) {
    const value = UAE_PINT_AE_TRANSACTION_TYPE_FLAG_VALUES[flag];
    if (!value) {
      continue;
    }
    for (let index = 0; index < value.length; index += 1) {
      if (value[index] === "1") {
        positions[index] = "1";
      }
    }
  }
  return positions.join("");
}

export function resolveUaePintAeTransactionTypeFlagCode(input: Pick<UaePintAeDocumentInput, "transactionTypeFlagCode" | "transactionTypeFlags">): string {
  const explicitCode = String(input.transactionTypeFlagCode ?? "").trim();
  return explicitCode || buildUaePintAeTransactionTypeFlagCode(input.transactionTypeFlags);
}
