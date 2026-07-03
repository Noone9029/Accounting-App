"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAppLocale } from "@/components/app-locale-provider";
import { StatusMessage } from "@/components/common/status-message";
import { usePermissions } from "@/components/permissions/permission-provider";
import { DataTable, FieldLabel, FieldText, FilterBar, LedgerButton, LedgerInput, LedgerSelect, MoneyCell, PageHeader, TableHead, Toolbar } from "@/components/ui-ledger";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { formatAppDate, formatAppMoney } from "@/lib/app-i18n";
import { PERMISSIONS } from "@/lib/permissions";
import type { SalesInvoice, SalesInvoiceStatus } from "@/lib/types";

type StatusFilter = "ALL" | SalesInvoiceStatus;

export default function SalesInvoicesPage() {
  const organizationId = useActiveOrganizationId();
  const { can } = usePermissions();
  const { locale, tc } = useAppLocale();
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
          setError(loadError instanceof Error ? loadError.message : tc("Unable to load sales invoices."));
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
  }, [organizationId, reloadToken, tc]);

  async function finalizeInvoice(invoice: SalesInvoice) {
    setActionId(invoice.id);
    setError("");
    setSuccess("");

    try {
      const finalized = await apiRequest<SalesInvoice>(`/sales-invoices/${invoice.id}/finalize`, { method: "POST" });
      setSuccess(tc("Invoice posted. Open {number} to record payment, view the customer ledger, or download the PDF.", { number: finalized.invoiceNumber }));
      setReloadToken((current) => current + 1);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : tc("Unable to finalize invoice."));
    } finally {
      setActionId("");
    }
  }

  return (
    <section>
      <PageHeader
        eyebrow={tc("Sales / AR")}
        title={tc("Sales invoices")}
        description={tc("Draft and finalized customer invoices from the live API. Review customer, VAT, balance, and posting state before taking action.")}
        actions={canCreateInvoice ? <LedgerButton href="/sales/invoices/new" variant="primary">{tc("Create invoice")}</LedgerButton> : null}
      />

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">{tc("Log in and select an organization to load invoices.")}</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">{tc("Loading sales invoices...")}</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {success ? <StatusMessage type="success">{success}</StatusMessage> : null}
        {!loading && organizationId && invoices.length === 0 ? (
          <StatusMessage type="empty">
            {tc("No sales invoices found. Create the first draft invoice, then finalize it when the customer and totals are ready.")}
          </StatusMessage>
        ) : null}
      </div>

      {invoices.length > 0 ? (
        <Toolbar
          title={tc("Invoice filters")}
          description={tc("Keep this list focused on review status and customer context before finalizing or recording payment.")}
        >
          <FilterBar>
            <FieldLabel>
              <FieldText>{tc("Status")}</FieldText>
              <LedgerSelect value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)} className="sm:w-40">
              <option value="ALL">{tc("All")}</option>
              <option value="DRAFT">{tc("Draft")}</option>
              <option value="FINALIZED">{tc("Finalized")}</option>
              <option value="VOIDED">{tc("Voided")}</option>
              </LedgerSelect>
            </FieldLabel>
            <FieldLabel className="min-w-64">
              <FieldText>{tc("Customer")}</FieldText>
              <LedgerInput value={customerSearch} onChange={(event) => setCustomerSearch(event.target.value)} placeholder={tc("Search customer")} />
            </FieldLabel>
          </FilterBar>
        </Toolbar>
      ) : null}

      {invoices.length > 0 && filteredInvoices.length === 0 ? (
        <div className="mt-5">
          <StatusMessage type="empty">{tc("No invoices match the current filters.")}</StatusMessage>
        </div>
      ) : null}

      {filteredInvoices.length > 0 ? (
        <div className="mt-5">
          <DataTable minWidth="1280px">
            <TableHead>
              <tr>
                <th className="px-4 py-3">{tc("Number")}</th>
                <th className="px-4 py-3">{tc("Customer")}</th>
                <th className="px-4 py-3">{tc("Issue")}</th>
                <th className="px-4 py-3">{tc("Due")}</th>
                <th className="px-4 py-3">{tc("Status")}</th>
                <th className="px-4 py-3">{tc("Subtotal")}</th>
                <th className="px-4 py-3">{tc("Tax")}</th>
                <th className="px-4 py-3">{tc("Total")}</th>
                <th className="px-4 py-3">{tc("Balance due")}</th>
                <th className="px-4 py-3">{tc("Journal")}</th>
                <th className="px-4 py-3">{tc("Actions")}</th>
              </tr>
            </TableHead>
            <tbody className="divide-y divide-slate-100">
              {filteredInvoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td className="px-4 py-3 font-mono text-xs"><bdi dir="ltr">{invoice.invoiceNumber}</bdi></td>
                  <td className="px-4 py-3 font-medium text-ink">{invoice.customer?.displayName ?? invoice.customer?.name ?? "-"}</td>
                  <td className="px-4 py-3 text-steel">{formatAppDate(invoice.issueDate, locale, "-")}</td>
                  <td className="px-4 py-3 text-steel">{formatAppDate(invoice.dueDate, locale, "-")}</td>
                  <td className="px-4 py-3">
                    <InvoiceStatusPill status={invoice.status} />
                  </td>
                  <td className="px-4 py-3"><MoneyCell>{formatAppMoney(invoice.subtotal, invoice.currency, locale)}</MoneyCell></td>
                  <td className="px-4 py-3"><MoneyCell>{formatAppMoney(invoice.taxTotal, invoice.currency, locale)}</MoneyCell></td>
                  <td className="px-4 py-3"><MoneyCell>{formatAppMoney(invoice.total, invoice.currency, locale)}</MoneyCell></td>
                  <td className="px-4 py-3"><MoneyCell>{formatAppMoney(invoice.balanceDue, invoice.currency, locale)}</MoneyCell></td>
                  <td className="px-4 py-3 text-steel">{invoice.journalEntry ? tc(invoice.journalEntry.status) : "-"}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <LedgerButton href={`/sales/invoices/${invoice.id}`} size="sm">{tc("View")}</LedgerButton>
                      {invoice.status === "DRAFT" && canFinalizeInvoice ? (
                        <button type="button" onClick={() => void finalizeInvoice(invoice)} disabled={actionId === invoice.id} className="ledger-focus rounded-md border border-palm px-2 py-1 text-xs font-semibold text-palm hover:bg-emerald-50 disabled:cursor-not-allowed disabled:text-slate-400">
                          {tc("Finalize")}
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        </div>
      ) : null}
    </section>
  );
}

function InvoiceStatusPill({ status }: { status: SalesInvoiceStatus }) {
  const { tc } = useAppLocale();
  const className =
    status === "FINALIZED"
      ? "bg-emerald-50 text-emerald-700"
      : status === "VOIDED"
        ? "bg-rose-50 text-rosewood"
        : "bg-slate-100 text-slate-700";
  const label = status === "FINALIZED" ? "Finalized/posted" : status === "VOIDED" ? "Voided" : "Draft";

  return <span className={`rounded-md px-2 py-1 text-xs font-medium ${className}`}>{tc(label)}</span>;
}
