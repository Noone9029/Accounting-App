"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AccountingStatusPanel } from "@/components/banking/accounting-status-panel";
import { usePermissions } from "@/components/permissions/permission-provider";
import {
  LedgerAlert,
  LedgerButton,
  LedgerDate,
  LedgerEmptyState,
  LedgerFieldLabel,
  LedgerFieldText,
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
import { getCardSettlementAccountingPreflight, postCardSettlementJournal } from "@/lib/banking-accounting";
import {
  canMatchCardSettlement,
  canPostCardSettlement,
  canVoidCardSettlement,
  cardSettlementStatusLabel,
  cardSettlementTypeLabel,
} from "@/lib/card-settlements";
import { formatOptionalDate } from "@/lib/invoice-display";
import { formatMoneyAmount } from "@/lib/money";
import { PERMISSIONS } from "@/lib/permissions";
import type { BankingAccountingPreflight, BankStatementTransaction, CardSettlement, CardSettlementStatus } from "@/lib/types";

export default function CardSettlementDetailPage() {
  const params = useParams<{ id: string; settlementId: string }>();
  const organizationId = useActiveOrganizationId();
  const { can } = usePermissions();
  const canReconcile = can(PERMISSIONS.bankStatements.reconcile);
  const canPostJournal = can(PERMISSIONS.journals.post);
  const [settlement, setSettlement] = useState<CardSettlement | null>(null);
  const [accountingPreflight, setAccountingPreflight] = useState<BankingAccountingPreflight | null>(null);
  const [accountingLoading, setAccountingLoading] = useState(false);
  const [matchCandidates, setMatchCandidates] = useState<BankStatementTransaction[]>([]);
  const [selectedStatementId, setSelectedStatementId] = useState("");
  const [loading, setLoading] = useState(false);
  const [action, setAction] = useState("");
  const [reloadToken, setReloadToken] = useState(0);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!organizationId || !params.settlementId) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    apiRequest<CardSettlement>(`/card-settlements/${params.settlementId}`)
      .then((result) => {
        if (!cancelled) {
          setSettlement(result);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load card settlement.");
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
  }, [organizationId, params.settlementId, reloadToken]);

  useEffect(() => {
    if (!organizationId || !settlement || settlement.status !== "POSTED") {
      setMatchCandidates([]);
      return;
    }

    let cancelled = false;
    apiRequest<BankStatementTransaction[]>(`/card-settlements/${settlement.id}/match-candidates`)
      .then((candidates) => {
        if (!cancelled) {
          setMatchCandidates(candidates);
          setSelectedStatementId((current) => current || candidates[0]?.id || "");
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load card settlement match candidates.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [organizationId, settlement]);

  useEffect(() => {
    if (!organizationId || !settlement) {
      setAccountingPreflight(null);
      return;
    }

    let cancelled = false;
    setAccountingLoading(true);
    getCardSettlementAccountingPreflight(settlement.id)
      .then((preflight) => {
        if (!cancelled) {
          setAccountingPreflight(preflight);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setAccountingPreflight({
            status: "BLOCKED",
            ready: false,
            reasons: [loadError instanceof Error ? loadError.message : "Unable to load card settlement accounting preflight."],
            warnings: [],
          });
        }
      })
      .finally(() => {
        if (!cancelled) {
          setAccountingLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [organizationId, settlement]);

  async function runSettlementAction(actionName: "post" | "void" | "unmatch-statement-transaction") {
    if (!settlement) {
      return;
    }
    setAction(actionName);
    setError("");
    setSuccess("");
    try {
      const updated = await apiRequest<CardSettlement>(`/card-settlements/${settlement.id}/${actionName}`, { method: "POST" });
      setSettlement(updated);
      setSuccess(
        actionName === "post"
          ? "Card settlement posted for operational matching."
          : actionName === "void"
            ? "Card settlement voided."
            : "Card settlement unmatched.",
      );
      setReloadToken((current) => current + 1);
    } catch (settlementError) {
      setError(settlementError instanceof Error ? settlementError.message : "Unable to update card settlement.");
    } finally {
      setAction("");
    }
  }

  async function matchStatementRow() {
    if (!settlement || !selectedStatementId) {
      return;
    }
    setAction("match");
    setError("");
    setSuccess("");
    try {
      const updated = await apiRequest<CardSettlement>(`/card-settlements/${settlement.id}/match-statement-transaction`, {
        method: "POST",
        body: { statementTransactionId: selectedStatementId },
      });
      setSettlement(updated);
      setSuccess("Card settlement matched to statement row.");
      setReloadToken((current) => current + 1);
    } catch (matchError) {
      setError(matchError instanceof Error ? matchError.message : "Unable to match statement row.");
    } finally {
      setAction("");
    }
  }

  async function postAccountingJournal() {
    if (!settlement) {
      return;
    }
    setAction("post-journal");
    setError("");
    setSuccess("");
    try {
      const result = await postCardSettlementJournal(settlement.id);
      setSettlement(result.record);
      setSuccess(`Journal ${result.journalEntry.entryNumber} posted for this card settlement.`);
      setReloadToken((current) => current + 1);
    } catch (postError) {
      setError(postError instanceof Error ? postError.message : "Unable to post card settlement journal.");
    } finally {
      setAction("");
    }
  }

  return (
    <LedgerPage>
      <LedgerPageHeader
        eyebrow="Banking"
        title="Card settlement detail"
        description={settlement ? cardSettlementTypeLabel(settlement.settlementType) : "Credit and prepaid card settlement"}
        actions={
          <>
            <LedgerButton href={`/bank-accounts/${params.id}/card-settlements`}>Card settlements</LedgerButton>
            <LedgerButton href={`/bank-accounts/${params.id}/statement-transactions?status=UNMATCHED`}>Statement rows</LedgerButton>
          </>
        }
      />

      <LedgerSummaryBand tone="warning">
        Card settlement posting, matching, and voiding remain explicit operator actions; credit-card credit offsets stay operational-only until policy is confirmed.
      </LedgerSummaryBand>

      <LedgerPageBody>
        {!organizationId ? <LedgerAlert tone="info">Log in and select an organization to load this card settlement.</LedgerAlert> : null}
        {loading ? <LedgerLoadingState title="Loading card settlement" /> : null}
        {error ? <LedgerAlert tone="danger">{error}</LedgerAlert> : null}
        {success ? <LedgerAlert tone="success">{success}</LedgerAlert> : null}

        {settlement ? (
          <>
            <LedgerMetricGrid>
              <LedgerStatCard label="Status" value={<LedgerStatusBadge tone={cardSettlementStatusTone(settlement.status)}>{cardSettlementStatusLabel(settlement.status)}</LedgerStatusBadge>} />
              <LedgerStatCard label="Amount" value={<LedgerMoney>{formatMoneyAmount(settlement.amount, settlement.currency)}</LedgerMoney>} />
              <LedgerStatCard label="Settlement date" value={<LedgerDate>{formatOptionalDate(settlement.settlementDate, "-")}</LedgerDate>} />
              <LedgerStatCard label="Type" value={cardSettlementTypeLabel(settlement.settlementType)} />
            </LedgerMetricGrid>

            <LedgerPanel>
              <p className="text-sm leading-6 text-steel">
                This is a manual card settlement record for reconciliation. No live bank feed is added, no bank API is called, no card credentials are collected, and no bank payment is sent.
              </p>
              <p className="mt-2 text-xs leading-5 text-steel">
                Card paydowns and prepaid top-ups can be journal-posted only after clearing-account configuration passes preflight. Credit-card credits remain operational-only until an accountant-reviewed offset policy exists.
              </p>
            </LedgerPanel>

            <AccountingStatusPanel
              preflight={accountingPreflight}
              loading={accountingLoading}
              action={action}
              canPost={canPostJournal}
              onPost={() => void postAccountingJournal()}
              postLabel="Post card settlement journal"
            />

            <LedgerSection
              title="Settlement metadata"
              description={settlement.memo ?? "No memo"}
              action={
                <div className="flex flex-wrap gap-2">
                  {canReconcile && canPostCardSettlement(settlement.status) ? (
                    <LedgerButton disabled={Boolean(action)} onClick={() => void runSettlementAction("post")}>
                      {action === "post" ? "Posting..." : "Post settlement"}
                    </LedgerButton>
                  ) : null}
                  {canReconcile && settlement.status === "MATCHED" ? (
                    <LedgerButton disabled={Boolean(action)} onClick={() => void runSettlementAction("unmatch-statement-transaction")}>
                      {action === "unmatch-statement-transaction" ? "Unmatching..." : "Unmatch"}
                    </LedgerButton>
                  ) : null}
                  {canReconcile && canVoidCardSettlement(settlement.status) ? (
                    <LedgerButton disabled={Boolean(action)} onClick={() => void runSettlementAction("void")}>
                      {action === "void" ? "Voiding..." : "Void"}
                    </LedgerButton>
                  ) : null}
                </div>
              }
            >
              <LedgerMetadataRow
                items={[
                  { label: "Funding account", value: settlement.fundingBankAccountProfile?.displayName ?? "-" },
                  { label: "Card account", value: settlement.cardAccountProfile?.displayName ?? "-" },
                  { label: "Reference", value: settlement.reference ?? "-" },
                  { label: "Posted at", value: <LedgerDate>{formatOptionalDate(settlement.postedAt, "-")}</LedgerDate> },
                  { label: "Matched at", value: <LedgerDate>{formatOptionalDate(settlement.matchedAt, "-")}</LedgerDate> },
                  { label: "Voided at", value: <LedgerDate>{formatOptionalDate(settlement.voidedAt, "-")}</LedgerDate> },
                ]}
              />
            </LedgerSection>

            {canReconcile && canMatchCardSettlement(settlement.status) ? (
              <LedgerSection
                title="Match statement row"
                description="Matching is explicit. Paydowns and prepaid top-ups match funding-account debit rows; credit card credits match card-account credit rows."
              >
                {matchCandidates.length === 0 ? <LedgerEmptyState title="No matching statement rows found within the date window." /> : null}
                {matchCandidates.length > 0 ? (
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto] md:items-end">
                    <LedgerFieldLabel>
                      <LedgerFieldText>Candidate row</LedgerFieldText>
                      <LedgerSelect value={selectedStatementId} onChange={(event) => setSelectedStatementId(event.target.value)}>
                        {matchCandidates.map((candidate) => (
                          <option key={candidate.id} value={candidate.id}>
                            {formatOptionalDate(candidate.transactionDate, "-")} - {candidate.description} - {candidate.type} - {formatMoneyAmount(candidate.amount, settlement.currency)}
                          </option>
                        ))}
                      </LedgerSelect>
                    </LedgerFieldLabel>
                    <LedgerButton disabled={!selectedStatementId || Boolean(action)} onClick={() => void matchStatementRow()}>
                      {action === "match" ? "Matching..." : "Match card settlement"}
                    </LedgerButton>
                  </div>
                ) : null}
              </LedgerSection>
            ) : null}

            {settlement.statementTransaction ? (
              <LedgerSection
                title="Linked statement row"
                description="The linked bank statement row remains available from the standalone statement detail route."
                action={<LedgerButton href={`/bank-statement-transactions/${settlement.statementTransaction.id}`}>Open statement row</LedgerButton>}
              >
                <LedgerMetadataRow
                  items={[
                    { label: "Date", value: <LedgerDate>{formatOptionalDate(settlement.statementTransaction.transactionDate, "-")}</LedgerDate> },
                    { label: "Description", value: settlement.statementTransaction.description },
                    { label: "Amount", value: <LedgerMoney>{formatMoneyAmount(settlement.statementTransaction.amount, settlement.currency)}</LedgerMoney> },
                  ]}
                />
              </LedgerSection>
            ) : null}
          </>
        ) : null}
      </LedgerPageBody>
    </LedgerPage>
  );
}

function cardSettlementStatusTone(status: CardSettlementStatus): LedgerStatusTone {
  if (status === "MATCHED") return "success";
  if (status === "POSTED") return "info";
  if (status === "VOIDED") return "neutral";
  return "draft";
}
