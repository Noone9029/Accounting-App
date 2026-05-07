import type { FlexibleZatcaPayload } from "./zatca-adapter.types";

interface ZatcaAdapterErrorOptions {
  responseCode: string;
  errorCode?: string;
  responsePayload?: FlexibleZatcaPayload;
  requestUrl?: string;
  httpStatus?: number;
}

export class ZatcaAdapterError extends Error {
  readonly responseCode: string;
  readonly errorCode?: string;
  readonly responsePayload: FlexibleZatcaPayload;
  readonly requestUrl?: string;
  readonly httpStatus?: number;

  constructor(message: string, options: ZatcaAdapterErrorOptions) {
    super(message);
    this.name = "ZatcaAdapterError";
    this.responseCode = options.responseCode;
    this.errorCode = options.errorCode ?? options.responseCode;
    this.responsePayload = options.responsePayload ?? { message };
    this.requestUrl = options.requestUrl;
    this.httpStatus = options.httpStatus;
  }
}

export function isZatcaAdapterError(error: unknown): error is ZatcaAdapterError {
  return error instanceof ZatcaAdapterError;
}

export function createRealNetworkDisabledError(operation: string): ZatcaAdapterError {
  const message =
    "Real ZATCA network calls are disabled. Set ZATCA_ADAPTER_MODE=sandbox, ZATCA_ENABLE_REAL_NETWORK=true, and ZATCA_SANDBOX_BASE_URL only after verifying official ZATCA sandbox endpoint and payload details.";

  return new ZatcaAdapterError(message, {
    responseCode: "REAL_NETWORK_DISABLED",
    errorCode: "REAL_NETWORK_DISABLED",
    responsePayload: { message, operation },
    httpStatus: 400,
  });
}

export function createOfficialEndpointNotConfiguredError(operation: string): ZatcaAdapterError {
  const message = `Real ZATCA sandbox call for ${operation} is not implemented because the official endpoint path and payload contract have not been verified.`;

  return new ZatcaAdapterError(message, {
    responseCode: "OFFICIAL_ENDPOINT_NOT_CONFIGURED",
    errorCode: "OFFICIAL_ENDPOINT_NOT_CONFIGURED",
    responsePayload: { message, operation },
    httpStatus: 501,
  });
}

export function createMockNotImplementedError(operation: string): ZatcaAdapterError {
  const message = `${operation} is not implemented in mock mode. No ZATCA network call was made.`;

  return new ZatcaAdapterError(message, {
    responseCode: "MOCK_NOT_IMPLEMENTED",
    errorCode: "MOCK_NOT_IMPLEMENTED",
    responsePayload: { message, operation, mode: "mock" },
    httpStatus: 501,
  });
}
