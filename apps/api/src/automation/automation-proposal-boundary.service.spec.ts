import { AutomationProposalBoundaryService } from "./automation-proposal-boundary.service";

describe("AutomationProposalBoundaryService", () => {
  it("returns a proposal-only automation boundary without mutation or provider authority", () => {
    const service = new AutomationProposalBoundaryService();

    const boundary = service.boundary("org-1");

    expect(boundary.scope).toEqual({ organizationId: "org-1", tenantScoped: true });
    expect(boundary.mode).toBe("PROPOSAL_ONLY");
    expect(boundary.readOnly).toBe(true);
    expect(boundary.noMutation).toBe(true);
    expect(boundary.automationEnabled).toBe(false);
    expect(boundary.aiAuthoritative).toBe(false);
    expect(boundary.requiresHumanConfirmation).toBe(true);
    expect(boundary.auditRequiredForConfirmation).toBe(true);
    expect(boundary.providerMutationAllowed).toBe(false);
    expect(boundary.hostedMutationAllowed).toBe(false);
    expect(boundary.productionClaimAllowed).toBe(false);
    expect(boundary.allowedProposalActions).toEqual([
      "Summarize existing LedgerByte-owned records.",
      "Prepare non-authoritative proposal metadata for human review.",
      "Explain blocked actions and required confirmation gates.",
    ]);
    expect(boundary.blockedActions).toEqual(
      expect.arrayContaining([
        "No automatic journal posting, invoice finalization, payment allocation, collection action, or inventory valuation mutation.",
        "No email, payment-provider, bank-feed, storage-provider, tax-network, ZATCA, UAE, Peppol, or hosted-system mutation.",
        "No compliance, provider, storage, or production-readiness claim.",
      ]),
    );
    expect(boundary.confirmationRequirements).toEqual(
      expect.arrayContaining([
        "A human user must explicitly confirm any future proposal before LedgerByte calls an existing mutation path.",
        "The confirmed path must re-check tenant scope, permissions, fiscal locks, and audit logging before mutation.",
      ]),
    );
    expect(boundary.generatedAt).toEqual(expect.any(String));
  });

  it("does not expose secrets, customer document bodies, provider payloads, or executable instructions", () => {
    const service = new AutomationProposalBoundaryService();

    const serialized = JSON.stringify(service.boundary("org-1"));

    expect(serialized).not.toMatch(/password|secret|api[_ -]?key|token|authorization|bearer/i);
    expect(serialized).not.toMatch(/customer document body|provider payload|raw email/i);
    expect(serialized).not.toMatch(/production ready|certified|official filing/i);
    expect(serialized).not.toMatch(/auto-post|autopost|auto post/i);
  });
});
