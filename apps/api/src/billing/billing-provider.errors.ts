export class BillingProviderDisabledError extends Error {
  constructor(message = "LedgerByte subscription billing provider execution is disabled.") {
    super(message);
    this.name = "BillingProviderDisabledError";
  }
}

export class BillingProviderValidationError extends Error {
  constructor(readonly code: "INVALID_WEBHOOK" | "UNSUPPORTED_EVENT" | "UNKNOWN_SUBSCRIPTION" | "LOCAL_ONLY", message: string) {
    super(message);
    this.name = "BillingProviderValidationError";
  }
}
