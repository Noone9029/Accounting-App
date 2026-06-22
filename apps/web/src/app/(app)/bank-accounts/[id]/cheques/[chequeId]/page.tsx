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
import { getChequeAccountingPreflight, postChequeJournal } from "@/lib/banking-accounting";
import {
  canBounceCheque,
  canClearCheque,
  canDepositCheque,
  canMatchCheque,
  canOpenCheque,
  canVoidCheque,
  chequeStatusLabel,
  chequeTypeLabel,
} from "@/lib/cheques";
import { formatOptionalDate } from "@/lib/invoice-display";
import { formatMoneyAmount } from "@/lib/money";
import { PERMISSIONS } from "@/lib/permissions";
import type { BankingAccountingPreflight, BankDepositBatch, BankStatementTransaction, ChequeInstrument, ChequeInstrumentStatus } from "@/lib/types";

export default function ChequeDetailPage() {
  const params = useParams<{ id: string; chequeId: string }>();
  const organizationId = useActiveOrganizationId();
  const { can } = usePermissions();
  const canManage = can(PERMISSIONS.bankStatements.manage);
  const canReconcile = can(PERMISSIONS.bankStatements.reconcile);
  const canPostJournal = can(PERMISSIONS.journals.post);
  const [cheque, setCheque] = useState<ChequeInstrument | null>(null);
  const [accountingPreflight, setAccountingPreflight] = useState<BankingAccountingPreflight | null>(null);
  const [accountingLoading, setAccountingLoading] = useState(false);
  const [deposits, setDeposits] = useState<BankDepositBatch[]>([]);
  const [matchCandidates, setMatchCandidates] = useState<BankStatementTransaction[]>([]);
  const [selectedDepositId, setSelectedDepositId] = useState("");
  const [selectedStatementId, setSelectedStatementId] = useState("");
  const [bounceReason, setBounceReason] = useState("");
  const [voidReason, setVoidReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [action, setAction] = useState("");
  const [reloadToken, setReloadToken] = useState(0);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!organizationId || !params.chequeId) {
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError("");
    apiRequest<ChequeInstrument>(`/cheques/${params.chequeId}`)
      .then((result) => {
        if (!cancelled) {
          setCheque(result);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load cheque.");
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
  }, [organizationId, params.chequeId, reloadToken]);

  useEffect(() => {
    if (!organizationId || !cheque) {
      setDeposits([]);
      setMatchCandidates([]);
      return;
    }
    let cancelled = false;
    const requests: Array<Promise<unknown>> = [];
    if (canManage && canDepositCheque(cheque.chequeType, cheque.status)) {
      requests.push(apiRequest<BankDepositBatch[]>(`/bank-deposits?bankAccountProfileId=${params.id}`));
    } else {
      requests.push(Promise.resolve([]));
    }
    if (canReconcile && canMatchCheque(cheque.status)) {
      requests.push(apiRequest<BankStatementTransaction[]>(`/cheques/${cheque.id}/match-candidates`));
    } else {
      requests.push(Promise.resolve([]));
    }
    Promise.all(requests)
      .then(([depositResult, matchResult]) => {
        if (!cancelled) {
          const draftDeposits = (depositResult as BankDepositBatch[]).filter((deposit) => deposit.status === "DRAFT" && deposit.currency === cheque.currency);
          const candidates = matchResult as BankStatementTransaction[];
          setDeposits(draftDeposits);
          setMatchCandidates(candidates);
          setSelectedDepositId((current) => current || draftDeposits[0]?.id || "");
          setSelectedStatementId((current) => current || candidates[0]?.id || "");
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load cheque supporting data.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [canManage, canReconcile, cheque, organizationId, params.id]);

  useEffect(() => {
    if (!organizationId || !cheque) {
      setAccountingPreflight(null);
      return;
    }
    let cancelled = false;
    setAccountingLoading(true);
    getChequeAccountingPreflight(cheque.id)
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
            reasons: [loadError instanceof Error ? loadError.message : "Unable to load cheque accounting preflight."],
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
  }, [cheque, organizationId]);

  async function runAction(actionName: "mark-received" | "mark-issued" | "clear" | "unmatch-statement-transaction") {
    if (!cheque) {
      return;
    }
    setAction(actionName);
    setError("");
    setSuccess("");
    try {
      const updated = await apiRequest<ChequeInstrument>(`/cheques/${cheque.id}/${actionName}`, { method: "POST" });
      setCheque(updated);
      setSuccess(actionName === "clear" ? "Cheque cleared." : actionName === "unmatch-statement-transaction" ? "Cheque unmatched." : "Cheque status updated.");
      setReloadToken((current) => current + 1);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Unable to update cheque.");
    } finally {
      setAction("");
    }
  }

  async function depositCheque() {
    if (!cheque || !selectedDepositId) {
      return;
    }
    setAction("deposit");
    setError("");
    setSuccess("");
    try {
      const updated = await apiRequest<ChequeInstrument>(`/cheques/${cheque.id}/deposit`, {
        method: "POST",
        body: { depositBatchId: selectedDepositId },
      });
      setCheque(updated);
      setSuccess("Cheque linked to deposit batch.");
      setReloadToken((current) => current + 1);
    } catch (depositError) {
      setError(depositError instanceof Error ? depositError.message : "Unable to deposit cheque.");
    } finally {
      setAction("");
    }
  }

  async function matchStatementRow() {
    if (!cheque || !selectedStatementId) {
      return;
    }
    setAction("match");
    setError("");
    setSuccess("");
    try {
      const updated = await apiRequest<ChequeInstrument>(`/cheques/${cheque.id}/match-statement-transaction`, {
        method: "POST",
        body: { statementTransactionId: selectedStatementId },
      });
      setCheque(updated);
      setSuccess("Cheque matched and cleared against statement row.");
      setReloadToken((current) => current + 1);
    } catch (matchError) {
      setError(matchError instanceof Error ? matchError.message : "Unable to match cheque.");
    } finally {
      setAction("");
    }
  }

  async function bounceCheque() {
    if (!cheque) {
      return;
    }
    if (!bounceReason.trim()) {
      setError("Bounce reason is required.");
      return;
    }
    setAction("bounce");
    setError("");
    setSuccess("");
    try {
      const updated = await apiRequest<ChequeInstrument>(`/cheques/${cheque.id}/bounce`, {
        method: "POST",
        body: { bounceReason },
      });
      setCheque(updated);
      setSuccess("Cheque bounced or stopped.");
    } catch (bounceError) {
      setError(bounceError instanceof Error ? bounceError.message : "Unable to bounce cheque.");
    } finally {
      setAction("");
    }
  }

  async function voidCheque() {
    if (!cheque) {
      return;
    }
    if (!voidReason.trim()) {
      setError("Void reason is required.");
      return;
    }
    setAction("void");
    setError("");
    setSuccess("");
    try {
      const updated = await apiRequest<ChequeInstrument>(`/cheques/${cheque.id}/void`, {
        method: "POST",
        body: { voidReason },
      });
      setCheque(updated);
      setSuccess("Cheque voided.");
    } catch (voidError) {
      setError(voidError instanceof Error ? voidError.message : "Unable to void cheque.");
    } finally {
      setAction("");
    }
  }

  async function postAccountingJournal() {
    if (!cheque) {
      return;
    }
    setAction("post-journal");
    setError("");
    setSuccess("");
    try {
      const result = await postChequeJournal(cheque.id);
      setCheque(result.record);
      setSuccess(`Journal ${result.journalEntry.entryNumber} posted for this cheque.`);
      setReloadToken((current) => current + 1);
    } catch (postError) {
      setError(postError instanceof Error ? postError.message : "Cheque journal posting remains deferred.");
    } finally {
      setAction("");
    }
  }

  return (
    <LedgerPage>
      <LedgerPageHeader
        eyebrow="Banking"
        title="Cheque detail"
        description={cheque ? `${cheque.chequeNumber} - ${chequeTypeLabel(cheque.chequeType)}` : "Manual cheque lifecycle"}
        actions={
          <>
            <LedgerButton href={`/bank-accounts/${params.id}/cheques`}>Cheques</LedgerButton>
            <LedgerButton href={`/bank-accounts/${params.id}/deposits`}>Deposits</LedgerButton>
            <LedgerButton href={`/bank-accounts/${params.id}/statement-transactions?status=UNMATCHED`}>Statement rows</LedgerButton>
          </>
        }
      />

      <LedgerSummaryBand tone="warning">
        Cheque lifecycle, deposit links, statement matching, bounce, and void actions require explicit operator action.
      </LedgerSummaryBand>

      <LedgerPageBody>
        {!organizationId ? <LedgerAlert tone="info">Log in and select an organization to load this cheque.</LedgerAlert> : null}
        {loading ? <LedgerLoadingState title="Loading cheque" /> : null}
        {error ? <LedgerAlert tone="danger">{error}</LedgerAlert> : null}
        {success ? <LedgerAlert tone="success">{success}</LedgerAlert> : null}

        {cheque ? (
          <>
            <LedgerMetricGrid>
              <LedgerStatCard label="Status" value={<LedgerStatusBadge tone={chequeStatusTone(cheque.status)}>{chequeStatusLabel(cheque.status)}</LedgerStatusBadge>} />
              <LedgerStatCard label="Amount" value={<LedgerMoney>{formatMoneyAmount(cheque.amount, cheque.currency)}</LedgerMoney>} />
              <LedgerStatCard label="Due date" value={<LedgerDate>{formatOptionalDate(cheque.dueDate, "-")}</LedgerDate>} />
              <LedgerStatCard label="Type" value={chequeTypeLabel(cheque.chequeType)} />
            </LedgerMetricGrid>

            <LedgerPanel>
              <p className="text-sm leading-6 text-steel">
                This is a manual cheque record. No live bank feed is added, no bank API is called, no bank credentials are collected, and no bank payment is sent.
              </p>
              <p className="mt-2 text-xs leading-5 text-steel">
                Direct cheque journal posting remains deferred unless a later accountant-reviewed source-accounting policy confirms cheque-in-hand or outstanding-cheque recognition. Matching and deposit links here require explicit user action.
              </p>
            </LedgerPanel>

            <AccountingStatusPanel
              preflight={accountingPreflight}
              loading={accountingLoading}
              action={action}
              canPost={canPostJournal}
              onPost={() => void postAccountingJournal()}
              postLabel="Post cheque journal"
            />

            <LedgerSection
              title="Lifecycle actions"
              description={cheque.memo ?? "No memo"}
              action={
                <div className="flex flex-wrap gap-2">
                  {canManage && canOpenCheque(cheque.status) && cheque.chequeType === "RECEIVED" ? (
                    <LedgerButton disabled={Boolean(action)} onClick={() => void runAction("mark-received")}>
                      {action === "mark-received" ? "Updating..." : "Mark received"}
                    </LedgerButton>
                  ) : null}
                  {canManage && canOpenCheque(cheque.status) && cheque.chequeType === "ISSUED" ? (
                    <LedgerButton disabled={Boolean(action)} onClick={() => void runAction("mark-issued")}>
                      {action === "mark-issued" ? "Updating..." : "Mark issued"}
                    </LedgerButton>
                  ) : null}
                  {canReconcile && canClearCheque(cheque.status) ? (
                    <LedgerButton disabled={Boolean(action)} onClick={() => void runAction("clear")}>
                      {action === "clear" ? "Clearing..." : "Clear"}
                    </LedgerButton>
                  ) : null}
                  {canReconcile && cheque.statementTransactionId ? (
                    <LedgerButton disabled={Boolean(action)} onClick={() => void runAction("unmatch-statement-transaction")}>
                      {action === "unmatch-statement-transaction" ? "Unmatching..." : "Unmatch"}
                    </LedgerButton>
                  ) : null}
                </div>
              }
            >
              <LedgerMetadataRow
                items={[
                  { label: "Counterparty", value: cheque.counterpartyName },
                  { label: "Drawer bank", value: cheque.drawerBankName ?? "-" },
                  { label: "Payee", value: cheque.payeeName ?? "-" },
                  { label: "Issue date", value: <LedgerDate>{formatOptionalDate(cheque.issueDate, "-")}</LedgerDate> },
                  { label: "Received date", value: <LedgerDate>{formatOptionalDate(cheque.receivedDate, "-")}</LedgerDate> },
                  { label: "Reference", value: cheque.reference ?? "-" },
                  { label: "Deposited", value: <LedgerDate>{formatOptionalDate(cheque.depositDate, "-")}</LedgerDate> },
                  { label: "Cleared", value: <LedgerDate>{formatOptionalDate(cheque.clearedDate, "-")}</LedgerDate> },
                  { label: "Bounced", value: <LedgerDate>{formatOptionalDate(cheque.bouncedDate, "-")}</LedgerDate> },
                ]}
              />
            </LedgerSection>

            {canManage && canDepositCheque(cheque.chequeType, cheque.status) ? (
              <LedgerSection title="Deposit received cheque" description="Depositing creates one cheque source line in a draft deposit batch. It does not post a journal entry.">
                {deposits.length === 0 ? <LedgerEmptyState title="No draft deposit batches are available for this bank account and currency." /> : null}
                {deposits.length > 0 ? (
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto] md:items-end">
                    <LedgerFieldLabel>
                      <LedgerFieldText>Draft deposit batch</LedgerFieldText>
                      <LedgerSelect value={selectedDepositId} onChange={(event) => setSelectedDepositId(event.target.value)}>
                        {deposits.map((deposit) => (
                          <option key={deposit.id} value={deposit.id}>
                            {formatOptionalDate(deposit.depositDate, "-")} - {formatMoneyAmount(deposit.totalAmount, deposit.currency)}
                          </option>
                        ))}
                      </LedgerSelect>
                    </LedgerFieldLabel>
                    <LedgerButton disabled={!selectedDepositId || Boolean(action)} onClick={() => void depositCheque()}>
                      {action === "deposit" ? "Depositing..." : "Deposit cheque"}
                    </LedgerButton>
                  </div>
                ) : null}
              </LedgerSection>
            ) : null}

            {canReconcile && canMatchCheque(cheque.status) ? (
              <LedgerSection title="Match statement row" description="Received cheques match credit rows. Issued cheques match debit rows. Matching is explicit.">
                {matchCandidates.length === 0 ? <LedgerEmptyState title="No matching statement rows found within the date window." /> : null}
                {matchCandidates.length > 0 ? (
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto] md:items-end">
                    <LedgerFieldLabel>
                      <LedgerFieldText>Candidate row</LedgerFieldText>
                      <LedgerSelect value={selectedStatementId} onChange={(event) => setSelectedStatementId(event.target.value)}>
                        {matchCandidates.map((candidate) => (
                          <option key={candidate.id} value={candidate.id}>
                            {formatOptionalDate(candidate.transactionDate, "-")} - {candidate.description} - {candidate.type} - {formatMoneyAmount(candidate.amount, cheque.currency)}
                          </option>
                        ))}
                      </LedgerSelect>
                    </LedgerFieldLabel>
                    <LedgerButton disabled={!selectedStatementId || Boolean(action)} onClick={() => void matchStatementRow()}>
                      {action === "match" ? "Matching..." : "Match cheque"}
                    </LedgerButton>
                  </div>
                ) : null}
              </LedgerSection>
            ) : null}

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {canReconcile && canBounceCheque(cheque.status) ? (
                <LedgerSection title="Bounce or stop" description="A reason is required before the cheque status changes.">
                  <LedgerFieldLabel>
                    <LedgerFieldText>Reason</LedgerFieldText>
                    <LedgerInput value={bounceReason} onChange={(event) => setBounceReason(event.target.value)} placeholder="Reason required" />
                  </LedgerFieldLabel>
                  <LedgerButton disabled={Boolean(action)} onClick={() => void bounceCheque()} className="mt-3">
                    {action === "bounce" ? "Updating..." : "Bounce/stop cheque"}
                  </LedgerButton>
                </LedgerSection>
              ) : null}
              {canReconcile && canVoidCheque(cheque.status) ? (
                <LedgerSection title="Void" description="A reason is required before the cheque is voided.">
                  <LedgerFieldLabel>
                    <LedgerFieldText>Reason</LedgerFieldText>
                    <LedgerInput value={voidReason} onChange={(event) => setVoidReason(event.target.value)} placeholder="Reason required" />
                  </LedgerFieldLabel>
                  <LedgerButton disabled={Boolean(action)} onClick={() => void voidCheque()} className="mt-3">
                    {action === "void" ? "Voiding..." : "Void cheque"}
                  </LedgerButton>
                </LedgerSection>
              ) : null}
            </div>

            {cheque.depositBatch ? (
              <LedgerSection
                title="Linked deposit batch"
                description="The linked draft or posted deposit remains available from its deposit detail route."
                action={<LedgerButton href={`/bank-accounts/${params.id}/deposits/${cheque.depositBatch.id}`}>Open deposit</LedgerButton>}
              >
                <LedgerMetadataRow
                  items={[
                    { label: "Date", value: <LedgerDate>{formatOptionalDate(cheque.depositBatch.depositDate, "-")}</LedgerDate> },
                    { label: "Amount", value: <LedgerMoney>{formatMoneyAmount(cheque.depositBatch.totalAmount, cheque.currency)}</LedgerMoney> },
                  ]}
                />
              </LedgerSection>
            ) : null}

            {cheque.statementTransaction ? (
              <LedgerSection
                title="Linked statement row"
                description="The linked bank statement row remains available from the standalone statement detail route."
                action={<LedgerButton href={`/bank-statement-transactions/${cheque.statementTransaction.id}`}>Open statement row</LedgerButton>}
              >
                <LedgerMetadataRow
                  items={[
                    { label: "Date", value: <LedgerDate>{formatOptionalDate(cheque.statementTransaction.transactionDate, "-")}</LedgerDate> },
                    { label: "Description", value: cheque.statementTransaction.description },
                    { label: "Amount", value: <LedgerMoney>{formatMoneyAmount(cheque.statementTransaction.amount, cheque.currency)}</LedgerMoney> },
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

function chequeStatusTone(status: ChequeInstrumentStatus): LedgerStatusTone {
  if (status === "CLEARED") return "success";
  if (status === "BOUNCED") return "danger";
  if (status === "VOIDED") return "neutral";
  if (status === "DEPOSITED") return "warning";
  if (status === "RECEIVED" || status === "ISSUED") return "info";
  return "draft";
}
