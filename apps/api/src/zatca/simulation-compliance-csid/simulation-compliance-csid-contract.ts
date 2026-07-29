import { createHash } from "node:crypto";

const REVIEWED_SIMULATION_BASE_URL = "https://gw-fatoora.zatca.gov.sa/e-invoicing/simulation";

export class SimulationComplianceCsidContractError extends Error {
  constructor(readonly code: string) {
    super("Simulation compliance-CSID contract was rejected.");
    this.name = "SimulationComplianceCsidContractError";
  }
}

export interface SimulationComplianceCsidRequestPlan {
  url: string;
  method: "POST";
  headers: Record<string, string>;
  body: Buffer;
  requestSha256: string;
}

export function buildSimulationComplianceCsidRequest(input: { contract: unknown; csr: Buffer; otp: Buffer }): SimulationComplianceCsidRequestPlan {
  const contract = readContract(input.contract);
  if (!Buffer.isBuffer(input.csr) || !Buffer.isBuffer(input.otp)) throw new SimulationComplianceCsidContractError("CONTRACT_REQUEST_INPUT_REJECTED");
  const csr = input.csr.toString("ascii");
  if (!isCanonicalBase64(csr) || input.csr.length > 128 * 1024 || !new RegExp(contract.otp.pattern, "u").test(input.otp.toString("ascii"))) throw new SimulationComplianceCsidContractError("CONTRACT_REQUEST_INPUT_REJECTED");
  const base = safeUrl(contract.simulationBaseUrl);
  if (base.toString().replace(/\/$/u, "") !== REVIEWED_SIMULATION_BASE_URL || base.protocol !== "https:" || base.username || base.password || base.port || base.search || base.hash || /\/(?:core|developer-portal)(?:\/|$)/u.test(base.pathname)) throw new SimulationComplianceCsidContractError("CONTRACT_TARGET_REJECTED");
  if (contract.operation.method !== "POST" || !/^\/[A-Za-z0-9/_-]+$/u.test(contract.operation.path) || /(?:^|\/)(?:core|developer-portal)(?:\/|$)/u.test(contract.operation.path)) throw new SimulationComplianceCsidContractError("CONTRACT_OPERATION_REJECTED");
  const url = safeUrl(`${base.pathname.replace(/\/$/u, "")}${contract.operation.path}`, base.origin);
  const body = Buffer.from(JSON.stringify({ [contract.request.field]: csr }), "utf8");
  const headers = {
    [contract.headers.otp.name]: input.otp.toString("ascii"),
    [contract.headers.acceptVersion.name]: contract.headers.acceptVersion.value,
    [contract.headers.contentType.name]: contract.headers.contentType.value,
    "Accept-Encoding": "identity",
  };
  return { url: url.toString(), method: "POST", headers, body, requestSha256: createHash("sha256").update(body).digest("hex") };
}

function readContract(value: unknown): { simulationBaseUrl: string; operation: { method: string; path: string }; headers: { otp: { name: string }; acceptVersion: { name: string; value: string }; contentType: { name: string; value: string } }; request: { field: string }; response: { fields: string[] }; otp: { digits: number; pattern: string } } {
  if (!isRecord(value)) throw new SimulationComplianceCsidContractError("CONTRACT_METADATA_INCOMPLETE");
  const operation = record(value.operation);
  const headers = record(value.headers);
  const otp = record(value.otp);
  const response = record(value.response);
  const request = record(value.request);
  const otpHeader = record(headers.otp);
  const acceptVersion = record(headers.acceptVersion);
  const contentType = record(headers.contentType);
  const fields = response.fields;
  if (typeof value.simulationBaseUrl !== "string" || operation.method !== "POST" || typeof operation.path !== "string" || typeof otpHeader.name !== "string" || typeof acceptVersion.name !== "string" || typeof acceptVersion.value !== "string" || typeof contentType.name !== "string" || contentType.value !== "application/json" || request.field !== "csr" || !Array.isArray(fields) || fields.length !== 4 || !["requestID", "dispositionMessage", "binarySecurityToken", "secret"].every((field) => fields.includes(field)) || otp.digits !== 6 || otp.pattern !== "^[0-9]{6}$") throw new SimulationComplianceCsidContractError("CONTRACT_METADATA_INCOMPLETE");
  return value as unknown as { simulationBaseUrl: string; operation: { method: string; path: string }; headers: { otp: { name: string }; acceptVersion: { name: string; value: string }; contentType: { name: string; value: string } }; request: { field: string }; response: { fields: string[] }; otp: { digits: number; pattern: string } };
}

function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
function record(value: unknown): Record<string, unknown> { if (!isRecord(value)) throw new SimulationComplianceCsidContractError("CONTRACT_METADATA_INCOMPLETE"); return value; }
function isCanonicalBase64(value: string): boolean {
  if (!/^[A-Za-z0-9+/]+={0,2}$/u.test(value) || value.length % 4 !== 0) return false;
  const decoded = Buffer.from(value, "base64");
  try { return decoded.length > 0 && decoded.toString("base64") === value; } finally { decoded.fill(0); }
}
function safeUrl(value: string, base?: string): URL {
  try { return new URL(value, base); } catch { throw new SimulationComplianceCsidContractError("CONTRACT_TARGET_REJECTED"); }
}
