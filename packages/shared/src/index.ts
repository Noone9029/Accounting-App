export type CurrencyCode = "SAR" | "AED" | "BHD" | "KWD" | "OMR" | "QAR" | "USD" | "EUR";

export interface TenantScoped {
  organizationId: string;
}

export interface ApiErrorShape {
  code: string;
  message: string;
  details?: unknown;
}

export const DEFAULT_BASE_CURRENCY: CurrencyCode = "SAR";

export * from "./permissions.js";
export * from "./zatca-readiness.js";
