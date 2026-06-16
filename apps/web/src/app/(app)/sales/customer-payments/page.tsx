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
import { StatusBadge } from "@/components/ui-ledger/status-badge";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import {
  customerPaymentAllocationState,
  customerPaymentAllocationStateLabel,
} from "@/lib/customer-payments";
import { formatOptionalDate } from "@/lib/invoice-display";
import { formatMoneyAmount } from "@/lib/money";
import { partyDetailHref, safeReturnToFromSearch } from "@/lib/parties";
import { PERMISSIONS } from "@/lib/permissions";
import type { CustomerPayment } from "@/lib/types";

export default function CustomerPaymentsPage() {
  const organizationId = useActiveOrganizationId();
  const { can } = usePermissions();
  const searchParams = useSearchParams();
  const [payments, setPayments] = useState<CustomerPayment[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionId, setActionId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [reloadToken, setReloadToken] = useState(0);
  const canCreatePayment = can(PERMISSIONS.customerPayments.create);
  const canVoidPayment = can(PERMISSIONS.customerPayments.void);
  const customerId = searchParams.get("customerId")?.trim() ?? "";
  const returnTo = safeReturnToFromSearch(searchParams.toString());
  const workspaceHref = customerId ? partyDetailHref("customer", customerId) : "";
  const listContextParams = new URLSearchParams();
  if (customerId) {
    listContextParams.set("customerId", customerId);
  }
  if (returnTo) {
    listContextParams.set("returnTo", returnTo);
  }
  const listContextHref = `/sales/customer-payments${listContextParams.size > 0 ? `?${listContextParams.toString()}` : ""}`;
  const detailReturnTo = customerId || returnTo ? listContextHref : "";
  const recordPaymentHref = customerId
    ? `/sales/customer-payments/new?customerId=${encodeURIComponent(customerId)}&returnTo=${encodeURIComponent(returnTo || workspaceHref)}`
    : "/sales/customer-payments/new";
  const visiblePayments = customerId ? payments.filter((payment) => payment.customerId === customerId) : payments;

  useEffect(() => {
    if (!organizationId) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    apiRequest<CustomerPayment[]>("/customer-payments")
      .then((result) => {
        if (!cancelled) {
          setPayments(result);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load customer payments.");
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

  async function voidPayment(payment: CustomerPayment) {
    if (!window.confirm(`Void payment ${payment.paymentNumber}?`)) {
      return;
    }

    setActionId(payment.id);
    setError("");
    setSuccess("");

    try {
      const voided = await apiRequest<CustomerPayment>(`/customer-payments/${payment.id}/void`, { method: "POST" });
      setSuccess(`Voided payment ${voided.paymentNumber}.`);
      setReloadToken((current) => current + 1);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Unable to void payment.");
    } finally {
      setActionId("");
    }
  }

  return (
    <section>
      <PageHeader
        title="Customer payments"
        description={
          customerId
            ? "Recorded customer payments for this workspace. Receipt PDFs remain explicit output actions."
            : "Recorded customer payments and invoice allocations. Receipt PDFs remain explicit output actions."
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
        {!organizationId ? <StatusMessage type="info">Log in and select an organization to load customer payments.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading customer payments...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {success ? <StatusMessage type="success">{success}</StatusMessage> : null}
        {!loading && organizationId && visiblePayments.length === 0 ? (
          <EmptyState
            title="No customer payments found"
            description={
              customerId
                ? "No customer payments are recorded for this workspace yet. Finalize an invoice first, then record payment to reduce the receivable balance."
                : "No customer payments found. Finalize an invoice first, then record payment to close the receivables loop."
            }
            action={canCreatePayment ? <Link href={recordPaymentHref} className={buttonVariants()}>Record payment</Link> : null}
          />
        ) : null}
      </div>

      {visiblePayments.length > 0 ? (
        <DataTable minWidth="min-w-[1120px]">
          <TableHeader>
              <TableRow>
                <TableHead>Number</TableHead>
                <TableHead>Customer</TableHead>
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
              {visiblePayments.map((payment) => {
                const allocationState = customerPaymentAllocationState(payment);
                return (
                  <TableRow key={payment.id}>
                    <TableCell className="font-mono text-xs">{payment.paymentNumber}</TableCell>
                    <TableCell className="font-medium text-foreground">{payment.customer?.displayName ?? payment.customer?.name ?? "-"}</TableCell>
                    <TableCell className="text-muted-foreground">{formatOptionalDate(payment.paymentDate, "-")}</TableCell>
                    <TableCell>
                      <PaymentStatusBadge status={payment.status} />
                    </TableCell>
                    <TableCell className="font-mono text-xs tabular-nums">{formatMoneyAmount(payment.amountReceived, payment.currency)}</TableCell>
                    <TableCell>
                      <div className="flex flex-col items-start gap-1">
                        <span className="font-mono text-xs tabular-nums">{formatMoneyAmount(payment.unappliedAmount, payment.currency)}</span>
                        <StatusBadge tone={allocationState === "FULLY_APPLIED" ? "success" : allocationState === "PARTIALLY_UNAPPLIED" ? "warning" : "muted"}>
                          {customerPaymentAllocationStateLabel(allocationState)}
                        </StatusBadge>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{payment.account ? `${payment.account.code} ${payment.account.name}` : "-"}</TableCell>
                    <TableCell className="font-mono text-xs">{payment.journalEntry ? `${payment.journalEntry.entryNumber} (${payment.journalEntry.id})` : "-"}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Link
                          href={detailReturnTo ? `/sales/customer-payments/${payment.id}?returnTo=${encodeURIComponent(detailReturnTo)}` : `/sales/customer-payments/${payment.id}`}
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
                );
              })}
            </TableBody>
        </DataTable>
      ) : null}
    </section>
  );
}
