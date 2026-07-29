import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { SandboxLocalDpapiComplianceCsidCustodyProvider } from "../custody/compliance-csid-secret-custody.provider";
import { readHiddenOtpFromTty, type SecureOtpTerminalInput, type SecureOtpTerminalOutput } from "../custody/ephemeral-otp-cli";
import {
  inspectZatcaSdkSimulationCsr,
  type ZatcaSdkCsrExpectedSubject,
} from "../custody/zatca-sdk-csr-inspector";
import { consumeOneShotSimulationApproval } from "./one-shot-simulation-approval";
import { buildSimulationComplianceCsidRequest } from "./simulation-compliance-csid-contract";
import { storeSimulationComplianceCredentialAtomically } from "./simulation-compliance-csid-custody";
import { executeSimulationComplianceCsidOnce } from "./simulation-compliance-csid-execution";
import { withParsedSimulationComplianceCsidResponse } from "./simulation-compliance-csid-response";
import { SimulationComplianceCsidHttpClient } from "./simulation-compliance-csid-transport";
import { isPlainRecord, parseStrictJson } from "./strict-json";

type PreflightResult = { requestSequenceReady: boolean; officialContractComplete: boolean; contractSha256: string; packetSha256: string; sandboxTargetVerified: boolean; executionBindingImplemented?: boolean; executionBindingReviewed?: boolean; oneShotApprovalBoundaryReady?: boolean; officialHttpsTransportReady?: boolean; complianceResponseParserReady?: boolean; complianceResponseCustodyReady?: boolean };

export class SimulationComplianceCsidCliError extends Error {
  constructor(readonly code: string) {
    super("Simulation compliance-CSID CLI invocation was rejected.");
    this.name = "SimulationComplianceCsidCliError";
  }
}

export interface SimulationComplianceCsidCliArguments {
  approvalFile: string;
  identityFile: string;
  custodyDirectory: string;
  executeOnce: true;
  stdinSecure: true;
  metadataJson: true;
}

interface SimulationIdentityMetadata {
  schemaVersion: 1;
  environment: "FATOORA_SIMULATION";
  identityReferenceId: string;
  organizationReference: string;
  egsReference: string;
  keyReferenceId: string;
  csrPath: string;
  csrSha256: string;
  publicKeyFingerprint: string;
  subject: ZatcaSdkCsrExpectedSubject;
  syntheticDataOnly: true;
  productionAllowed: false;
}

interface ImportedSimulationComplianceCsidContract {
  simulationBaseUrl: string;
  operation: { method: string; path: string };
  headers: { otp: { name: string }; acceptVersion: { name: string; value: string }; contentType: { name: string; value: string } };
  request: { field: string };
  response: { fields: string[] };
  otp: { digits: number; pattern: string };
}

export function parseSimulationComplianceCsidCliArguments(argv: readonly string[]): SimulationComplianceCsidCliArguments {
  const values = argv[0] === "--" ? argv.slice(1) : argv;
  const recognized = new Set(["--execute-once", "--approval-file", "--identity-file", "--custody-directory", "--stdin-secure", "--metadata-json"]);
  if (values.some((value) => !recognized.has(value) && !value.startsWith("/" ) && !/^[A-Za-z]:\\/u.test(value))) throw new SimulationComplianceCsidCliError("CLI_ARGUMENTS_REJECTED");
  const singleValue = (flag: string): string => {
    const index = values.indexOf(flag);
    if (index < 0 || values.indexOf(flag, index + 1) >= 0 || typeof values[index + 1] !== "string" || values[index + 1]!.startsWith("--")) throw new SimulationComplianceCsidCliError("CLI_ARGUMENTS_REJECTED");
    return values[index + 1]!;
  };
  if (values.filter((value) => value === "--execute-once").length !== 1 || values.filter((value) => value === "--stdin-secure").length !== 1 || values.filter((value) => value === "--metadata-json").length !== 1 || values.length !== 9) throw new SimulationComplianceCsidCliError("CLI_ARGUMENTS_REJECTED");
  const approvalFile = singleValue("--approval-file");
  const identityFile = singleValue("--identity-file");
  const custodyDirectory = singleValue("--custody-directory");
  if (![approvalFile, identityFile, custodyDirectory].every(isLocalAbsolutePath)) throw new SimulationComplianceCsidCliError("CLI_ARGUMENTS_REJECTED");
  return { executeOnce: true, stdinSecure: true, metadataJson: true, approvalFile, identityFile, custodyDirectory };
}

export async function runSimulationComplianceCsidCli(input: {
  argv: readonly string[];
  cwd: string;
  terminal: { input: SecureOtpTerminalInput; output: SecureOtpTerminalOutput };
  environment?: NodeJS.ProcessEnv;
}): Promise<Record<string, unknown>> {
  const args = parseSimulationComplianceCsidCliArguments(input.argv);
  const environment = input.environment ?? process.env;
  if (environment.ZATCA_ENABLE_REAL_NETWORK !== "true" || environment.ZATCA_SANDBOX_BASE_URL !== undefined || Object.keys(environment).some((key) => /(?:^|_)OTP(?:_|$)/iu.test(key))) throw new SimulationComplianceCsidCliError("CLI_NETWORK_GATE_REJECTED");
  const runtimeEnvironment = (environment.APP_ENV ?? environment.NODE_ENV ?? "").trim().toUpperCase();
  if (runtimeEnvironment.includes("PROD") || environment.ZATCA_PRODUCTION_BASE_URL !== undefined) throw new SimulationComplianceCsidCliError("CLI_ENVIRONMENT_REJECTED");
  const repositoryRoot = git(input.cwd, ["rev-parse", "--show-toplevel"]);
  const mainSha = git(repositoryRoot, ["rev-parse", "HEAD"]);
  if (mainSha !== git(repositoryRoot, ["rev-parse", "origin/main"]) || git(repositoryRoot, ["status", "--porcelain", "--untracked-files=all"]) !== "") throw new SimulationComplianceCsidCliError("CLI_CLEAN_MAIN_REQUIRED");
  const preflight = readPreflight(repositoryRoot);
  if (!preflight.requestSequenceReady || !preflight.officialContractComplete || !preflight.sandboxTargetVerified || !preflight.executionBindingImplemented || !preflight.executionBindingReviewed || !preflight.oneShotApprovalBoundaryReady || !preflight.officialHttpsTransportReady || !preflight.complianceResponseParserReady || !preflight.complianceResponseCustodyReady) throw new SimulationComplianceCsidCliError("CLI_PREFLIGHT_REJECTED");
  const identity = await readIdentity(args.identityFile, repositoryRoot);
  assertVerifiedOfficialContract(repositoryRoot);
  const contract = await readContract(repositoryRoot);
  const custody = new SandboxLocalDpapiComplianceCsidCustodyProvider({ environment: "LOCAL_TEST", storageDirectory: resolve(args.custodyDirectory) });
  const publicKey = await custody.deriveSpkiPublicKeyForOperation({ organizationId: identity.organizationReference, egsUnitId: identity.egsReference, referenceId: identity.keyReferenceId, environment: "SANDBOX" });
  let csr: Buffer | undefined;
  try {
    csr = await readCsr(identity, publicKey);
    const publicKeyFingerprint = createHash("sha256").update(publicKey).digest("hex");
    if (publicKeyFingerprint !== identity.publicKeyFingerprint) throw new SimulationComplianceCsidCliError("CLI_IDENTITY_KEY_MISMATCH");
    const client = new SimulationComplianceCsidHttpClient({ environment, reviewedSimulationBaseUrl: contract.simulationBaseUrl });
    client.assertPreflightPolicy();
    const execution = await executeSimulationComplianceCsidOnce({
      staticPreflight: preflight,
      consumeApproval: () => consumeOneShotSimulationApproval({ approvalFile: args.approvalFile, repositoryRoot, expected: { executionStage: "COMPLIANCE_CSID_ONBOARDING", mainSha, contractSha: preflight.contractSha256, packetSha: preflight.packetSha256, syntheticRunId: identity.identityReferenceId, organizationReference: identity.organizationReference, egsReference: identity.egsReference } }),
      rerunStaticPreflight: async () => readPreflight(repositoryRoot),
      readOtp: () => readHiddenOtpFromTty(input.terminal.input, input.terminal.output),
      executeRequest: async (otp) => {
        const plan = buildSimulationComplianceCsidRequest({ contract, csr: csr!, otp });
        try {
          const response = await client.requestComplianceCsidOnce(plan);
          if (response.status !== 200) {
            response.body.fill(0);
            throw new SimulationComplianceCsidCliError(classifyComplianceCsidStatus(response.status));
          }
          return await withParsedSimulationComplianceCsidResponse({ body: response.body, expectedPublicKeyFingerprint: identity.publicKeyFingerprint, requiredResponseFields: contract.response.fields }, async (material) => ({
            ...(await storeSimulationComplianceCredentialAtomically({ provider: custody, organizationId: identity.organizationReference, egsUnitId: identity.egsReference, requestId: material.requestId, certificate: material.certificate, secret: material.secret, certificateMetadata: material.certificateMetadata, requestHash: response.requestSha256, responseHash: response.responseSha256 })),
            status: "SIMULATION_COMPLIANCE_CSID_STORED", requestCount: 1, networkCallsMade: 1,
          }));
        } finally { plan.body.fill(0); }
      },
    });
    return { ...execution.result, approvalRecordSha256: execution.approvalRecordSha256 };
  } catch (error) {
    if (error instanceof SimulationComplianceCsidCliError) throw error;
    const code = error instanceof Error && "code" in error && typeof error.code === "string" && /^[A-Z][A-Z0-9_]{2,127}$/u.test(error.code) ? error.code : "CLI_EXECUTION_REJECTED";
    throw new SimulationComplianceCsidCliError(code);
  } finally {
    publicKey.fill(0);
    csr?.fill(0);
  }
}

export function classifyComplianceCsidStatus(status: number): string {
  if (status === 400) return "CSID_RESPONSE_REQUEST_REJECTED";
  if (status === 401) return "CSID_RESPONSE_AUTHENTICATION_REJECTED";
  if (status === 406) return "CSID_RESPONSE_NOT_ACCEPTABLE";
  if (status === 409 || status === 208) return "CSID_RESPONSE_DUPLICATE_REJECTED";
  if (status === 422) return "CSID_RESPONSE_BUSINESS_REJECTED";
  if (status === 429) return "CSID_RESPONSE_RATE_LIMIT_REJECTED";
  if (status === 500 || status === 503 || status === 504) return "CSID_RESPONSE_SERVER_REJECTED";
  return "CSID_RESPONSE_UNEXPECTED_STATUS";
}

function readPreflight(cwd: string): PreflightResult { const module = require("../../../../../scripts/zatca-sandbox-execution-preflight.cjs") as { buildSandboxExecutionPreflight: (input: Record<string, unknown>) => PreflightResult }; return module.buildSandboxExecutionPreflight({ cwd, executionStage: "COMPLIANCE_CSID_ONBOARDING", noNetwork: true }); }
function git(cwd: string, args: string[]): string { try { return execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim(); } catch { throw new SimulationComplianceCsidCliError("CLI_CLEAN_MAIN_REQUIRED"); } }

async function readIdentity(file: string, repositoryRoot: string): Promise<SimulationIdentityMetadata> {
  const path = resolve(file);
  if (!isLocalAbsolutePath(file) || isInside(path, repositoryRoot)) throw new SimulationComplianceCsidCliError("CLI_IDENTITY_PATH_REJECTED");
  let raw: Buffer | undefined;
  try {
    raw = await readFile(path);
    const value = parseStrictJson(raw);
    if (!isPlainRecord(value)) throw new SimulationComplianceCsidCliError("CLI_IDENTITY_INVALID");
    const identity = value as unknown as SimulationIdentityMetadata;
    if (identity.schemaVersion !== 1 || identity.environment !== "FATOORA_SIMULATION" || identity.syntheticDataOnly !== true || identity.productionAllowed !== false || !identity.identityReferenceId.startsWith("synthetic-") || !identity.organizationReference.startsWith("synthetic-") || !identity.egsReference.startsWith("synthetic-") || !identity.keyReferenceId.startsWith("simulation-signing-key-") || !/^[a-f0-9]{64}$/iu.test(identity.csrSha256) || !/^[a-f0-9]{64}$/iu.test(identity.publicKeyFingerprint) || !isExpectedSubject(identity.subject)) throw new SimulationComplianceCsidCliError("CLI_IDENTITY_INVALID");
    if (!isLocalAbsolutePath(identity.csrPath) || isInside(resolve(identity.csrPath), repositoryRoot)) throw new SimulationComplianceCsidCliError("CLI_IDENTITY_PATH_REJECTED");
    return identity;
  } catch (error) { if (error instanceof SimulationComplianceCsidCliError) throw error; throw new SimulationComplianceCsidCliError("CLI_IDENTITY_INVALID"); } finally { raw?.fill(0); }
}

async function readCsr(identity: SimulationIdentityMetadata, expectedPublicKeySpkiDer: Buffer): Promise<Buffer> {
  let raw: Buffer | undefined;
  let csrDer: Buffer | undefined;
  try {
    raw = await readFile(resolve(identity.csrPath));
    const base64 = raw.toString("ascii").trim();
    if (!isCanonicalBase64(base64)) throw new SimulationComplianceCsidCliError("CLI_CSR_INVALID");
    csrDer = Buffer.from(base64, "base64");
    if (!csrDer.length || createHash("sha256").update(csrDer).digest("hex") !== identity.csrSha256) throw new SimulationComplianceCsidCliError("CLI_CSR_INVALID");
    const inspection = inspectZatcaSdkSimulationCsr({
      csrDer,
      expectedSubject: identity.subject,
      expectedPublicKeySpkiDer,
    });
    if (!inspection.valid) throw new SimulationComplianceCsidCliError("CLI_CSR_INVALID");
    return Buffer.from(base64, "ascii");
  } catch (error) {
    if (error instanceof SimulationComplianceCsidCliError) throw error;
    throw new SimulationComplianceCsidCliError("CLI_CSR_INVALID");
  } finally {
    raw?.fill(0);
    csrDer?.fill(0);
  }
}

async function readContract(cwd: string): Promise<ImportedSimulationComplianceCsidContract> {
  const raw = await readFile(resolve(cwd, "docs/zatca/evidence/arc-07b/official-sandbox-contracts.json"));
  try {
    const value = parseStrictJson(raw);
    if (!isPlainRecord(value)) throw new SimulationComplianceCsidCliError("CLI_CONTRACT_INVALID");
    const contract = recordAt(value, ["contract"]);
    return {
      simulationBaseUrl: stringAt(contract, ["environments", "simulation", "value", "baseUrl"]),
      operation: { method: stringAt(contract, ["operations", "complianceCsid", "value", "method"]), path: stringAt(contract, ["operations", "complianceCsid", "value", "path"]) },
      headers: {
        otp: { name: stringAt(contract, ["headers", "otp", "value", "name"]) },
        acceptVersion: { name: stringAt(contract, ["headers", "acceptVersion", "value", "name"]), value: stringAt(contract, ["headers", "acceptVersion", "value", "value"]) },
        contentType: { name: stringAt(contract, ["headers", "contentType", "value", "name"]), value: stringAt(contract, ["headers", "contentType", "value", "value"]) },
      },
      request: { field: stringAt(contract, ["requestFields", "complianceCsid", "value", "fields", "0"]) },
      response: { fields: stringArrayAt(contract, ["responseFields", "certificateIssue", "value", "fields"]) },
      otp: { digits: numberAt(contract, ["otp", "format", "value", "length"]), pattern: stringAt(contract, ["otp", "format", "value", "pattern"]) },
    };
  } catch (error) {
    if (error instanceof SimulationComplianceCsidCliError) throw error;
    throw new SimulationComplianceCsidCliError("CLI_CONTRACT_INVALID");
  } finally { raw.fill(0); }
}

function assertVerifiedOfficialContract(cwd: string): void {
  const validator = require("../../../../../scripts/zatca-official-sandbox-contracts.cjs") as { validateOfficialSandboxContracts: (input: { cwd: string }) => { officialContractComplete: boolean; contractDigestVerified: boolean } };
  const result = validator.validateOfficialSandboxContracts({ cwd });
  if (!result.officialContractComplete || !result.contractDigestVerified) throw new SimulationComplianceCsidCliError("CLI_CONTRACT_INVALID");
}

function recordAt(value: Record<string, unknown>, path: readonly string[]): Record<string, unknown> {
  const current = valueAt(value, path);
  if (!isPlainRecord(current)) throw new SimulationComplianceCsidCliError("CLI_CONTRACT_INVALID");
  return current;
}
function valueAt(value: Record<string, unknown>, path: readonly string[]): unknown {
  let current: unknown = value;
  for (const key of path) {
    if (Array.isArray(current)) {
      if (!/^\d+$/u.test(key)) throw new SimulationComplianceCsidCliError("CLI_CONTRACT_INVALID");
      current = current[Number(key)];
    } else if (isPlainRecord(current)) {
      current = current[key];
    } else {
      throw new SimulationComplianceCsidCliError("CLI_CONTRACT_INVALID");
    }
  }
  return current;
}
function stringAt(value: Record<string, unknown>, path: readonly string[]): string { const result = valueAt(value, path); if (typeof result !== "string" || !result) throw new SimulationComplianceCsidCliError("CLI_CONTRACT_INVALID"); return result; }
function numberAt(value: Record<string, unknown>, path: readonly string[]): number { const result = valueAt(value, path); if (typeof result !== "number" || !Number.isSafeInteger(result)) throw new SimulationComplianceCsidCliError("CLI_CONTRACT_INVALID"); return result; }
function stringArrayAt(value: Record<string, unknown>, path: readonly string[]): string[] { const result = valueAt(value, path); if (!Array.isArray(result) || result.some((entry) => typeof entry !== "string")) throw new SimulationComplianceCsidCliError("CLI_CONTRACT_INVALID"); return [...result]; }
function isInside(candidate: string, parent: string): boolean { const value = require("node:path").relative(parent, candidate) as string; return value === "" || (!value.startsWith("..") && !value.includes("..\\") && !value.includes("../")); }
function isLocalAbsolutePath(value: string): boolean {
  return /^(?:[A-Za-z]:[\\/]|\/)(?!\/)/u.test(value) && !/^(?:\\\\|\/\/)/u.test(value);
}
function isExpectedSubject(value: unknown): value is ZatcaSdkCsrExpectedSubject {
  if (!isPlainRecord(value)) return false;
  const fields: ReadonlyArray<keyof ZatcaSdkCsrExpectedSubject> = ["commonName", "serialNumber", "organizationIdentifier", "organizationalUnitName", "organizationName", "countryName", "invoiceType", "locationAddress", "businessCategory"];
  return Object.keys(value).length === fields.length && fields.every((field) => {
    const fieldValue = value[field];
    if (typeof fieldValue !== "string" || fieldValue.trim() === "" || /[\r\n\u0000]/u.test(fieldValue)) return false;
    if (field === "countryName") return fieldValue === "SA";
    if (field === "invoiceType") return /^[01]{4}$/u.test(fieldValue);
    return /synthetic|riyadh|sa/iu.test(fieldValue);
  });
}
function isCanonicalBase64(value: string): boolean {
  if (!/^[A-Za-z0-9+/]+={0,2}$/u.test(value) || value.length % 4 !== 0) return false;
  const decoded = Buffer.from(value, "base64");
  try { return decoded.length > 0 && decoded.toString("base64") === value; } finally { decoded.fill(0); }
}
