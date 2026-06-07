"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { usePermissions } from "@/components/permissions/permission-provider";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import {
  collectionCaseStatuses,
  collectionPriorities,
  collectionPriorityBadgeClass,
  collectionPriorityLabel,
  collectionStatusBadgeClass,
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
  const { can } = usePermissions();
  const [summary, setSummary] = useState<CollectionSummary | null>(null);
  const [cases, setCases] = useState<CollectionCase[]>([]);
  const [status, setStatus] = useState<StatusFilter>((searchParams.get("status") as StatusFilter) || "ALL");
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
    const customerId = searchParams.get("customerId");
    const invoiceId = searchParams.get("invoiceId");
    if (customerId) {
      params.set("customerId", customerId);
    }
    if (invoiceId) {
      params.set("invoiceId", invoiceId);
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
  }, [organizationId, searchParams]);

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
    <section>
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Collections</h1>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-steel">{collectionsSafeWording}</p>
        </div>
        {canCreate ? (
          <Link href="/sales/collections/new" className="self-start rounded-md bg-palm px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800">
            New collection case
          </Link>
        ) : null}
      </div>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">Log in and select an organization to load collection cases.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading collection cases...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
      </div>

      {summary ? (
        <>
          <div className="grid gap-3 md:grid-cols-4 xl:grid-cols-7">
            <SummaryCard label="Overdue amount" value={formatMoneyAmount(summary.totalOverdueAmount, "SAR")} />
            <SummaryCard label="Overdue invoices" value={String(summary.overdueInvoiceCount)} />
            <SummaryCard label="Open cases" value={String(summary.openCollectionCaseCount)} />
            <SummaryCard label="Due today" value={String(summary.casesDueToday)} />
            <SummaryCard label="Overdue follow-ups" value={String(summary.casesOverdueForFollowUp)} />
            <SummaryCard label="Promised-to-pay" value={formatMoneyAmount(summary.promisedToPayTotal, "SAR")} />
            <SummaryCard label="Disputed" value={formatMoneyAmount(summary.disputedTotal, "SAR")} />
          </div>
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

      <div className="mt-5 flex flex-wrap items-end gap-3 rounded-md border border-slate-200 bg-white p-4 shadow-panel">
        <label className="block">
          <span className="text-xs font-medium uppercase tracking-wide text-steel">Status</span>
          <select value={status} onChange={(event) => setStatus(event.target.value as StatusFilter)} className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm">
            <option value="ALL">All statuses</option>
            {collectionCaseStatuses.map((option) => (
              <option key={option} value={option}>{collectionStatusLabel(option)}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-medium uppercase tracking-wide text-steel">Priority</span>
          <select value={priority} onChange={(event) => setPriority(event.target.value as PriorityFilter)} className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm">
            <option value="ALL">All priorities</option>
            {collectionPriorities.map((option) => (
              <option key={option} value={option}>{collectionPriorityLabel(option)}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-medium uppercase tracking-wide text-steel">Customer</span>
          <input value={customerSearch} onChange={(event) => setCustomerSearch(event.target.value)} placeholder="Search customer" className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
        </label>
        <label className="block">
          <span className="text-xs font-medium uppercase tracking-wide text-steel">Quick filter</span>
          <select value={quickFilter} onChange={(event) => setQuickFilter(event.target.value as typeof quickFilter)} className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm">
            <option value="ALL">All cases</option>
            <option value="OVERDUE">Overdue follow-up</option>
            <option value="DUE_TODAY">Due today</option>
            <option value="DISPUTED">Disputed</option>
            <option value="PROMISED">Promised-to-pay</option>
          </select>
        </label>
      </div>

      {!loading && cases.length === 0 ? <div className="mt-5"><StatusMessage type="empty">No collection cases yet.</StatusMessage></div> : null}
      {cases.length > 0 && filteredCases.length === 0 ? <div className="mt-5"><StatusMessage type="empty">No collection cases match the current filters.</StatusMessage></div> : null}

      {filteredCases.length > 0 ? (
        <div className="mt-5 overflow-x-auto rounded-md border border-slate-200 bg-white shadow-panel">
          <table className="w-full min-w-[1160px] text-left text-sm">
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
                  <td className="px-4 py-3 text-steel">{formatOptionalDate(collectionCase.salesInvoice?.dueDate, "-")}</td>
                  <td className="px-4 py-3 font-mono text-xs">{formatMoneyAmount(collectionCase.salesInvoice?.balanceDue ?? "0.0000", collectionCase.salesInvoice?.currency ?? "SAR")}</td>
                  <td className="px-4 py-3"><Pill className={collectionStatusBadgeClass(collectionCase.status)} label={collectionStatusLabel(collectionCase.status)} /></td>
                  <td className="px-4 py-3"><Pill className={collectionPriorityBadgeClass(collectionCase.priority)} label={collectionPriorityLabel(collectionCase.priority)} /></td>
                  <td className="px-4 py-3 text-steel">{formatOptionalDate(collectionCase.nextActionAt ?? collectionCase.followUpDate, "-")}</td>
                  <td className="px-4 py-3 text-steel">{collectionCase.assignedTo?.name ?? "-"}</td>
                  <td className="px-4 py-3">
                    <Link href={`/sales/collections/${collectionCase.id}`} className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
                      Open
                    </Link>
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

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-4 shadow-panel">
      <div className="text-xs font-semibold uppercase tracking-wide text-steel">{label}</div>
      <div className="mt-2 font-mono text-lg font-semibold text-ink">{value}</div>
    </div>
  );
}

function SummaryList({ title, rows, emptyLabel }: { title: string; rows: Array<{ label: string; value: string }>; emptyLabel: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-4 shadow-panel">
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
    </div>
  );
}

function Pill({ label, className }: { label: string; className: string }) {
  return <span className={`rounded-md px-2 py-1 text-xs font-medium ${className}`}>{label}</span>;
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
