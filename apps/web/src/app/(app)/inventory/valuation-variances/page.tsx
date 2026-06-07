"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { usePermissions } from "@/components/permissions/permission-provider";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { formatOptionalDate } from "@/lib/invoice-display";
import {
  formatInventoryQuantity,
  inventoryFifoPreviewUrl,
  inventoryTraceabilityUrl,
  inventoryValuationVarianceAmountDisplay,
  inventoryValuationVarianceSeverityBadgeClass,
  inventoryValuationVarianceSeverityLabel,
  inventoryValuationVarianceSourceTypeLabel,
  inventoryValuationVarianceStatusLabel,
  inventoryValuationVarianceTypeLabel,
  landedCostPreviewUrl,
} from "@/lib/inventory";
import { PERMISSIONS } from "@/lib/permissions";
import type {
  InventoryValuationVariancePreviewItem,
  InventoryValuationVariancePreviewResponse,
  InventoryValuationVarianceSeverity,
  InventoryValuationVarianceSourceLink,
  InventoryValuationVarianceSourceType,
  InventoryValuationVarianceType,
} from "@/lib/types";

const VARIANCE_TYPES: InventoryValuationVarianceType[] = [
  "PRICE_VARIANCE",
  "QUANTITY_VARIANCE",
  "RECEIPT_WITHOUT_BILL",
  "BILL_WITHOUT_RECEIPT",
  "OVER_RECEIVED_VALUE",
  "OVER_BILLED_VALUE",
  "RETURN_PENDING_CREDIT",
  "REVIEW_REQUIRED",
];
const SEVERITIES: InventoryValuationVarianceSeverity[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];
const SOURCE_TYPES: InventoryValuationVarianceSourceType[] = ["purchaseOrder", "purchaseBill", "purchaseReceipt", "purchaseReturn", "matchingReview"];

type Filters = {
  supplierId: string;
  itemId: string;
  varianceType: string;
  severity: string;
  sourceType: string;
  from: string;
  to: string;
  search: string;
  purchaseReceiptId: string;
  purchaseBillId: string;
  matchingReviewId: string;
};

export default function InventoryValuationVariancesPage() {
  const organizationId = useActiveOrganizationId();
  const searchParams = useSearchParams();
  const { can, canAny } = usePermissions();
  const [data, setData] = useState<InventoryValuationVariancePreviewResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState<Filters>(() => ({
    supplierId: searchParams.get("supplierId") ?? "",
    itemId: searchParams.get("itemId") ?? "",
    varianceType: searchParams.get("varianceType") ?? "",
    severity: searchParams.get("severity") ?? "",
    sourceType: searchParams.get("sourceType") ?? "",
    from: searchParams.get("from") ?? "",
    to: searchParams.get("to") ?? "",
    search: searchParams.get("search") ?? "",
    purchaseReceiptId: searchParams.get("purchaseReceiptId") ?? "",
    purchaseBillId: searchParams.get("purchaseBillId") ?? "",
    matchingReviewId: searchParams.get("matchingReviewId") ?? "",
  }));

  const canViewPage = can(PERMISSIONS.inventory.view);
  const linkPermissions = useMemo(
    () => ({
      purchaseOrder: can(PERMISSIONS.purchaseOrders.view),
      purchaseBill: can(PERMISSIONS.purchaseBills.view),
      purchaseReceipt: can(PERMISSIONS.purchaseReceiving.view),
      purchaseReturn: canAny(PERMISSIONS.purchaseOrders.view, PERMISSIONS.purchaseBills.view, PERMISSIONS.purchaseReceiving.view),
      matchingReview: canAny(PERMISSIONS.purchaseOrders.view, PERMISSIONS.purchaseBills.view, PERMISSIONS.purchaseReceiving.view),
      supplier: can(PERMISSIONS.contacts.view),
    }),
    [can, canAny],
  );

  const path = useMemo(() => `/inventory/valuation-variances${buildQuery(filters)}`, [filters]);

  useEffect(() => {
    if (!organizationId || !canViewPage) {
      setData(null);
      return;
    }

    let active = true;
    setLoading(true);
    setError("");

    apiRequest<InventoryValuationVariancePreviewResponse>(path)
      .then((result) => {
        if (active) setData(result);
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : "Unable to load valuation variance preview.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [canViewPage, organizationId, path]);

  const supplierOptions = useMemo(() => data?.supplierGroups.map((group) => ({ id: group.supplierId, name: group.supplierName })) ?? [], [data]);
  const itemOptions = useMemo(() => {
    const items = new Map<string, string>();
    data?.items.forEach((item) => {
      if (item.item?.id) items.set(item.item.id, item.item.sku ? `${item.item.name} (${item.item.sku})` : item.item.name);
    });
    return [...items.entries()].map(([id, name]) => ({ id, name }));
  }, [data]);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Inventory Valuation Variance Preview</h1>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-steel">
            This page previews valuation differences between purchase receipts, bills, returns, and matching reviews. It does not post journals, update inventory valuation, change AP balances, or book variances.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={inventoryFifoPreviewUrl({ itemId: filters.itemId || null })} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            FIFO preview
          </Link>
          {filters.itemId ? (
            <Link href={inventoryTraceabilityUrl(filters.itemId)} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Item traceability
            </Link>
          ) : null}
          <Link href={landedCostPreviewUrl({})} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Landed cost preview
          </Link>
          <Link href="/purchases/matching?reviewStatus=NEEDS_VARIANCE_REVIEW" className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Matching variance reviews
          </Link>
        </div>
      </header>

      {!organizationId ? <StatusMessage type="info">Log in and select an organization to load valuation variance previews.</StatusMessage> : null}
      {organizationId && !canViewPage ? <StatusMessage type="info">Inventory valuation variance preview requires inventory view permission.</StatusMessage> : null}
      {loading ? <StatusMessage type="loading">Loading valuation variance preview...</StatusMessage> : null}
      {error ? <StatusMessage type="error">{error}</StatusMessage> : null}

      {data ? (
        <>
          <section className="grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <SummaryCard label="Total variance" value={data.summary.totalVarianceCount} />
            <SummaryCard label="Critical/high review count" value={data.summary.criticalCount + data.summary.highCount} tone="high" />
            <SummaryCard label="Suppliers affected" value={data.summary.suppliersAffected} />
            <SummaryCard label="Items affected" value={data.summary.itemsAffected} />
            <SummaryCard label="Return-related variances" value={data.summary.returnRelatedVarianceCount} tone="return" />
            <SummaryCard label="Matching-review variances" value={data.summary.matchingReviewRelatedVarianceCount} tone="review" />
          </section>

          <section className="grid grid-cols-1 gap-3 rounded-md border border-slate-200 bg-white p-4 shadow-panel md:grid-cols-4 xl:grid-cols-8">
            <SelectField label="Supplier" value={filters.supplierId} onChange={(value) => setFilters((current) => ({ ...current, supplierId: value }))}>
              <option value="">All suppliers</option>
              {supplierOptions.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </SelectField>
            <SelectField label="Item" value={filters.itemId} onChange={(value) => setFilters((current) => ({ ...current, itemId: value }))}>
              <option value="">All items</option>
              {itemOptions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </SelectField>
            <SelectField label="Variance type" value={filters.varianceType} onChange={(value) => setFilters((current) => ({ ...current, varianceType: value }))}>
              <option value="">All types</option>
              {VARIANCE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {inventoryValuationVarianceTypeLabel(type)}
                </option>
              ))}
            </SelectField>
            <SelectField label="Severity" value={filters.severity} onChange={(value) => setFilters((current) => ({ ...current, severity: value }))}>
              <option value="">All severities</option>
              {SEVERITIES.map((severity) => (
                <option key={severity} value={severity}>
                  {inventoryValuationVarianceSeverityLabel(severity)}
                </option>
              ))}
            </SelectField>
            <SelectField label="Source type" value={filters.sourceType} onChange={(value) => setFilters((current) => ({ ...current, sourceType: value }))}>
              <option value="">All sources</option>
              {SOURCE_TYPES.map((sourceType) => (
                <option key={sourceType} value={sourceType}>
                  {inventoryValuationVarianceSourceTypeLabel(sourceType)}
                </option>
              ))}
            </SelectField>
            <InputField label="From" type="date" value={filters.from} onChange={(value) => setFilters((current) => ({ ...current, from: value }))} />
            <InputField label="To" type="date" value={filters.to} onChange={(value) => setFilters((current) => ({ ...current, to: value }))} />
            <InputField label="Search" value={filters.search} placeholder="Supplier, item, document" onChange={(value) => setFilters((current) => ({ ...current, search: value }))} />
          </section>

          <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <AmountSummary label="Total absolute variance" value={data.summary.totalAbsoluteVarianceAmount} />
            <AmountSummary label="Positive variance amount" value={data.summary.positiveVarianceAmount} />
            <AmountSummary label="Negative variance amount" value={data.summary.negativeVarianceAmount} />
          </section>

          {data.warnings.length > 0 ? (
            <section className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <ul className="space-y-1">
                {data.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </section>
          ) : null}

          {data.supplierGroups.length === 0 ? (
            <StatusMessage type="empty">No valuation variance previews found for the selected filters.</StatusMessage>
          ) : (
            <section className="space-y-4">
              {data.supplierGroups.map((group) => (
                <div key={group.supplierId} className="rounded-md border border-slate-200 bg-white shadow-panel">
                  <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-steel">Supplier group</p>
                      {linkPermissions.supplier ? (
                        <Link href={`/contacts/${group.supplierId}`} className="text-base font-semibold text-palm hover:underline">
                          {group.supplierName}
                        </Link>
                      ) : (
                        <p className="text-base font-semibold text-ink">{group.supplierName}</p>
                      )}
                      <div className="mt-2 flex flex-wrap gap-2 text-xs text-steel">
                        {group.sourceDocumentLinks.map((link) => (
                          <SourceLink key={`${link.type}:${link.id}`} link={link} allowed={linkPermissions[link.type]} />
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className={`rounded-md px-2 py-1 text-xs font-medium ${inventoryValuationVarianceSeverityBadgeClass(group.highestSeverity)}`}>
                        {inventoryValuationVarianceSeverityLabel(group.highestSeverity)}
                      </span>
                      <span className="text-steel">{group.varianceCount} variances</span>
                      <span className="font-mono text-xs text-ink">{inventoryValuationVarianceAmountDisplay(group.totalVarianceAmount)}</span>
                      <span className="text-steel">{group.itemsAffected} items affected</span>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[1320px] text-left text-sm">
                      <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
                        <tr>
                          <th className="px-3 py-2">Source</th>
                          <th className="px-3 py-2">Item</th>
                          <th className="px-3 py-2 text-right">Quantities</th>
                          <th className="px-3 py-2 text-right">Values</th>
                          <th className="px-3 py-2 text-right">Variance</th>
                          <th className="px-3 py-2">Type</th>
                          <th className="px-3 py-2">Severity</th>
                          <th className="px-3 py-2">Suggested review action</th>
                          <th className="px-3 py-2">Links</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {group.items.map((item) => (
                          <VarianceRow key={item.id} item={item} linkPermissions={linkPermissions} />
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </section>
          )}
        </>
      ) : null}
    </div>
  );
}

function VarianceRow({
  item,
  linkPermissions,
}: {
  item: InventoryValuationVariancePreviewItem;
  linkPermissions: Record<InventoryValuationVarianceSourceType | "supplier", boolean>;
}) {
  return (
    <tr>
      <td className="px-3 py-3">
        {linkPermissions[item.sourceType] ? (
          <Link href={item.sourceHref} className="font-medium text-palm hover:underline">
            {item.sourceNumber}
          </Link>
        ) : (
          <span className="font-medium text-ink">{item.sourceNumber}</span>
        )}
        <div className="text-xs text-steel">{inventoryValuationVarianceSourceTypeLabel(item.sourceType)}</div>
        <div className="text-xs text-steel">{formatOptionalDate(item.latestRelevantDate, "-")}</div>
      </td>
      <td className="px-3 py-3">
        <div className="font-medium text-ink">{item.item ? `${item.item.name}${item.item.sku ? ` (${item.item.sku})` : ""}` : item.lineDescription}</div>
        {item.item ? <div className="text-xs text-steel">{item.lineDescription}</div> : null}
      </td>
      <td className="px-3 py-3 text-right font-mono text-xs">
        <div>Ordered {item.orderedQuantity === null ? "-" : formatInventoryQuantity(item.orderedQuantity)}</div>
        <div>Received {formatInventoryQuantity(item.receivedQuantity)}</div>
        <div>Billed {formatInventoryQuantity(item.billedQuantity)}</div>
        <div>Returned {formatInventoryQuantity(item.returnedQuantity)}</div>
      </td>
      <td className="px-3 py-3 text-right font-mono text-xs">
        <div>Expected {inventoryValuationVarianceAmountDisplay(item.expectedValue)}</div>
        <div>Received {inventoryValuationVarianceAmountDisplay(item.receivedValue)}</div>
        <div>Billed {inventoryValuationVarianceAmountDisplay(item.billedValue)}</div>
        <div>Returned {inventoryValuationVarianceAmountDisplay(item.returnedValue)}</div>
      </td>
      <td className="px-3 py-3 text-right font-mono text-xs">
        <div>{inventoryValuationVarianceAmountDisplay(item.varianceAmount)}</div>
        <div className="text-steel">Qty {formatInventoryQuantity(item.varianceQuantity)}</div>
      </td>
      <td className="px-3 py-3">
        <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">{inventoryValuationVarianceTypeLabel(item.varianceType)}</span>
        <div className="mt-1 text-xs text-steel">{inventoryValuationVarianceStatusLabel(item.status)}</div>
      </td>
      <td className="px-3 py-3">
        <span className={`rounded-md px-2 py-1 text-xs font-medium ${inventoryValuationVarianceSeverityBadgeClass(item.severity)}`}>
          {inventoryValuationVarianceSeverityLabel(item.severity)}
        </span>
      </td>
      <td className="px-3 py-3 text-steel">
        <div>{item.suggestedReviewAction}</div>
        <div className="mt-1 text-xs">No posting, inventory valuation, AP balance, supplier credit, refund, or return automation is available from this preview.</div>
      </td>
      <td className="px-3 py-3">
        <div className="flex flex-col gap-1">
          {item.sourceDocumentLinks.map((link) => (
            <SourceLink key={`${item.id}:${link.type}:${link.id}`} link={link} allowed={linkPermissions[link.type]} />
          ))}
        </div>
      </td>
    </tr>
  );
}

function SourceLink({ link, allowed }: { link: InventoryValuationVarianceSourceLink; allowed: boolean }) {
  const label = `${inventoryValuationVarianceSourceTypeLabel(link.type)}: ${link.number}`;
  if (!allowed) {
    return <span className="text-xs text-steel">{label}</span>;
  }
  return (
    <Link href={link.href} className="text-xs font-medium text-palm hover:underline">
      {label}
    </Link>
  );
}

function SummaryCard({ label, value, tone = "neutral" }: { label: string; value: number; tone?: "neutral" | "high" | "return" | "review" }) {
  const toneClass = tone === "high" ? "text-amber-700" : tone === "return" ? "text-palm" : tone === "review" ? "text-sky-700" : "text-ink";
  return (
    <div className="rounded-md border border-slate-200 bg-white p-4 shadow-panel">
      <p className="text-xs uppercase tracking-wide text-steel">{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${toneClass}`}>{value}</p>
    </div>
  );
}

function AmountSummary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-4 shadow-panel">
      <p className="text-xs uppercase tracking-wide text-steel">{label}</p>
      <p className="mt-1 font-mono text-sm font-semibold text-ink">{inventoryValuationVarianceAmountDisplay(value)}</p>
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <label className="text-sm font-medium text-ink">
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm">
        {children}
      </select>
    </label>
  );
}

function InputField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "date";
  placeholder?: string;
}) {
  return (
    <label className="text-sm font-medium text-ink">
      {label}
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
      />
    </label>
  );
}

function buildQuery(filters: Filters): string {
  const query = new URLSearchParams();
  if (filters.supplierId) query.set("supplierId", filters.supplierId);
  if (filters.itemId) query.set("itemId", filters.itemId);
  if (filters.varianceType) query.set("varianceType", filters.varianceType);
  if (filters.severity) query.set("severity", filters.severity);
  if (filters.sourceType) query.set("sourceType", filters.sourceType);
  if (filters.from) query.set("from", filters.from);
  if (filters.to) query.set("to", filters.to);
  if (filters.search.trim()) query.set("search", filters.search.trim());
  if (filters.purchaseReceiptId) query.set("purchaseReceiptId", filters.purchaseReceiptId);
  if (filters.purchaseBillId) query.set("purchaseBillId", filters.purchaseBillId);
  if (filters.matchingReviewId) query.set("matchingReviewId", filters.matchingReviewId);
  const suffix = query.toString();
  return suffix ? `?${suffix}` : "";
}
