import type { ZatcaAdapterConfig } from "../zatca.config";
import { FutureOfficialZatcaSandboxAdapter } from "./future-official-zatca-sandbox.adapter";
import type {
  ClearanceInput,
  ComplianceCheckInput,
  RequestComplianceCsidInput,
  RequestProductionCsidInput,
  ReportingInput,
} from "./zatca-onboarding.adapter";

/** @deprecated Use FutureOfficialZatcaSandboxAdapter. No HTTP is performed. */
export class HttpZatcaSandboxAdapter extends FutureOfficialZatcaSandboxAdapter {
  constructor(config: ZatcaAdapterConfig) {
    super(config);
  }

  requestComplianceCsid(input: RequestComplianceCsidInput) {
    return super.requestComplianceCsid(input);
  }

  requestProductionCsid(input: RequestProductionCsidInput) {
    return super.requestProductionCsid(input);
  }

  submitComplianceCheck(input: ComplianceCheckInput) {
    return super.submitComplianceCheck(input);
  }

  submitClearance(input: ClearanceInput) {
    return super.submitClearance(input);
  }

  submitReporting(input: ReportingInput) {
    return super.submitReporting(input);
  }
}
