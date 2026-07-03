"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useAppLocale } from "@/components/app-locale-provider";
import { StatusMessage } from "@/components/common/status-message";
import { usePermissions } from "@/components/permissions/permission-provider";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { formatAppDate, formatAppMoney } from "@/lib/app-i18n";
import { partyDetailHref, safeReturnToFromSearch } from "@/lib/parties";
import { PERMISSIONS } from "@/lib/permissions";
import type { SupplierPayment } from "@/lib/types";

export default function SupplierPaymentsPage() {
  const organizationId = useActiveOrganizationId();
  const { can } = usePermissions();
  const { locale, tc } = useAppLocale();
  const searchParams = useSearchParams();
  const [payments, setPayments] = useState<SupplierPayment[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionId, setActionId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [reloadToken, setReloadToken] = useState(0);
  const canCreatePayment = can(PERMISSIONS.supplierPayments.create);
  const canVoidPayment = can(PERMISSIONS.supplierPayments.void);
  const supplierId = searchParams.get("supplierId")?.trim() ?? "";
  const returnTo = safeReturnToFromSearch(searchParams.toString());
  const workspaceHref = supplierId ? partyDetailHref("supplier", supplierId) : "";
  const listContextParams = new URLSearchParams();
  if (supplierId) {
    listContextParams.set("supplierId", supplierId);
  }
  if (returnTo) {
    listContextParams.set("returnTo", returnTo);
  }
  const listContextHref = `/purchases/supplier-payments${listContextParams.size > 0 ? `?${listContextParams.toString()}` : ""}`;
  const detailReturnTo = supplierId || returnTo ? listContextHref : "";
  const recordPaymentHref = supplierId
    ? `/purchases/supplier-payments/new?supplierId=${encodeURIComponent(supplierId)}&returnTo=${encodeURIComponent(returnTo || workspaceHref)}`
    : "/purchases/supplier-payments/new";
  const visiblePayments = supplierId ? payments.filter((payment) => payment.supplierId === supplierId) : payments;

  useEffect(() => {
    if (!organizationId) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    apiRequest<SupplierPayment[]>("/supplier-payments")
      .then((result) => {
        if (!cancelled) {
          setPayments(result);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : tc("Unable to load supplier payments."));
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
  }, [organizationId, reloadToken]);

  async function voidPayment(payment: SupplierPayment) {
    if (!window.confirm(tc("Void supplier payment {number}?", { number: payment.paymentNumber }))) {
      return;
    }

    setActionId(payment.id);
    setError("");
    setSuccess("");

    try {
      const voided = await apiRequest<SupplierPayment>(`/supplier-payments/${payment.id}/void`, { method: "POST" });
      setSuccess(tc("Voided supplier payment {number}.", { number: voided.paymentNumber }));
      setReloadToken((current) => current + 1);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : tc("Unable to void supplier payment."));
    } finally {
      setActionId("");
    }
  }

  return (
    <section>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">{tc("Supplier payments")}</h1>
          <p className="mt-1 text-sm text-steel">
            {supplierId
              ? tc("Recorded supplier payments for this workspace. Payment PDFs remain explicit output actions.")
              : tc("Recorded supplier payments and purchase bill allocations. Payment PDFs remain explicit output actions.")}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {returnTo ? (
            <Link href={returnTo} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              {tc("Back to workspace")}
            </Link>
          ) : null}
          {canCreatePayment ? (
            <Link href={recordPaymentHref} className="rounded-md bg-palm px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800">
              {tc("Record payment")}
            </Link>
          ) : null}
        </div>
      </div>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">{tc("Log in and select an organization to load supplier payments.")}</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">{tc("Loading supplier payments...")}</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {success ? <StatusMessage type="success">{success}</StatusMessage> : null}
        {!loading && organizationId && visiblePayments.length === 0 ? (
          <StatusMessage type="empty">
            {supplierId
              ? tc("No supplier payments are recorded for this workspace yet. Finalize a bill first, then record payment to reduce the payable balance.")
              : tc("No supplier payments found. Finalize a bill first, then record payment to reduce the payable balance.")}
          </StatusMessage>
        ) : null}
      </div>

      {visiblePayments.length > 0 ? (
        <div className="mt-5 overflow-x-auto rounded-md border border-slate-200 bg-white shadow-panel">
          <table className="w-full min-w-[1080px] text-start text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
              <tr>
                <th className="px-4 py-3">{tc("Number")}</th>
                <th className="px-4 py-3">{tc("Supplier")}</th>
                <th className="px-4 py-3">{tc("Date")}</th>
                <th className="px-4 py-3">{tc("Status")}</th>
                <th className="px-4 py-3">{tc("Amount")}</th>
                <th className="px-4 py-3">{tc("Unapplied")}</th>
                <th className="px-4 py-3">{tc("Paid through")}</th>
                <th className="px-4 py-3">{tc("Journal")}</th>
                <th className="px-4 py-3">{tc("Actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visiblePayments.map((payment) => (
                <tr key={payment.id}>
                  <td className="px-4 py-3 font-mono text-xs"><bdi dir="ltr">{payment.paymentNumber}</bdi></td>
                  <td className="px-4 py-3 font-medium text-ink">{payment.supplier?.displayName ?? payment.supplier?.name ?? "-"}</td>
                  <td className="px-4 py-3 text-steel">{formatAppDate(payment.paymentDate, locale, "-")}</td>
                  <td className="px-4 py-3 text-steel">{tc(supplierPaymentStatusLabel(payment.status))}</td>
                  <td className="px-4 py-3 font-mono text-xs">{formatAppMoney(payment.amountPaid, payment.currency, locale)}</td>
                  <td className="px-4 py-3 font-mono text-xs">{formatAppMoney(payment.unappliedAmount, payment.currency, locale)}</td>
                  <td className="px-4 py-3 text-steel">{payment.account ? <bdi dir="ltr">{`${payment.account.code} ${payment.account.name}`}</bdi> : "-"}</td>
                  <td className="px-4 py-3 font-mono text-xs">{payment.journalEntry ? <bdi dir="ltr">{`${payment.journalEntry.entryNumber} (${payment.journalEntry.id})`}</bdi> : "-"}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Link
                        href={detailReturnTo ? `/purchases/supplier-payments/${payment.id}?returnTo=${encodeURIComponent(detailReturnTo)}` : `/purchases/supplier-payments/${payment.id}`}
                        className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        {tc("View")}
                      </Link>
                      {payment.status === "POSTED" && canVoidPayment ? (
                        <button type="button" onClick={() => void voidPayment(payment)} disabled={actionId === payment.id} className="rounded-md border border-rosewood px-2 py-1 text-xs font-medium text-rosewood hover:bg-red-50 disabled:cursor-not-allowed disabled:text-slate-400">
                          {tc("Void")}
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
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
      return status ?? "-";
  }
}
