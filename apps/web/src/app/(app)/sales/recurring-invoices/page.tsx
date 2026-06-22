"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { StatusMessage } from "@/components/common/status-message";
import { usePermissions } from "@/components/permissions/permission-provider";
import {
  LedgerAlert,
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
  LedgerToolbar,
  type LedgerStatusTone,
} from "@/components/ui/ledger-system";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { formatOptionalDate } from "@/lib/invoice-display";
import { formatMoneyAmount } from "@/lib/money";
import { PERMISSIONS } from "@/lib/permissions";
import { recurringInvoiceFrequencyLabel, recurringInvoiceStatusLabel } from "@/lib/recurring-invoices";
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
    <LedgerPage>
      <LedgerPageHeader
        eyebrow="Sales"
        title="Recurring invoices"
        description="Non-posting templates for manual draft-invoice generation. No automatic scheduler runs from this workspace."
        actions={
          canCreateTemplate ? (
            <LedgerButton href="/sales/recurring-invoices/new" variant="primary" icon={Plus}>
              Create template
            </LedgerButton>
          ) : null
        }
      />

      <LedgerPageBody>
        <div className="space-y-3">
          {!organizationId ? <LedgerAlert tone="info">Log in and select an organization to load recurring invoice templates.</LedgerAlert> : null}
          {loading ? <StatusMessage type="loading">Loading recurring invoice templates...</StatusMessage> : null}
          {error ? <LedgerAlert tone="danger">{error}</LedgerAlert> : null}
          {!loading && organizationId && templates.length === 0 ? (
            <LedgerEmptyState
              title="No recurring invoice templates found"
              description="Create a draft template, activate it, then generate draft invoices manually."
              action={canCreateTemplate ? <LedgerButton href="/sales/recurring-invoices/new" variant="primary" icon={Plus}>Create template</LedgerButton> : null}
            />
          ) : null}
        </div>

        {templates.length > 0 ? (
          <LedgerToolbar title="Filters" description="Filter recurring templates without generating, posting, emailing, collecting, filing, or submitting anything.">
            <LedgerFilterBar>
              <LedgerFieldLabel>
                <LedgerFieldText>Status</LedgerFieldText>
                <LedgerSelect value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}>
                  <option value="ALL">All</option>
                  {statuses.map((status) => (
                    <option key={status} value={status}>
                      {recurringInvoiceStatusLabel(status)}
                    </option>
                  ))}
                </LedgerSelect>
              </LedgerFieldLabel>
              <LedgerFieldLabel>
                <LedgerFieldText>Frequency</LedgerFieldText>
                <LedgerSelect value={frequencyFilter} onChange={(event) => setFrequencyFilter(event.target.value as FrequencyFilter)}>
                  <option value="ALL">All</option>
                  {frequencies.map((frequency) => (
                    <option key={frequency} value={frequency}>
                      {recurringInvoiceFrequencyLabel(frequency)}
                    </option>
                  ))}
                </LedgerSelect>
              </LedgerFieldLabel>
              <LedgerFieldLabel className="min-w-64">
                <LedgerFieldText>Customer</LedgerFieldText>
                <LedgerInput value={customerSearch} onChange={(event) => setCustomerSearch(event.target.value)} placeholder="Search customer" />
              </LedgerFieldLabel>
            </LedgerFilterBar>
          </LedgerToolbar>
        ) : null}

        {templates.length > 0 && filteredTemplates.length === 0 ? (
          <LedgerEmptyState title="No recurring invoice templates match the current filters" />
        ) : null}

        {filteredTemplates.length > 0 ? (
          <LedgerDataTable minWidth="1180px">
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
                  <td className="px-4 py-3"><LedgerDate>{formatOptionalDate(template.nextRunDate)}</LedgerDate></td>
                  <td className="px-4 py-3"><LedgerDate>{formatOptionalDate(template.lastRunDate)}</LedgerDate></td>
                  <td className="px-4 py-3"><LedgerMoney>{formatMoneyAmount(template.total, template.currency)}</LedgerMoney></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <LedgerButton href={`/sales/recurring-invoices/${template.id}`} size="sm">
                        View
                      </LedgerButton>
                      {template.status === "DRAFT" && canEditTemplate ? (
                        <LedgerButton href={`/sales/recurring-invoices/${template.id}/edit`} size="sm">
                          Edit
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

function TemplateStatusPill({ status }: { status: RecurringInvoiceTemplateStatus }) {
  return <LedgerStatusBadge tone={recurringInvoiceStatusTone(status)}>{recurringInvoiceStatusLabel(status)}</LedgerStatusBadge>;
}

function recurringInvoiceStatusTone(status: RecurringInvoiceTemplateStatus): LedgerStatusTone {
  switch (status) {
    case "DRAFT":
      return "draft";
    case "ACTIVE":
      return "success";
    case "PAUSED":
      return "warning";
    case "ENDED":
      return "neutral";
    case "CANCELLED":
      return "danger";
  }
}
