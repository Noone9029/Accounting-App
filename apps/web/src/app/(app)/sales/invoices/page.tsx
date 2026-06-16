"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { usePermissions } from "@/components/permissions/permission-provider";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DataTable } from "@/components/ui-ledger/data-table";
import { EmptyState } from "@/components/ui-ledger/empty-state";
import { FilterBar } from "@/components/ui-ledger/filter-bar";
import { PageHeader } from "@/components/ui-ledger/page-header";
import { StatusBadge } from "@/components/ui-ledger/status-badge";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { formatOptionalDate } from "@/lib/invoice-display";
import { formatMoneyAmount } from "@/lib/money";
import { PERMISSIONS } from "@/lib/permissions";
import type { SalesInvoice, SalesInvoiceStatus } from "@/lib/types";

type StatusFilter = "ALL" | SalesInvoiceStatus;

export default function SalesInvoicesPage() {
  const organizationId = useActiveOrganizationId();
  const { can } = usePermissions();
  const [invoices, setInvoices] = useState<SalesInvoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionId, setActionId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [reloadToken, setReloadToken] = useState(0);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [customerSearch, setCustomerSearch] = useState("");
  const canCreateInvoice = can(PERMISSIONS.salesInvoices.create);
  const canFinalizeInvoice = can(PERMISSIONS.salesInvoices.finalize);

  const filteredInvoices = useMemo(() => {
    const normalizedSearch = customerSearch.trim().toLowerCase();
    return invoices.filter((invoice) => {
      const statusMatches = statusFilter === "ALL" || invoice.status === statusFilter;
      const customerName = invoice.customer?.displayName ?? invoice.customer?.name ?? "";
      const customerMatches = !normalizedSearch || customerName.toLowerCase().includes(normalizedSearch);
      return statusMatches && customerMatches;
    });
  }, [customerSearch, invoices, statusFilter]);

  useEffect(() => {
    if (!organizationId) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    apiRequest<SalesInvoice[]>("/sales-invoices")
      .then((result) => {
        if (!cancelled) {
          setInvoices(result);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load sales invoices.");
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

  async function finalizeInvoice(invoice: SalesInvoice) {
    setActionId(invoice.id);
    setError("");
    setSuccess("");

    try {
      const finalized = await apiRequest<SalesInvoice>(`/sales-invoices/${invoice.id}/finalize`, { method: "POST" });
      setSuccess(`Invoice posted. Open ${finalized.invoiceNumber} to record payment, view the customer ledger, or download the PDF.`);
      setReloadToken((current) => current + 1);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Unable to finalize invoice.");
    } finally {
      setActionId("");
    }
  }

  return (
    <section>
      <PageHeader
        title="Sales invoices"
        description="Draft and finalized customer invoices from the live API."
        actions={
          canCreateInvoice ? (
            <Link href="/sales/invoices/new" className={buttonVariants()}>
              Create invoice
            </Link>
          ) : null
        }
      />

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">Log in and select an organization to load invoices.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading sales invoices...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {success ? <StatusMessage type="success">{success}</StatusMessage> : null}
        {!loading && organizationId && invoices.length === 0 ? (
          <EmptyState
            title="No sales invoices found"
            description="Create the first draft invoice, then finalize it when the customer and totals are ready."
            action={canCreateInvoice ? <Link href="/sales/invoices/new" className={buttonVariants()}>Create invoice</Link> : null}
          />
        ) : null}
      </div>

      {invoices.length > 0 ? (
        <FilterBar>
          <label className="block">
            <span className="text-xs font-medium uppercase text-muted-foreground">Status</span>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)} className="mt-1 h-8 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20">
              <option value="ALL">All</option>
              <option value="DRAFT">Draft</option>
              <option value="FINALIZED">Finalized</option>
              <option value="VOIDED">Voided</option>
            </select>
          </label>
          <label className="block min-w-64">
            <span className="text-xs font-medium uppercase text-muted-foreground">Customer</span>
            <Input value={customerSearch} onChange={(event) => setCustomerSearch(event.target.value)} placeholder="Search customer" className="mt-1 w-full" />
          </label>
        </FilterBar>
      ) : null}

      {invoices.length > 0 && filteredInvoices.length === 0 ? (
        <div className="mt-5">
          <EmptyState title="No invoices match the current filters" />
        </div>
      ) : null}

      {filteredInvoices.length > 0 ? (
        <DataTable minWidth="min-w-[1280px]">
            <TableHeader className="bg-muted/60 text-xs uppercase text-muted-foreground">
              <TableRow>
                <TableHead>Number</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Issue</TableHead>
                <TableHead>Due</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Subtotal</TableHead>
                <TableHead>Tax</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Balance due</TableHead>
                <TableHead>Journal</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-mono text-xs">{invoice.invoiceNumber}</TableCell>
                  <TableCell className="font-medium text-foreground">{invoice.customer?.displayName ?? invoice.customer?.name ?? "-"}</TableCell>
                  <TableCell className="text-muted-foreground">{new Date(invoice.issueDate).toLocaleDateString()}</TableCell>
                  <TableCell className="text-muted-foreground">{formatOptionalDate(invoice.dueDate)}</TableCell>
                  <TableCell>
                    <InvoiceStatusPill status={invoice.status} />
                  </TableCell>
                  <TableCell className="font-mono text-xs">{formatMoneyAmount(invoice.subtotal, invoice.currency)}</TableCell>
                  <TableCell className="font-mono text-xs">{formatMoneyAmount(invoice.taxTotal, invoice.currency)}</TableCell>
                  <TableCell className="font-mono text-xs">{formatMoneyAmount(invoice.total, invoice.currency)}</TableCell>
                  <TableCell className="font-mono text-xs">{formatMoneyAmount(invoice.balanceDue, invoice.currency)}</TableCell>
                  <TableCell className="text-muted-foreground">{invoice.journalEntry ? invoice.journalEntry.status : "-"}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Link href={`/sales/invoices/${invoice.id}`} className={buttonVariants({ variant: "outline", size: "xs" })}>
                        View
                      </Link>
                      {invoice.status === "DRAFT" && canFinalizeInvoice ? (
                        <Button type="button" variant="outline" size="xs" onClick={() => void finalizeInvoice(invoice)} disabled={actionId === invoice.id}>
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

function InvoiceStatusPill({ status }: { status: SalesInvoiceStatus }) {
  const label = status === "FINALIZED" ? "Finalized/posted" : status === "VOIDED" ? "Voided" : "Draft";
  const tone = status === "FINALIZED" ? "success" : status === "VOIDED" ? "danger" : "muted";

  return <StatusBadge tone={tone}>{label}</StatusBadge>;
}
