import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";

import { AutomationProposalBoundaryPanel } from "./automation-proposal-boundary-panel";
import type { AutomationProposalBoundaryResponse } from "@/lib/types";

describe("AutomationProposalBoundaryPanel", () => {
  it("renders proposal-only automation posture without mutation controls or production claims", () => {
    render(<AutomationProposalBoundaryPanel boundary={boundaryFixture()} />);

    expect(screen.getByText("Automation proposal boundary")).toBeInTheDocument();
    expect(screen.getByText("Proposal-only")).toBeInTheDocument();
    expect(screen.getByText("Read-only")).toBeInTheDocument();
    expect(screen.getByText("No mutation")).toBeInTheDocument();
    expect(screen.getByText("Human confirmation required")).toBeInTheDocument();
    expect(screen.getByText("Audit required")).toBeInTheDocument();
    expect(screen.getByText("Summarize existing LedgerByte-owned records.")).toBeInTheDocument();
    expect(screen.getByText("Prepare non-authoritative proposal metadata for human review.")).toBeInTheDocument();
    expect(screen.getByText("Explain blocked actions and required confirmation gates.")).toBeInTheDocument();
    expect(screen.getByText(/No automatic journal posting/i)).toBeInTheDocument();
    expect(screen.getByText(/No email, payment-provider, bank-feed/i)).toBeInTheDocument();
    expect(screen.getByText(/No compliance, provider, storage/i)).toBeInTheDocument();
    expect(screen.getByText(/A human user must explicitly confirm/i)).toBeInTheDocument();
    expect(screen.getByText(/re-check tenant scope, permissions, fiscal locks, and audit logging/i)).toBeInTheDocument();

    expect(document.body).not.toHaveTextContent("sk_live");
    expect(document.body).not.toHaveTextContent("smtp-password");
    expect(document.body).not.toHaveTextContent("customer document body");
    expect(document.body).not.toHaveTextContent("raw provider payload");
    expect(document.body).not.toHaveTextContent(/production ready/i);
    expect(screen.queryByRole("button", { name: /post|confirm|send|enable|run|automate|provider/i })).not.toBeInTheDocument();
  });

  it("renders empty proposal lists as blocked review guidance", () => {
    render(
      <AutomationProposalBoundaryPanel
        boundary={{ ...boundaryFixture(), allowedProposalActions: [], blockedActions: [], confirmationRequirements: [] }}
      />,
    );

    expect(screen.getByText("No proposal actions configured")).toBeInTheDocument();
    expect(screen.getByText("No blocked actions configured")).toBeInTheDocument();
    expect(screen.getByText("No confirmation requirements configured")).toBeInTheDocument();
  });
});

function boundaryFixture(): AutomationProposalBoundaryResponse {
  return {
    generatedAt: "2026-06-21T08:00:00.000Z",
    scope: { organizationId: "org-1", tenantScoped: true },
    mode: "PROPOSAL_ONLY",
    readOnly: true,
    noMutation: true,
    automationEnabled: false,
    aiAuthoritative: false,
    requiresHumanConfirmation: true,
    auditRequiredForConfirmation: true,
    providerMutationAllowed: false,
    hostedMutationAllowed: false,
    productionClaimAllowed: false,
    allowedProposalActions: [
      "Summarize existing LedgerByte-owned records.",
      "Prepare non-authoritative proposal metadata for human review.",
      "Explain blocked actions and required confirmation gates.",
    ],
    blockedActions: [
      "No automatic journal posting, invoice finalization, payment allocation, collection action, or inventory valuation mutation.",
      "No email, payment-provider, bank-feed, storage-provider, tax-network, ZATCA, UAE, Peppol, or hosted-system mutation.",
      "No compliance, provider, storage, or production-readiness claim.",
    ],
    confirmationRequirements: [
      "A human user must explicitly confirm any future proposal before LedgerByte calls an existing mutation path.",
      "The confirmed path must re-check tenant scope, permissions, fiscal locks, and audit logging before mutation.",
    ],
  };
}
