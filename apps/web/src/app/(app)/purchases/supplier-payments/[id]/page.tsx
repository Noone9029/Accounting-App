"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { SourceDocumentGuidance } from "@/components/documents/document-guidance";
import { AttachmentPanel } from "@/components/attachments/attachment-panel";
import { usePermissions } from "@/components/permissions/permission-provider";
import { PaymentStatusBadge } from "@/components/ui-ledger/payment-method-badge";
import {
  LedgerActionBar,
  LedgerAlert,
  LedgerButton,
  LedgerDataTable,
  LedgerDate,
  LedgerFieldLabel,
  LedgerFieldText,
  LedgerInput,
  LedgerMetadataRow,
  LedgerMoney,
  LedgerPage,
  LedgerPageBody,
  LedgerPageHeader,
  LedgerPanel,
  LedgerSection,
  LedgerSelect,
  LedgerStatusBadge,
  LedgerSummaryBand,
  type LedgerStatusTone,
} from "@/components/ui/ledger-system";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { formatOptionalDate } from "@/lib/invoice-display";
import { formatMoneyAmount, formatUnits, parseDecimalToUnits } from "@/lib/money";
import { partyDetailHref, safeReturnToFromSearch } from "@/lib/parties";
import { downloadPdf, supplierPaymentReceiptPdfPath } from "@/lib/pdf-download";
import { PERMISSIONS } from "@/lib/permissions";
import {
  canReverseSupplierPaymentUnappliedAllocation,
  supplierPaymentActiveUnappliedAppliedAmount,
  supplierPaymentUnappliedAllocationStatusBadgeClass,
  supplierPaymentUnappliedAllocationStatusLabel,
  validateSupplierPaymentUnappliedAllocation,
} from "@/lib/supplier-payments";
import type { OpenPurchaseBill, SupplierPayment, SupplierPaymentReceiptData } from "@/lib/types";

export default function SupplierPaymentDetailPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const organizationId = useActiveOrganizationId();
  const { can } = usePermissions();
  const [payment, setPayment] = useState<SupplierPayment | null>(null);
  const [receiptData, setReceiptData] = useState<SupplierPaymentReceiptData | null>(null);
  const [openBills, setOpenBills] = useState<OpenPurchaseBill[]>([]);
  const [applyBillId, setApplyBillId] = useState("");
  const [applyAmount, setApplyAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [wasJustRecorded, setWasJustRecorded] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    setWasJustRecorded(new URLSearchParams(window.location.search).get("recorded") === "1");
  }, []);

  useEffect(() => {
    if (!organizationId || !params.id) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    Promise.all([
      apiRequest<SupplierPayment>(`/supplier-payments/${params.id}`),
      apiRequest<SupplierPaymentReceiptData>(`/supplier-payments/${params.id}/receipt-data`),
    ])
      .then(([paymentResult, receiptResult]) => {
        if (!cancelled) {
          setPayment(paymentResult);
          setReceiptData(receiptResult);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load supplier payment.");
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
  }, [organizationId, params.id]);

  useEffect(() => {
    if (!organizationId || !payment || payment.status !== "POSTED") {
      setOpenBills([]);
      return;
    }

    let cancelled = false;
    apiRequest<OpenPurchaseBill[]>(`/purchase-bills/open?supplierId=${encodeURIComponent(payment.supplierId)}`)
      .then((result) => {
        if (!cancelled) {
          setOpenBills(result);
          setApplyBillId((current) => current || result[0]?.id || "");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setOpenBills([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [organizationId, payment]);

  async function refreshPayment() {
    if (!params.id) {
      return;
    }
    const [paymentResult, receiptResult] = await Promise.all([
      apiRequest<SupplierPayment>(`/supplier-payments/${params.id}`),
      apiRequest<SupplierPaymentReceiptData>(`/supplier-payments/${params.id}/receipt-data`),
    ]);
    setPayment(paymentResult);
    setReceiptData(receiptResult);
  }

  async function applyUnapplied(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!payment) {
      return;
    }

    const targetBill = openBills.find((bill) => bill.id === applyBillId);
    const validationError = validateSupplierPaymentUnappliedAllocation(
      applyAmount,
      payment.unappliedAmount,
      targetBill?.balanceDue ?? "0.0000",
    );
    if (validationError) {
      setError(validationError);
      setSuccess("");
      return;
    }

    setActionLoading(true);
    setError("");
    setSuccess("");

    try {
      const updated = await apiRequest<SupplierPayment>(`/supplier-payments/${payment.id}/apply-unapplied`, {
        method: "POST",
        body: { billId: applyBillId, amountApplied: applyAmount },
      });
      setPayment(updated);
      setReceiptData(await apiRequest<SupplierPaymentReceiptData>(`/supplier-payments/${payment.id}/receipt-data`));
      setApplyAmount("");
      setApplyBillId("");
      setSuccess(`Applied ${formatMoneyAmount(applyAmount, payment.currency)} from ${payment.paymentNumber}.`);
    } catch (applyError) {
      setError(applyError instanceof Error ? applyError.message : "Unable to apply unapplied supplier payment amount.");
    } finally {
      setActionLoading(false);
    }
  }

  async function reverseUnappliedAllocation(allocationId: string) {
    if (!payment) {
      return;
    }
    const reason = window.prompt("Reason for reversing this unapplied supplier payment allocation?") ?? "";
    if (!window.confirm(`Reverse allocation on ${payment.paymentNumber}?`)) {
      return;
    }

    setActionLoading(true);
    setError("");
    setSuccess("");

    try {
      const updated = await apiRequest<SupplierPayment>(`/supplier-payments/${payment.id}/unapplied-allocations/${allocationId}/reverse`, {
        method: "POST",
        body: { reason },
      });
      setPayment(updated);
      setReceiptData(await apiRequest<SupplierPaymentReceiptData>(`/supplier-payments/${payment.id}/receipt-data`));
      setSuccess("Unapplied supplier payment allocation reversed.");
    } catch (reverseError) {
      setError(reverseError instanceof Error ? reverseError.message : "Unable to reverse unapplied supplier payment allocation.");
    } finally {
      setActionLoading(false);
    }
  }

  async function voidPayment() {
    if (!payment || !window.confirm(`Void supplier payment ${payment.paymentNumber}?`)) {
      return;
    }

    setActionLoading(true);
    setError("");
    setSuccess("");

    try {
      const updated = await apiRequest<SupplierPayment>(`/supplier-payments/${payment.id}/void`, { method: "POST" });
      setPayment(updated);
      await refreshPayment();
      setSuccess(`Voided supplier payment ${updated.paymentNumber}.`);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Unable to void supplier payment.");
    } finally {
      setActionLoading(false);
    }
  }

  async function downloadReceiptPdf() {
    if (!payment) {
      return;
    }

    setActionLoading(true);
    setError("");
    setSuccess("");

    try {
      await downloadPdf(supplierPaymentReceiptPdfPath(payment.id), `supplier-payment-${payment.paymentNumber}.pdf`);
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : "Unable to download supplier payment PDF.");
    } finally {
      setActionLoading(false);
    }
  }

  const unappliedAppliedAmount = payment ? supplierPaymentActiveUnappliedAppliedAmount(payment.unappliedAllocations) : "0.0000";
  const selectedOpenBill = openBills.find((bill) => bill.id === applyBillId);
  const canCreatePayment = can(PERMISSIONS.supplierPayments.create);
  const canVoidPaymentPermission = can(PERMISSIONS.supplierPayments.void);
  const canDownloadGeneratedDocuments = can(PERMISSIONS.generatedDocuments.download);
  const canApplyUnapplied = payment?.status === "POSTED" && Number(payment.unappliedAmount) > 0 && canCreatePayment;
  const returnTo = safeReturnToFromSearch(searchParams.toString());
  const paymentDetailHref =
    payment ? `/purchases/supplier-payments/${payment.id}${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ""}` : "";

  return (
    <LedgerPage>
      <LedgerPageHeader
        eyebrow="Purchases"
        title={payment ? payment.paymentNumber : "Supplier payment"}
        description="Supplier payment posting, bill matching, and downloadable payment PDF."
        badge={payment ? <LedgerStatusBadge tone={supplierPaymentStatusTone(payment.status)}>{supplierPaymentStatusLabel(payment.status)}</LedgerStatusBadge> : undefined}
        actions={
          <LedgerActionBar>
          <LedgerButton href={returnTo || "/purchases/supplier-payments"}>
            Back
          </LedgerButton>
          {payment?.supplierId ? (
            <LedgerButton href={partyDetailHref("supplier", payment.supplierId)}>
              Supplier workspace
            </LedgerButton>
          ) : null}
          {payment && canDownloadGeneratedDocuments ? (
            <LedgerButton onClick={() => void downloadReceiptPdf()} disabled={actionLoading}>
              Download payment PDF
            </LedgerButton>
          ) : null}
          {payment?.status === "POSTED" && Number(payment.unappliedAmount) > 0 ? (
            <LedgerButton
              href={`/purchases/supplier-refunds/new?supplierId=${encodeURIComponent(payment.supplierId)}&sourceType=SUPPLIER_PAYMENT&sourcePaymentId=${encodeURIComponent(payment.id)}`}
              variant="primary"
            >
              Record supplier refund
            </LedgerButton>
          ) : null}
          {payment?.status === "POSTED" && canVoidPaymentPermission ? (
            <LedgerButton variant="danger" onClick={() => void voidPayment()} disabled={actionLoading}>
              Void
            </LedgerButton>
          ) : null}
          </LedgerActionBar>
        }
      />

      <LedgerPageBody>
        {!organizationId ? <LedgerAlert tone="info">Log in and select an organization to load supplier payments.</LedgerAlert> : null}
        {loading ? <LedgerAlert tone="info">Loading supplier payment...</LedgerAlert> : null}
        {error ? <LedgerAlert tone="danger">{error}</LedgerAlert> : null}
        {success ? <LedgerAlert tone="success">{success}</LedgerAlert> : null}

      {payment ? (
        <>
          <SupplierPaymentWorkflowGuidance
            payment={payment}
            recorded={wasJustRecorded}
            receiptData={receiptData}
            actionLoading={actionLoading}
            canDownloadGeneratedDocuments={canDownloadGeneratedDocuments}
            paymentDetailHref={paymentDetailHref}
            onDownloadReceiptPdf={() => void downloadReceiptPdf()}
          />

          <AttachmentPanel linkedEntityType="SUPPLIER_PAYMENT" linkedEntityId={payment.id} />

          <LedgerSection title="Payment details" description="AP payment posting, cash account, journal, and reversal state.">
            <LedgerMetadataRow
              items={[
                { label: "Supplier", value: payment.supplier?.displayName ?? payment.supplier?.name ?? "-" },
                { label: "Status", value: supplierPaymentStatusLabel(payment.status) },
                { label: "Payment date", value: <LedgerDate>{formatOptionalDate(payment.paymentDate, "-")}</LedgerDate> },
                { label: "Currency", value: payment.currency },
                { label: "Amount paid", value: <LedgerMoney>{formatMoneyAmount(payment.amountPaid, payment.currency)}</LedgerMoney> },
                { label: "Unapplied amount", value: <LedgerMoney>{formatMoneyAmount(payment.unappliedAmount, payment.currency)}</LedgerMoney> },
                { label: "Applied from unapplied", value: <LedgerMoney>{formatMoneyAmount(unappliedAppliedAmount, payment.currency)}</LedgerMoney> },
                { label: "Paid-through account", value: payment.account ? `${payment.account.code} ${payment.account.name}` : "-" },
                { label: "Journal entry", value: payment.journalEntry ? `${payment.journalEntry.entryNumber} (${payment.journalEntry.id})` : "-" },
                { label: "Void reversal", value: payment.voidReversalJournalEntry ? `${payment.voidReversalJournalEntry.entryNumber} (${payment.voidReversalJournalEntry.id})` : "-" },
                { label: "Posted", value: payment.postedAt ? new Date(payment.postedAt).toLocaleString() : "-" },
                { label: "Voided", value: payment.voidedAt ? new Date(payment.voidedAt).toLocaleString() : "-" },
                { label: "Description", value: payment.description ?? "-" },
              ]}
            />
          </LedgerSection>

          <LedgerSection title="Bill allocations" description="Direct allocations created when the supplier payment was recorded." className="p-0">
            <LedgerDataTable minWidth="820px" className="rounded-t-none border-0 shadow-none">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
                <tr>
                  <th className="px-4 py-3">Bill</th>
                  <th className="px-4 py-3">Bill date</th>
                  <th className="px-4 py-3">Bill total</th>
                  <th className="px-4 py-3">Applied</th>
                  <th className="px-4 py-3">Bill balance due</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payment.allocations?.length ? (
                  payment.allocations.map((allocation) => (
                    <tr key={allocation.id}>
                      <td className="px-4 py-3">
                        <Link href={`/purchases/bills/${allocation.billId}${paymentDetailHref ? `?returnTo=${encodeURIComponent(paymentDetailHref)}` : ""}`} className="font-mono text-xs text-palm hover:underline">
                          {allocation.bill?.billNumber ?? allocation.billId}
                        </Link>
                      </td>
                      <td className="px-4 py-3"><LedgerDate>{formatOptionalDate(allocation.bill?.billDate, "-")}</LedgerDate></td>
                      <td className="px-4 py-3"><LedgerMoney>{formatMoneyAmount(allocation.bill?.total ?? "0.0000", payment.currency)}</LedgerMoney></td>
                      <td className="px-4 py-3"><LedgerMoney>{formatMoneyAmount(allocation.amountApplied, payment.currency)}</LedgerMoney></td>
                      <td className="px-4 py-3"><LedgerMoney>{formatMoneyAmount(allocation.bill?.balanceDue ?? "0.0000", payment.currency)}</LedgerMoney></td>
                      <td className="px-4 py-3 text-steel">{allocation.bill?.status ?? "-"}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-4 py-5 text-center text-steel">
                      This supplier payment has no direct bill allocations.
                    </td>
                  </tr>
                )}
              </tbody>
            </LedgerDataTable>
          </LedgerSection>

          <LedgerSection title="Unapplied supplier payment applications" description="Matching unapplied supplier payment credit to later bills updates balances only. No new journal entry is created." className="p-0">
            {payment.unappliedAllocations && payment.unappliedAllocations.length > 0 ? (
                <LedgerDataTable minWidth="980px" className="rounded-t-none border-0 shadow-none">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
                    <tr>
                      <th className="px-4 py-3">Bill</th>
                      <th className="px-4 py-3">Bill date</th>
                      <th className="px-4 py-3">Bill total</th>
                      <th className="px-4 py-3">Amount applied</th>
                      <th className="px-4 py-3">Bill balance due</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Reversed</th>
                      <th className="px-4 py-3">Reason</th>
                      <th className="px-4 py-3">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {payment.unappliedAllocations.map((allocation) => (
                      <tr key={allocation.id}>
                        <td className="px-4 py-3 font-mono text-xs">{allocation.bill?.billNumber ?? allocation.billId}</td>
                        <td className="px-4 py-3"><LedgerDate>{formatOptionalDate(allocation.bill?.billDate, "-")}</LedgerDate></td>
                        <td className="px-4 py-3">{allocation.bill ? <LedgerMoney>{formatMoneyAmount(allocation.bill.total, payment.currency)}</LedgerMoney> : "-"}</td>
                        <td className="px-4 py-3"><LedgerMoney>{formatMoneyAmount(allocation.amountApplied, payment.currency)}</LedgerMoney></td>
                        <td className="px-4 py-3">{allocation.bill ? <LedgerMoney>{formatMoneyAmount(allocation.bill.balanceDue, payment.currency)}</LedgerMoney> : "-"}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-md px-2 py-1 text-xs font-medium ${supplierPaymentUnappliedAllocationStatusBadgeClass(allocation)}`}>
                            {supplierPaymentUnappliedAllocationStatusLabel(allocation)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-steel">{allocation.reversedAt ? new Date(allocation.reversedAt).toLocaleString() : "-"}</td>
                        <td className="px-4 py-3 text-steel">{allocation.reversalReason ?? "-"}</td>
                        <td className="px-4 py-3">
                          <LedgerActionBar>
                            <LedgerButton href={`/purchases/bills/${allocation.billId}${paymentDetailHref ? `?returnTo=${encodeURIComponent(paymentDetailHref)}` : ""}`} size="sm">
                              View bill
                            </LedgerButton>
                            {canReverseSupplierPaymentUnappliedAllocation(allocation) && canVoidPaymentPermission ? (
                              <LedgerButton variant="danger" size="sm" onClick={() => void reverseUnappliedAllocation(allocation.id)} disabled={actionLoading}>
                                Reverse
                              </LedgerButton>
                            ) : null}
                          </LedgerActionBar>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </LedgerDataTable>
            ) : (
              <div className="px-5 py-4">
                <LedgerAlert tone="info">No unapplied supplier payment credit has been matched to later bills.</LedgerAlert>
              </div>
            )}
          </LedgerSection>

          <LedgerPanel className="p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-ink">Apply unapplied amount</h2>
                <p className="mt-1 text-sm text-steel">Use remaining supplier payment credit against finalized open bills for the same supplier.</p>
              </div>
              <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">No accounting journal</span>
            </div>
            {canApplyUnapplied ? (
              openBills.length > 0 ? (
                <form onSubmit={applyUnapplied} className="mt-4 grid grid-cols-1 gap-4 text-sm md:grid-cols-[1.4fr_0.7fr_auto]">
                  <LedgerFieldLabel>
                    <LedgerFieldText>Open bill</LedgerFieldText>
                    <LedgerSelect value={applyBillId} onChange={(event) => setApplyBillId(event.target.value)}>
                      {openBills.map((bill) => (
                        <option key={bill.id} value={bill.id}>
                          {bill.billNumber} - balance {formatMoneyAmount(bill.balanceDue, bill.currency)}
                        </option>
                      ))}
                    </LedgerSelect>
                  </LedgerFieldLabel>
                  <LedgerFieldLabel>
                    <LedgerFieldText>Amount to apply</LedgerFieldText>
                    <LedgerInput value={applyAmount} onChange={(event) => setApplyAmount(event.target.value)} placeholder="0.0000" className="font-mono tabular-nums" />
                  </LedgerFieldLabel>
                  <LedgerButton type="submit" disabled={actionLoading || !applyBillId} variant="primary" className="self-end">
                    Apply
                  </LedgerButton>
                  <div className="text-xs text-steel md:col-span-3">
                    Selected bill balance: {selectedOpenBill ? formatMoneyAmount(selectedOpenBill.balanceDue, selectedOpenBill.currency) : "-"}.
                    Supplier payment credit available: {formatMoneyAmount(payment.unappliedAmount, payment.currency)}.
                  </div>
                </form>
              ) : (
                <div className="mt-4">
                  <LedgerAlert tone="info">No finalized open bills are available for this supplier.</LedgerAlert>
                </div>
              )
            ) : (
              <div className="mt-4">
                <LedgerAlert tone="info">Unapplied amount can be applied only while the supplier payment is posted and credit remains.</LedgerAlert>
              </div>
            )}
          </LedgerPanel>

          {receiptData ? (
            <LedgerSection title="Receipt data preview" description="Structured supplier payment document preview. Downloading the PDF stores a generated archive record.">
              <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4">
                <div>
                  <h3 className="text-sm font-semibold text-ink">Payment PDF source data</h3>
                </div>
                {canDownloadGeneratedDocuments ? (
                  <LedgerButton onClick={() => void downloadReceiptPdf()} disabled={actionLoading}>
                    Download payment PDF
                  </LedgerButton>
                ) : null}
              </div>
              <div className="p-5">
                <LedgerMetadataRow
                  items={[
                    { label: "Payment number", value: receiptData.receiptNumber },
                    { label: "Supplier", value: receiptData.supplier.displayName ?? receiptData.supplier.name },
                    { label: "Payment date", value: <LedgerDate>{formatOptionalDate(receiptData.paymentDate, "-")}</LedgerDate> },
                    { label: "Status", value: receiptData.status },
                    { label: "Amount paid", value: <LedgerMoney>{formatMoneyAmount(receiptData.amountPaid, receiptData.currency)}</LedgerMoney> },
                    { label: "Unapplied", value: <LedgerMoney>{formatMoneyAmount(receiptData.unappliedAmount, receiptData.currency)}</LedgerMoney> },
                    { label: "Paid through", value: `${receiptData.paidThroughAccount.code} ${receiptData.paidThroughAccount.name}` },
                    { label: "Journal entry", value: receiptData.journalEntry ? `${receiptData.journalEntry.entryNumber} (${receiptData.journalEntry.id})` : "-" },
                  ]}
                />
              </div>
            </LedgerSection>
          ) : null}
        </>
      ) : null}
      </LedgerPageBody>
    </LedgerPage>
  );
}

export function SupplierPaymentWorkflowGuidance({
  payment,
  recorded,
  receiptData,
  actionLoading,
  canDownloadGeneratedDocuments,
  paymentDetailHref,
  onDownloadReceiptPdf,
}: {
  payment: SupplierPayment;
  recorded: boolean;
  receiptData: SupplierPaymentReceiptData | null;
  actionLoading: boolean;
  canDownloadGeneratedDocuments: boolean;
  paymentDetailHref: string;
  onDownloadReceiptPdf: () => void;
}) {
  const firstAllocatedBill = payment.allocations?.find((allocation) => allocation.bill)?.bill ?? null;
  const appliedTotalUnits = payment.allocations?.reduce((sum, allocation) => sum + parseDecimalToUnits(allocation.amountApplied), 0) ?? 0;
  const hasUnapplied = Number(payment.unappliedAmount) > 0;

  return (
    <div className="space-y-4">
      {recorded ? (
        <LedgerAlert tone="success">
          Supplier payment recorded. The payment details below show what changed; linked bill balances are updated.
        </LedgerAlert>
      ) : null}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <LedgerPanel className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-ink">What happened?</h2>
              <p className="mt-1 text-sm leading-6 text-steel">{supplierPaymentOutcomeDescription(payment, hasUnapplied)}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <PaymentStatusBadge status={payment.status} />
              {hasUnapplied ? (
                <LedgerStatusBadge tone="warning">Unapplied supplier credit</LedgerStatusBadge>
              ) : null}
            </div>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
            <Summary label="Amount paid" value={formatMoneyAmount(payment.amountPaid, payment.currency)} />
            <Summary label="Applied to bills" value={formatMoneyAmount(formatUnits(appliedTotalUnits), payment.currency)} />
            <Summary label="Payment number" value={receiptData?.receiptNumber ?? payment.paymentNumber} />
          </div>
        </LedgerPanel>

        <LedgerPanel className="p-4">
          <h2 className="text-base font-semibold text-ink">Next actions</h2>
          <p className="mt-1 text-sm leading-6 text-steel">{supplierPaymentNextActionDescription(payment, hasUnapplied)}</p>
          <div className="mt-4 flex flex-col gap-2">
            {firstAllocatedBill ? (
              <LedgerButton
                href={`/purchases/bills/${firstAllocatedBill.id}${paymentDetailHref ? `?returnTo=${encodeURIComponent(paymentDetailHref)}` : ""}`}
                variant="primary"
              >
                View bill
              </LedgerButton>
            ) : null}
            {canDownloadGeneratedDocuments ? (
              <LedgerButton
                onClick={onDownloadReceiptPdf}
                disabled={actionLoading}
              >
                Download payment PDF
              </LedgerButton>
            ) : null}
            <LedgerButton href={partyDetailHref("supplier", payment.supplierId)}>
              Open supplier workspace
            </LedgerButton>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <LedgerButton
                href={`/reports/aged-payables${paymentDetailHref ? `?returnTo=${encodeURIComponent(paymentDetailHref)}` : ""}`}
              >
                AP report
              </LedgerButton>
              <LedgerButton href="/dashboard">
                Dashboard
              </LedgerButton>
            </div>
          </div>
          {payment.status === "VOIDED" ? (
            <p className="mt-3 text-xs leading-5 text-steel">This supplier payment is voided. Review the reversal journal below if present before taking further action.</p>
          ) : null}
          <SourceDocumentGuidance className="mt-4" />
        </LedgerPanel>
      </div>
    </div>
  );
}

function supplierPaymentStatusLabel(status: SupplierPayment["status"] | undefined | null): string {
  switch (status) {
    case "DRAFT":
      return "Draft";
    case "POSTED":
      return "Posted";
    case "VOIDED":
      return "Voided";
    default:
      return "-";
  }
}

function supplierPaymentStatusTone(status: SupplierPayment["status"]): LedgerStatusTone {
  switch (status) {
    case "DRAFT":
      return "draft";
    case "POSTED":
      return "success";
    case "VOIDED":
      return "danger";
    default:
      return "neutral";
  }
}

function supplierPaymentOutcomeDescription(payment: SupplierPayment, hasUnapplied: boolean): string {
  if (payment.status === "VOIDED") {
    return "This supplier payment is voided. The original payment is closed and reversal journal details remain visible for review.";
  }

  if (payment.status === "DRAFT") {
    return "This supplier payment is still a draft. It has not posted cash movement or bill allocations yet.";
  }

  if (hasUnapplied) {
    return "This supplier payment is posted. Allocated amounts reduced purchase bill balances, and the remaining unapplied supplier credit can be matched to a later bill or refunded.";
  }

    return "This supplier payment is posted. Payment details are available, and linked purchase bill balances were reduced by the allocations below.";
}

function supplierPaymentNextActionDescription(payment: SupplierPayment, hasUnapplied: boolean): string {
  if (payment.status === "VOIDED") {
    return "Use the links below for review and reporting. Record a new supplier payment if replacement funds are paid.";
  }

  if (hasUnapplied) {
    return "Review the payment details, then either apply the remaining credit to another bill or record a supplier refund from the actions above.";
  }

  return "Review the purchase bill, supplier ledger, and AP report to confirm the payable loop is closed.";
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-steel">{label}</div>
      <div className="mt-1 break-words font-medium text-ink">{value}</div>
    </div>
  );
}
