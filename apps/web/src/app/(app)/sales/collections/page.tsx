"use client";

import { useSearchParams } from "next/navigation";
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
  LedgerMetricGrid,
  LedgerMoney,
  LedgerPage,
  LedgerPageBody,
  LedgerPageHeader,
  LedgerPanel,
  LedgerSelect,
  LedgerStatCard,
  LedgerStatusBadge,
  LedgerToolbar,
  type LedgerStatusTone,
} from "@/components/ui/ledger-system";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import {
  collectionCaseStatuses,
  collectionPriorities,
  collectionPriorityLabel,
  collectionStatusLabel,
  collectionsSafeWording,
} from "@/lib/collections";
import { formatOptionalDate } from "@/lib/invoice-display";
import { formatMoneyAmount } from "@/lib/money";
import { apiRequest } from "@/lib/api";
import { PERMISSIONS } from "@/lib/permissions";
import type { CollectionCase, CollectionCaseStatus, CollectionPriority, CollectionSummary } from "@/lib/types";

type StatusFilter = "ALL" | CollectionCaseStatus;
type PriorityFilter = "ALL" | CollectionPriority;

export default function CollectionsPage() {
  const organizationId = useActiveOrganizationId();
  const searchParams = useSearchParams();
  const statusParam = searchParams.get("status");
  const customerIdParam = searchParams.get("customerId");
  const invoiceIdParam = searchParams.get("invoiceId");
  const { can } = usePermissions();
  const [summary, setSummary] = useState<CollectionSummary | null>(null);
  const [cases, setCases] = useState<CollectionCase[]>([]);
  const [status, setStatus] = useState<StatusFilter>((statusParam as StatusFilter) || "ALL");
  const [priority, setPriority] = useState<PriorityFilter>("ALL");
  const [customerSearch, setCustomerSearch] = useState("");
  const [quickFilter, setQuickFilter] = useState<"ALL" | "OVERDUE" | "DUE_TODAY" | "DISPUTED" | "PROMISED">("ALL");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const canCreate = can(PERMISSIONS.salesInvoices.create);

  useEffect(() => {
    if (!organizationId) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    const params = new URLSearchParams();
    if (customerIdParam) {
      params.set("customerId", customerIdParam);
    }
    if (invoiceIdParam) {
      params.set("invoiceId", invoiceIdParam);
    }
    const path = `/collections${params.toString() ? `?${params.toString()}` : ""}`;

    Promise.all([apiRequest<CollectionSummary>("/collections/summary"), apiRequest<CollectionCase[]>(path)])
      .then(([summaryResult, caseResult]) => {
        if (!cancelled) {
          setSummary(summaryResult);
          setCases(caseResult);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load collection cases.");
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
  }, [organizationId, customerIdParam, invoiceIdParam]);

  const filteredCases = useMemo(() => {
    const normalizedCustomer = customerSearch.trim().toLowerCase();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return cases.filter((collectionCase) => {
      const customerName = collectionCase.customer ? collectionCase.customer.displayName ?? collectionCase.customer.name : "";
      const nextDate = dateValue(collectionCase.nextActionAt ?? collectionCase.followUpDate);
      if (status !== "ALL" && collectionCase.status !== status) {
        return false;
      }
      if (priority !== "ALL" && collectionCase.priority !== priority) {
        return false;
      }
      if (normalizedCustomer && !customerName.toLowerCase().includes(normalizedCustomer)) {
        return false;
      }
      if (quickFilter === "OVERDUE" && (!nextDate || nextDate >= today)) {
        return false;
      }
      if (quickFilter === "DUE_TODAY" && (!nextDate || nextDate < today || nextDate >= tomorrow)) {
        return false;
      }
      if (quickFilter === "DISPUTED" && collectionCase.status !== "DISPUTED") {
        return false;
      }
      if (quickFilter === "PROMISED" && collectionCase.status !== "PROMISED_TO_PAY") {
        return false;
      }
      return true;
    });
  }, [cases, customerSearch, priority, quickFilter, status]);

  return (
    <LedgerPage>
      <LedgerPageHeader
        eyebrow="Sales"
        title="Collections"
        description={collectionsSafeWording}
        actions={
          canCreate ? (
            <LedgerButton href="/sales/collections/new" variant="primary" icon={Plus}>
              New collection case
            </LedgerButton>
          ) : null
        }
      />

      <LedgerPageBody>
        <div className="space-y-3">
          {!organizationId ? <LedgerAlert tone="info">Log in and select an organization to load collection cases.</LedgerAlert> : null}
          {loading ? <StatusMessage type="loading">Loading collection cases...</StatusMessage> : null}
          {error ? <LedgerAlert tone="danger">{error}</LedgerAlert> : null}
        </div>

        {summary ? (
          <>
          <LedgerMetricGrid>
            <SummaryCard label="Overdue amount" value={formatMoneyAmount(summary.totalOverdueAmount, "SAR")} />
            <SummaryCard label="Overdue invoices" value={String(summary.overdueInvoiceCount)} />
            <SummaryCard label="Open cases" value={String(summary.openCollectionCaseCount)} />
            <SummaryCard label="Due today" value={String(summary.casesDueToday)} />
            <SummaryCard label="Overdue follow-ups" value={String(summary.casesOverdueForFollowUp)} />
            <SummaryCard label="Promised-to-pay" value={formatMoneyAmount(summary.promisedToPayTotal, "SAR")} />
            <SummaryCard label="Disputed" value={formatMoneyAmount(summary.disputedTotal, "SAR")} />
          </LedgerMetricGrid>
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            <SummaryList
              title="Top overdue customers"
              rows={summary.topCustomersByOverdueAmount.map((row) => ({
                label: row.customerName,
                value: `${formatMoneyAmount(row.overdueAmount, "SAR")} / ${row.overdueInvoiceCount} invoice${row.overdueInvoiceCount === 1 ? "" : "s"}`,
              }))}
              emptyLabel="No overdue customers."
            />
            <SummaryList
              title="Aging buckets"
              rows={summary.agingBuckets.map((row) => ({
                label: agingBucketSummaryLabel(row.bucket),
                value: formatMoneyAmount(row.amount, "SAR"),
              }))}
              emptyLabel="No overdue aging buckets."
            />
          </div>
        </>
      ) : null}

      <LedgerToolbar title="Filters" description="Filter collection cases without posting journals, allocating payments, sending reminders, creating payment links, filing VAT, calling ZATCA, or changing invoice balances.">
        <LedgerFilterBar>
        <LedgerFieldLabel>
          <LedgerFieldText>Status</LedgerFieldText>
          <LedgerSelect value={status} onChange={(event) => setStatus(event.target.value as StatusFilter)}>
            <option value="ALL">All statuses</option>
            {collectionCaseStatuses.map((option) => (
              <option key={option} value={option}>{collectionStatusLabel(option)}</option>
            ))}
          </LedgerSelect>
        </LedgerFieldLabel>
        <LedgerFieldLabel>
          <LedgerFieldText>Priority</LedgerFieldText>
          <LedgerSelect value={priority} onChange={(event) => setPriority(event.target.value as PriorityFilter)}>
            <option value="ALL">All priorities</option>
            {collectionPriorities.map((option) => (
              <option key={option} value={option}>{collectionPriorityLabel(option)}</option>
            ))}
          </LedgerSelect>
        </LedgerFieldLabel>
        <LedgerFieldLabel>
          <LedgerFieldText>Customer</LedgerFieldText>
          <LedgerInput value={customerSearch} onChange={(event) => setCustomerSearch(event.target.value)} placeholder="Search customer" />
        </LedgerFieldLabel>
        <LedgerFieldLabel>
          <LedgerFieldText>Quick filter</LedgerFieldText>
          <LedgerSelect value={quickFilter} onChange={(event) => setQuickFilter(event.target.value as typeof quickFilter)}>
            <option value="ALL">All cases</option>
            <option value="OVERDUE">Overdue follow-up</option>
            <option value="DUE_TODAY">Due today</option>
            <option value="DISPUTED">Disputed</option>
            <option value="PROMISED">Promised-to-pay</option>
          </LedgerSelect>
        </LedgerFieldLabel>
        </LedgerFilterBar>
      </LedgerToolbar>

      {!loading && cases.length === 0 ? <LedgerEmptyState title="No collection cases yet." /> : null}
      {cases.length > 0 && filteredCases.length === 0 ? <LedgerEmptyState title="No collection cases match the current filters." /> : null}

      {filteredCases.length > 0 ? (
        <LedgerDataTable minWidth="1160px">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
              <tr>
                <th className="px-4 py-3">Case</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Invoice</th>
                <th className="px-4 py-3">Due date</th>
                <th className="px-4 py-3">Outstanding</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Priority</th>
                <th className="px-4 py-3">Next follow-up</th>
                <th className="px-4 py-3">Assigned</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCases.map((collectionCase) => (
                <tr key={collectionCase.id}>
                  <td className="px-4 py-3 font-mono text-xs">{collectionCase.caseNumber}</td>
                  <td className="px-4 py-3 text-steel">{collectionCase.customer ? collectionCase.customer.displayName ?? collectionCase.customer.name : "-"}</td>
                  <td className="px-4 py-3 font-mono text-xs">{collectionCase.salesInvoice?.invoiceNumber ?? "Customer-level"}</td>
                  <td className="px-4 py-3"><LedgerDate>{formatOptionalDate(collectionCase.salesInvoice?.dueDate, "-")}</LedgerDate></td>
                  <td className="px-4 py-3"><LedgerMoney>{formatMoneyAmount(collectionCase.salesInvoice?.balanceDue ?? "0.0000", collectionCase.salesInvoice?.currency ?? "SAR")}</LedgerMoney></td>
                  <td className="px-4 py-3"><CollectionStatusPill status={collectionCase.status} /></td>
                  <td className="px-4 py-3"><CollectionPriorityPill priority={collectionCase.priority} /></td>
                  <td className="px-4 py-3"><LedgerDate>{formatOptionalDate(collectionCase.nextActionAt ?? collectionCase.followUpDate, "-")}</LedgerDate></td>
                  <td className="px-4 py-3 text-steel">{collectionCase.assignedTo?.name ?? "-"}</td>
                  <td className="px-4 py-3">
                    <LedgerButton href={`/sales/collections/${collectionCase.id}`} size="sm">
                      Open
                    </LedgerButton>
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

function SummaryCard({ label, value }: { label: string; value: string }) {
  return <LedgerStatCard label={label} value={value} />;
}

function SummaryList({ title, rows, emptyLabel }: { title: string; rows: Array<{ label: string; value: string }>; emptyLabel: string }) {
  return (
    <LedgerPanel>
      <h2 className="text-sm font-semibold text-ink">{title}</h2>
      {rows.length ? (
        <div className="mt-3 divide-y divide-slate-100">
          {rows.map((row) => (
            <div key={`${row.label}-${row.value}`} className="flex items-start justify-between gap-3 py-2 text-sm">
              <span className="text-steel">{row.label}</span>
              <span className="font-mono text-xs text-ink">{row.value}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm text-steel">{emptyLabel}</p>
      )}
    </LedgerPanel>
  );
}

function CollectionStatusPill({ status }: { status: CollectionCaseStatus }) {
  return <LedgerStatusBadge tone={collectionStatusTone(status)}>{collectionStatusLabel(status)}</LedgerStatusBadge>;
}

function CollectionPriorityPill({ priority }: { priority: CollectionPriority }) {
  return <LedgerStatusBadge tone={collectionPriorityTone(priority)}>{collectionPriorityLabel(priority)}</LedgerStatusBadge>;
}

function collectionStatusTone(status: CollectionCaseStatus): LedgerStatusTone {
  switch (status) {
    case "OPEN":
      return "draft";
    case "IN_PROGRESS":
    case "PROMISED_TO_PAY":
      return "info";
    case "PAID":
    case "CLOSED":
      return "success";
    case "ON_HOLD":
    case "DISPUTED":
      return "warning";
    case "CANCELLED":
      return "danger";
  }
}

function collectionPriorityTone(priority: CollectionPriority): LedgerStatusTone {
  switch (priority) {
    case "LOW":
      return "neutral";
    case "NORMAL":
      return "info";
    case "HIGH":
      return "warning";
    case "URGENT":
      return "danger";
  }
}

function dateValue(value: string | null | undefined): Date | null {
  return value ? new Date(value) : null;
}

function agingBucketSummaryLabel(bucket: string): string {
  switch (bucket) {
    case "current":
    case "CURRENT":
      return "Current";
    case "1_30":
    case "1-30":
      return "1-30 days";
    case "31_60":
    case "31-60":
      return "31-60 days";
    case "61_90":
    case "61-90":
      return "61-90 days";
    case "90_plus":
    case "90+":
      return "90+ days";
    default:
      return bucket;
  }
}
