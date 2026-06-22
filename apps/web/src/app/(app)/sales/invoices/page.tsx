"use client";

import { useEffect, useMemo, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { usePermissions } from "@/components/permissions/permission-provider";
import {
  LedgerButton,
  LedgerDataTable,
  LedgerDate,
  LedgerEmptyState,
  LedgerFieldLabel,
  LedgerFieldText,
  LedgerFilterBar,
  LedgerInput,
  LedgerMoney,
  LedgerPage,
  LedgerPageBody,
  LedgerPageHeader,
  LedgerSelect,
  LedgerStatusBadge,
  LedgerSummaryBand,
  LedgerToolbar,
} from "@/components/ui/ledger-system";
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
    <LedgerPage>
      <LedgerPageHeader
        eyebrow="Sales / AR"
        title="Sales invoices"
        description="Draft and finalized customer invoices from the live API. Review customer, VAT, balance, and posting state before taking action."
        actions={
          canCreateInvoice ? (
            <LedgerButton href="/sales/invoices/new" variant="primary">
              Create invoice
            </LedgerButton>
          ) : null
        }
      />

      <LedgerSummaryBand tone="info">
        Finalizing an invoice remains an explicit posting action. This list does not send email, collect payments, submit tax data, run compliance calls, or change PDF/storage behavior.
      </LedgerSummaryBand>

      <LedgerPageBody>
        {!organizationId ? <StatusMessage type="info">Log in and select an organization to load invoices.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading sales invoices...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {success ? <StatusMessage type="success">{success}</StatusMessage> : null}
        {!loading && organizationId && invoices.length === 0 ? (
          <LedgerEmptyState
            title="No sales invoices found"
            description="Create the first draft invoice, then finalize it when the customer and totals are ready."
            action={canCreateInvoice ? <LedgerButton href="/sales/invoices/new" variant="primary">Create invoice</LedgerButton> : null}
          />
        ) : null}

      {invoices.length > 0 ? (
        <LedgerToolbar
          title="Invoice filters"
          description="Keep this list focused on review status and customer context before finalizing or recording payment."
        >
          <LedgerFilterBar>
            <LedgerFieldLabel>
              <LedgerFieldText>Status</LedgerFieldText>
              <LedgerSelect value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)} className="sm:w-40">
                <option value="ALL">All</option>
                <option value="DRAFT">Draft</option>
                <option value="FINALIZED">Finalized</option>
                <option value="VOIDED">Voided</option>
              </LedgerSelect>
            </LedgerFieldLabel>
            <LedgerFieldLabel className="min-w-64">
              <LedgerFieldText>Customer</LedgerFieldText>
              <LedgerInput value={customerSearch} onChange={(event) => setCustomerSearch(event.target.value)} placeholder="Search customer" />
            </LedgerFieldLabel>
          </LedgerFilterBar>
        </LedgerToolbar>
      ) : null}

      {invoices.length > 0 && filteredInvoices.length === 0 ? (
        <LedgerEmptyState title="No invoices match the current filters" description="Clear the status or customer filter to return to the full AR invoice list." />
      ) : null}

      {filteredInvoices.length > 0 ? (
        <LedgerDataTable minWidth="1280px">
            <thead className="ledger-table-header">
              <tr>
                <th className="px-4 py-3">Number</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Issue</th>
                <th className="px-4 py-3">Due</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Subtotal</th>
                <th className="px-4 py-3">Tax</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Balance due</th>
                <th className="px-4 py-3">Journal</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredInvoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td className="px-4 py-3 font-mono text-xs">{invoice.invoiceNumber}</td>
                  <td className="px-4 py-3 font-medium text-ink">{invoice.customer?.displayName ?? invoice.customer?.name ?? "-"}</td>
                  <td className="px-4 py-3"><LedgerDate>{new Date(invoice.issueDate).toLocaleDateString()}</LedgerDate></td>
                  <td className="px-4 py-3"><LedgerDate>{formatOptionalDate(invoice.dueDate)}</LedgerDate></td>
                  <td className="px-4 py-3">
                    <InvoiceStatusPill status={invoice.status} />
                  </td>
                  <td className="px-4 py-3"><LedgerMoney>{formatMoneyAmount(invoice.subtotal, invoice.currency)}</LedgerMoney></td>
                  <td className="px-4 py-3"><LedgerMoney>{formatMoneyAmount(invoice.taxTotal, invoice.currency)}</LedgerMoney></td>
                  <td className="px-4 py-3"><LedgerMoney>{formatMoneyAmount(invoice.total, invoice.currency)}</LedgerMoney></td>
                  <td className="px-4 py-3"><LedgerMoney>{formatMoneyAmount(invoice.balanceDue, invoice.currency)}</LedgerMoney></td>
                  <td className="px-4 py-3 text-steel">{invoice.journalEntry ? invoice.journalEntry.status : "-"}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <LedgerButton href={`/sales/invoices/${invoice.id}`} size="sm">View</LedgerButton>
                      {invoice.status === "DRAFT" && canFinalizeInvoice ? (
                        <LedgerButton size="sm" onClick={() => void finalizeInvoice(invoice)} disabled={actionId === invoice.id}>
                          Finalize
                        </LedgerButton>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
        </LedgerDataTable>
      ) : null}
      </LedgerPageBody>
    </LedgerPage>
  );
}

function InvoiceStatusPill({ status }: { status: SalesInvoiceStatus }) {
  const label = status === "FINALIZED" ? "Finalized/posted" : status === "VOIDED" ? "Voided" : "Draft";
  const tone = status === "FINALIZED" ? "success" : status === "VOIDED" ? "danger" : "draft";

  return <LedgerStatusBadge tone={tone}>{label}</LedgerStatusBadge>;
}
