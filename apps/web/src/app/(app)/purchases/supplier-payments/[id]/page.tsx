"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { SourceDocumentGuidance } from "@/components/documents/document-guidance";
import { AttachmentPanel } from "@/components/attachments/attachment-panel";
import { useAppLocale } from "@/components/app-locale-provider";
import { usePermissions } from "@/components/permissions/permission-provider";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { formatAppDate, formatAppDateTime, formatAppMoney } from "@/lib/app-i18n";
import { formatUnits, parseDecimalToUnits } from "@/lib/money";
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
  const { locale, tc } = useAppLocale();
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
          setError(loadError instanceof Error ? loadError.message : tc("Unable to load supplier payment."));
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
      setError(tc(validationError));
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
      setSuccess(tc("Applied {amount} from {number}.", { amount: formatAppMoney(applyAmount, payment.currency, locale), number: payment.paymentNumber }));
    } catch (applyError) {
      setError(applyError instanceof Error ? applyError.message : tc("Unable to apply unapplied supplier payment amount."));
    } finally {
      setActionLoading(false);
    }
  }

  async function reverseUnappliedAllocation(allocationId: string) {
    if (!payment) {
      return;
    }
    const reason = window.prompt(tc("Reason for reversing this unapplied supplier payment allocation?")) ?? "";
    if (!window.confirm(tc("Reverse allocation on {number}?", { number: payment.paymentNumber }))) {
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
      setSuccess(tc("Unapplied supplier payment allocation reversed."));
    } catch (reverseError) {
      setError(reverseError instanceof Error ? reverseError.message : tc("Unable to reverse unapplied supplier payment allocation."));
    } finally {
      setActionLoading(false);
    }
  }

  async function voidPayment() {
    if (!payment || !window.confirm(tc("Void supplier payment {number}?", { number: payment.paymentNumber }))) {
      return;
    }

    setActionLoading(true);
    setError("");
    setSuccess("");

    try {
      const updated = await apiRequest<SupplierPayment>(`/supplier-payments/${payment.id}/void`, { method: "POST" });
      setPayment(updated);
      await refreshPayment();
      setSuccess(tc("Voided supplier payment {number}.", { number: updated.paymentNumber }));
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : tc("Unable to void supplier payment."));
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
      setError(downloadError instanceof Error ? downloadError.message : tc("Unable to download supplier payment PDF."));
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
    <section>
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">{payment ? <bdi dir="ltr">{payment.paymentNumber}</bdi> : tc("Supplier payment")}</h1>
          <p className="mt-1 text-sm text-steel">{tc("Supplier payment posting, bill matching, and downloadable payment PDF.")}</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Link href={returnTo || "/purchases/supplier-payments"} className="rounded-md border border-slate-300 px-3 py-2 text-center text-sm font-medium text-slate-700 hover:bg-slate-50">
            {tc("Back")}
          </Link>
          {payment?.supplierId ? (
            <Link href={partyDetailHref("supplier", payment.supplierId)} className="rounded-md border border-slate-300 px-3 py-2 text-center text-sm font-medium text-slate-700 hover:bg-slate-50">
              {tc("Supplier workspace")}
            </Link>
          ) : null}
          {payment && canDownloadGeneratedDocuments ? (
            <button type="button" onClick={() => void downloadReceiptPdf()} disabled={actionLoading} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400">
              {tc("Download payment PDF")}
            </button>
          ) : null}
          {payment?.status === "POSTED" && Number(payment.unappliedAmount) > 0 ? (
            <Link
              href={`/purchases/supplier-refunds/new?supplierId=${encodeURIComponent(payment.supplierId)}&sourceType=SUPPLIER_PAYMENT&sourcePaymentId=${encodeURIComponent(payment.id)}`}
              className="rounded-md bg-palm px-3 py-2 text-center text-sm font-semibold text-white hover:bg-teal-800"
            >
              {tc("Record supplier refund")}
            </Link>
          ) : null}
          {payment?.status === "POSTED" && canVoidPaymentPermission ? (
            <button type="button" onClick={() => void voidPayment()} disabled={actionLoading} className="rounded-md border border-rosewood px-3 py-2 text-sm font-medium text-rosewood hover:bg-red-50 disabled:cursor-not-allowed disabled:text-slate-400">
              {tc("Void")}
            </button>
          ) : null}
        </div>
      </div>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">{tc("Log in and select an organization to load supplier payments.")}</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">{tc("Loading supplier payment...")}</StatusMessage> : null}
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
            paymentDetailHref={paymentDetailHref}
            onDownloadReceiptPdf={() => void downloadReceiptPdf()}
          />

          <AttachmentPanel linkedEntityType="SUPPLIER_PAYMENT" linkedEntityId={payment.id} />

          <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
            <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-4">
              <Summary label={tc("Supplier")} value={payment.supplier?.displayName ?? payment.supplier?.name ?? "-"} />
              <Summary label={tc("Status")} value={tc(supplierPaymentStatusLabel(payment.status))} />
              <Summary label={tc("Payment date")} value={formatAppDate(payment.paymentDate, locale, "-")} />
              <Summary label={tc("Currency")} value={payment.currency} bidi />
              <Summary label={tc("Amount paid")} value={formatAppMoney(payment.amountPaid, payment.currency, locale)} />
              <Summary label={tc("Unapplied")} value={formatAppMoney(payment.unappliedAmount, payment.currency, locale)} />
              <Summary label={tc("Applied from unapplied")} value={formatAppMoney(unappliedAppliedAmount, payment.currency, locale)} />
              <Summary label={tc("Paid-through account")} value={payment.account ? `${payment.account.code} ${payment.account.name}` : "-"} bidi={Boolean(payment.account)} />
              <Summary label={tc("Journal entry")} value={payment.journalEntry ? `${payment.journalEntry.entryNumber} (${payment.journalEntry.id})` : "-"} bidi={Boolean(payment.journalEntry)} />
              <Summary label={tc("Void reversal")} value={payment.voidReversalJournalEntry ? `${payment.voidReversalJournalEntry.entryNumber} (${payment.voidReversalJournalEntry.id})` : "-"} bidi={Boolean(payment.voidReversalJournalEntry)} />
              <Summary label={tc("Posted")} value={formatAppDateTime(payment.postedAt, locale, "-")} />
              <Summary label={tc("Voided")} value={formatAppDateTime(payment.voidedAt, locale, "-")} />
              <Summary label={tc("Description")} value={payment.description ?? "-"} />
            </div>
          </div>

          <div className="overflow-x-auto rounded-md border border-slate-200 bg-white shadow-panel">
            <table className="w-full min-w-[820px] text-start text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
                <tr>
                  <th className="px-4 py-3">{tc("Bill")}</th>
                  <th className="px-4 py-3">{tc("Bill date")}</th>
                  <th className="px-4 py-3">{tc("Bill total")}</th>
                  <th className="px-4 py-3">{tc("Applied")}</th>
                  <th className="px-4 py-3">{tc("Bill balance due")}</th>
                  <th className="px-4 py-3">{tc("Status")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payment.allocations?.length ? (
                  payment.allocations.map((allocation) => (
                    <tr key={allocation.id}>
                      <td className="px-4 py-3">
                        <Link href={`/purchases/bills/${allocation.billId}${paymentDetailHref ? `?returnTo=${encodeURIComponent(paymentDetailHref)}` : ""}`} className="font-mono text-xs text-palm hover:underline">
                          <bdi dir="ltr">{allocation.bill?.billNumber ?? allocation.billId}</bdi>
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-steel">{formatAppDate(allocation.bill?.billDate, locale, "-")}</td>
                      <td className="px-4 py-3 font-mono text-xs">{formatAppMoney(allocation.bill?.total ?? "0.0000", payment.currency, locale)}</td>
                      <td className="px-4 py-3 font-mono text-xs">{formatAppMoney(allocation.amountApplied, payment.currency, locale)}</td>
                      <td className="px-4 py-3 font-mono text-xs">{formatAppMoney(allocation.bill?.balanceDue ?? "0.0000", payment.currency, locale)}</td>
                      <td className="px-4 py-3 text-steel">{tc(billStatusLabel(allocation.bill?.status))}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-4 py-5 text-center text-steel">
                      {tc("This supplier payment has no direct bill allocations.")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="rounded-md border border-slate-200 bg-white shadow-panel">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="text-base font-semibold text-ink">{tc("Unapplied supplier payment applications")}</h2>
              <p className="mt-1 text-sm text-steel">{tc("Matching unapplied supplier payment credit to later bills updates balances only. No new journal entry is created.")}</p>
            </div>
            {payment.unappliedAllocations && payment.unappliedAllocations.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[980px] text-start text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
                    <tr>
                      <th className="px-4 py-3">{tc("Bill")}</th>
                      <th className="px-4 py-3">{tc("Bill date")}</th>
                      <th className="px-4 py-3">{tc("Bill total")}</th>
                      <th className="px-4 py-3">{tc("Amount applied")}</th>
                      <th className="px-4 py-3">{tc("Bill balance due")}</th>
                      <th className="px-4 py-3">{tc("Status")}</th>
                      <th className="px-4 py-3">{tc("Reversed")}</th>
                      <th className="px-4 py-3">{tc("Reason")}</th>
                      <th className="px-4 py-3">{tc("Action")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {payment.unappliedAllocations.map((allocation) => (
                      <tr key={allocation.id}>
                        <td className="px-4 py-3 font-mono text-xs"><bdi dir="ltr">{allocation.bill?.billNumber ?? allocation.billId}</bdi></td>
                        <td className="px-4 py-3 text-steel">{formatAppDate(allocation.bill?.billDate, locale, "-")}</td>
                        <td className="px-4 py-3 font-mono text-xs">{allocation.bill ? formatAppMoney(allocation.bill.total, payment.currency, locale) : "-"}</td>
                        <td className="px-4 py-3 font-mono text-xs">{formatAppMoney(allocation.amountApplied, payment.currency, locale)}</td>
                        <td className="px-4 py-3 font-mono text-xs">{allocation.bill ? formatAppMoney(allocation.bill.balanceDue, payment.currency, locale) : "-"}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-md px-2 py-1 text-xs font-medium ${supplierPaymentUnappliedAllocationStatusBadgeClass(allocation)}`}>
                            {tc(supplierPaymentUnappliedAllocationStatusLabel(allocation))}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-steel">{formatAppDateTime(allocation.reversedAt, locale, "-")}</td>
                        <td className="px-4 py-3 text-steel">{allocation.reversalReason ?? "-"}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            <Link href={`/purchases/bills/${allocation.billId}${paymentDetailHref ? `?returnTo=${encodeURIComponent(paymentDetailHref)}` : ""}`} className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
                              {tc("View bill")}
                            </Link>
                            {canReverseSupplierPaymentUnappliedAllocation(allocation) && canVoidPaymentPermission ? (
                              <button type="button" onClick={() => void reverseUnappliedAllocation(allocation.id)} disabled={actionLoading} className="rounded-md border border-rosewood px-2 py-1 text-xs font-medium text-rosewood hover:bg-red-50 disabled:cursor-not-allowed disabled:text-slate-400">
                                {tc("Reverse")}
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
                <StatusMessage type="empty">{tc("No unapplied supplier payment credit has been matched to later bills.")}</StatusMessage>
              </div>
            )}
          </div>

          <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-ink">{tc("Apply unapplied amount")}</h2>
                <p className="mt-1 text-sm text-steel">{tc("Use remaining supplier payment credit against finalized open bills for the same supplier.")}</p>
              </div>
              <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">{tc("No accounting journal")}</span>
            </div>
            {canApplyUnapplied ? (
              openBills.length > 0 ? (
                <form onSubmit={applyUnapplied} className="mt-4 grid grid-cols-1 gap-4 text-sm md:grid-cols-[1.4fr_0.7fr_auto]">
                  <label className="block">
                    <span className="text-xs font-medium uppercase tracking-wide text-steel">{tc("Open bill")}</span>
                    <select value={applyBillId} onChange={(event) => setApplyBillId(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm">
                      {openBills.map((bill) => (
                        <option key={bill.id} value={bill.id}>
                          {tc("{number} - balance {amount}", { number: bill.billNumber, amount: formatAppMoney(bill.balanceDue, bill.currency, locale) })}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-xs font-medium uppercase tracking-wide text-steel">{tc("Amount to apply")}</span>
                    <input value={applyAmount} onChange={(event) => setApplyAmount(event.target.value)} placeholder="0.0000" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
                  </label>
                  <button type="submit" disabled={actionLoading || !applyBillId} className="self-end rounded-md bg-palm px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400">
                    {tc("Apply")}
                  </button>
                  <div className="text-xs text-steel md:col-span-3">
                    {tc("Selected bill balance: {amount}.", { amount: selectedOpenBill ? formatAppMoney(selectedOpenBill.balanceDue, selectedOpenBill.currency, locale) : "-" })}
                    {" "}
                    {tc("Supplier payment credit available: {amount}.", { amount: formatAppMoney(payment.unappliedAmount, payment.currency, locale) })}
                  </div>
                </form>
              ) : (
                <div className="mt-4">
                  <StatusMessage type="empty">{tc("No finalized open bills are available for this supplier.")}</StatusMessage>
                </div>
              )
            ) : (
              <div className="mt-4">
                <StatusMessage type="info">{tc("Unapplied amount can be applied only while the supplier payment is posted and credit remains.")}</StatusMessage>
              </div>
            )}
          </div>

          {receiptData ? (
            <div className="rounded-md border border-slate-200 bg-white shadow-panel">
              <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4">
                <div>
                  <h2 className="text-base font-semibold text-ink">{tc("Receipt data preview")}</h2>
                  <p className="mt-1 text-sm text-steel">{tc("Structured supplier payment document preview. Downloading the PDF stores a generated archive record.")}</p>
                </div>
                {canDownloadGeneratedDocuments ? (
                  <button type="button" onClick={() => void downloadReceiptPdf()} disabled={actionLoading} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400">
                    {tc("Download payment PDF")}
                  </button>
                ) : null}
              </div>
              <div className="p-5">
                <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-4">
                  <Summary label={tc("Payment number")} value={receiptData.receiptNumber} bidi />
                  <Summary label={tc("Supplier")} value={receiptData.supplier.displayName ?? receiptData.supplier.name} />
                  <Summary label={tc("Payment date")} value={formatAppDate(receiptData.paymentDate, locale, "-")} />
                  <Summary label={tc("Status")} value={tc(supplierPaymentStatusLabel(receiptData.status))} />
                  <Summary label={tc("Amount paid")} value={formatAppMoney(receiptData.amountPaid, receiptData.currency, locale)} />
                  <Summary label={tc("Unapplied")} value={formatAppMoney(receiptData.unappliedAmount, receiptData.currency, locale)} />
                  <Summary label={tc("Paid through")} value={`${receiptData.paidThroughAccount.code} ${receiptData.paidThroughAccount.name}`} bidi />
                  <Summary label={tc("Journal entry")} value={receiptData.journalEntry ? `${receiptData.journalEntry.entryNumber} (${receiptData.journalEntry.id})` : "-"} bidi={Boolean(receiptData.journalEntry)} />
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
  const { locale, tc } = useAppLocale();
  const firstAllocatedBill = payment.allocations?.find((allocation) => allocation.bill)?.bill ?? null;
  const appliedTotalUnits = payment.allocations?.reduce((sum, allocation) => sum + parseDecimalToUnits(allocation.amountApplied), 0) ?? 0;
  const hasUnapplied = Number(payment.unappliedAmount) > 0;

  return (
    <div className="space-y-4">
      {recorded ? (
        <StatusMessage type="success">
          {tc("Supplier payment recorded. The payment details below show what changed; linked bill balances are updated.")}
        </StatusMessage>
      ) : null}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-ink">{tc("What happened?")}</h2>
              <p className="mt-1 text-sm leading-6 text-steel">{tc(supplierPaymentOutcomeDescription(payment, hasUnapplied))}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className={`rounded-md px-2 py-1 text-xs font-semibold ${supplierPaymentStatusBadgeClass(payment.status)}`}>
                {tc(supplierPaymentStatusLabel(payment.status))}
              </span>
              {hasUnapplied ? (
                <span className="rounded-md bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">{tc("Unapplied supplier credit")}</span>
              ) : null}
            </div>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
            <Summary label={tc("Amount paid")} value={formatAppMoney(payment.amountPaid, payment.currency, locale)} />
            <Summary label={tc("Applied to bills")} value={formatAppMoney(formatUnits(appliedTotalUnits), payment.currency, locale)} />
            <Summary label={tc("Payment number")} value={receiptData?.receiptNumber ?? payment.paymentNumber} bidi />
          </div>
        </div>

        <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
          <h2 className="text-base font-semibold text-ink">{tc("Next actions")}</h2>
          <p className="mt-1 text-sm leading-6 text-steel">{tc(supplierPaymentNextActionDescription(payment, hasUnapplied))}</p>
          <div className="mt-4 flex flex-col gap-2">
            {firstAllocatedBill ? (
              <Link
                href={`/purchases/bills/${firstAllocatedBill.id}${paymentDetailHref ? `?returnTo=${encodeURIComponent(paymentDetailHref)}` : ""}`}
                className="rounded-md bg-palm px-3 py-2 text-center text-sm font-semibold text-white hover:bg-teal-800"
              >
                {tc("View bill")}
              </Link>
            ) : null}
            {canDownloadGeneratedDocuments ? (
              <button
                type="button"
                onClick={onDownloadReceiptPdf}
                disabled={actionLoading}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
              >
                {tc("Download payment PDF")}
              </button>
            ) : null}
            <Link href={partyDetailHref("supplier", payment.supplierId)} className="rounded-md border border-slate-300 px-3 py-2 text-center text-sm font-medium text-slate-700 hover:bg-slate-50">
              {tc("Open supplier workspace")}
            </Link>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Link
                href={`/reports/aged-payables${paymentDetailHref ? `?returnTo=${encodeURIComponent(paymentDetailHref)}` : ""}`}
                className="rounded-md border border-slate-300 px-3 py-2 text-center text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                {tc("AP report")}
              </Link>
              <Link href="/dashboard" className="rounded-md border border-slate-300 px-3 py-2 text-center text-sm font-medium text-slate-700 hover:bg-slate-50">
                {tc("Dashboard")}
              </Link>
            </div>
          </div>
          {payment.status === "VOIDED" ? (
            <p className="mt-3 text-xs leading-5 text-steel">{tc("This supplier payment is voided. Review the reversal journal below if present before taking further action.")}</p>
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

function Summary({ label, value, bidi = false }: { label: string; value: string; bidi?: boolean }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-steel">{label}</div>
      <div className="mt-1 break-words font-medium text-ink">{bidi ? <bdi dir="ltr">{value}</bdi> : value}</div>
    </div>
  );
}

function billStatusLabel(status: string | undefined | null): string {
  switch (status) {
    case "FINALIZED":
      return "Finalized";
    case "DRAFT":
      return "Draft";
    case "VOIDED":
      return "Voided";
    default:
      return status ?? "-";
  }
}
