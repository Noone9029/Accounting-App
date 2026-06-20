import { buildIntegrationReadinessPolicy, INTEGRATION_READINESS_BOUNDARY } from "./integration-readiness-policy";

describe("integration readiness policy", () => {
  it("classifies local fixture mode without allowing external calls or mutations", () => {
    const policy = buildIntegrationReadinessPolicy({
      surface: "bank-feed",
      mode: "local-fixture",
      configPresent: false,
      localFixtureAvailable: true,
    });

    expect(policy).toMatchObject({
      status: "LOCAL_FIXTURE",
      label: "Local fixture",
      operatorAction: "Use local fixtures or manual workflow until external evidence is reviewed.",
      boundary: INTEGRATION_READINESS_BOUNDARY,
      blockers: [],
      warnings: ["External configuration is not present."],
    });
    expect(Object.values(policy.boundary).every((value) => value === false)).toBe(true);
  });

  it("blocks external call attempts when hosted mutation approval is absent", () => {
    const policy = buildIntegrationReadinessPolicy({
      surface: "payment",
      mode: "external-provider",
      configPresent: true,
      evidenceReviewed: true,
      externalCallsRequested: true,
      hostedMutationApproved: false,
    });

    expect(policy.status).toBe("BLOCKED");
    expect(policy.blockers).toContain("External calls require explicit hosted-mutation approval for this surface.");
    expect(policy.boundary.externalCallEnabled).toBe(false);
    expect(policy.boundary.hostedMutationEnabled).toBe(false);
  });

  it("marks configured but unverified provider surfaces as degraded", () => {
    const policy = buildIntegrationReadinessPolicy({
      surface: "email",
      mode: "external-provider",
      configPresent: true,
      evidenceReviewed: false,
      signedWebhookVerified: false,
      monitoringReviewed: false,
    });

    expect(policy).toMatchObject({
      status: "DEGRADED",
      label: "Configured, evidence incomplete",
      blockers: [],
      warnings: [
        "External evidence has not been reviewed.",
        "Signed webhook verification has not been reviewed.",
        "Monitoring evidence has not been reviewed.",
      ],
    });
  });

  it("returns operator review status only after evidence and monitoring are reviewed", () => {
    const policy = buildIntegrationReadinessPolicy({
      surface: "storage",
      mode: "external-provider",
      configPresent: true,
      evidenceReviewed: true,
      signedWebhookVerified: true,
      monitoringReviewed: true,
      externalCallsRequested: false,
    });

    expect(policy).toMatchObject({
      status: "OPERATOR_REVIEW",
      label: "Evidence ready for operator review",
      warnings: [],
      blockers: [],
    });
    expect(policy.boundary.storageObjectMutationEnabled).toBe(false);
  });

  it("rejects unsupported surface and mode values", () => {
    expect(() =>
      buildIntegrationReadinessPolicy({
        surface: "social-feed" as never,
        mode: "local-fixture",
      }),
    ).toThrow("Unsupported integration readiness surface: social-feed");

    expect(() =>
      buildIntegrationReadinessPolicy({
        surface: "email",
        mode: "always-on" as never,
      }),
    ).toThrow("Unsupported integration readiness mode: always-on");
  });
});
