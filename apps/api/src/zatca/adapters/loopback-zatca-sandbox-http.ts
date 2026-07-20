import { createServer, type Server } from "node:http";

const MAX_BODY_BYTES = 8 * 1024;
const allowedRoutes = new Set(["/loopback/compliance", "/loopback/clearance", "/loopback/reporting"]);

export type LoopbackScenario = "ACCEPTED" | "WARNING" | "REJECTED" | "AUTH_REJECTED" | "RATE_LIMIT" | "SERVER_ERROR" | "MALFORMED" | "WRONG_CONTENT_TYPE" | "OVERSIZED" | "TRUNCATED" | "REDIRECT" | "EMPTY" | "TIMEOUT" | "RESET_AFTER_REQUEST";
export interface LoopbackEvidence { loopbackOnly: true; externalDnsLookups: 0; externalSockets: 0; redirectsFollowed: 0; requestBodiesRetained: false; responseBodiesRetained: false; requestCount: number; }

export class LoopbackZatcaSandboxServer {
  private server?: Server;
  private requests = 0;
  constructor(private readonly scenario: LoopbackScenario = "ACCEPTED") {}

  async start(enabled: boolean): Promise<string> {
    if (!enabled) throw new Error("Loopback proof flag is required.");
    this.server = createServer((request, response) => this.handle(request, response));
    await new Promise<void>((resolve, reject) => { this.server!.once("error", reject); this.server!.listen(0, "127.0.0.1", resolve); });
    const address = this.server.address();
    if (!address || typeof address === "string") throw new Error("Loopback server did not bind a TCP address.");
    return `http://127.0.0.1:${address.port}`;
  }

  async stop(): Promise<void> { if (this.server) await new Promise<void>((resolve, reject) => this.server!.close((error) => error ? reject(error) : resolve())); }
  getEvidence(): LoopbackEvidence { return { loopbackOnly: true, externalDnsLookups: 0, externalSockets: 0, redirectsFollowed: 0, requestBodiesRetained: false, responseBodiesRetained: false, requestCount: this.requests }; }

  private handle(request: import("node:http").IncomingMessage, response: import("node:http").ServerResponse) {
    this.requests += 1;
    if (request.method !== "POST" || !allowedRoutes.has(request.url ?? "")) return this.respond(response, 404, "ROUTE_REJECTED");
    let received = 0;
    request.on("data", (chunk: Buffer) => { received += chunk.length; if (received > MAX_BODY_BYTES) request.destroy(); });
    request.once("end", () => this.respondScenario(response));
    request.once("error", () => response.destroy());
  }

  private respondScenario(response: import("node:http").ServerResponse) {
    if (this.scenario === "TRUNCATED") return response.destroy();
    if (this.scenario === "RESET_AFTER_REQUEST") return response.socket?.destroy();
    if (this.scenario === "TIMEOUT") return void setTimeout(() => response.end(), 1_100);
    if (this.scenario === "REDIRECT") { response.statusCode = 302; response.setHeader("location", "http://127.0.0.1/forbidden"); return response.end(); }
    if (this.scenario === "EMPTY") { response.setHeader("content-type", "application/json"); return response.end(); }
    if (this.scenario === "MALFORMED") return response.end("{");
    if (this.scenario === "WRONG_CONTENT_TYPE") { response.setHeader("content-type", "text/plain"); return response.end("safe"); }
    if (this.scenario === "OVERSIZED") { response.setHeader("content-type", "application/json"); return response.end(JSON.stringify({ code: "X".repeat(MAX_BODY_BYTES + 1) })); }
    const mapped: [number, string] = this.scenario === "REJECTED" ? [422, "SIMULATED_BUSINESS_REJECTED"] : this.scenario === "AUTH_REJECTED" ? [401, "SIMULATED_AUTH_REJECTED"] : this.scenario === "RATE_LIMIT" ? [429, "SIMULATED_RATE_LIMIT"] : this.scenario === "SERVER_ERROR" ? [503, "SIMULATED_SERVER_ERROR"] : [200, this.scenario === "WARNING" ? "SIMULATED_ACCEPTED_WITH_WARNING" : "SIMULATED_ACCEPTED"];
    this.respond(response, mapped[0], mapped[1]);
  }

  private respond(response: import("node:http").ServerResponse, status: number, code: string) { response.statusCode = status; response.setHeader("content-type", "application/json"); response.end(JSON.stringify({ code })); }
}

export class LoopbackZatcaProtocolError extends Error { constructor(readonly safeCode: string) { super(safeCode); } }

export class LoopbackZatcaSandboxHttpClient {
  constructor(private readonly baseUrl: string) { assertLoopbackUrl(baseUrl); }
  async submit(route: string, metadata: { invoiceUuid: string; invoiceHash: string }): Promise<{ responseCode: string; warningCodes: string[]; errorCodes: string[] }> {
    if (!allowedRoutes.has(route)) throw new Error("Loopback route is not allowed.");
    const body = JSON.stringify(metadata);
    if (Buffer.byteLength(body) > MAX_BODY_BYTES) throw new Error("Loopback request exceeds the safe size limit.");
    let response: Response;
    try { response = await fetch(new URL(route, this.baseUrl), { method: "POST", headers: { "content-type": "application/json" }, body, redirect: "error", signal: AbortSignal.timeout(1_000) }); } catch { throw new LoopbackZatcaProtocolError("SIMULATED_CONNECTION_UNCERTAIN"); }
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.startsWith("application/json")) throw new LoopbackZatcaProtocolError("SIMULATED_PROTOCOL_CONTENT_TYPE");
    const text = await response.text();
    if (Buffer.byteLength(text) > MAX_BODY_BYTES) throw new LoopbackZatcaProtocolError("SIMULATED_PROTOCOL_SIZE");
    let parsed: { code?: unknown };
    try { parsed = JSON.parse(text) as { code?: unknown }; } catch { throw new LoopbackZatcaProtocolError("SIMULATED_PROTOCOL_MALFORMED"); }
    if (typeof parsed.code !== "string" || !/^SIMULATED_[A-Z_]+$/.test(parsed.code)) throw new LoopbackZatcaProtocolError("SIMULATED_PROTOCOL_CODE");
    return { responseCode: parsed.code, warningCodes: parsed.code === "SIMULATED_ACCEPTED_WITH_WARNING" ? ["SIMULATED_WARNING"] : [], errorCodes: response.ok ? [] : [parsed.code] };
  }
}

function assertLoopbackUrl(value: string): void { const url = new URL(value); if (url.protocol !== "http:" || url.hostname !== "127.0.0.1" || url.username || url.password) throw new Error("Only literal 127.0.0.1 loopback targets are allowed."); }
