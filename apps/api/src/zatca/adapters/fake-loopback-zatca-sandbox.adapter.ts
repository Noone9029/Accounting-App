import type {
  ClearanceInput,
  ComplianceCheckInput,
  ComplianceCsidResult,
  ProductionCsidResult,
  ReportingInput,
  RequestComplianceCsidInput,
  RequestProductionCsidInput,
  ZatcaAdapterResult,
  ZatcaClearanceResponse,
  ZatcaComplianceCheckResponse,
  ZatcaOnboardingAdapter,
  ZatcaReportingResponse,
} from "./zatca-onboarding.adapter";

/**
 * Test-only adapter seam for the ARC-07B loopback simulator. It delegates to a
 * supplied in-process handler and never derives a network target.
 */
export class FakeLoopbackZatcaSandboxAdapter implements ZatcaOnboardingAdapter {
  readonly calls: string[] = [];

  constructor(private readonly loopbackHandler: ZatcaOnboardingAdapter) {}

  async requestComplianceCsid(input: RequestComplianceCsidInput): Promise<ComplianceCsidResult> {
    this.calls.push("requestComplianceCsid");
    return this.loopbackHandler.requestComplianceCsid(input);
  }

  async requestProductionCsid(input: RequestProductionCsidInput): Promise<ProductionCsidResult> {
    this.calls.push("requestProductionCsid");
    return this.loopbackHandler.requestProductionCsid(input);
  }

  async submitComplianceCheck(input: ComplianceCheckInput): Promise<ZatcaAdapterResult<ZatcaComplianceCheckResponse>> {
    this.calls.push("submitComplianceCheck");
    return this.loopbackHandler.submitComplianceCheck(input);
  }

  async submitClearance(input: ClearanceInput): Promise<ZatcaAdapterResult<ZatcaClearanceResponse>> {
    this.calls.push("submitClearance");
    return this.loopbackHandler.submitClearance(input);
  }

  async submitReporting(input: ReportingInput): Promise<ZatcaAdapterResult<ZatcaReportingResponse>> {
    this.calls.push("submitReporting");
    return this.loopbackHandler.submitReporting(input);
  }
}
