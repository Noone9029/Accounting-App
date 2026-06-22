"use client";

import { useParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { AccountingStatusPanel } from "@/components/banking/accounting-status-panel";
import { usePermissions } from "@/components/permissions/permission-provider";
import {
  LedgerAlert,
  LedgerButton,
  LedgerDataTable,
  LedgerDate,
  LedgerEmptyState,
  LedgerFieldHelp,
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
import { getDepositAccountingPreflight, postDepositJournal } from "@/lib/banking-accounting";
import {
  bankDepositSourceTypeLabel,
  bankDepositStatusLabel,
  canMatchBankDeposit,
  canPostBankDeposit,
  canVoidBankDeposit,
  validateBankDepositLineInput,
} from "@/lib/bank-deposits";
import { formatOptionalDate } from "@/lib/invoice-display";
import { formatMoneyAmount } from "@/lib/money";
import { PERMISSIONS } from "@/lib/permissions";
import type {
  BankDepositBatch,
  BankDepositBatchLineSourceType,
  BankDepositBatchStatus,
  BankDepositSourceCandidate,
  BankingAccountingPreflight,
  BankStatementTransaction,
} from "@/lib/types";

const SOURCE_TYPES: BankDepositBatchLineSourceType[] = [
  "CUSTOMER_PAYMENT",
  "MANUAL_CASH_RECEIPT",
  "RECEIPT",
  "CHEQUE_PLACEHOLDER",
  "OTHER_CLEARING_ITEM",
];

export default function BankDepositDetailPage() {
  const params = useParams<{ id: string; depositId: string }>();
  const organizationId = useActiveOrganizationId();
  const { can } = usePermissions();
  const canManage = can(PERMISSIONS.bankStatements.manage);
  const canReconcile = can(PERMISSIONS.bankStatements.reconcile);
  const canPostJournal = can(PERMISSIONS.journals.post);
  const [deposit, setDeposit] = useState<BankDepositBatch | null>(null);
  const [accountingPreflight, setAccountingPreflight] = useState<BankingAccountingPreflight | null>(null);
  const [accountingLoading, setAccountingLoading] = useState(false);
  const [sourceCandidates, setSourceCandidates] = useState<BankDepositSourceCandidate[]>([]);
  const [matchCandidates, setMatchCandidates] = useState<BankStatementTransaction[]>([]);
  const [sourceType, setSourceType] = useState<BankDepositBatchLineSourceType>("MANUAL_CASH_RECEIPT");
  const [sourceId, setSourceId] = useState("");
  const [counterpartyName, setCounterpartyName] = useState("");
  const [reference, setReference] = useState("");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [selectedStatementId, setSelectedStatementId] = useState("");
  const [loading, setLoading] = useState(false);
  const [action, setAction] = useState("");
  const [reloadToken, setReloadToken] = useState(0);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!organizationId || !params.depositId || !params.id) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    apiRequest<BankDepositBatch>(`/bank-deposits/${params.depositId}`)
      .then((result) => {
        if (!cancelled) {
          setDeposit(result);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load bank deposit batch.");
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
  }, [organizationId, params.depositId, params.id, reloadToken]);

  useEffect(() => {
    if (!organizationId || !deposit) {
      return;
    }

    let cancelled = false;
    const requests: Array<Promise<unknown>> = [];
    if (deposit.status === "DRAFT") {
      requests.push(apiRequest<BankDepositSourceCandidate[]>(`/bank-deposits/source-candidates?bankAccountProfileId=${deposit.bankAccountProfileId}&currency=${deposit.currency}`));
    } else {
      requests.push(Promise.resolve([]));
    }
    if (deposit.status === "POSTED") {
      requests.push(apiRequest<BankStatementTransaction[]>(`/bank-deposits/${deposit.id}/match-candidates`));
    } else {
      requests.push(Promise.resolve([]));
    }

    Promise.all(requests)
      .then(([sourceResult, matchResult]) => {
        if (!cancelled) {
          setSourceCandidates(sourceResult as BankDepositSourceCandidate[]);
          const candidates = matchResult as BankStatementTransaction[];
          setMatchCandidates(candidates);
          setSelectedStatementId((current) => current || candidates[0]?.id || "");
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load deposit supporting data.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [deposit, organizationId]);

  useEffect(() => {
    if (!organizationId || !deposit) {
      setAccountingPreflight(null);
      return;
    }

    let cancelled = false;
    setAccountingLoading(true);
    getDepositAccountingPreflight(deposit.id)
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
            reasons: [loadError instanceof Error ? loadError.message : "Unable to load deposit accounting preflight."],
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
  }, [deposit, organizationId]);

  const selectedSource = useMemo(() => sourceCandidates.find((candidate) => candidate.sourceId === sourceId), [sourceCandidates, sourceId]);
  const currency = deposit?.currency ?? "SAR";

  function chooseSource(nextSourceId: string) {
    setSourceId(nextSourceId);
    const candidate = sourceCandidates.find((item) => item.sourceId === nextSourceId);
    if (candidate) {
      setAmount(candidate.amount);
      setReference(candidate.reference);
      setCounterpartyName(candidate.counterpartyName);
    }
  }

  async function addLine(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!deposit) {
      return;
    }
    const validationError = validateBankDepositLineInput({ sourceType, sourceId, amount, currency });
    if (validationError) {
      setError(validationError);
      return;
    }
    setAction("add-line");
    setError("");
    setSuccess("");
    try {
      const updated = await apiRequest<BankDepositBatch>(`/bank-deposits/${deposit.id}/lines`, {
        method: "POST",
        body: {
          sourceType,
          sourceId: sourceId || undefined,
          counterpartyName: counterpartyName.trim() || undefined,
          reference: reference.trim() || undefined,
          amount,
          currency,
          memo: memo.trim() || undefined,
        },
      });
      setDeposit(updated);
      setSuccess("Deposit line added.");
      setAmount("");
      setMemo("");
      setReference("");
      setCounterpartyName("");
      setSourceId("");
      setReloadToken((current) => current + 1);
    } catch (lineError) {
      setError(lineError instanceof Error ? lineError.message : "Unable to add deposit line.");
    } finally {
      setAction("");
    }
  }

  async function removeLine(lineId: string) {
    if (!deposit) {
      return;
    }
    setAction(lineId);
    setError("");
    setSuccess("");
    try {
      const updated = await apiRequest<BankDepositBatch>(`/bank-deposits/${deposit.id}/lines/${lineId}`, { method: "DELETE" });
      setDeposit(updated);
      setSuccess("Deposit line removed.");
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "Unable to remove deposit line.");
    } finally {
      setAction("");
    }
  }

  async function runDepositAction(actionName: "post" | "void" | "unmatch-statement-transaction") {
    if (!deposit) {
      return;
    }
    setAction(actionName);
    setError("");
    setSuccess("");
    try {
      const updated = await apiRequest<BankDepositBatch>(`/bank-deposits/${deposit.id}/${actionName}`, { method: "POST" });
      setDeposit(updated);
      setSuccess(actionName === "post" ? "Deposit batch posted for operational matching." : actionName === "void" ? "Deposit batch voided." : "Deposit batch unmatched.");
      setReloadToken((current) => current + 1);
    } catch (depositError) {
      setError(depositError instanceof Error ? depositError.message : "Unable to update deposit batch.");
    } finally {
      setAction("");
    }
  }

  async function matchStatementRow() {
    if (!deposit || !selectedStatementId) {
      return;
    }
    setAction("match");
    setError("");
    setSuccess("");
    try {
      const updated = await apiRequest<BankDepositBatch>(`/bank-deposits/${deposit.id}/match-statement-transaction`, {
        method: "POST",
        body: { statementTransactionId: selectedStatementId },
      });
      setDeposit(updated);
      setSuccess("Deposit batch matched to statement credit row.");
      setReloadToken((current) => current + 1);
    } catch (matchError) {
      setError(matchError instanceof Error ? matchError.message : "Unable to match statement row.");
    } finally {
      setAction("");
    }
  }

  async function postAccountingJournal() {
    if (!deposit) {
      return;
    }
    setAction("post-journal");
    setError("");
    setSuccess("");
    try {
      const result = await postDepositJournal(deposit.id);
      setDeposit(result.record);
      setSuccess(`Journal ${result.journalEntry.entryNumber} posted for this deposit batch.`);
      setReloadToken((current) => current + 1);
    } catch (postError) {
      setError(postError instanceof Error ? postError.message : "Unable to post deposit journal.");
    } finally {
      setAction("");
    }
  }

  return (
    <LedgerPage>
      <LedgerPageHeader
        eyebrow="Banking"
        title="Deposit batch detail"
        description={deposit?.bankAccountProfile?.displayName ?? "Bank deposit batch"}
        actions={
          <>
            <LedgerButton href={`/bank-accounts/${params.id}/deposits`}>Deposits</LedgerButton>
            <LedgerButton href={`/bank-accounts/${params.id}/statement-transactions?status=UNMATCHED`}>Statement rows</LedgerButton>
            <LedgerButton href={`/bank-accounts/${params.id}/cheques`}>Cheques</LedgerButton>
          </>
        }
      />

      <LedgerSummaryBand tone="warning">
        This deposit batch groups receipts, cash, or clearing references for manual reconciliation. Accounting journal posting is separate, explicit, and limited to configured clearing-account paths.
      </LedgerSummaryBand>

      <LedgerPageBody>
        {!organizationId ? <LedgerAlert tone="info">Log in and select an organization to load this deposit batch.</LedgerAlert> : null}
        {loading ? <LedgerLoadingState title="Loading deposit batch" /> : null}
        {error ? <LedgerAlert tone="danger">{error}</LedgerAlert> : null}
        {success ? <LedgerAlert tone="success">{success}</LedgerAlert> : null}

        {deposit ? (
          <>
            <LedgerMetricGrid>
              <LedgerStatCard label="Status" value={<LedgerStatusBadge tone={bankDepositStatusTone(deposit.status)}>{bankDepositStatusLabel(deposit.status)}</LedgerStatusBadge>} />
              <LedgerStatCard label="Total" value={<LedgerMoney>{formatMoneyAmount(deposit.totalAmount, deposit.currency)}</LedgerMoney>} />
              <LedgerStatCard label="Lines" value={deposit.lines.length} />
              <LedgerStatCard label="Deposit date" value={<LedgerDate>{formatOptionalDate(deposit.depositDate, "-")}</LedgerDate>} />
            </LedgerMetricGrid>

            <LedgerPanel>
              <p className="text-sm leading-6 text-steel">
                This deposit batch groups receipts, cash, or clearing references for manual reconciliation. No live bank feed is added, no bank API is called, and no bank payment is sent. Accounting journal posting is separate, explicit, and limited to configured clearing-account paths.
              </p>
            </LedgerPanel>

            <AccountingStatusPanel
              preflight={accountingPreflight}
              loading={accountingLoading}
              action={action}
              canPost={canPostJournal}
              onPost={() => void postAccountingJournal()}
              postLabel="Post deposit journal"
            />

            <LedgerSection
              title="Lines"
              description={deposit.memo ?? "No memo"}
              action={
                <div className="flex flex-wrap gap-2">
                  {canReconcile && canPostBankDeposit(deposit.status, deposit.totalAmount, deposit.lines.length) ? (
                    <LedgerButton disabled={Boolean(action)} onClick={() => void runDepositAction("post")}>
                      {action === "post" ? "Posting..." : "Post batch"}
                    </LedgerButton>
                  ) : null}
                  {canReconcile && deposit.status === "MATCHED" ? (
                    <LedgerButton disabled={Boolean(action)} onClick={() => void runDepositAction("unmatch-statement-transaction")}>
                      {action === "unmatch-statement-transaction" ? "Unmatching..." : "Unmatch"}
                    </LedgerButton>
                  ) : null}
                  {canReconcile && canVoidBankDeposit(deposit.status) ? (
                    <LedgerButton disabled={Boolean(action)} onClick={() => void runDepositAction("void")}>
                      {action === "void" ? "Voiding..." : "Void"}
                    </LedgerButton>
                  ) : null}
                </div>
              }
            >
              <LedgerDataTable minWidth="860px">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
                  <tr>
                    <th className="px-4 py-3">Source</th>
                    <th className="px-4 py-3">Reference</th>
                    <th className="px-4 py-3">Counterparty</th>
                    <th className="px-4 py-3">Memo</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {deposit.lines.map((line) => (
                    <tr key={line.id}>
                      <td className="px-4 py-3 text-steel">{bankDepositSourceTypeLabel(line.sourceType)}</td>
                      <td className="px-4 py-3 font-mono text-xs">{line.reference ?? line.sourceId ?? "-"}</td>
                      <td className="px-4 py-3 text-ink">{line.counterpartyName ?? "-"}</td>
                      <td className="px-4 py-3 text-steel">{line.memo ?? "-"}</td>
                      <td className="px-4 py-3 text-right"><LedgerMoney>{formatMoneyAmount(line.amount, line.currency)}</LedgerMoney></td>
                      <td className="px-4 py-3">
                        {canManage && deposit.status === "DRAFT" ? (
                          <LedgerButton disabled={Boolean(action)} onClick={() => void removeLine(line.id)} size="sm">
                            {action === line.id ? "Removing..." : "Remove"}
                          </LedgerButton>
                        ) : (
                          <span className="text-xs text-steel">Locked</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </LedgerDataTable>
              {deposit.lines.length === 0 ? (
                <div className="mt-4">
                  <LedgerEmptyState title="No deposit lines yet." />
                </div>
              ) : null}
            </LedgerSection>

            {canManage && deposit.status === "DRAFT" ? (
              <LedgerSection title="Add line" description="Line additions only update this draft operational batch.">
                <form onSubmit={addLine} className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                  <LedgerFieldLabel>
                    <LedgerFieldText>Source type</LedgerFieldText>
                    <LedgerSelect value={sourceType} onChange={(event) => setSourceType(event.target.value as BankDepositBatchLineSourceType)}>
                      {SOURCE_TYPES.map((item) => (
                        <option key={item} value={item}>
                          {bankDepositSourceTypeLabel(item)}
                        </option>
                      ))}
                    </LedgerSelect>
                  </LedgerFieldLabel>
                  {sourceType === "CUSTOMER_PAYMENT" ? (
                    <LedgerFieldLabel className="lg:col-span-2">
                      <LedgerFieldText>Customer payment</LedgerFieldText>
                      <LedgerSelect value={sourceId} onChange={(event) => chooseSource(event.target.value)}>
                        <option value="">Select customer payment</option>
                        {sourceCandidates.map((candidate) => (
                          <option key={candidate.sourceId} value={candidate.sourceId}>
                            {candidate.reference} - {candidate.counterpartyName} - {formatMoneyAmount(candidate.amount, candidate.currency)}
                          </option>
                        ))}
                      </LedgerSelect>
                      {selectedSource ? (
                        <LedgerFieldHelp>
                          {selectedSource.depositReadiness === "ALREADY_POSTED_TO_THIS_BANK_ACCOUNT"
                            ? "This payment is already posted to this bank account."
                            : "Operational grouping only. Clearing-account journal movement is deferred."}
                        </LedgerFieldHelp>
                      ) : null}
                    </LedgerFieldLabel>
                  ) : (
                    <LedgerFieldLabel className="lg:col-span-2">
                      <LedgerFieldText>Source id</LedgerFieldText>
                      <LedgerInput value={sourceId} onChange={(event) => setSourceId(event.target.value)} />
                    </LedgerFieldLabel>
                  )}
                  <LedgerFieldLabel>
                    <LedgerFieldText>Amount</LedgerFieldText>
                    <LedgerInput inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} required />
                  </LedgerFieldLabel>
                  <LedgerFieldLabel>
                    <LedgerFieldText>Reference</LedgerFieldText>
                    <LedgerInput value={reference} onChange={(event) => setReference(event.target.value)} />
                  </LedgerFieldLabel>
                  <LedgerFieldLabel>
                    <LedgerFieldText>Counterparty</LedgerFieldText>
                    <LedgerInput value={counterpartyName} onChange={(event) => setCounterpartyName(event.target.value)} />
                  </LedgerFieldLabel>
                  <LedgerFieldLabel className="lg:col-span-2">
                    <LedgerFieldText>Memo</LedgerFieldText>
                    <LedgerInput value={memo} onChange={(event) => setMemo(event.target.value)} />
                  </LedgerFieldLabel>
                  <div className="flex items-end">
                    <LedgerButton type="submit" disabled={Boolean(action)} variant="primary" className="w-full">
                      {action === "add-line" ? "Adding..." : "Add line"}
                    </LedgerButton>
                  </div>
                </form>
              </LedgerSection>
            ) : null}

            {canReconcile && canMatchBankDeposit(deposit.status) ? (
              <LedgerSection title="Match statement credit row" description="Matching is explicit and only accepts same-account credit rows with the same amount.">
                {matchCandidates.length === 0 ? <LedgerEmptyState title="No matching statement credit rows found within the date window." /> : null}
                {matchCandidates.length > 0 ? (
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto] md:items-end">
                    <LedgerFieldLabel>
                      <LedgerFieldText>Candidate row</LedgerFieldText>
                      <LedgerSelect value={selectedStatementId} onChange={(event) => setSelectedStatementId(event.target.value)}>
                        {matchCandidates.map((candidate) => (
                          <option key={candidate.id} value={candidate.id}>
                            {formatOptionalDate(candidate.transactionDate, "-")} - {candidate.description} - {formatMoneyAmount(candidate.amount, currency)}
                          </option>
                        ))}
                      </LedgerSelect>
                    </LedgerFieldLabel>
                    <LedgerButton disabled={!selectedStatementId || Boolean(action)} onClick={() => void matchStatementRow()}>
                      {action === "match" ? "Matching..." : "Match deposit batch"}
                    </LedgerButton>
                  </div>
                ) : null}
              </LedgerSection>
            ) : null}

            {deposit.statementTransaction ? (
              <LedgerSection
                title="Linked statement row"
                description="The linked bank statement row remains available from the standalone statement detail route."
                action={<LedgerButton href={`/bank-statement-transactions/${deposit.statementTransaction.id}`}>Open statement row</LedgerButton>}
              >
                <LedgerMetadataRow
                  items={[
                    { label: "Date", value: <LedgerDate>{formatOptionalDate(deposit.statementTransaction.transactionDate, "-")}</LedgerDate> },
                    { label: "Description", value: deposit.statementTransaction.description },
                    { label: "Amount", value: <LedgerMoney>{formatMoneyAmount(deposit.statementTransaction.amount, deposit.currency)}</LedgerMoney> },
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

function bankDepositStatusTone(status: BankDepositBatchStatus): LedgerStatusTone {
  if (status === "MATCHED") return "success";
  if (status === "POSTED") return "info";
  if (status === "VOIDED") return "neutral";
  return "draft";
}
