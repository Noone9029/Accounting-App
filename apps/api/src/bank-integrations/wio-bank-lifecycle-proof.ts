import { redactForDiagnostics } from "../observability/redaction";

export interface WioBankLifecycleProofEvidence {
  generatedAt: string;
  gitCommit: string;
  sourceBase: string;
  proofScope: "local-test-only";
  provider: "MOCK_WIO";
  result: "PASS" | "FAIL";
  lifecycle: {
    connectionStatus: string;
    feedAccountStatus: string;
    syncRunStatus: string;
    feedTransactionCount: number;
    beneficiaryMappingStatus: string;
    paymentRequestStatuses: string[];
    releaseAttempted: false;
    externalReleaseRecordedOnly: true;
    reconciliationLinked: boolean;
  };
  counts: {
    organizationsSeeded: number;
    suppliersSeeded: number;
    purchaseBillsSeeded: number;
    bankConnections: number;
    bankFeedAccounts: number;
    bankFeedSyncRuns: number;
    bankFeedTransactions: number;
    beneficiaryMappings: number;
    paymentRequests: number;
    auditEvents: number;
    requestIdsCaptured: number;
  };
  tenantIsolation: {
    crossTenantSupplierBlocked: boolean;
    crossTenantFeedTransactionBlocked: boolean;
    tenantBRecordsHiddenFromTenantAList: boolean;
  };
  auditTrail: Array<{ action: string; entityType: string; hasRequestId: boolean }>;
  safety: {
    noRealWioApiCalls: true;
    noRealMoneyMovement: true;
    noBankCredentialsStored: true;
    noHostedMutation: true;
    rawProviderPayloadsStored: false;
    rawBankDetailsIncluded: false;
    zatcaOrUaeComplianceTouched: false;
  };
}

const UNSAFE_EVIDENCE_PATTERNS = [
  /postgres(?:ql)?:\/\/\S+/i,
  /Bearer\s+[A-Za-z0-9._~+/=-]+/i,
  /sk_(?:test|live)_[A-Za-z0-9]+/i,
  /whsec_[A-Za-z0-9]+/i,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/i,
  /AKIA[0-9A-Z]{16}/,
  /AE[0-9]{21}/i,
  /wio-(?:connection|account|transaction|beneficiary)-[A-Za-z0-9-]+/i,
  /beneficiary-account-[A-Za-z0-9-]+/i,
  /manual-bank-confirmation-[A-Za-z0-9-]+/i,
];

export function buildWioBankLifecycleProofEvidence(input: WioBankLifecycleProofEvidence): WioBankLifecycleProofEvidence {
  const evidence = redactForDiagnostics(input) as WioBankLifecycleProofEvidence;
  assertWioBankLifecycleEvidenceIsSafe(evidence);
  return evidence;
}

export function assertWioBankLifecycleEvidenceIsSafe(evidence: unknown): void {
  const serialized = JSON.stringify(evidence);
  const unsafePattern = UNSAFE_EVIDENCE_PATTERNS.find((pattern) => pattern.test(serialized));
  if (unsafePattern) {
    throw new Error(`Wio bank lifecycle evidence contains unsafe diagnostic content matching ${unsafePattern.source}.`);
  }
}

export function renderWioBankLifecycleEvidenceMarkdown(evidence: WioBankLifecycleProofEvidence): string {
  assertWioBankLifecycleEvidenceIsSafe(evidence);
  return [
    "# Wio Bank Lifecycle Proof Evidence",
    "",
    `- Result: ${evidence.result}`,
    `- Generated at: ${evidence.generatedAt}`,
    `- Git commit: ${evidence.gitCommit}`,
    `- Source base: ${evidence.sourceBase}`,
    `- Scope: ${evidence.proofScope}`,
    `- Provider: ${evidence.provider}`,
    "",
    "## Lifecycle",
    "",
    `- Connection: ${evidence.lifecycle.connectionStatus}`,
    `- Feed account: ${evidence.lifecycle.feedAccountStatus}`,
    `- Sync run: ${evidence.lifecycle.syncRunStatus}`,
    `- Feed transactions: ${evidence.lifecycle.feedTransactionCount}`,
    `- Beneficiary mapping: ${evidence.lifecycle.beneficiaryMappingStatus}`,
    `- Payment request statuses: ${evidence.lifecycle.paymentRequestStatuses.join(" -> ")}`,
    `- Release attempted: ${evidence.lifecycle.releaseAttempted ? "yes" : "no"}`,
    `- External release recorded only: ${evidence.lifecycle.externalReleaseRecordedOnly ? "yes" : "no"}`,
    `- Reconciliation linked: ${evidence.lifecycle.reconciliationLinked ? "yes" : "no"}`,
    "",
    "## Counts",
    "",
    `- Organizations seeded: ${evidence.counts.organizationsSeeded}`,
    `- Suppliers seeded: ${evidence.counts.suppliersSeeded}`,
    `- Purchase bills seeded: ${evidence.counts.purchaseBillsSeeded}`,
    `- Bank connections: ${evidence.counts.bankConnections}`,
    `- Feed accounts: ${evidence.counts.bankFeedAccounts}`,
    `- Sync runs: ${evidence.counts.bankFeedSyncRuns}`,
    `- Feed transactions: ${evidence.counts.bankFeedTransactions}`,
    `- Beneficiary mappings: ${evidence.counts.beneficiaryMappings}`,
    `- Payment requests: ${evidence.counts.paymentRequests}`,
    `- Audit events: ${evidence.counts.auditEvents}`,
    `- Request IDs captured: ${evidence.counts.requestIdsCaptured}`,
    "",
    "## Tenant Isolation",
    "",
    `- Cross-tenant supplier blocked: ${evidence.tenantIsolation.crossTenantSupplierBlocked ? "yes" : "no"}`,
    `- Cross-tenant feed transaction blocked: ${evidence.tenantIsolation.crossTenantFeedTransactionBlocked ? "yes" : "no"}`,
    `- Tenant B records hidden from Tenant A list: ${evidence.tenantIsolation.tenantBRecordsHiddenFromTenantAList ? "yes" : "no"}`,
    "",
    "## Safety",
    "",
    "- No real Wio API calls were made.",
    "- No real money movement was attempted.",
    "- No bank credentials were stored.",
    "- No hosted database mutation was attempted.",
    "- No ZATCA or UAE compliance implementation was touched.",
    "",
  ].join("\n");
}
