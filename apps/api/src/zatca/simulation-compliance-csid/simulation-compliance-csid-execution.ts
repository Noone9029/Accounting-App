import { EphemeralOtpOperation } from "../custody/ephemeral-otp";
import { SimulationComplianceCsidTransportError } from "./simulation-compliance-csid-transport";

export class SimulationComplianceCsidExecutionError extends Error {
  constructor(readonly code: "EXECUTION_PREFLIGHT_REQUIRED" | "UNCERTAIN_REQUIRES_FRESH_APPROVAL" | "EXECUTION_APPROVAL_EXPIRED") {
    super("Simulation compliance-CSID execution was rejected.");
    this.name = "SimulationComplianceCsidExecutionError";
  }
}

export async function executeSimulationComplianceCsidOnce<T>(input: {
  staticPreflight: { requestSequenceReady: boolean; officialContractComplete: boolean };
  consumeApproval: () => Promise<{ approvalRecordSha256: string; expiresAt: string }>;
  rerunStaticPreflight: () => Promise<{ requestSequenceReady: boolean; officialContractComplete: boolean }>;
  readOtp: () => Promise<Buffer>;
  executeRequest: (otp: Buffer) => Promise<T>;
  now?: () => Date;
}): Promise<{ result: T; approvalRecordSha256: string }> {
  if (!input.staticPreflight.requestSequenceReady || !input.staticPreflight.officialContractComplete) throw new SimulationComplianceCsidExecutionError("EXECUTION_PREFLIGHT_REQUIRED");
  const approval = await input.consumeApproval();
  const expiresAt = new Date(approval.expiresAt);
  if (!Number.isFinite(expiresAt.getTime()) || expiresAt.getTime() <= (input.now?.() ?? new Date()).getTime()) throw new SimulationComplianceCsidExecutionError("EXECUTION_APPROVAL_EXPIRED");
  const recheckedPreflight = await input.rerunStaticPreflight();
  if (!recheckedPreflight.requestSequenceReady || !recheckedPreflight.officialContractComplete) throw new SimulationComplianceCsidExecutionError("EXECUTION_PREFLIGHT_REQUIRED");
  const otp = new EphemeralOtpOperation({
    approvalPresent: true, preflightReady: true, interactiveInput: true, expiresAt,
    now: input.now, format: { digits: 6, officialEvidenceConfirmed: true }, reader: input.readOtp,
  });
  try {
    return { result: await otp.consume(input.executeRequest), approvalRecordSha256: approval.approvalRecordSha256 };
  } catch (error) {
    if (error instanceof SimulationComplianceCsidTransportError && error.uncertain) throw new SimulationComplianceCsidExecutionError("UNCERTAIN_REQUIRES_FRESH_APPROVAL");
    throw error;
  }
}
