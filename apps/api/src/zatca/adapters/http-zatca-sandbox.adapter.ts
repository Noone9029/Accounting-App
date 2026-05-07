import { Inject, Injectable } from "@nestjs/common";
import { isZatcaRealNetworkAllowed, type ZatcaAdapterConfig, ZATCA_ADAPTER_CONFIG } from "../zatca.config";
import {
  type ClearanceInput,
  type ComplianceCheckInput,
  type ComplianceCsidResult,
  type RequestComplianceCsidInput,
  type RequestProductionCsidInput,
  type ReportingInput,
  type ZatcaAdapterResult,
  type ZatcaOnboardingAdapter,
} from "./zatca-onboarding.adapter";
import { createOfficialEndpointNotConfiguredError, createRealNetworkDisabledError, ZatcaAdapterError } from "./zatca-adapter.error";
import type {
  FlexibleZatcaPayload,
  ProductionCsidResult,
  ZatcaClearanceResponse,
  ZatcaComplianceCheckResponse,
  ZatcaComplianceCsidResponse,
  ZatcaReportingResponse,
} from "./zatca-adapter.types";

@Injectable()
export class HttpZatcaSandboxAdapter implements ZatcaOnboardingAdapter {
  constructor(@Inject(ZATCA_ADAPTER_CONFIG) private readonly config: ZatcaAdapterConfig) {}

  async requestComplianceCsid(input: RequestComplianceCsidInput): Promise<ComplianceCsidResult> {
    const result = await this.safeZatcaRequest<ZatcaComplianceCsidResponse>("requestComplianceCsid", input.request.endpointPath, input.request);
    const complianceCsidPem = typeof result.responsePayload.complianceCsidPem === "string" ? result.responsePayload.complianceCsidPem : "";
    const certificateRequestId = typeof result.responsePayload.certificateRequestId === "string" ? result.responsePayload.certificateRequestId : "";

    if (!complianceCsidPem || !certificateRequestId) {
      throw new ZatcaAdapterError("Sandbox compliance CSID response mapping is incomplete. Verify official ZATCA response fields before enabling this flow.", {
        responseCode: "OFFICIAL_RESPONSE_UNMAPPED",
        errorCode: "OFFICIAL_RESPONSE_UNMAPPED",
        responsePayload: result.responsePayload,
        requestUrl: result.requestUrl,
        httpStatus: 501,
      });
    }

    return { ...result, complianceCsidPem, certificateRequestId };
  }

  async requestProductionCsid(_input: RequestProductionCsidInput): Promise<ProductionCsidResult> {
    throw new ZatcaAdapterError("Production CSID request is not implemented in the sandbox scaffold. No production ZATCA call was made.", {
      responseCode: "PRODUCTION_CSID_NOT_IMPLEMENTED",
      errorCode: "PRODUCTION_CSID_NOT_IMPLEMENTED",
      responsePayload: {
        message: "Production CSID request is not implemented in the sandbox scaffold. No production ZATCA call was made.",
      },
      httpStatus: 501,
    });
  }

  submitComplianceCheck(input: ComplianceCheckInput): Promise<ZatcaAdapterResult<ZatcaComplianceCheckResponse>> {
    return this.safeZatcaRequest<ZatcaComplianceCheckResponse>("submitComplianceCheck", input.request.endpointPath, input.request);
  }

  submitClearance(input: ClearanceInput): Promise<ZatcaAdapterResult<ZatcaClearanceResponse>> {
    return this.safeZatcaRequest<ZatcaClearanceResponse>("submitClearance", input.request.endpointPath, input.request);
  }

  submitReporting(input: ReportingInput): Promise<ZatcaAdapterResult<ZatcaReportingResponse>> {
    return this.safeZatcaRequest<ZatcaReportingResponse>("submitReporting", input.request.endpointPath, input.request);
  }

  private async safeZatcaRequest<TResponse extends FlexibleZatcaPayload>(
    operation: string,
    endpointPath: string | undefined,
    payload: FlexibleZatcaPayload,
  ): Promise<ZatcaAdapterResult<TResponse>> {
    if (!isZatcaRealNetworkAllowed(this.config)) {
      throw createRealNetworkDisabledError(operation);
    }

    if (!endpointPath?.trim()) {
      throw createOfficialEndpointNotConfiguredError(operation);
    }

    const requestUrl = new URL(endpointPath, ensureTrailingSlash(this.config.sandboxBaseUrl!)).toString();
    const response = await fetch(requestUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(stripInternalFields(payload)),
    });

    const text = await response.text();
    const parsedPayload = parseJsonObject(text);
    const responseCode = readResponseCode(parsedPayload) ?? `HTTP_${response.status}`;

    if (!response.ok) {
      throw new ZatcaAdapterError(`ZATCA sandbox request for ${operation} failed with HTTP ${response.status}.`, {
        responseCode,
        errorCode: responseCode,
        responsePayload: parsedPayload,
        requestUrl,
        httpStatus: response.status,
      });
    }

    return {
      requestUrl,
      responseCode,
      responsePayload: parsedPayload as TResponse,
      httpStatus: response.status,
    };
  }
}

function ensureTrailingSlash(value: string): string {
  return value.endsWith("/") ? value : `${value}/`;
}

function stripInternalFields(payload: FlexibleZatcaPayload): FlexibleZatcaPayload {
  const { endpointPath: _endpointPath, ...networkPayload } = payload;
  return networkPayload;
}

function parseJsonObject(text: string): FlexibleZatcaPayload {
  if (!text) {
    return {};
  }

  try {
    const parsed = JSON.parse(text) as unknown;
    return typeof parsed === "object" && parsed !== null ? (parsed as FlexibleZatcaPayload) : { raw: parsed };
  } catch {
    return { raw: text };
  }
}

function readResponseCode(payload: FlexibleZatcaPayload): string | undefined {
  const code = payload.responseCode ?? payload.statusCode ?? payload.code;
  return typeof code === "string" && code.trim() ? code : undefined;
}
