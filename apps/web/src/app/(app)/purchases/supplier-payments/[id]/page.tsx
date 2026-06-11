"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { SourceDocumentGuidance } from "@/components/documents/document-guidance";
import { AttachmentPanel } from "@/components/attachments/attachment-panel";
import { usePermissions } from "@/components/permissions/permission-provider";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { formatOptionalDate } from "@/lib/invoice-display";
import { formatMoneyAmount, formatUnits, parseDecimalToUnits } from "@/lib/money";
import { partyDetailHref } from "@/lib/parties";
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
      setError(downloadError instanceof Error ? downloadError.message : "Unable to download supplier payment receipt.");
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

  return (
    <section>
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">{payment ? payment.paymentNumber : "Supplier payment"}</h1>
          <p className="mt-1 text-sm text-steel">Supplier payment posting, bill matching, and receipt PDF.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Link href="/purchases/supplier-payments" className="rounded-md border border-slate-300 px-3 py-2 text-center text-sm font-medium text-slate-700 hover:bg-slate-50">
            Back
          </Link>
          {payment?.supplierId ? (
            <Link href={partyDetailHref("supplier", payment.supplierId)} className="rounded-md border border-slate-300 px-3 py-2 text-center text-sm font-medium text-slate-700 hover:bg-slate-50">
              Supplier workspace
            </Link>
          ) : null}
          {payment && canDownloadGeneratedDocuments ? (
            <button type="button" onClick={() => void downloadReceiptPdf()} disabled={actionLoading} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400">
              Download receipt PDF
            </button>
          ) : null}
          {payment?.status === "POSTED" && Number(payment.unappliedAmount) > 0 ? (
            <Link
              href={`/purchases/supplier-refunds/new?supplierId=${encodeURIComponent(payment.supplierId)}&sourceType=SUPPLIER_PAYMENT&sourcePaymentId=${encodeURIComponent(payment.id)}`}
              className="rounded-md bg-palm px-3 py-2 text-center text-sm font-semibold text-white hover:bg-teal-800"
            >
              Record supplier refund
            </Link>
          ) : null}
          {payment?.status === "POSTED" && canVoidPaymentPermission ? (
            <button type="button" onClick={() => void voidPayment()} disabled={actionLoading} className="rounded-md border border-rosewood px-3 py-2 text-sm font-medium text-rosewood hover:bg-red-50 disabled:cursor-not-allowed disabled:text-slate-400">
              Void
            </button>
          ) : null}
        </div>
      </div>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">Log in and select an organization to load supplier payments.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading supplier payment...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {success ? <StatusMessage type="success">{success}</StatusMessage> : null}
      </div>

      {payment ? (
        <div className="mt-5 space-y-5">
          <SupplierPaymentWorkflowGuidance
            payment={payment}
            recorded={wasJustRecorded}
            receiptData={receiptData}
            actionLoading={actionLoading}
            canDownloadGeneratedDocuments={canDownloadGeneratedDocuments}
            onDownloadReceiptPdf={() => void downloadReceiptPdf()}
          />

          <AttachmentPanel linkedEntityType="SUPPLIER_PAYMENT" linkedEntityId={payment.id} />

          <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
            <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-4">
              <Summary label="Supplier" value={payment.supplier?.displayName ?? payment.supplier?.name ?? "-"} />
              <Summary label="Status" value={supplierPaymentStatusLabel(payment.status)} />
              <Summary label="Payment date" value={formatOptionalDate(payment.paymentDate, "-")} />
              <Summary label="Currency" value={payment.currency} />
              <Summary label="Amount paid" value={formatMoneyAmount(payment.amountPaid, payment.currency)} />
              <Summary label="Unapplied" value={formatMoneyAmount(payment.unappliedAmount, payment.currency)} />
              <Summary label="Applied from unapplied" value={formatMoneyAmount(unappliedAppliedAmount, payment.currency)} />
              <Summary label="Paid-through account" value={payment.account ? `${payment.account.code} ${payment.account.name}` : "-"} />
              <Summary label="Journal entry" value={payment.journalEntry ? `${payment.journalEntry.entryNumber} (${payment.journalEntry.id})` : "-"} />
              <Summary label="Void reversal" value={payment.voidReversalJournalEntry ? `${payment.voidReversalJournalEntry.entryNumber} (${payment.voidReversalJournalEntry.id})` : "-"} />
              <Summary label="Posted" value={payment.postedAt ? new Date(payment.postedAt).toLocaleString() : "-"} />
              <Summary label="Voided" value={payment.voidedAt ? new Date(payment.voidedAt).toLocaleString() : "-"} />
              <Summary label="Description" value={payment.description ?? "-"} />
            </div>
          </div>

          <div className="overflow-x-auto rounded-md border border-slate-200 bg-white shadow-panel">
            <table className="w-full min-w-[820px] text-left text-sm">
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
                        <Link href={`/purchases/bills/${allocation.billId}`} className="font-mono text-xs text-palm hover:underline">
                          {allocation.bill?.billNumber ?? allocation.billId}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-steel">{formatOptionalDate(allocation.bill?.billDate, "-")}</td>
                      <td className="px-4 py-3 font-mono text-xs">{formatMoneyAmount(allocation.bill?.total ?? "0.0000", payment.currency)}</td>
                      <td className="px-4 py-3 font-mono text-xs">{formatMoneyAmount(allocation.amountApplied, payment.currency)}</td>
                      <td className="px-4 py-3 font-mono text-xs">{formatMoneyAmount(allocation.bill?.balanceDue ?? "0.0000", payment.currency)}</td>
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
            </table>
          </div>

          <div className="rounded-md border border-slate-200 bg-white shadow-panel">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="text-base font-semibold text-ink">Unapplied supplier payment applications</h2>
              <p className="mt-1 text-sm text-steel">Matching unapplied supplier payment credit to later bills updates balances only. No new journal entry is created.</p>
            </div>
            {payment.unappliedAllocations && payment.unappliedAllocations.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[980px] text-left text-sm">
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
                        <td className="px-4 py-3 text-steel">{formatOptionalDate(allocation.bill?.billDate, "-")}</td>
                        <td className="px-4 py-3 font-mono text-xs">{allocation.bill ? formatMoneyAmount(allocation.bill.total, payment.currency) : "-"}</td>
                        <td className="px-4 py-3 font-mono text-xs">{formatMoneyAmount(allocation.amountApplied, payment.currency)}</td>
                        <td className="px-4 py-3 font-mono text-xs">{allocation.bill ? formatMoneyAmount(allocation.bill.balanceDue, payment.currency) : "-"}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-md px-2 py-1 text-xs font-medium ${supplierPaymentUnappliedAllocationStatusBadgeClass(allocation)}`}>
                            {supplierPaymentUnappliedAllocationStatusLabel(allocation)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-steel">{allocation.reversedAt ? new Date(allocation.reversedAt).toLocaleString() : "-"}</td>
                        <td className="px-4 py-3 text-steel">{allocation.reversalReason ?? "-"}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            <Link href={`/purchases/bills/${allocation.billId}`} className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
                              View bill
                            </Link>
                            {canReverseSupplierPaymentUnappliedAllocation(allocation) && canVoidPaymentPermission ? (
                              <button type="button" onClick={() => void reverseUnappliedAllocation(allocation.id)} disabled={actionLoading} className="rounded-md border border-rosewood px-2 py-1 text-xs font-medium text-rosewood hover:bg-red-50 disabled:cursor-not-allowed disabled:text-slate-400">
                                Reverse
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="px-5 py-4">
                <StatusMessage type="empty">No unapplied supplier payment credit has been matched to later bills.</StatusMessage>
              </div>
            )}
          </div>

          <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
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
                  <label className="block">
                    <span className="text-xs font-medium uppercase tracking-wide text-steel">Open bill</span>
                    <select value={applyBillId} onChange={(event) => setApplyBillId(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm">
                      {openBills.map((bill) => (
                        <option key={bill.id} value={bill.id}>
                          {bill.billNumber} - balance {formatMoneyAmount(bill.balanceDue, bill.currency)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-xs font-medium uppercase tracking-wide text-steel">Amount to apply</span>
                    <input value={applyAmount} onChange={(event) => setApplyAmount(event.target.value)} placeholder="0.0000" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
                  </label>
                  <button type="submit" disabled={actionLoading || !applyBillId} className="self-end rounded-md bg-palm px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400">
                    Apply
                  </button>
                  <div className="text-xs text-steel md:col-span-3">
                    Selected bill balance: {selectedOpenBill ? formatMoneyAmount(selectedOpenBill.balanceDue, selectedOpenBill.currency) : "-"}.
                    Supplier payment credit available: {formatMoneyAmount(payment.unappliedAmount, payment.currency)}.
                  </div>
                </form>
              ) : (
                <div className="mt-4">
                  <StatusMessage type="empty">No finalized open bills are available for this supplier.</StatusMessage>
                </div>
              )
            ) : (
              <div className="mt-4">
                <StatusMessage type="info">Unapplied amount can be applied only while the supplier payment is posted and credit remains.</StatusMessage>
              </div>
            )}
          </div>

          {receiptData ? (
            <div className="rounded-md border border-slate-200 bg-white shadow-panel">
              <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4">
                <div>
                  <h2 className="text-base font-semibold text-ink">Receipt data preview</h2>
                  <p className="mt-1 text-sm text-steel">Structured supplier payment receipt preview. Downloading the receipt stores a generated PDF archive record.</p>
                </div>
                {canDownloadGeneratedDocuments ? (
                  <button type="button" onClick={() => void downloadReceiptPdf()} disabled={actionLoading} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400">
                    Download receipt PDF
                  </button>
                ) : null}
              </div>
              <div className="p-5">
                <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-4">
                  <Summary label="Receipt number" value={receiptData.receiptNumber} />
                  <Summary label="Supplier" value={receiptData.supplier.displayName ?? receiptData.supplier.name} />
                  <Summary label="Payment date" value={formatOptionalDate(receiptData.paymentDate, "-")} />
                  <Summary label="Status" value={receiptData.status} />
                  <Summary label="Amount paid" value={formatMoneyAmount(receiptData.amountPaid, receiptData.currency)} />
                  <Summary label="Unapplied" value={formatMoneyAmount(receiptData.unappliedAmount, receiptData.currency)} />
                  <Summary label="Paid through" value={`${receiptData.paidThroughAccount.code} ${receiptData.paidThroughAccount.name}`} />
                  <Summary label="Journal entry" value={receiptData.journalEntry ? `${receiptData.journalEntry.entryNumber} (${receiptData.journalEntry.id})` : "-"} />
                </div>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

export function SupplierPaymentWorkflowGuidance({
  payment,
  recorded,
  receiptData,
  actionLoading,
  canDownloadGeneratedDocuments,
  onDownloadReceiptPdf,
}: {
  payment: SupplierPayment;
  recorded: boolean;
  receiptData: SupplierPaymentReceiptData | null;
  actionLoading: boolean;
  canDownloadGeneratedDocuments: boolean;
  onDownloadReceiptPdf: () => void;
}) {
  const firstAllocatedBill = payment.allocations?.find((allocation) => allocation.bill)?.bill ?? null;
  const appliedTotalUnits = payment.allocations?.reduce((sum, allocation) => sum + parseDecimalToUnits(allocation.amountApplied), 0) ?? 0;
  const hasUnapplied = Number(payment.unappliedAmount) > 0;

  return (
    <div className="space-y-4">
      {recorded ? (
        <StatusMessage type="success">
          Supplier payment recorded. The receipt and allocation details below show what changed; linked bill balances are updated.
        </StatusMessage>
      ) : null}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-ink">What happened?</h2>
              <p className="mt-1 text-sm leading-6 text-steel">{supplierPaymentOutcomeDescription(payment, hasUnapplied)}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className={`rounded-md px-2 py-1 text-xs font-semibold ${supplierPaymentStatusBadgeClass(payment.status)}`}>
                {supplierPaymentStatusLabel(payment.status)}
              </span>
              {hasUnapplied ? (
                <span className="rounded-md bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">Unapplied supplier credit</span>
              ) : null}
            </div>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
            <Summary label="Amount paid" value={formatMoneyAmount(payment.amountPaid, payment.currency)} />
            <Summary label="Applied to bills" value={formatMoneyAmount(formatUnits(appliedTotalUnits), payment.currency)} />
            <Summary label="Receipt" value={receiptData?.receiptNumber ?? payment.paymentNumber} />
          </div>
        </div>

        <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
          <h2 className="text-base font-semibold text-ink">Next actions</h2>
          <p className="mt-1 text-sm leading-6 text-steel">{supplierPaymentNextActionDescription(payment, hasUnapplied)}</p>
          <div className="mt-4 flex flex-col gap-2">
            {firstAllocatedBill ? (
              <Link href={`/purchases/bills/${firstAllocatedBill.id}`} className="rounded-md bg-palm px-3 py-2 text-center text-sm font-semibold text-white hover:bg-teal-800">
                View bill
              </Link>
            ) : null}
            {canDownloadGeneratedDocuments ? (
              <button
                type="button"
                onClick={onDownloadReceiptPdf}
                disabled={actionLoading}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
              >
                Download receipt PDF
              </button>
            ) : null}
            <Link href={partyDetailHref("supplier", payment.supplierId)} className="rounded-md border border-slate-300 px-3 py-2 text-center text-sm font-medium text-slate-700 hover:bg-slate-50">
              Open supplier workspace
            </Link>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Link href="/reports/aged-payables" className="rounded-md border border-slate-300 px-3 py-2 text-center text-sm font-medium text-slate-700 hover:bg-slate-50">
                AP report
              </Link>
              <Link href="/dashboard" className="rounded-md border border-slate-300 px-3 py-2 text-center text-sm font-medium text-slate-700 hover:bg-slate-50">
                Dashboard
              </Link>
            </div>
          </div>
          {payment.status === "VOIDED" ? (
            <p className="mt-3 text-xs leading-5 text-steel">This supplier payment is voided. Review the reversal journal below if present before taking further action.</p>
          ) : null}
          <SourceDocumentGuidance className="mt-4" />
        </div>
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

function supplierPaymentStatusBadgeClass(status: SupplierPayment["status"]): string {
  switch (status) {
    case "DRAFT":
      return "bg-slate-100 text-slate-700";
    case "POSTED":
      return "bg-emerald-50 text-emerald-700";
    case "VOIDED":
      return "bg-rose-50 text-rosewood";
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

  return "This supplier payment is posted. Receipt details are available, and linked purchase bill balances were reduced by the allocations below.";
}

function supplierPaymentNextActionDescription(payment: SupplierPayment, hasUnapplied: boolean): string {
  if (payment.status === "VOIDED") {
    return "Use the links below for review and reporting. Record a new supplier payment if replacement funds are paid.";
  }

  if (hasUnapplied) {
    return "Review the receipt, then either apply the remaining credit to another bill or record a supplier refund from the actions above.";
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
