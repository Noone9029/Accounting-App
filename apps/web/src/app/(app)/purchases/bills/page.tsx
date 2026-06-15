"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { usePermissions } from "@/components/permissions/permission-provider";
import { Button, buttonVariants } from "@/components/ui/button";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DataTable } from "@/components/ui-ledger/data-table";
import { EmptyState } from "@/components/ui-ledger/empty-state";
import { PageHeader } from "@/components/ui-ledger/page-header";
import { StatusBadge } from "@/components/ui-ledger/status-badge";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { formatOptionalDate } from "@/lib/invoice-display";
import { formatMoneyAmount } from "@/lib/money";
import { PERMISSIONS } from "@/lib/permissions";
import type { PurchaseBill } from "@/lib/types";

export default function PurchaseBillsPage() {
  const organizationId = useActiveOrganizationId();
  const { can } = usePermissions();
  const [bills, setBills] = useState<PurchaseBill[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionId, setActionId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [reloadToken, setReloadToken] = useState(0);
  const canCreateBill = can(PERMISSIONS.purchaseBills.create);
  const canFinalizeBill = can(PERMISSIONS.purchaseBills.finalize);

  useEffect(() => {
    if (!organizationId) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    apiRequest<PurchaseBill[]>("/purchase-bills")
      .then((result) => {
        if (!cancelled) {
          setBills(result);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load purchase bills.");
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

  async function finalizeBill(bill: PurchaseBill) {
    setActionId(bill.id);
    setError("");
    setSuccess("");

    try {
      const finalized = await apiRequest<PurchaseBill>(`/purchase-bills/${bill.id}/finalize`, { method: "POST" });
      setSuccess(`Finalized bill ${finalized.billNumber}.`);
      setReloadToken((current) => current + 1);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Unable to finalize purchase bill.");
    } finally {
      setActionId("");
    }
  }

  return (
    <section>
      <PageHeader
        title="Purchase bills"
        description="Supplier bills, AP status, and balance due tracking."
        actions={
          canCreateBill ? (
            <Link href="/purchases/bills/new" className={buttonVariants()}>
              Create bill
            </Link>
          ) : null
        }
      />

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">Log in and select an organization to load purchase bills.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading purchase bills...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {success ? <StatusMessage type="success">{success}</StatusMessage> : null}
        {!loading && organizationId && bills.length === 0 ? <EmptyState title="No purchase bills found" description="Create the first supplier bill when AP records are ready." action={canCreateBill ? <Link href="/purchases/bills/new" className={buttonVariants()}>Create bill</Link> : null} /> : null}
      </div>

      {bills.length > 0 ? (
        <DataTable minWidth="min-w-[1060px]">
            <TableHeader className="bg-muted/60 text-xs uppercase text-muted-foreground">
              <TableRow>
                <TableHead>Number</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Bill date</TableHead>
                <TableHead>Due date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Balance due</TableHead>
                <TableHead>Journal</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bills.map((bill) => (
                <TableRow key={bill.id}>
                  <TableCell className="font-mono text-xs">{bill.billNumber}</TableCell>
                  <TableCell className="font-medium text-foreground">{bill.supplier?.displayName ?? bill.supplier?.name ?? "-"}</TableCell>
                  <TableCell className="text-muted-foreground">{formatOptionalDate(bill.billDate, "-")}</TableCell>
                  <TableCell className="text-muted-foreground">{formatOptionalDate(bill.dueDate, "-")}</TableCell>
                  <TableCell><BillStatusPill status={bill.status} /></TableCell>
                  <TableCell className="font-mono text-xs">{formatMoneyAmount(bill.total, bill.currency)}</TableCell>
                  <TableCell className="font-mono text-xs">{formatMoneyAmount(bill.balanceDue, bill.currency)}</TableCell>
                  <TableCell className="font-mono text-xs">{bill.journalEntry ? `${bill.journalEntry.entryNumber} (${bill.journalEntry.id})` : "-"}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Link href={`/purchases/bills/${bill.id}`} className={buttonVariants({ variant: "outline", size: "xs" })}>
                        View
                      </Link>
                      {bill.status === "DRAFT" && canFinalizeBill ? (
                        <Button type="button" size="xs" onClick={() => void finalizeBill(bill)} disabled={actionId === bill.id}>
                          Finalize
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

function BillStatusPill({ status }: Readonly<{ status: string }>) {
  const tone = status === "FINALIZED" ? "success" : status === "VOIDED" ? "danger" : status === "DRAFT" ? "muted" : "info";
  const label = status === "FINALIZED" ? "Finalized/posted" : status.toLowerCase().replaceAll("_", " ");

  return <StatusBadge tone={tone}>{label}</StatusBadge>;
}
