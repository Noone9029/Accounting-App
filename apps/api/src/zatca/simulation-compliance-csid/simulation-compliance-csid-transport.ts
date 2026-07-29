import { createHash } from "node:crypto";
import { lookup } from "node:dns/promises";
import * as https from "node:https";
import type { ClientRequest } from "node:http";
import { isIP } from "node:net";
import type { SimulationComplianceCsidRequestPlan } from "./simulation-compliance-csid-contract";

const MAX_RESPONSE_BYTES = 64 * 1024;
const MAX_REQUEST_BYTES = 128 * 1024;
const DNS_TIMEOUT_MS = 5_000;
const REVIEWED_SIMULATION_BASE_URL = "https://gw-fatoora.zatca.gov.sa/e-invoicing/simulation";
const PROXY_KEYS = ["HTTP_PROXY", "HTTPS_PROXY", "ALL_PROXY", "http_proxy", "https_proxy", "all_proxy"] as const;

export class SimulationComplianceCsidTransportError extends Error {
  constructor(readonly code: string, readonly uncertain = false) {
    super("Simulation compliance-CSID transport was rejected.");
    this.name = "SimulationComplianceCsidTransportError";
  }
}

export type SimulationComplianceCsidSendOutcome =
  | { status: number; headers: Record<string, string | string[] | undefined>; body: Buffer }
  | { error: "TIMEOUT_BEFORE_CONNECTION" | "RESET_AFTER_REQUEST" | "CONNECTION_FAILED" | "RESPONSE_TOO_LARGE"; mayHaveReachedServer: boolean };

export interface SimulationComplianceCsidTransportResult {
  status: number;
  headers: Record<string, string | string[] | undefined>;
  body: Buffer;
  requestSha256: string;
  responseSha256: string;
  bytesSent: number;
  bytesReceived: number;
  durationMs: number;
  mayHaveReachedServer: true;
}

export class SimulationComplianceCsidHttpClient {
  private attempted = false;
  private readonly send: (plan: SimulationComplianceCsidRequestPlan, approvedAddresses: readonly string[]) => Promise<SimulationComplianceCsidSendOutcome>;
  private readonly resolve: (hostname: string) => Promise<readonly string[]>;
  private readonly environment: NodeJS.ProcessEnv;
  private readonly reviewedSimulationBaseUrl: string;

  constructor(options: {
    reviewedSimulationBaseUrl: string;
    send?: (plan: SimulationComplianceCsidRequestPlan, approvedAddresses: readonly string[]) => Promise<SimulationComplianceCsidSendOutcome>;
    resolve?: (hostname: string) => Promise<readonly string[]>;
    environment?: NodeJS.ProcessEnv;
  }) {
    this.send = options.send ?? sendOfficialHttpsRequest;
    this.resolve = options.resolve ?? resolveOfficialHostname;
    this.environment = options.environment ?? process.env;
    this.reviewedSimulationBaseUrl = options.reviewedSimulationBaseUrl;
  }

  assertPreflightPolicy(): void {
    this.assertProxyFree();
    const reviewed = this.safeUrl(this.reviewedSimulationBaseUrl);
    if (reviewed.toString().replace(/\/$/u, "") !== REVIEWED_SIMULATION_BASE_URL || reviewed.protocol !== "https:" || reviewed.username || reviewed.password || reviewed.port || reviewed.search || reviewed.hash || reviewed.pathname !== "/e-invoicing/simulation" || !reviewed.hostname) throw new SimulationComplianceCsidTransportError("TRANSPORT_TARGET_REJECTED");
  }

  async requestComplianceCsidOnce(plan: SimulationComplianceCsidRequestPlan): Promise<SimulationComplianceCsidTransportResult> {
    if (this.attempted) throw new SimulationComplianceCsidTransportError("TRANSPORT_REQUEST_ALREADY_ATTEMPTED");
    this.assertPreflightPolicy();
    const target = this.assertOfficialTarget(plan);
    const addresses = await resolveWithTimeout(this.resolve(target.hostname)).catch(() => { throw new SimulationComplianceCsidTransportError("TRANSPORT_DNS_REJECTED"); });
    if (!addresses.length || addresses.some((address) => !isPublicAddress(address))) throw new SimulationComplianceCsidTransportError("TRANSPORT_DNS_REJECTED");
    this.attempted = true;
    const startedAt = Date.now();
    let outcome: SimulationComplianceCsidSendOutcome | undefined;
    try {
      outcome = await this.send(plan, addresses);
      if ("error" in outcome) {
        if (outcome.error === "RESPONSE_TOO_LARGE") throw new SimulationComplianceCsidTransportError("TRANSPORT_RESPONSE_TOO_LARGE");
        if (outcome.mayHaveReachedServer) throw new SimulationComplianceCsidTransportError("UNCERTAIN_REQUIRES_FRESH_APPROVAL", true);
        throw new SimulationComplianceCsidTransportError(outcome.error === "TIMEOUT_BEFORE_CONNECTION" ? "TRANSPORT_TIMEOUT" : "TRANSPORT_CONNECTION_REJECTED");
      }
      if (outcome.status >= 300 && outcome.status < 400) throw new SimulationComplianceCsidTransportError("TRANSPORT_REDIRECT_REJECTED");
      const contentType = headerValue(outcome.headers, "content-type");
      if (!contentType?.toLowerCase().startsWith("application/json")) throw new SimulationComplianceCsidTransportError("TRANSPORT_CONTENT_TYPE_REJECTED");
      if (outcome.body.length > MAX_RESPONSE_BYTES) throw new SimulationComplianceCsidTransportError("TRANSPORT_RESPONSE_TOO_LARGE");
      const body = Buffer.from(outcome.body);
      return {
        status: outcome.status,
        headers: outcome.headers,
        body,
        requestSha256: plan.requestSha256,
        responseSha256: createHash("sha256").update(body).digest("hex"),
        bytesSent: plan.body.length,
        bytesReceived: body.length,
        durationMs: Math.max(0, Date.now() - startedAt),
        mayHaveReachedServer: true,
      };
    } finally {
      if (outcome && "body" in outcome) outcome.body.fill(0);
    }
  }

  private assertProxyFree(): void {
    if (PROXY_KEYS.some((key) => Boolean(this.environment[key]?.trim()))) throw new SimulationComplianceCsidTransportError("TRANSPORT_PROXY_ENV_REJECTED");
  }

  private assertOfficialTarget(plan: SimulationComplianceCsidRequestPlan): URL {
    const url = this.safeUrl(plan.url);
    const reviewed = this.safeUrl(this.reviewedSimulationBaseUrl);
    const expectedPath = `${reviewed.pathname.replace(/\/$/u, "")}/compliance`;
    if (!Buffer.isBuffer(plan.body) || plan.body.length < 1 || plan.body.length > MAX_REQUEST_BYTES || !/^[a-f0-9]{64}$/iu.test(plan.requestSha256) || createHash("sha256").update(plan.body).digest("hex") !== plan.requestSha256 || reviewed.toString().replace(/\/$/u, "") !== REVIEWED_SIMULATION_BASE_URL || reviewed.protocol !== "https:" || reviewed.username || reviewed.password || reviewed.port || reviewed.search || reviewed.hash || url.protocol !== "https:" || url.username || url.password || url.port || url.search || url.hash || !url.hostname || url.hostname !== reviewed.hostname || url.pathname !== expectedPath || /(?:^|\/)(?:core|developer-portal)(?:\/|$)/u.test(url.pathname)) throw new SimulationComplianceCsidTransportError("TRANSPORT_TARGET_REJECTED");
    return url;
  }

  private safeUrl(value: string): URL {
    try {
      return new URL(value);
    } catch {
      throw new SimulationComplianceCsidTransportError("TRANSPORT_TARGET_REJECTED");
    }
  }
}

async function resolveWithTimeout(resolveAddresses: Promise<readonly string[]>): Promise<readonly string[]> {
  let timeout: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      resolveAddresses,
      new Promise<never>((_resolve, reject) => {
        timeout = setTimeout(() => reject(new Error("DNS_TIMEOUT")), DNS_TIMEOUT_MS);
        timeout.unref();
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

async function resolveOfficialHostname(hostname: string): Promise<readonly string[]> {
  const records = await lookup(hostname, { all: true, verbatim: true });
  return records.map((record) => record.address);
}

function sendOfficialHttpsRequest(plan: SimulationComplianceCsidRequestPlan, approvedAddresses: readonly string[]): Promise<SimulationComplianceCsidSendOutcome> {
  const url = new URL(plan.url);
  const approvedAddress = approvedAddresses[0];
  if (!approvedAddress) return Promise.resolve({ error: "CONNECTION_FAILED", mayHaveReachedServer: false });
  return new Promise((resolve) => {
    let settled = false;
    let requestMayHaveReachedServer = false;
    const agent = new https.Agent({ keepAlive: false, maxSockets: 1, maxFreeSockets: 0 });
    let request: ClientRequest | undefined;
    let totalTimeout: NodeJS.Timeout | undefined;
    const finish = (value: SimulationComplianceCsidSendOutcome): void => {
      if (settled) return;
      settled = true;
      if (totalTimeout) clearTimeout(totalTimeout);
      agent.destroy();
      resolve(value);
    };
    request = https.request({
      protocol: "https:", hostname: url.hostname, port: 443, path: `${url.pathname}`, method: plan.method,
      headers: { ...plan.headers, "Content-Length": String(plan.body.length) }, servername: url.hostname,
      minVersion: "TLSv1.2", rejectUnauthorized: true, agent,
      lookup: (_hostname, _options, callback) => callback(null, approvedAddress, isIP(approvedAddress)),
      timeout: 15_000,
    }, (response) => {
      const chunks: Buffer[] = [];
      let size = 0;
      const disposeChunks = (): void => { for (const buffered of chunks) buffered.fill(0); chunks.length = 0; };
      response.on("data", (chunk: Buffer) => {
        if (settled) { chunk.fill(0); return; }
        size += chunk.length;
        if (size > MAX_RESPONSE_BYTES) {
          chunk.fill(0);
          disposeChunks();
          response.destroy();
          request?.destroy();
          finish({ error: "RESPONSE_TOO_LARGE", mayHaveReachedServer: true });
          return;
        }
        chunks.push(Buffer.from(chunk));
        chunk.fill(0);
      });
      response.on("end", () => {
        if (settled) { disposeChunks(); return; }
        const body = Buffer.concat(chunks);
        disposeChunks();
        finish({ status: response.statusCode ?? 0, headers: response.headers, body });
      });
      response.on("error", () => { disposeChunks(); finish({ error: "RESET_AFTER_REQUEST", mayHaveReachedServer: true }); });
    });
    totalTimeout = setTimeout(() => {
      request?.destroy();
      finish({ error: requestMayHaveReachedServer ? "RESET_AFTER_REQUEST" : "TIMEOUT_BEFORE_CONNECTION", mayHaveReachedServer: requestMayHaveReachedServer });
    }, 15_000);
    totalTimeout.unref();
    request.once("timeout", () => { request?.destroy(); finish({ error: requestMayHaveReachedServer ? "RESET_AFTER_REQUEST" : "TIMEOUT_BEFORE_CONNECTION", mayHaveReachedServer: requestMayHaveReachedServer }); });
    request.once("error", () => finish({ error: requestMayHaveReachedServer ? "RESET_AFTER_REQUEST" : "CONNECTION_FAILED", mayHaveReachedServer: requestMayHaveReachedServer }));
    request.once("finish", () => { requestMayHaveReachedServer = true; });
    request.end(plan.body);
  });
}

function headerValue(headers: Record<string, string | string[] | undefined>, name: string): string | undefined {
  const value = headers[name] ?? headers[name.toLowerCase()] ?? headers[name.toUpperCase()];
  return Array.isArray(value) ? value[0] : value;
}

function isPublicAddress(value: string): boolean {
  if (isIP(value) === 4) {
    const octets = value.split(".").map(Number);
    if (octets.some((octet) => octet > 255)) return false;
    const [first, second] = octets;
    return first !== 0 && first !== 10 && first !== 127 && first! < 224 && !(first === 100 && second! >= 64 && second! <= 127) && !(first === 169 && second === 254) && !(first === 172 && second! >= 16 && second! <= 31) && !(first === 192 && (second === 0 || second === 168)) && !(first === 198 && (second! >= 18 && second! <= 19 || second === 51)) && !(first === 203 && second === 0);
  }
  if (isIP(value) !== 6) return false;
  const normalized = value.toLowerCase();
  if (normalized.startsWith("::ffff:")) return isPublicAddress(normalized.slice("::ffff:".length));
  return !["::", "::1"].includes(normalized) && !/^fe[89ab]:/u.test(normalized) && !normalized.startsWith("fc") && !normalized.startsWith("fd") && !normalized.startsWith("ff");
}
