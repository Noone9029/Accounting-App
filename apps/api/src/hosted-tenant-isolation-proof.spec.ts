import {
  createHostedTenantIsolationProofPlan,
  createHostedTenantIsolationProofPlanFromCli,
  executeHostedTenantReadOnlyProbe,
  formatHostedTenantIsolationProofSummary,
  type HostedTenantProofHttpClient,
  type HostedTenantProofHttpRequest,
  redactSecrets,
} from "./hosted-tenant-isolation-proof";

describe("hosted tenant isolation proof safety harness", () => {
  it("allows dry-run classification without hosted credentials or mutation gates", () => {
    const plan = createHostedTenantIsolationProofPlan({
      environment: "local",
      proofRunId: "",
      baseUrl: "http://localhost:3001",
      allow: undefined,
    });

    expect(plan.safety).toBe("ready");
    expect(plan.mode).toBe("dry-run");
    expect(plan.networkEnabled).toBe(false);
    expect(plan.mutationEnabled).toBe(false);
    expect(plan.missingVariables).toContain("LEDGERBYTE_HOSTED_TENANT_PROOF_RUN_ID");
  });

  it("requires a proof run id before staging synthetic proof execution", () => {
    const plan = createHostedTenantIsolationProofPlan({
      environment: "staging",
      proofRunId: "",
      baseUrl: "https://api.staging.ledgerbyte.test",
      allow: "1",
      mode: "staging-synthetic-proof",
      stagingMutationAllow: "1",
    });

    expect(plan.safety).toBe("refused");
    expect(plan.refusedReasons.join(" ")).toContain("proofRunId");
  });

  it("defaults the CLI harness to dry-run mode", () => {
    const plan = createHostedTenantIsolationProofPlanFromCli(["--proof-run-id", "proof-20260618"], {
    });

    expect(plan.safety).toBe("ready");
    expect(plan.mode).toBe("dry-run");
    expect(plan.dryRun).toBe(true);
    expect(plan.networkEnabled).toBe(false);
    expect(plan.mutationEnabled).toBe(false);
  });

  it("refuses production-looking URLs without a production override", () => {
    const plan = createHostedTenantIsolationProofPlan({
      environment: "staging",
      proofRunId: "proof-20260618",
      baseUrl: "https://api.production.ledgerbyte.com",
      allow: "1",
    });

    expect(plan.safety).toBe("refused");
    expect(plan.target.productionLooking).toBe(true);
    expect(plan.refusedReasons.join(" ")).toContain("production-looking");
  });

  it("refuses production-like environment names without enabling any posture mode", () => {
    const plan = createHostedTenantIsolationProofPlanFromCli(
      ["--environment", "live", "--proof-run-id", "proof-20260618", "--base-url", "http://localhost:3001"],
      {
        LEDGERBYTE_HOSTED_TENANT_PROOF_ALLOW: "1",
      },
    );

    expect(plan.safety).toBe("refused");
    expect(plan.environment).toBe("production");
    expect(plan.refusedReasons.join(" ")).toContain("environment name is production-like");
    expect(plan.networkEnabled).toBe(false);
    expect(plan.mutationEnabled).toBe(false);
  });

  it("refuses local mode when pointed at a hosted target", () => {
    const plan = createHostedTenantIsolationProofPlan({
      environment: "local",
      proofRunId: "proof-20260618",
      baseUrl: "https://ledgerbyte-api-test.vercel.app",
      allow: "1",
    });

    expect(plan.safety).toBe("refused");
    expect(plan.refusedReasons.join(" ")).toContain("Local mode only accepts localhost");
  });

  it("redacts secret-like values in target summaries", () => {
    const input = "https://user:password@example.test/path?token=secret-value&S3_SECRET_ACCESS_KEY=abc123";

    expect(redactSecrets(input)).toBe("https://user:[REDACTED]@example.test/path?token=[REDACTED]&S3_SECRET_ACCESS_KEY=[REDACTED]");
  });

  it("redacts secret values from the JSON summary", () => {
    const plan = createHostedTenantIsolationProofPlanFromCli(
      [
        "--mode",
        "staging-read-only-probe",
        "--environment",
        "staging",
        "--proof-run-id",
        "proof-20260618",
        "--base-url",
        "https://user:secret@example.staging.test/path?api_key=abc123",
      ],
      {
        LEDGERBYTE_HOSTED_TENANT_PROOF_ALLOW: "1",
        LEDGERBYTE_HOSTED_TENANT_PROOF_READONLY_ALLOW: "1",
        LEDGERBYTE_HOSTED_TENANT_PROOF_AUTH_TOKEN: "super-secret-token",
        LEDGERBYTE_HOSTED_TENANT_PROOF_TENANT_A_ID: "tenant-a-proof",
        LEDGERBYTE_HOSTED_TENANT_PROOF_TENANT_B_ID: "tenant-b-proof",
      },
    );

    const json = JSON.stringify(plan);

    expect(json).not.toContain("super-secret-token");
    expect(json).not.toContain("abc123");
    expect(json).not.toContain("://user:secret@");
    expect(plan.redactionCheck.secretLikeInputsRedacted).toBe(true);
  });

  it("refuses destructive or external operation flags", () => {
    const plan = createHostedTenantIsolationProofPlanFromCli(["--proof-run-id", "proof-20260618", "--seed"], {
      LEDGERBYTE_HOSTED_TENANT_PROOF_ALLOW: "1",
    });

    expect(plan.safety).toBe("refused");
    expect(plan.refusedReasons.join(" ")).toContain("Destructive or external operations are not allowed");
  });

  it("requires the explicit staging mutation allow gate for synthetic proof mode", () => {
    const plan = createHostedTenantIsolationProofPlan({
      environment: "staging",
      proofRunId: "proof-20260618",
      baseUrl: "https://api.staging.ledgerbyte.test",
      allow: "1",
      mode: "staging-synthetic-proof",
      readonlyAllow: "1",
      authToken: "super-secret-token",
      tenantAId: "tenant-a-proof",
      tenantBId: "tenant-b-proof",
    });

    expect(plan.safety).toBe("refused");
    expect(plan.refusedReasons.join(" ")).toContain("LEDGERBYTE_HOSTED_TENANT_PROOF_STAGING_MUTATION_ALLOW=1");
    expect(plan.mutationEnabled).toBe(false);
  });

  it("classifies staging synthetic proof as ready only with explicit staging gates and proof tenants", () => {
    const plan = createHostedTenantIsolationProofPlan({
      environment: "staging",
      proofRunId: "proof-20260618",
      baseUrl: "https://api.staging.ledgerbyte.test",
      allow: "1",
      mode: "staging-synthetic-proof",
      readonlyAllow: "1",
      stagingMutationAllow: "1",
      authToken: "super-secret-token",
      tenantAId: "tenant-a-proof",
      tenantBId: "tenant-b-proof",
    });

    expect(plan.safety).toBe("ready");
    expect(plan.executionContract.stage).toBe("staging-synthetic-proof");
    expect(plan.executionContract.syntheticDataLabel).toBe("LB-TENANT-PROOF:proof-20260618");
    expect(plan.executionContract.cleanupScope).toBe("proofRunId-only");
    expect(plan.networkEnabled).toBe(false);
    expect(plan.mutationEnabled).toBe(false);
  });

  it("formats a human-readable summary without exposing secrets", () => {
    const plan = createHostedTenantIsolationProofPlanFromCli(
      [
        "--mode",
        "staging-read-only-probe",
        "--environment",
        "staging",
        "--proof-run-id",
        "proof-20260618",
        "--base-url",
        "https://user:secret@example.staging.test/path?token=abc123",
      ],
      {
        LEDGERBYTE_HOSTED_TENANT_PROOF_ALLOW: "1",
        LEDGERBYTE_HOSTED_TENANT_PROOF_READONLY_ALLOW: "1",
        LEDGERBYTE_HOSTED_TENANT_PROOF_AUTH_TOKEN: "super-secret-token",
        LEDGERBYTE_HOSTED_TENANT_PROOF_TENANT_A_ID: "tenant-a-proof",
        LEDGERBYTE_HOSTED_TENANT_PROOF_TENANT_B_ID: "tenant-b-proof",
      },
    );

    const summary = formatHostedTenantIsolationProofSummary(plan);

    expect(summary).toContain("safety=ready");
    expect(summary).toContain("mode=staging-read-only-probe");
    expect(summary).toContain("networkEnabled=false");
    expect(summary).not.toContain("super-secret-token");
    expect(summary).not.toContain("abc123");
    expect(summary).not.toContain("://user:secret@");
  });

  it("does not call the read-only probe client when staging gates are missing", async () => {
    const client = jest.fn<ReturnType<HostedTenantProofHttpClient>, Parameters<HostedTenantProofHttpClient>>();

    const result = await executeHostedTenantReadOnlyProbe(
      {
        environment: "staging",
        proofRunId: "proof-20260618",
        baseUrl: "https://api.staging.ledgerbyte.test",
        allow: "1",
        mode: "staging-read-only-probe",
      },
      client,
    );

    expect(result.safety).toBe("refused");
    expect(result.networkAttempted).toBe(false);
    expect(result.mutationAttempted).toBe(false);
    expect(client).not.toHaveBeenCalled();
  });

  it("does not call the read-only probe client for production-looking targets", async () => {
    const client = jest.fn<ReturnType<HostedTenantProofHttpClient>, Parameters<HostedTenantProofHttpClient>>();

    const result = await executeHostedTenantReadOnlyProbe(
      {
        environment: "staging",
        proofRunId: "proof-20260618",
        baseUrl: "https://api.production.ledgerbyte.com",
        allow: "1",
        readonlyAllow: "1",
        authToken: "super-secret-token",
        tenantAId: "tenant-a-proof",
        tenantBId: "tenant-b-proof",
        mode: "staging-read-only-probe",
      },
      client,
    );

    expect(result.safety).toBe("refused");
    expect(result.networkAttempted).toBe(false);
    expect(result.mutationAttempted).toBe(false);
    expect(result.refusedReasons.join(" ")).toContain("production-looking");
    expect(client).not.toHaveBeenCalled();
  });

  it("executes only GET read-only probes when staging gates are ready", async () => {
    const requests: HostedTenantProofHttpRequest[] = [];
    const client: HostedTenantProofHttpClient = async (request) => {
      requests.push(request);
      return {
        status: request.headers["x-organization-id"] === "tenant-b-proof" ? 403 : 200,
      };
    };

    const result = await executeHostedTenantReadOnlyProbe(
      {
        environment: "staging",
        proofRunId: "proof-20260618",
        baseUrl: "https://api.staging.ledgerbyte.test/api",
        allow: "1",
        readonlyAllow: "1",
        authToken: "super-secret-token",
        tenantAId: "tenant-a-proof",
        tenantBId: "tenant-b-proof",
        mode: "staging-read-only-probe",
      },
      client,
    );

    expect(result.safety).toBe("ready");
    expect(result.passed).toBe(true);
    expect(result.networkAttempted).toBe(true);
    expect(result.mutationAttempted).toBe(false);
    expect(result.checks).toHaveLength(5);
    expect(requests).toHaveLength(5);
    expect(requests.every((request) => request.method === "GET")).toBe(true);
    expect(requests.every((request) => request.headers.Authorization === "Bearer super-secret-token")).toBe(true);
    expect(requests.some((request) => request.headers["x-organization-id"] === "tenant-b-proof")).toBe(true);
    expect(requests.map((request) => new URL(request.url).pathname)).toEqual([
      "/api/auth/me",
      "/api/dashboard/summary",
      "/api/search",
      "/api/reports/profit-and-loss",
      "/api/dashboard/summary",
    ]);
    expect(requests.map((request) => new URL(request.url).search)).toContain("?query=LB-TENANT-PROOF%3Aproof-20260618");
    expect(result.checks.every((check) => check.responseBodyCaptured === false)).toBe(true);

    const json = JSON.stringify(result);
    expect(json).not.toContain("super-secret-token");
  });

  it("fails the read-only probe if the cross-tenant organization context succeeds", async () => {
    const client: HostedTenantProofHttpClient = async () => ({ status: 200 });

    const result = await executeHostedTenantReadOnlyProbe(
      {
        environment: "staging",
        proofRunId: "proof-20260618",
        baseUrl: "https://api.staging.ledgerbyte.test",
        allow: "1",
        readonlyAllow: "1",
        authToken: "super-secret-token",
        tenantAId: "tenant-a-proof",
        tenantBId: "tenant-b-proof",
        mode: "staging-read-only-probe",
      },
      client,
    );

    const crossTenantCheck = result.checks.find((check) => check.id === "tenant-b-dashboard-summary-denied");

    expect(result.safety).toBe("ready");
    expect(result.passed).toBe(false);
    expect(crossTenantCheck).toMatchObject({
      expectedStatus: "403",
      status: 200,
      passed: false,
      failure: "unexpected-status",
      responseBodyCaptured: false,
    });
    expect(JSON.stringify(result)).not.toContain("super-secret-token");
  });
});
