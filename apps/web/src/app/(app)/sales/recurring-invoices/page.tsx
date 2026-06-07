"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { usePermissions } from "@/components/permissions/permission-provider";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { formatOptionalDate } from "@/lib/invoice-display";
import { formatMoneyAmount } from "@/lib/money";
import { PERMISSIONS } from "@/lib/permissions";
import { recurringInvoiceFrequencyLabel, recurringInvoiceStatusBadgeClass, recurringInvoiceStatusLabel } from "@/lib/recurring-invoices";
import type { RecurringInvoiceFrequency, RecurringInvoiceTemplate, RecurringInvoiceTemplateStatus } from "@/lib/types";

type StatusFilter = "ALL" | RecurringInvoiceTemplateStatus;
type FrequencyFilter = "ALL" | RecurringInvoiceFrequency;

const statuses: RecurringInvoiceTemplateStatus[] = ["DRAFT", "ACTIVE", "PAUSED", "ENDED", "CANCELLED"];
const frequencies: RecurringInvoiceFrequency[] = ["WEEKLY", "MONTHLY", "QUARTERLY", "YEARLY"];

export default function RecurringInvoicesPage() {
  const organizationId = useActiveOrganizationId();
  const { can } = usePermissions();
  const [templates, setTemplates] = useState<RecurringInvoiceTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [frequencyFilter, setFrequencyFilter] = useState<FrequencyFilter>("ALL");
  const [customerSearch, setCustomerSearch] = useState("");
  const canCreateTemplate = can(PERMISSIONS.salesInvoices.create);
  const canEditTemplate = can(PERMISSIONS.salesInvoices.update);

  const filteredTemplates = useMemo(() => {
    const normalizedSearch = customerSearch.trim().toLowerCase();
    return templates.filter((template) => {
      const statusMatches = statusFilter === "ALL" || template.status === statusFilter;
      const frequencyMatches = frequencyFilter === "ALL" || template.frequency === frequencyFilter;
      const customerName = template.customer?.displayName ?? template.customer?.name ?? "";
      const customerMatches = !normalizedSearch || customerName.toLowerCase().includes(normalizedSearch);
      return statusMatches && frequencyMatches && customerMatches;
    });
  }, [customerSearch, frequencyFilter, statusFilter, templates]);

  useEffect(() => {
    if (!organizationId) {
      return;
    }

    let cancelled = false;
    const params = new URLSearchParams(typeof window === "undefined" ? "" : window.location.search);
    const customerId = params.get("customerId")?.trim();
    const path = customerId ? `/recurring-invoices?customerId=${encodeURIComponent(customerId)}` : "/recurring-invoices";

    setLoading(true);
    setError("");

    apiRequest<RecurringInvoiceTemplate[]>(path)
      .then((result) => {
        if (!cancelled) {
          setTemplates(result);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load recurring invoice templates.");
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
  }, [organizationId]);

  return (
    <section>
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Recurring invoices</h1>
          <p className="mt-1 text-sm text-steel">Non-posting templates for manual draft-invoice generation. No automatic scheduler runs from this workspace.</p>
        </div>
        {canCreateTemplate ? (
          <Link href="/sales/recurring-invoices/new" className="rounded-md bg-palm px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800">
            Create template
          </Link>
        ) : null}
      </div>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">Log in and select an organization to load recurring invoice templates.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading recurring invoice templates...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {!loading && organizationId && templates.length === 0 ? (
          <StatusMessage type="empty">No recurring invoice templates found. Create a draft template, activate it, then generate draft invoices manually.</StatusMessage>
        ) : null}
      </div>

      {templates.length > 0 ? (
        <div className="mt-5 flex flex-wrap gap-3 rounded-md border border-slate-200 bg-white p-4 shadow-panel">
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wide text-steel">Status</span>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)} className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm">
              <option value="ALL">All</option>
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {recurringInvoiceStatusLabel(status)}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wide text-steel">Frequency</span>
            <select value={frequencyFilter} onChange={(event) => setFrequencyFilter(event.target.value as FrequencyFilter)} className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm">
              <option value="ALL">All</option>
              {frequencies.map((frequency) => (
                <option key={frequency} value={frequency}>
                  {recurringInvoiceFrequencyLabel(frequency)}
                </option>
              ))}
            </select>
          </label>
          <label className="block min-w-64">
            <span className="text-xs font-medium uppercase tracking-wide text-steel">Customer</span>
            <input value={customerSearch} onChange={(event) => setCustomerSearch(event.target.value)} placeholder="Search customer" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
          </label>
        </div>
      ) : null}

      {filteredTemplates.length > 0 ? (
        <div className="mt-5 overflow-x-auto rounded-md border border-slate-200 bg-white shadow-panel">
          <table className="w-full min-w-[1180px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
              <tr>
                <th className="px-4 py-3">Number</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Frequency</th>
                <th className="px-4 py-3">Next run</th>
                <th className="px-4 py-3">Last run</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTemplates.map((template) => (
                <tr key={template.id}>
                  <td className="px-4 py-3 font-mono text-xs">{template.templateNumber}</td>
                  <td className="px-4 py-3 font-medium text-ink">{template.name}</td>
                  <td className="px-4 py-3 text-steel">{template.customer?.displayName ?? template.customer?.name ?? "-"}</td>
                  <td className="px-4 py-3">
                    <TemplateStatusPill status={template.status} />
                  </td>
                  <td className="px-4 py-3 text-steel">{recurringInvoiceFrequencyLabel(template.frequency, template.interval)}</td>
                  <td className="px-4 py-3 text-steel">{formatOptionalDate(template.nextRunDate)}</td>
                  <td className="px-4 py-3 text-steel">{formatOptionalDate(template.lastRunDate)}</td>
                  <td className="px-4 py-3 font-mono text-xs">{formatMoneyAmount(template.total, template.currency)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Link href={`/sales/recurring-invoices/${template.id}`} className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
                        View
                      </Link>
                      {template.status === "DRAFT" && canEditTemplate ? (
                        <Link href={`/sales/recurring-invoices/${template.id}/edit`} className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
                          Edit
                        </Link>
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

function TemplateStatusPill({ status }: { status: RecurringInvoiceTemplateStatus }) {
  return <span className={`rounded-md px-2 py-1 text-xs font-medium ${recurringInvoiceStatusBadgeClass(status)}`}>{recurringInvoiceStatusLabel(status)}</span>;
}
