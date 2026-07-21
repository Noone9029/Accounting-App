import { Injectable } from "@nestjs/common";

export type AutomationProposalBoundaryMode = "PROPOSAL_ONLY";

export interface AutomationProposalBoundaryResponse {
  generatedAt: string;
  scope: {
    organizationId: string;
    tenantScoped: true;
  };
  mode: AutomationProposalBoundaryMode;
  readOnly: true;
  noMutation: true;
  automationEnabled: false;
  aiAuthoritative: false;
  requiresHumanConfirmation: true;
  auditRequiredForConfirmation: true;
  providerMutationAllowed: false;
  hostedMutationAllowed: false;
  productionClaimAllowed: false;
  allowedProposalActions: string[];
  blockedActions: string[];
  confirmationRequirements: string[];
}

@Injectable()
export class AutomationProposalBoundaryService {
  boundary(organizationId: string): AutomationProposalBoundaryResponse {
    return {
      generatedAt: new Date().toISOString(),
      scope: {
        organizationId,
        tenantScoped: true,
      },
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
        "The confirmed path must stay on LedgerByte-owned APIs and must not trust model-supplied tenant, account, provider, or compliance identifiers.",
      ],
    };
  }
}
