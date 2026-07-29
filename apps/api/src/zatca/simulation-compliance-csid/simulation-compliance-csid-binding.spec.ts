import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import {
  APPROVAL_PHRASE,
  consumeOneShotSimulationApproval,
  OneShotSimulationApprovalError,
} from "./one-shot-simulation-approval";
import {
  buildSimulationComplianceCsidRequest,
  SimulationComplianceCsidContractError,
} from "./simulation-compliance-csid-contract";
import {
  SimulationComplianceCsidHttpClient,
  SimulationComplianceCsidTransportError,
} from "./simulation-compliance-csid-transport";
import {
  SimulationComplianceCsidResponseError,
  withParsedSimulationComplianceCsidResponse,
} from "./simulation-compliance-csid-response";
import {
  SimulationComplianceCsidCustodyError,
  storeSimulationComplianceCredentialAtomically,
} from "./simulation-compliance-csid-custody";
import {
  executeSimulationComplianceCsidOnce,
  SimulationComplianceCsidExecutionError,
} from "./simulation-compliance-csid-execution";
import { LoopbackZatcaProtocolError, LoopbackZatcaSandboxHttpClient, LoopbackZatcaSandboxServer, type LoopbackScenario } from "../adapters/loopback-zatca-sandbox-http";
import { SandboxLocalDpapiComplianceCsidCustodyProvider } from "../custody/compliance-csid-secret-custody.provider";

const CONTRACT = {
  simulationBaseUrl: "https://gw-fatoora.zatca.gov.sa/e-invoicing/simulation",
  operation: { method: "POST", path: "/compliance" },
  headers: {
    otp: { name: "OTP" },
    acceptVersion: { name: "Accept-Version", value: "V2" },
    contentType: { name: "Content-Type", value: "application/json" },
  },
  request: { field: "csr" },
  response: { fields: ["requestID", "dispositionMessage", "binarySecurityToken", "secret"] },
  otp: { digits: 6, pattern: "^[0-9]{6}$" },
} as const;

const EXPECTED = {
  mainSha: "a".repeat(40),
  contractSha: "b".repeat(64),
  packetSha: "c".repeat(64),
  syntheticRunId: "synthetic-run-001",
  organizationReference: "synthetic-org-001",
  egsReference: "synthetic-egs-001",
};
const BASE64_CSR = "c3ludGhldGljLWNzcg==";

const REQUIRED_ONE_SHOT_MATRIX = [
  "accepted-credential", "invalid-otp", "expired-otp", "authentication-rejection", "duplicate-request", "business-rejection", "rate-limit", "server-error",
  "timeout-before-connection", "timeout-after-request", "connection-reset", "redirect", "wrong-content-type", "malformed-json", "duplicate-json", "oversized-response",
  "missing-token", "missing-secret", "certificate-key-mismatch", "partial-custody", "approval-expired", "approval-replay", "packet-drift", "production-target", "proxy-environment", "second-request-attempt",
] as const;

function validApprovalRecord(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    schemaVersion: 1,
    approvalPhrase: APPROVAL_PHRASE,
    executionStage: "COMPLIANCE_CSID_ONBOARDING",
    currentMainSha: EXPECTED.mainSha,
    contractSha256: EXPECTED.contractSha,
    packetSha256: EXPECTED.packetSha,
    syntheticRunId: EXPECTED.syntheticRunId,
    syntheticOrganizationReference: EXPECTED.organizationReference,
    syntheticEgsReference: EXPECTED.egsReference,
    maximumRequestCount: 1,
    simulationOnly: true,
    customerDataAllowed: false,
    productionAllowed: false,
    issuedAt: "2026-07-29T00:00:00.000Z",
    expiresAt: "2026-07-29T01:00:00.000Z",
    oneShotNonce: "synthetic-one-shot-nonce-001",
    ...overrides,
  };
}

function approvalExpected(): Parameters<typeof consumeOneShotSimulationApproval>[0]["expected"] {
  return {
    ...EXPECTED,
    executionStage: "COMPLIANCE_CSID_ONBOARDING",
    now: new Date("2026-07-29T00:30:00.000Z"),
  };
}

describe("one-shot Simulation compliance-CSID approval", () => {
  it("atomically consumes a matching external approval before OTP handling and returns metadata only", async () => {
    const directory = await mkdtemp(join(tmpdir(), "ledgerbyte-zatca-approval-"));
    const approvalFile = join(directory, "approval.json");
    const record = validApprovalRecord();
    await writeFile(approvalFile, JSON.stringify(record), "utf8");
    try {
      const consumed = await consumeOneShotSimulationApproval({ approvalFile, expected: approvalExpected(), repositoryRoot: join(directory, "repository") });
      expect(consumed.approvalRecordSha256).toMatch(/^[a-f0-9]{64}$/);
      expect(consumed.expiresAt).toBe("2026-07-29T01:00:00.000Z");
      await expect(readFile(approvalFile)).rejects.toMatchObject({ code: "ENOENT" });
      await expect(consumeOneShotSimulationApproval({ approvalFile, expected: approvalExpected(), repositoryRoot: join(directory, "repository") })).rejects.toMatchObject({ code: "APPROVAL_RECORD_UNAVAILABLE" });
      const copiedApprovalFile = join(directory, "copied-approval.json");
      await writeFile(copiedApprovalFile, JSON.stringify(record), "utf8");
      await expect(consumeOneShotSimulationApproval({ approvalFile: copiedApprovalFile, expected: approvalExpected(), repositoryRoot: join(directory, "repository") })).rejects.toMatchObject({ code: "APPROVAL_RECORD_REPLAYED" });
      expect(JSON.stringify(consumed)).not.toContain(APPROVAL_PHRASE);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it.each([
    ["expired", { expiresAt: "2026-07-29T00:15:00.000Z" }, "APPROVAL_RECORD_EXPIRED"],
    ["hash drift", { packetSha256: "d".repeat(64) }, "APPROVAL_RECORD_BINDING_MISMATCH"],
    ["production scope", { productionAllowed: true }, "APPROVAL_RECORD_SCOPE_REJECTED"],
    ["two-request budget", { maximumRequestCount: 2 }, "APPROVAL_RECORD_REQUEST_BUDGET_REJECTED"],
  ])("rejects %s without returning the approval body", async (_name, overrides, expectedCode) => {
    const directory = await mkdtemp(join(tmpdir(), "ledgerbyte-zatca-approval-"));
    const approvalFile = join(directory, "approval.json");
    await writeFile(approvalFile, JSON.stringify(validApprovalRecord(overrides)), "utf8");
    try {
      await expect(consumeOneShotSimulationApproval({ approvalFile, expected: approvalExpected(), repositoryRoot: join(directory, "repository") })).rejects.toMatchObject({ code: expectedCode });
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});

describe("Simulation compliance-CSID contract and HTTPS transport", () => {
  it("keeps the complete required one-shot matrix explicit and unique", () => {
    expect(REQUIRED_ONE_SHOT_MATRIX).toHaveLength(26);
    expect(new Set(REQUIRED_ONE_SHOT_MATRIX).size).toBe(REQUIRED_ONE_SHOT_MATRIX.length);
  });
  it("builds one exact HTTPS request from reviewed contract metadata and rejects target substitution", () => {
    const otp = Buffer.from("123456", "ascii");
    const csr = Buffer.from(BASE64_CSR, "ascii");
    try {
      const plan = buildSimulationComplianceCsidRequest({ contract: CONTRACT, csr, otp });
      expect(plan.url).toBe("https://gw-fatoora.zatca.gov.sa/e-invoicing/simulation/compliance");
      expect(plan.method).toBe("POST");
      expect(plan.headers).toEqual(expect.objectContaining({ OTP: "123456", "Accept-Version": "V2", "Content-Type": "application/json", "Accept-Encoding": "identity" }));
      expect(plan.requestSha256).toBe(createHash("sha256").update(plan.body).digest("hex"));
      expect(plan.body.toString("utf8")).toBe(JSON.stringify({ csr: BASE64_CSR }));
      expect(() => buildSimulationComplianceCsidRequest({ contract: { ...CONTRACT, simulationBaseUrl: "https://gw-fatoora.zatca.gov.sa/e-invoicing/core" }, csr, otp })).toThrow(SimulationComplianceCsidContractError);
      expect(() => buildSimulationComplianceCsidRequest({ contract: { ...CONTRACT, simulationBaseUrl: "https://example.invalid/e-invoicing/simulation" }, csr, otp })).toThrow(SimulationComplianceCsidContractError);
      expect(() => buildSimulationComplianceCsidRequest({ contract: { ...CONTRACT, simulationBaseUrl: "not-a-url" }, csr, otp })).toThrow(SimulationComplianceCsidContractError);
    } finally {
      csr.fill(0);
      otp.fill(0);
    }
  });

  it("rejects raw DER-like CSR bytes so the request can only carry canonical base64", () => {
    const csr = Buffer.from("synthetic-csr", "utf8");
    const otp = Buffer.from("123456", "ascii");
    try {
      expect(() => buildSimulationComplianceCsidRequest({ contract: CONTRACT, csr, otp })).toThrow(
        expect.objectContaining({ code: "CONTRACT_REQUEST_INPUT_REJECTED" }),
      );
    } finally {
      csr.fill(0);
      otp.fill(0);
    }
  });

  it.each([
    ["redirect", { status: 302, headers: { location: "https://example.invalid" }, body: Buffer.alloc(0) }, "TRANSPORT_REDIRECT_REJECTED", false],
    ["wrong content type", { status: 200, headers: { "content-type": "text/plain" }, body: Buffer.from("x") }, "TRANSPORT_CONTENT_TYPE_REJECTED", false],
    ["oversized body", { status: 200, headers: { "content-type": "application/json" }, body: Buffer.alloc(65_537) }, "TRANSPORT_RESPONSE_TOO_LARGE", false],
    ["timeout before connection", { error: "TIMEOUT_BEFORE_CONNECTION", mayHaveReachedServer: false }, "TRANSPORT_TIMEOUT", false],
    ["reset after request", { error: "RESET_AFTER_REQUEST", mayHaveReachedServer: true }, "UNCERTAIN_REQUIRES_FRESH_APPROVAL", true],
  ])("classifies %s without retries or raw-body output", async (_name, outcome, code, uncertain) => {
    const plan = buildSimulationComplianceCsidRequest({ contract: CONTRACT, csr: Buffer.from(BASE64_CSR), otp: Buffer.from("123456") });
    const send = jest.fn(async () => outcome as never);
    const client = new SimulationComplianceCsidHttpClient({ reviewedSimulationBaseUrl: CONTRACT.simulationBaseUrl, send, resolve: async () => ["8.8.8.8"] });
    await expect(client.requestComplianceCsidOnce(plan)).rejects.toMatchObject({ code, uncertain });
    expect(send).toHaveBeenCalledTimes(1);
    plan.body.fill(0);
  });

  it("rejects proxy configuration before DNS or a socket is opened", async () => {
    const send = jest.fn(async () => ({ status: 400, headers: { "content-type": "application/json" }, body: Buffer.from("{}") }));
    const client = new SimulationComplianceCsidHttpClient({ reviewedSimulationBaseUrl: CONTRACT.simulationBaseUrl, send, resolve: async () => ["8.8.8.8"], environment: { HTTPS_PROXY: "http://192.0.2.1:8080" } });
    expect(() => client.assertPreflightPolicy()).toThrow(expect.objectContaining({ code: "TRANSPORT_PROXY_ENV_REJECTED" }));
    expect(send).not.toHaveBeenCalled();
  });

  it("allows no second request attempt after a definitive first response", async () => {
    const plan = buildSimulationComplianceCsidRequest({ contract: CONTRACT, csr: Buffer.from(BASE64_CSR), otp: Buffer.from("123456") });
    const send = jest.fn(async () => ({ status: 400, headers: { "content-type": "application/json" }, body: Buffer.from("{}") }));
    const client = new SimulationComplianceCsidHttpClient({ reviewedSimulationBaseUrl: CONTRACT.simulationBaseUrl, send, resolve: async () => ["8.8.8.8"] });
    try {
      await expect(client.requestComplianceCsidOnce(plan)).resolves.toMatchObject({ status: 400 });
      await expect(client.requestComplianceCsidOnce(plan)).rejects.toMatchObject({ code: "TRANSPORT_REQUEST_ALREADY_ATTEMPTED" });
      expect(send).toHaveBeenCalledTimes(1);
    } finally { plan.body.fill(0); }
  });

  it("passes only the already-vetted public address set to the one-shot sender", async () => {
    const plan = buildSimulationComplianceCsidRequest({ contract: CONTRACT, csr: Buffer.from(BASE64_CSR), otp: Buffer.from("123456") });
    const send = jest.fn(async (_request, addresses: readonly string[]) => ({
      status: 400,
      headers: { "content-type": "application/json" },
      body: Buffer.from("{}"),
      approvedAddresses: addresses,
    }));
    const client = new SimulationComplianceCsidHttpClient({
      reviewedSimulationBaseUrl: CONTRACT.simulationBaseUrl,
      send: async (request, addresses) => {
        const outcome = await send(request, addresses);
        return { status: outcome.status, headers: outcome.headers, body: outcome.body };
      },
      resolve: async () => ["8.8.8.8", "1.1.1.1"],
    });
    try {
      await expect(client.requestComplianceCsidOnce(plan)).resolves.toMatchObject({ status: 400 });
      expect(send).toHaveBeenCalledWith(plan, ["8.8.8.8", "1.1.1.1"]);
    } finally {
      plan.body.fill(0);
    }
  });

  it("rejects a plan whose host diverges from the reviewed Simulation base before DNS or a socket", async () => {
    const plan = buildSimulationComplianceCsidRequest({ contract: CONTRACT, csr: Buffer.from(BASE64_CSR), otp: Buffer.from("123456") });
    const send = jest.fn(async () => ({ status: 200, headers: { "content-type": "application/json" }, body: Buffer.from("{}") }));
    const client = new SimulationComplianceCsidHttpClient({ reviewedSimulationBaseUrl: CONTRACT.simulationBaseUrl, send, resolve: async () => ["8.8.8.8"] });
    try {
      await expect(client.requestComplianceCsidOnce({ ...plan, url: "https://example.invalid/e-invoicing/simulation/compliance" })).rejects.toMatchObject({ code: "TRANSPORT_TARGET_REJECTED" });
      expect(send).not.toHaveBeenCalled();
    } finally { plan.body.fill(0); }
  });

  it("rejects a caller-supplied non-FATOORA reviewed base before DNS or a socket", () => {
    const client = new SimulationComplianceCsidHttpClient({
      reviewedSimulationBaseUrl: "https://example.invalid/e-invoicing/simulation",
      send: async () => ({ status: 200, headers: { "content-type": "application/json" }, body: Buffer.from("{}") }),
      resolve: async () => ["8.8.8.8"],
    });
    expect(() => client.assertPreflightPolicy()).toThrow(
      expect.objectContaining({ code: "TRANSPORT_TARGET_REJECTED" }),
    );
  });

  it("rejects an oversized or hash-mismatched plan before DNS", async () => {
    const basePlan = buildSimulationComplianceCsidRequest({ contract: CONTRACT, csr: Buffer.from(BASE64_CSR), otp: Buffer.from("123456") });
    const resolve = jest.fn(async () => ["8.8.8.8"]);
    const client = new SimulationComplianceCsidHttpClient({
      reviewedSimulationBaseUrl: CONTRACT.simulationBaseUrl,
      send: async () => ({ status: 200, headers: { "content-type": "application/json" }, body: Buffer.from("{}") }),
      resolve,
    });
    const oversizedBody = Buffer.alloc(128 * 1024 + 1, 1);
    try {
      await expect(client.requestComplianceCsidOnce({ ...basePlan, body: oversizedBody, requestSha256: createHash("sha256").update(oversizedBody).digest("hex") })).rejects.toMatchObject({ code: "TRANSPORT_TARGET_REJECTED" });
      expect(resolve).not.toHaveBeenCalled();
    } finally {
      basePlan.body.fill(0);
      oversizedBody.fill(0);
    }
  });
});

describe("strict response parsing and atomic custody", () => {
  const inspector = { inspect: jest.fn(() => ({
    fingerprint: "e".repeat(64),
    issuer: "CN=SYNTHETIC-ISSUER",
    serialNumber: "SYNTHETIC-001",
    expiresAt: "2026-08-29T00:00:00.000Z",
    publicKeyFingerprint: "f".repeat(64),
    curve: "secp256k1" as const,
  })) };

  it("rejects duplicate JSON members and only exposes material inside a disposal callback", async () => {
    const duplicate = Buffer.from('{"requestID":"1","requestID":"2"}', "utf8");
    await expect(withParsedSimulationComplianceCsidResponse({ body: duplicate, expectedPublicKeyFingerprint: "f".repeat(64), requiredResponseFields: CONTRACT.response.fields, inspector }, async () => undefined)).rejects.toMatchObject({ code: "RESPONSE_DUPLICATE_JSON_MEMBER" });
    expect(duplicate.every((value) => value === 0)).toBe(true);

    const raw = Buffer.from(JSON.stringify({ requestID: "synthetic-request", dispositionMessage: "ISSUED", binarySecurityToken: Buffer.from("synthetic-certificate").toString("base64"), secret: "synthetic-secret" }), "utf8");
    let leaked: Buffer | undefined;
    const metadata = await withParsedSimulationComplianceCsidResponse({ body: raw, expectedPublicKeyFingerprint: "f".repeat(64), requiredResponseFields: CONTRACT.response.fields, inspector }, async (material) => {
      leaked = material.secret;
      return { seen: material.certificate.length > 0 };
    });
    expect(metadata).toEqual({ seen: true });
    expect(leaked?.every((value) => value === 0)).toBe(true);
    expect(raw.every((value) => value === 0)).toBe(true);
  });

  it("rejects non-canonical credential encoding and production-marked response metadata", async () => {
    const malformedToken = Buffer.from(JSON.stringify({ requestID: "synthetic-request", dispositionMessage: "ISSUED", binarySecurityToken: "AB==", secret: "synthetic-secret" }), "utf8");
    await expect(withParsedSimulationComplianceCsidResponse({ body: malformedToken, expectedPublicKeyFingerprint: "f".repeat(64), requiredResponseFields: CONTRACT.response.fields, inspector }, async () => undefined)).rejects.toMatchObject({ code: "RESPONSE_REQUIRED_FIELD_MISSING" });
    expect(malformedToken.every((value) => value === 0)).toBe(true);

    const productionMessage = Buffer.from(JSON.stringify({ requestID: "synthetic-request", dispositionMessage: "production credential", binarySecurityToken: Buffer.from("synthetic-certificate").toString("base64"), secret: "synthetic-secret" }), "utf8");
    await expect(withParsedSimulationComplianceCsidResponse({ body: productionMessage, expectedPublicKeyFingerprint: "f".repeat(64), requiredResponseFields: CONTRACT.response.fields, inspector }, async () => undefined)).rejects.toMatchObject({ code: "RESPONSE_REQUIRED_FIELD_MISSING" });
    expect(productionMessage.every((value) => value === 0)).toBe(true);
  });

  it("rolls back partial DPAPI custody and never returns credential bodies", async () => {
    const revokeReference = jest.fn(async () => undefined);
    const provider = {
      storeComplianceCertificate: jest.fn(async () => ({ provider: "SANDBOX_LOCAL_DPAPI" as const, referenceId: "cert-ref", versionId: null, createdAt: new Date(), bodyReturned: false as const, productionCompliance: false as const })),
      storeComplianceSecret: jest.fn(async () => { throw new Error("synthetic storage failure"); }),
      revokeReference,
    };
    const certificate = Buffer.from("synthetic-certificate");
    const secret = Buffer.from("synthetic-secret");
    await expect(storeSimulationComplianceCredentialAtomically({ provider, organizationId: "synthetic-org", egsUnitId: "synthetic-egs", requestId: "synthetic-request", certificate, secret, certificateMetadata: { fingerprint: "e".repeat(64), issuer: "CN=SYNTHETIC", serialNumber: "SYNTHETIC", expiresAt: "2026-08-29T00:00:00.000Z" } })).rejects.toMatchObject({ code: "CUSTODY_PARTIAL_STORAGE_ROLLED_BACK" });
    expect(revokeReference).toHaveBeenCalledTimes(1);
    expect(certificate.every((value) => value === 0)).toBe(true);
    expect(secret.every((value) => value === 0)).toBe(true);
  });

  it("uses the unredacted transaction-local reference only for actual DPAPI rollback", async () => {
    const directory = await mkdtemp(join(tmpdir(), "ledgerbyte-zatca-custody-rollback-"));
    const actual = new SandboxLocalDpapiComplianceCsidCustodyProvider({
      environment: "LOCAL_TEST",
      storageDirectory: directory,
      protector: {
        protect: async (value) => Buffer.from(`protected:${value.toString("base64")}`, "utf8"),
        unprotect: async (value) => Buffer.from(value.toString("utf8").replace("protected:", ""), "base64"),
      },
    });
    const certificate = Buffer.from("synthetic-certificate");
    const secret = Buffer.from("synthetic-secret");
    try {
      await expect(storeSimulationComplianceCredentialAtomically({
        provider: {
          storeComplianceCertificate: actual.storeComplianceCertificate.bind(actual),
          storeComplianceSecret: async () => { throw new Error("synthetic second-write failure"); },
          revokeReference: actual.revokeReference.bind(actual),
          deleteReference: actual.deleteReference.bind(actual),
        },
        organizationId: "synthetic-org",
        egsUnitId: "synthetic-egs",
        requestId: "synthetic-request",
        certificate,
        secret,
        certificateMetadata: { fingerprint: "e".repeat(64), issuer: "CN=SYNTHETIC", serialNumber: "SYNTHETIC", expiresAt: "2026-08-29T00:00:00.000Z" },
      })).rejects.toMatchObject({ code: "CUSTODY_PARTIAL_STORAGE_ROLLED_BACK" });
      expect(await actual.listMetadataOnly()).toEqual([]);
      expect(certificate.every((value) => value === 0)).toBe(true);
      expect(secret.every((value) => value === 0)).toBe(true);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});

describe("CLI-only one-shot execution orchestration", () => {
  it("does not read an OTP until static preflight and approval consumption pass, then refuses an uncertain outcome", async () => {
    const readOtp = jest.fn(async () => Buffer.from("123456"));
    const executeRequest = jest.fn(async () => { throw new SimulationComplianceCsidTransportError("UNCERTAIN_REQUIRES_FRESH_APPROVAL", true); });
    await expect(executeSimulationComplianceCsidOnce({
      staticPreflight: { requestSequenceReady: false, officialContractComplete: true },
      consumeApproval: async () => ({ approvalRecordSha256: "a".repeat(64), expiresAt: "2026-07-29T01:00:00.000Z" }),
      rerunStaticPreflight: async () => ({ requestSequenceReady: false, officialContractComplete: true }),
      readOtp,
      executeRequest,
      now: () => new Date("2026-07-29T00:30:00.000Z"),
    })).rejects.toMatchObject({ code: "EXECUTION_PREFLIGHT_REQUIRED" });
    expect(readOtp).not.toHaveBeenCalled();

    await expect(executeSimulationComplianceCsidOnce({
      staticPreflight: { requestSequenceReady: true, officialContractComplete: true },
      consumeApproval: async () => ({ approvalRecordSha256: "a".repeat(64), expiresAt: "2026-07-29T01:00:00.000Z" }),
      rerunStaticPreflight: async () => ({ requestSequenceReady: true, officialContractComplete: true }),
      readOtp,
      executeRequest,
      now: () => new Date("2026-07-29T00:30:00.000Z"),
    })).rejects.toMatchObject({ code: "UNCERTAIN_REQUIRES_FRESH_APPROVAL" });
    expect(readOtp).toHaveBeenCalledTimes(1);
    expect(executeRequest).toHaveBeenCalledTimes(1);
  });

  it("consumes approval before rechecking static gates, then fails before OTP when they drift", async () => {
    const consumeApproval = jest.fn(async () => ({ approvalRecordSha256: "a".repeat(64), expiresAt: "2026-07-29T01:00:00.000Z" }));
    const rerunStaticPreflight = jest.fn(async () => ({ requestSequenceReady: false, officialContractComplete: true }));
    const readOtp = jest.fn(async () => Buffer.from("123456"));
    await expect(executeSimulationComplianceCsidOnce({
      staticPreflight: { requestSequenceReady: true, officialContractComplete: true },
      consumeApproval,
      rerunStaticPreflight,
      readOtp,
      executeRequest: async () => undefined,
      now: () => new Date("2026-07-29T00:30:00.000Z"),
    })).rejects.toMatchObject({ code: "EXECUTION_PREFLIGHT_REQUIRED" });
    expect(consumeApproval).toHaveBeenCalledTimes(1);
    expect(rerunStaticPreflight).toHaveBeenCalledTimes(1);
    expect(readOtp).not.toHaveBeenCalled();
  });
});

describe("literal-loopback one-shot CSID matrix", () => {
  it("chains approval consumption, hidden OTP disposal, one loopback request, response custody, and cleanup", async () => {
    const directory = await mkdtemp(join(tmpdir(), "ledgerbyte-zatca-one-shot-"));
    const approvalFile = join(directory, "approval.json");
    const server = new LoopbackZatcaSandboxServer("CSID_ISSUED");
    const provider = new SandboxLocalDpapiComplianceCsidCustodyProvider({
      environment: "LOCAL_TEST",
      storageDirectory: join(directory, "custody"),
      protector: {
        protect: async (value) => Buffer.from(`protected:${value.toString("base64")}`, "utf8"),
        unprotect: async (value) => Buffer.from(value.toString("utf8").replace("protected:", ""), "base64"),
      },
    });
    const csr = Buffer.from(BASE64_CSR, "ascii");
    const otp = Buffer.from("123456", "ascii");
    try {
      await writeFile(approvalFile, JSON.stringify(validApprovalRecord()), "utf8");
      const baseUrl = await server.start(true);
      const loopback = new LoopbackZatcaSandboxHttpClient(baseUrl);
      const plan = buildSimulationComplianceCsidRequest({ contract: CONTRACT, csr, otp });
      const client = new SimulationComplianceCsidHttpClient({
        reviewedSimulationBaseUrl: CONTRACT.simulationBaseUrl,
        resolve: async () => ["8.8.8.8"],
        send: async (request) => loopback.submitRaw("/loopback/compliance", request.body),
      });
      const execution = await executeSimulationComplianceCsidOnce({
        staticPreflight: { requestSequenceReady: true, officialContractComplete: true },
        consumeApproval: () => consumeOneShotSimulationApproval({ approvalFile, repositoryRoot: join(directory, "repository"), expected: approvalExpected() }),
        rerunStaticPreflight: async () => ({ requestSequenceReady: true, officialContractComplete: true }),
        readOtp: async () => Buffer.from("123456", "ascii"),
        executeRequest: async () => {
          const response = await client.requestComplianceCsidOnce(plan);
          return withParsedSimulationComplianceCsidResponse({
            body: response.body,
            expectedPublicKeyFingerprint: "f".repeat(64),
            requiredResponseFields: CONTRACT.response.fields,
            inspector: { inspect: () => ({ fingerprint: "e".repeat(64), issuer: "CN=SYNTHETIC", serialNumber: "SYNTHETIC-001", expiresAt: "2026-08-29T00:00:00.000Z", publicKeyFingerprint: "f".repeat(64), curve: "secp256k1" as const }) },
          }, async (material) => storeSimulationComplianceCredentialAtomically({
            provider,
            organizationId: EXPECTED.organizationReference,
            egsUnitId: EXPECTED.egsReference,
            requestId: material.requestId,
            certificate: material.certificate,
            secret: material.secret,
            certificateMetadata: material.certificateMetadata,
            requestHash: response.requestSha256,
            responseHash: response.responseSha256,
          }));
        },
        now: () => new Date("2026-07-29T00:30:00.000Z"),
      });
      expect(execution.approvalRecordSha256).toMatch(/^[a-f0-9]{64}$/);
      expect(server.getEvidence()).toEqual(expect.objectContaining({ requestCount: 1, externalDnsLookups: 0, externalSockets: 0 }));
      expect(await provider.listMetadataOnly()).toHaveLength(2);
      plan.body.fill(0);
    } finally {
      csr.fill(0);
      otp.fill(0);
      await server.stop();
      await rm(directory, { recursive: true, force: true });
    }
  });

  const scenarios: ReadonlyArray<{ id: string; scenario: LoopbackScenario; kind: "accepted" | "definitive" | "uncertain" | "transportProtocol" | "responseProtocol" | "partialCustody" }> = [
    { id: "accepted credential", scenario: "CSID_ISSUED", kind: "accepted" },
    { id: "invalid OTP", scenario: "CSID_INVALID_OTP", kind: "definitive" },
    { id: "expired OTP", scenario: "CSID_EXPIRED_OTP", kind: "definitive" },
    { id: "authentication rejection", scenario: "AUTH_REJECTED", kind: "definitive" },
    { id: "duplicate request", scenario: "CSID_DUPLICATE", kind: "definitive" },
    { id: "business rejection", scenario: "CSID_BUSINESS_REJECTED", kind: "definitive" },
    { id: "rate limit", scenario: "RATE_LIMIT", kind: "definitive" },
    { id: "server error", scenario: "SERVER_ERROR", kind: "definitive" },
    { id: "timeout after request may have been sent", scenario: "TIMEOUT", kind: "uncertain" },
    { id: "connection reset", scenario: "RESET_AFTER_REQUEST", kind: "uncertain" },
    { id: "redirect", scenario: "REDIRECT", kind: "transportProtocol" },
    { id: "wrong content type", scenario: "WRONG_CONTENT_TYPE", kind: "transportProtocol" },
    { id: "malformed JSON", scenario: "MALFORMED", kind: "responseProtocol" },
    { id: "duplicate JSON members", scenario: "CSID_DUPLICATE_JSON", kind: "responseProtocol" },
    { id: "oversized response", scenario: "OVERSIZED", kind: "transportProtocol" },
    { id: "missing token", scenario: "CSID_MISSING_TOKEN", kind: "responseProtocol" },
    { id: "missing secret", scenario: "CSID_MISSING_SECRET", kind: "responseProtocol" },
    { id: "certificate/key mismatch", scenario: "CSID_CERTIFICATE_KEY_MISMATCH", kind: "responseProtocol" },
    { id: "partial DPAPI custody failure", scenario: "CSID_ISSUED", kind: "partialCustody" },
  ];

  it.each(scenarios)("uses exactly one literal-loopback request for $id", async ({ scenario, kind }) => {
    const server = new LoopbackZatcaSandboxServer(scenario);
    const baseUrl = await server.start(true);
    const loopback = new LoopbackZatcaSandboxHttpClient(baseUrl);
    const plan = buildSimulationComplianceCsidRequest({ contract: CONTRACT, csr: Buffer.from(BASE64_CSR), otp: Buffer.from("123456") });
    const client = new SimulationComplianceCsidHttpClient({
      reviewedSimulationBaseUrl: CONTRACT.simulationBaseUrl,
      resolve: async () => ["8.8.8.8"],
      send: async (request) => {
        try { return await loopback.submitRaw("/loopback/compliance", request.body); }
        catch (error) {
          if (error instanceof LoopbackZatcaProtocolError) return { error: "RESET_AFTER_REQUEST", mayHaveReachedServer: true };
          throw error;
        }
      },
    });
    try {
      if (kind === "uncertain" || kind === "transportProtocol") {
        await expect(client.requestComplianceCsidOnce(plan)).rejects.toBeInstanceOf(SimulationComplianceCsidTransportError);
      } else {
        const response = await client.requestComplianceCsidOnce(plan);
        const inspector = { inspect: () => ({ fingerprint: "e".repeat(64), issuer: "CN=SYNTHETIC", serialNumber: "SYNTHETIC", expiresAt: "2026-08-29T00:00:00.000Z", publicKeyFingerprint: scenario === "CSID_CERTIFICATE_KEY_MISMATCH" ? "d".repeat(64) : "f".repeat(64), curve: "secp256k1" as const }) };
        if (kind === "accepted") {
          await expect(withParsedSimulationComplianceCsidResponse({ body: response.body, expectedPublicKeyFingerprint: "f".repeat(64), requiredResponseFields: CONTRACT.response.fields, inspector }, async () => undefined)).resolves.toBeUndefined();
        } else if (kind === "responseProtocol") {
          await expect(withParsedSimulationComplianceCsidResponse({ body: response.body, expectedPublicKeyFingerprint: "f".repeat(64), requiredResponseFields: CONTRACT.response.fields, inspector }, async () => undefined)).rejects.toBeInstanceOf(SimulationComplianceCsidResponseError);
        } else if (kind === "partialCustody") {
          const revokeReference = jest.fn(async () => undefined);
          const provider = { storeComplianceCertificate: jest.fn(async () => ({ provider: "SANDBOX_LOCAL_DPAPI" as const, referenceId: "synthetic-cert", versionId: null, createdAt: new Date(), bodyReturned: false as const, productionCompliance: false as const })), storeComplianceSecret: jest.fn(async () => { throw new Error("synthetic failure"); }), revokeReference };
          await expect(withParsedSimulationComplianceCsidResponse({ body: response.body, expectedPublicKeyFingerprint: "f".repeat(64), requiredResponseFields: CONTRACT.response.fields, inspector }, async (material) => storeSimulationComplianceCredentialAtomically({ provider, organizationId: "synthetic-org", egsUnitId: "synthetic-egs", requestId: material.requestId, certificate: material.certificate, secret: material.secret, certificateMetadata: material.certificateMetadata }))).rejects.toMatchObject({ code: "CUSTODY_PARTIAL_STORAGE_ROLLED_BACK" });
          expect(revokeReference).toHaveBeenCalledTimes(1);
        } else {
          response.body.fill(0);
          expect(response.status).toBeGreaterThanOrEqual(400);
        }
      }
      expect(server.getEvidence()).toEqual(expect.objectContaining({ loopbackOnly: true, externalDnsLookups: 0, externalSockets: 0, requestCount: 1, requestBodiesRetained: false, responseBodiesRetained: false }));
    } finally { plan.body.fill(0); await server.stop(); }
  });
});
