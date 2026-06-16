"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { usePermissions } from "@/components/permissions/permission-provider";
import { Button, buttonVariants } from "@/components/ui/button";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DataTable } from "@/components/ui-ledger/data-table";
import { EmptyState } from "@/components/ui-ledger/empty-state";
import { PageHeader } from "@/components/ui-ledger/page-header";
import { PaymentStatusBadge } from "@/components/ui-ledger/payment-method-badge";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { formatOptionalDate } from "@/lib/invoice-display";
import { formatMoneyAmount } from "@/lib/money";
import { partyDetailHref, safeReturnToFromSearch } from "@/lib/parties";
import { PERMISSIONS } from "@/lib/permissions";
import type { SupplierPayment } from "@/lib/types";

export default function SupplierPaymentsPage() {
  const organizationId = useActiveOrganizationId();
  const { can } = usePermissions();
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
          setError(loadError instanceof Error ? loadError.message : "Unable to load supplier payments.");
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
    if (!window.confirm(`Void supplier payment ${payment.paymentNumber}?`)) {
      return;
    }

    setActionId(payment.id);
    setError("");
    setSuccess("");

    try {
      const voided = await apiRequest<SupplierPayment>(`/supplier-payments/${payment.id}/void`, { method: "POST" });
      setSuccess(`Voided supplier payment ${voided.paymentNumber}.`);
      setReloadToken((current) => current + 1);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Unable to void supplier payment.");
    } finally {
      setActionId("");
    }
  }

  return (
    <section>
      <PageHeader
        title="Supplier payments"
        description={
          supplierId
            ? "Recorded supplier payments for this workspace. Payment PDFs remain explicit output actions."
            : "Recorded supplier payments and purchase bill allocations. Payment PDFs remain explicit output actions."
        }
        actions={
          <>
          {returnTo ? (
            <Link href={returnTo} className={buttonVariants({ variant: "outline" })}>
              Back to workspace
            </Link>
          ) : null}
          {canCreatePayment ? (
            <Link href={recordPaymentHref} className={buttonVariants()}>
              Record payment
            </Link>
          ) : null}
          </>
        }
      />

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">Log in and select an organization to load supplier payments.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading supplier payments...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {success ? <StatusMessage type="success">{success}</StatusMessage> : null}
        {!loading && organizationId && visiblePayments.length === 0 ? (
          <EmptyState
            title="No supplier payments found"
            description={
              supplierId
                ? "No supplier payments are recorded for this workspace yet. Finalize a bill first, then record payment to reduce the payable balance."
                : "No supplier payments found. Finalize a bill first, then record payment to reduce the payable balance."
            }
            action={canCreatePayment ? <Link href={recordPaymentHref} className={buttonVariants()}>Record payment</Link> : null}
          />
        ) : null}
      </div>

      {visiblePayments.length > 0 ? (
        <DataTable minWidth="min-w-[1080px]">
          <TableHeader>
              <TableRow>
                <TableHead>Number</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Unapplied</TableHead>
                <TableHead>Paid through</TableHead>
                <TableHead>Journal</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visiblePayments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell className="font-mono text-xs">{payment.paymentNumber}</TableCell>
                  <TableCell className="font-medium text-foreground">{payment.supplier?.displayName ?? payment.supplier?.name ?? "-"}</TableCell>
                  <TableCell className="text-muted-foreground">{formatOptionalDate(payment.paymentDate, "-")}</TableCell>
                  <TableCell>
                    <PaymentStatusBadge status={payment.status} />
                  </TableCell>
                  <TableCell className="font-mono text-xs tabular-nums">{formatMoneyAmount(payment.amountPaid, payment.currency)}</TableCell>
                  <TableCell className="font-mono text-xs tabular-nums">{formatMoneyAmount(payment.unappliedAmount, payment.currency)}</TableCell>
                  <TableCell className="text-muted-foreground">{payment.account ? `${payment.account.code} ${payment.account.name}` : "-"}</TableCell>
                  <TableCell className="font-mono text-xs">{payment.journalEntry ? `${payment.journalEntry.entryNumber} (${payment.journalEntry.id})` : "-"}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Link
                        href={detailReturnTo ? `/purchases/supplier-payments/${payment.id}?returnTo=${encodeURIComponent(detailReturnTo)}` : `/purchases/supplier-payments/${payment.id}`}
                        className={buttonVariants({ variant: "outline", size: "xs" })}
                      >
                        View
                      </Link>
                      {payment.status === "POSTED" && canVoidPayment ? (
                        <Button type="button" variant="destructive" size="xs" onClick={() => void voidPayment(payment)} disabled={actionId === payment.id}>
                          Void
                        </Button>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
        </DataTable>
      ) : null}
    </section>
  );
}
