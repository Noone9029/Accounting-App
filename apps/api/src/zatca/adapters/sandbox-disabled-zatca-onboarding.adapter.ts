import { Injectable } from "@nestjs/common";
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
import { createRealNetworkDisabledError } from "./zatca-adapter.error";
import type { ProductionCsidResult, ZatcaClearanceResponse, ZatcaComplianceCheckResponse, ZatcaReportingResponse } from "./zatca-adapter.types";

@Injectable()
export class SandboxDisabledZatcaOnboardingAdapter implements ZatcaOnboardingAdapter {
  async requestComplianceCsid(_input: RequestComplianceCsidInput): Promise<ComplianceCsidResult> {
    throw createRealNetworkDisabledError("requestComplianceCsid");
  }

  async requestProductionCsid(_input: RequestProductionCsidInput): Promise<ProductionCsidResult> {
    throw createRealNetworkDisabledError("requestProductionCsid");
  }

  async submitComplianceCheck(_input: ComplianceCheckInput): Promise<ZatcaAdapterResult<ZatcaComplianceCheckResponse>> {
    throw createRealNetworkDisabledError("submitComplianceCheck");
  }

  async submitClearance(_input: ClearanceInput): Promise<ZatcaAdapterResult<ZatcaClearanceResponse>> {
    throw createRealNetworkDisabledError("submitClearance");
  }

  async submitReporting(_input: ReportingInput): Promise<ZatcaAdapterResult<ZatcaReportingResponse>> {
    throw createRealNetworkDisabledError("submitReporting");
  }
}
