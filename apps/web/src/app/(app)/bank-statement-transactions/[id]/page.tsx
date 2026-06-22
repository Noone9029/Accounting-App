"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AttachmentPanel } from "@/components/attachments/attachment-panel";
import { usePermissions } from "@/components/permissions/permission-provider";
import {
  LedgerAlert,
  LedgerButton,
  LedgerDate,
  LedgerFieldLabel,
  LedgerFieldText,
  LedgerInput,
  LedgerLoadingState,
  LedgerMetadataRow,
  LedgerMetricGrid,
  LedgerMoney,
  LedgerPage,
  LedgerPageBody,
  LedgerPageHeader,
  LedgerPanel,
  LedgerSection,
  LedgerSelect,
  LedgerStatCard,
  LedgerStatusBadge,
  LedgerSummaryBand,
  type LedgerStatusTone,
} from "@/components/ui/ledger-system";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import {
  bankStatementTransactionStatusLabel,
  bankStatementTransactionTypeLabel,
  candidateScoreLabel,
  lockedStatementTransactionWarning,
} from "@/lib/bank-statements";
import { formatOptionalDate } from "@/lib/invoice-display";
import { formatMoneyAmount } from "@/lib/money";
import { PERMISSIONS } from "@/lib/permissions";
import type { Account, BankStatementMatchCandidate, BankStatementTransaction } from "@/lib/types";

function statementTransactionStatusTone(status: BankStatementTransaction["status"]): LedgerStatusTone {
  switch (status) {
    case "UNMATCHED":
      return "warning";
    case "MATCHED":
    case "CATEGORIZED":
      return "success";
    case "IGNORED":
      return "draft";
    case "VOIDED":
      return "danger";
  }
}

function candidateScoreTone(candidate: Pick<BankStatementMatchCandidate, "score">): LedgerStatusTone {
  if (candidate.score >= 90) return "success";
  if (candidate.score >= 75) return "info";
  return "warning";
}

export default function BankStatementTransactionDetailPage() {
  const params = useParams<{ id: string }>();
  const organizationId = useActiveOrganizationId();
  const { can } = usePermissions();
  const [transaction, setTransaction] = useState<BankStatementTransaction | null>(null);
  const [candidates, setCandidates] = useState<BankStatementMatchCandidate[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountId, setAccountId] = useState("");
  const [categoryDescription, setCategoryDescription] = useState("");
  const [ignoreReason, setIgnoreReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [submitting, setSubmitting] = useState("");
  const [reloadToken, setReloadToken] = useState(0);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const canReconcile = can(PERMISSIONS.bankStatements.reconcile);
  const currency = transaction?.bankAccountProfile?.currency ?? "SAR";
  const isUnmatched = transaction?.status === "UNMATCHED";
  const lockedWarning = transaction ? lockedStatementTransactionWarning(transaction) : null;

  useEffect(() => {
    if (!organizationId || !params.id) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    const requests: Array<Promise<unknown>> = [apiRequest<BankStatementTransaction>(`/bank-statement-transactions/${params.id}`)];
    if (canReconcile) {
      requests.push(apiRequest<Account[]>("/accounts"));
    }

    Promise.all(requests)
      .then(([transactionResult, accountResult]) => {
        if (!cancelled) {
          setTransaction(transactionResult as BankStatementTransaction);
          if (Array.isArray(accountResult)) {
            const postingAccounts = accountResult.filter((account) => account.isActive && account.allowPosting);
            setAccounts(postingAccounts);
            setAccountId((current) => current || postingAccounts[0]?.id || "");
          }
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load statement transaction.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [canReconcile, organizationId, params.id, reloadToken]);

  useEffect(() => {
    if (!organizationId || !params.id || !canReconcile || !isUnmatched || lockedWarning) {
      setCandidates([]);
      return;
    }

    let cancelled = false;
    setLoadingCandidates(true);

    apiRequest<BankStatementMatchCandidate[]>(`/bank-statement-transactions/${params.id}/match-candidates`)
      .then((result) => {
        if (!cancelled) {
          setCandidates(result);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCandidates([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingCandidates(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [canReconcile, isUnmatched, lockedWarning, organizationId, params.id, reloadToken]);

  async function submitAction(action: "match" | "categorize" | "ignore", body: unknown) {
    setSubmitting(action);
    setError("");
    setSuccess("");
    try {
      const updated = await apiRequest<BankStatementTransaction>(`/bank-statement-transactions/${params.id}/${action}`, {
        method: "POST",
        body,
      });
      setTransaction(updated);
      setSuccess(`Statement transaction ${bankStatementTransactionStatusLabel(updated.status).toLowerCase()}.`);
      setReloadToken((current) => current + 1);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Unable to update statement transaction.");
    } finally {
      setSubmitting("");
    }
  }

  return (
    <LedgerPage>
      <LedgerPageHeader
        eyebrow="Banking"
        title="Statement transaction"
        description="Manual matching, categorization, and ignore controls."
        badge={transaction ? <LedgerStatusBadge tone={statementTransactionStatusTone(transaction.status)}>{bankStatementTransactionStatusLabel(transaction.status)}</LedgerStatusBadge> : null}
        actions={transaction?.bankAccountProfileId ? <LedgerButton href={`/bank-accounts/${transaction.bankAccountProfileId}/statement-transactions`}>Back</LedgerButton> : null}
      />

      <LedgerSummaryBand tone="warning">
        Statement row review is manual. Match to posted accounting, categorize with an explicit journal, or ignore only rows that should stay out of reconciliation.
      </LedgerSummaryBand>

      <LedgerPageBody>
        {!organizationId ? <LedgerAlert tone="info">Log in and select an organization to load this statement row.</LedgerAlert> : null}
        {loading ? <LedgerLoadingState title="Loading statement transaction" /> : null}
        {error ? <LedgerAlert tone="danger">{error}</LedgerAlert> : null}
        {success ? <LedgerAlert tone="success">{success}</LedgerAlert> : null}

        {transaction ? (
          <>
            <AttachmentPanel linkedEntityType="BANK_STATEMENT_TRANSACTION" linkedEntityId={transaction.id} />

            <LedgerMetricGrid>
              <LedgerStatCard label="Date" value={<LedgerDate>{formatOptionalDate(transaction.transactionDate, "-")}</LedgerDate>} />
              <LedgerStatCard label="Type" value={bankStatementTransactionTypeLabel(transaction.type)} />
              <LedgerStatCard label="Amount" value={<LedgerMoney>{formatMoneyAmount(transaction.amount, currency)}</LedgerMoney>} />
              <LedgerStatCard label="Status" value={<LedgerStatusBadge tone={statementTransactionStatusTone(transaction.status)}>{bankStatementTransactionStatusLabel(transaction.status)}</LedgerStatusBadge>} />
            </LedgerMetricGrid>

            <StatementTransactionWorkflowGuidance transaction={transaction} canReconcile={canReconcile} lockedWarning={lockedWarning} />

            <LedgerSection title="Statement row detail" description="Imported row metadata and linked accounting references.">
              <LedgerMetadataRow
                items={[
                  { label: "Description", value: transaction.description },
                  { label: "Reference", value: transaction.reference ?? "-" },
                  { label: "Import", value: transaction.import?.filename ?? "-" },
                  { label: "Bank account", value: transaction.bankAccountProfile?.displayName ?? "-" },
                  { label: "Matched journal", value: transaction.matchedJournalEntry?.entryNumber ?? transaction.createdJournalEntry?.entryNumber ?? "-" },
                  { label: "Categorized account", value: transaction.categorizedAccount ? `${transaction.categorizedAccount.code} ${transaction.categorizedAccount.name}` : "-" },
                ]}
              />
              {transaction.ignoredReason ? <p className="mt-4 text-sm leading-6 text-steel">Ignored reason: {transaction.ignoredReason}</p> : null}
            </LedgerSection>

            {lockedWarning ? <LedgerAlert tone="warning">{lockedWarning}</LedgerAlert> : null}

            {canReconcile && isUnmatched && !lockedWarning ? (
              <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                <LedgerSection
                  title="Match candidates"
                  description="Candidates are posted journal lines with the same direction and a nearby date. Matching links the statement row to accounting that already exists."
                >
                  {loadingCandidates ? <LedgerLoadingState title="Loading match candidates" /> : null}
                  {!loadingCandidates && candidates.length === 0 ? <LedgerAlert tone="info">No posted bank journal lines matched the amount and direction.</LedgerAlert> : null}
                  <div className="mt-4 space-y-3">
                    {candidates.map((candidate) => (
                      <LedgerPanel key={candidate.journalLineId}>
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-ink">{candidate.entryNumber}</p>
                            <p className="mt-1 text-xs text-steel">{formatOptionalDate(candidate.date, "-")} - {candidate.description}</p>
                            <p className="mt-1 text-xs text-steel">{candidate.reason}</p>
                          </div>
                          <LedgerStatusBadge tone={candidateScoreTone(candidate)}>{candidateScoreLabel(candidate)}</LedgerStatusBadge>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                          <p className="font-mono text-xs text-steel">
                            Dr {formatMoneyAmount(candidate.debit, currency)} / Cr {formatMoneyAmount(candidate.credit, currency)}
                          </p>
                          <LedgerButton type="button" disabled={Boolean(submitting)} onClick={() => void submitAction("match", { journalLineId: candidate.journalLineId })}>
                            {submitting === "match" ? "Matching..." : "Match"}
                          </LedgerButton>
                        </div>
                      </LedgerPanel>
                    ))}
                  </div>
                </LedgerSection>

                <div className="space-y-5">
                  <LedgerSection
                    title="Categorize"
                    description="Use categorization only when no existing posted movement should be matched. It posts a manual journal using this statement row date."
                  >
                    <div className="space-y-3">
                      <LedgerFieldLabel>
                        <LedgerFieldText>Offset account</LedgerFieldText>
                        <LedgerSelect value={accountId} onChange={(event) => setAccountId(event.target.value)}>
                          {accounts.map((account) => (
                            <option key={account.id} value={account.id}>
                              {account.code} {account.name}
                            </option>
                          ))}
                        </LedgerSelect>
                      </LedgerFieldLabel>
                      <LedgerFieldLabel>
                        <LedgerFieldText>Description</LedgerFieldText>
                        <LedgerInput value={categoryDescription} onChange={(event) => setCategoryDescription(event.target.value)} />
                      </LedgerFieldLabel>
                      <LedgerButton type="button" disabled={Boolean(submitting) || !accountId} onClick={() => void submitAction("categorize", { accountId, description: categoryDescription || undefined })}>
                        {submitting === "categorize" ? "Posting..." : "Post categorization journal"}
                      </LedgerButton>
                    </div>
                  </LedgerSection>

                  <LedgerSection
                    title="Ignore"
                    description="Ignore rows that should stay out of reconciliation, such as duplicates already represented by another imported row."
                  >
                    <LedgerFieldLabel>
                      <LedgerFieldText>Reason</LedgerFieldText>
                      <LedgerInput value={ignoreReason} onChange={(event) => setIgnoreReason(event.target.value)} />
                    </LedgerFieldLabel>
                    <div className="mt-3">
                      <LedgerButton type="button" disabled={Boolean(submitting) || !ignoreReason.trim()} onClick={() => void submitAction("ignore", { reason: ignoreReason })}>
                        {submitting === "ignore" ? "Ignoring..." : "Ignore row"}
                      </LedgerButton>
                    </div>
                  </LedgerSection>
                </div>
              </div>
            ) : null}

            {!canReconcile ? <LedgerAlert tone="info">Your role can view statement rows, but reconciliation actions require bank statement reconcile permission.</LedgerAlert> : null}
            {canReconcile && !lockedWarning && !isUnmatched ? <LedgerAlert tone="info">Only unmatched rows can be matched, categorized, or ignored.</LedgerAlert> : null}
          </>
        ) : null}
      </LedgerPageBody>
    </LedgerPage>
  );
}

export function StatementTransactionWorkflowGuidance({
  transaction,
  canReconcile,
  lockedWarning,
}: {
  transaction: BankStatementTransaction;
  canReconcile: boolean;
  lockedWarning: string | null;
}) {
  const profileHref = transaction.bankAccountProfileId ? `/bank-accounts/${transaction.bankAccountProfileId}` : "/bank-accounts";
  const rowsHref = transaction.bankAccountProfileId ? `/bank-accounts/${transaction.bankAccountProfileId}/statement-transactions` : "/bank-accounts";
  const reconciliationHref = transaction.bankAccountProfileId ? `/bank-accounts/${transaction.bankAccountProfileId}/reconciliation` : "/bank-accounts";
  const statusCopy =
    transaction.status === "UNMATCHED"
      ? "This row is waiting for review. Match it to an existing posted bank journal, categorize it to post a manual journal, or ignore it if it should not affect reconciliation."
      : transaction.status === "MATCHED"
        ? "This row is matched to an existing posted journal line. It can be reviewed in the bank account ledger."
        : transaction.status === "CATEGORIZED"
          ? "This row created a manual categorization journal. Review that journal from the matched journal reference."
          : transaction.status === "IGNORED"
            ? "This row is ignored and stays out of reconciliation matching totals."
            : "This row is voided and remains visible for audit review.";

  return (
    <LedgerPanel>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold text-ink">What this statement row means</h2>
            <LedgerStatusBadge tone={statementTransactionStatusTone(transaction.status)}>{bankStatementTransactionStatusLabel(transaction.status)}</LedgerStatusBadge>
          </div>
          <p className="mt-2 text-sm leading-6 text-steel">{statusCopy}</p>
          <p className="mt-2 text-xs leading-5 text-steel">
            Credit rows increase the bank statement balance. Debit rows decrease it. Matching remains manual, and LedgerByte does not use live bank feeds.
          </p>
          {lockedWarning ? (
            <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              {lockedWarning} The closed period blocks match, categorize, and ignore changes.
            </div>
          ) : null}
          {!canReconcile ? (
            <p className="mt-3 text-xs leading-5 text-steel">Your role can review this row, but matching and categorization require reconcile permission.</p>
          ) : null}
        </div>
        <div className="min-w-full lg:min-w-[260px]">
          <p className="text-xs font-semibold uppercase tracking-wide text-steel">Next actions</p>
          <div className="mt-2 flex flex-wrap gap-2 lg:flex-col">
            <LedgerButton href={profileHref}>Bank account</LedgerButton>
            <LedgerButton href={rowsHref}>Statement rows</LedgerButton>
            <LedgerButton href={reconciliationHref}>Reconciliation summary</LedgerButton>
            <LedgerButton href="/dashboard">Dashboard</LedgerButton>
          </div>
        </div>
      </div>
    </LedgerPanel>
  );
}
