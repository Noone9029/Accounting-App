import { createHash, randomUUID } from "node:crypto";
import { lstat, open, readFile, rename, unlink } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { isPlainRecord, parseStrictJson, StrictJsonError } from "./strict-json";

export const APPROVAL_PHRASE = "APPROVE ZATCA SANDBOX NETWORK EXECUTION FOR SYNTHETIC DATA ONLY";

export type OneShotSimulationApprovalErrorCode =
  | "APPROVAL_RECORD_UNAVAILABLE"
  | "APPROVAL_RECORD_NOT_EXTERNAL"
  | "APPROVAL_RECORD_INVALID"
  | "APPROVAL_RECORD_EXPIRED"
  | "APPROVAL_RECORD_REPLAYED"
  | "APPROVAL_RECORD_BINDING_MISMATCH"
  | "APPROVAL_RECORD_SCOPE_REJECTED"
  | "APPROVAL_RECORD_REQUEST_BUDGET_REJECTED";

export class OneShotSimulationApprovalError extends Error {
  constructor(readonly code: OneShotSimulationApprovalErrorCode) {
    super("One-shot owner approval was rejected.");
    this.name = "OneShotSimulationApprovalError";
  }
}

export interface OneShotSimulationApprovalExpected {
  executionStage: "COMPLIANCE_CSID_ONBOARDING";
  mainSha: string;
  contractSha: string;
  packetSha: string;
  syntheticRunId: string;
  organizationReference: string;
  egsReference: string;
  now?: Date;
}

export interface ConsumedOneShotSimulationApproval {
  approvalRecordSha256: string;
  expiresAt: string;
}

interface ApprovalRecord {
  schemaVersion: 1;
  approvalPhrase: string;
  executionStage: string;
  currentMainSha: string;
  contractSha256: string;
  packetSha256: string;
  syntheticRunId: string;
  syntheticOrganizationReference: string;
  syntheticEgsReference: string;
  maximumRequestCount: number;
  simulationOnly: boolean;
  customerDataAllowed: boolean;
  productionAllowed: boolean;
  issuedAt: string;
  expiresAt: string;
  oneShotNonce: string;
}

export async function consumeOneShotSimulationApproval(input: {
  approvalFile: string;
  repositoryRoot: string;
  expected: OneShotSimulationApprovalExpected;
}): Promise<ConsumedOneShotSimulationApproval> {
  const approvalFile = resolve(input.approvalFile);
  if (isInside(approvalFile, resolve(input.repositoryRoot))) {
    throw new OneShotSimulationApprovalError("APPROVAL_RECORD_NOT_EXTERNAL");
  }
  let consumedPath: string | undefined;
  let raw: Buffer | undefined;
  try {
    const parentDetails = await lstat(dirname(approvalFile));
    if (!parentDetails.isDirectory() || parentDetails.isSymbolicLink()) {
      throw new OneShotSimulationApprovalError("APPROVAL_RECORD_NOT_EXTERNAL");
    }
    const details = await lstat(approvalFile);
    if (!details.isFile() || details.isSymbolicLink() || details.size < 1 || details.size > 16 * 1024) {
      throw new OneShotSimulationApprovalError("APPROVAL_RECORD_INVALID");
    }
    consumedPath = `${approvalFile}.consumed-${randomUUID()}`;
    await rename(approvalFile, consumedPath);
    raw = await readFile(consumedPath);
    const record = parseApprovalRecord(raw);
    assertApprovalRecord(record, input.expected);
    await consumeNonceTombstone(dirname(approvalFile), record.oneShotNonce);
    return {
      approvalRecordSha256: createHash("sha256").update(raw).digest("hex"),
      expiresAt: record.expiresAt,
    };
  } catch (error) {
    if (error instanceof OneShotSimulationApprovalError) throw error;
    if (error instanceof StrictJsonError) throw new OneShotSimulationApprovalError("APPROVAL_RECORD_INVALID");
    throw new OneShotSimulationApprovalError("APPROVAL_RECORD_UNAVAILABLE");
  } finally {
    raw?.fill(0);
    if (consumedPath) await unlink(consumedPath).catch(() => undefined);
  }
}

async function consumeNonceTombstone(directory: string, nonce: string): Promise<void> {
  const nonceDigest = createHash("sha256").update(nonce, "utf8").digest("hex");
  const marker = resolve(directory, `.ledgerbyte-zatca-consumed-nonce-${nonceDigest}`);
  let handle: Awaited<ReturnType<typeof open>> | undefined;
  try {
    handle = await open(marker, "wx", 0o600);
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === "EEXIST") throw new OneShotSimulationApprovalError("APPROVAL_RECORD_REPLAYED");
    throw new OneShotSimulationApprovalError("APPROVAL_RECORD_UNAVAILABLE");
  } finally {
    await handle?.close().catch(() => undefined);
  }
}

function parseApprovalRecord(raw: Buffer): ApprovalRecord {
  const value = parseStrictJson(raw);
  if (!isPlainRecord(value)) throw new OneShotSimulationApprovalError("APPROVAL_RECORD_INVALID");
  const keys = ["schemaVersion", "approvalPhrase", "executionStage", "currentMainSha", "contractSha256", "packetSha256", "syntheticRunId", "syntheticOrganizationReference", "syntheticEgsReference", "maximumRequestCount", "simulationOnly", "customerDataAllowed", "productionAllowed", "issuedAt", "expiresAt", "oneShotNonce"];
  if (Object.keys(value).length !== keys.length || keys.some((key) => !(key in value))) throw new OneShotSimulationApprovalError("APPROVAL_RECORD_INVALID");
  return value as unknown as ApprovalRecord;
}

function assertApprovalRecord(record: ApprovalRecord, expected: OneShotSimulationApprovalExpected): void {
  if (record.schemaVersion !== 1 || record.approvalPhrase !== APPROVAL_PHRASE || record.executionStage !== expected.executionStage) throw new OneShotSimulationApprovalError("APPROVAL_RECORD_INVALID");
  if (![record.currentMainSha, record.contractSha256, record.packetSha256].every((value) => /^[a-f0-9]{40,64}$/iu.test(value))) throw new OneShotSimulationApprovalError("APPROVAL_RECORD_INVALID");
  if (record.currentMainSha !== expected.mainSha || record.contractSha256 !== expected.contractSha || record.packetSha256 !== expected.packetSha || record.syntheticRunId !== expected.syntheticRunId || record.syntheticOrganizationReference !== expected.organizationReference || record.syntheticEgsReference !== expected.egsReference) throw new OneShotSimulationApprovalError("APPROVAL_RECORD_BINDING_MISMATCH");
  if (record.maximumRequestCount !== 1) throw new OneShotSimulationApprovalError("APPROVAL_RECORD_REQUEST_BUDGET_REJECTED");
  if (!record.simulationOnly || record.customerDataAllowed || record.productionAllowed) throw new OneShotSimulationApprovalError("APPROVAL_RECORD_SCOPE_REJECTED");
  const issuedAt = Date.parse(record.issuedAt);
  const expiresAt = Date.parse(record.expiresAt);
  if (!Number.isFinite(issuedAt) || !Number.isFinite(expiresAt) || expiresAt <= issuedAt) throw new OneShotSimulationApprovalError("APPROVAL_RECORD_INVALID");
  if (expiresAt <= (expected.now ?? new Date()).getTime()) throw new OneShotSimulationApprovalError("APPROVAL_RECORD_EXPIRED");
  if (!/^[A-Za-z0-9_-]{16,128}$/u.test(record.oneShotNonce)) throw new OneShotSimulationApprovalError("APPROVAL_RECORD_INVALID");
}

function isInside(candidate: string, parent: string): boolean {
  const value = relative(parent, candidate);
  return value === "" || (!value.startsWith("..") && !value.includes(`..${dirname("x").slice(-1)}`));
}
