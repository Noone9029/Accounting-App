import { Injectable } from "@nestjs/common";
import { isZatcaRealNetworkAllowed, type ZatcaAdapterConfig } from "../zatca.config";
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
import { createOfficialContractUnconfirmedError, createRealNetworkDisabledError } from "./zatca-adapter.error";
import type { ProductionCsidResult, ZatcaClearanceResponse, ZatcaComplianceCheckResponse, ZatcaReportingResponse } from "./zatca-adapter.types";

/**
 * Reserved for a later, separately approved official-sandbox contract.
 *
 * It intentionally performs no DNS lookup, credential read, socket connection,
 * HTTP request, retry, or response parsing. The official host and endpoint
 * contract are not currently source-verified, so an implementation would be
 * unsafe even when legacy environment flags are present.
 */
@Injectable()
export class FutureOfficialZatcaSandboxAdapter implements ZatcaOnboardingAdapter {
  constructor(
    private readonly config: ZatcaAdapterConfig,
    private readonly credentialReadBoundary: () => unknown = () => undefined,
  ) {}

  async requestComplianceCsid(_input: RequestComplianceCsidInput): Promise<ComplianceCsidResult> {
    return this.reject("requestComplianceCsid");
  }

  async requestProductionCsid(_input: RequestProductionCsidInput): Promise<ProductionCsidResult> {
    return this.reject("requestProductionCsid");
  }

  async submitComplianceCheck(_input: ComplianceCheckInput): Promise<ZatcaAdapterResult<ZatcaComplianceCheckResponse>> {
    return this.reject("submitComplianceCheck");
  }

  async submitClearance(_input: ClearanceInput): Promise<ZatcaAdapterResult<ZatcaClearanceResponse>> {
    return this.reject("submitClearance");
  }

  async submitReporting(_input: ReportingInput): Promise<ZatcaAdapterResult<ZatcaReportingResponse>> {
    return this.reject("submitReporting");
  }

  private reject(operation: string): never {
    // Keep this branch before the credential boundary: disabled execution must
    // never cause credential material to be resolved as a side effect.
    if (!isZatcaRealNetworkAllowed(this.config)) {
      throw createRealNetworkDisabledError(operation);
    }

    void this.credentialReadBoundary;
    throw createOfficialContractUnconfirmedError(operation);
  }
}
