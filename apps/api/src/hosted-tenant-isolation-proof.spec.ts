import {
  createHostedTenantIsolationProofPlan,
  createHostedTenantIsolationProofPlanFromCli,
  redactSecrets,
} from "./hosted-tenant-isolation-proof";

describe("hosted tenant isolation proof safety harness", () => {
  it("refuses to run without the explicit allow gate", () => {
    const plan = createHostedTenantIsolationProofPlan({
      environment: "local",
      proofRunId: "proof-20260618",
      baseUrl: "http://localhost:3001",
      allow: undefined,
    });

    expect(plan.safety).toBe("refused");
    expect(plan.networkEnabled).toBe(false);
    expect(plan.mutationEnabled).toBe(false);
    expect(plan.refusedReasons.join(" ")).toContain("LEDGERBYTE_HOSTED_TENANT_PROOF_ALLOW=1");
  });

  it("requires a proof run id before classifying a target as ready", () => {
    const plan = createHostedTenantIsolationProofPlan({
      environment: "local",
      proofRunId: "",
      baseUrl: "http://localhost:3001",
      allow: "1",
    });

    expect(plan.safety).toBe("refused");
    expect(plan.refusedReasons.join(" ")).toContain("proofRunId");
  });

  it("defaults the CLI harness to dry-run mode", () => {
    const plan = createHostedTenantIsolationProofPlanFromCli(["--proof-run-id", "proof-20260618"], {
      LEDGERBYTE_HOSTED_TENANT_PROOF_ALLOW: "1",
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

  it("refuses destructive or external operation flags", () => {
    const plan = createHostedTenantIsolationProofPlanFromCli(["--proof-run-id", "proof-20260618", "--seed"], {
      LEDGERBYTE_HOSTED_TENANT_PROOF_ALLOW: "1",
    });

    expect(plan.safety).toBe("refused");
    expect(plan.refusedReasons.join(" ")).toContain("Destructive or external operations are not allowed");
  });
});
