"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { usePermissions } from "@/components/permissions/permission-provider";
import {
  LedgerAlert,
  LedgerButton,
  LedgerDataTable,
  LedgerEmptyState,
  LedgerFieldLabel,
  LedgerFieldText,
  LedgerInput,
  LedgerLoadingState,
  LedgerMoney,
  LedgerPage,
  LedgerPageBody,
  LedgerPageHeader,
  LedgerPanel,
  LedgerSelect,
  LedgerStatCard,
  LedgerToolbar,
} from "@/components/ui/ledger-system";
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
import { partyDetailHref } from "@/lib/parties";
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
    <LedgerPage>
      <LedgerPageHeader
        eyebrow="Inventory valuation"
        title="Inventory Valuation Variance Preview"
        description="This page previews valuation differences between purchase receipts, bills, returns, and matching reviews. It does not post journals, update inventory valuation, change AP balances, or book variances."
        actions={
          <>
            <LedgerButton href={inventoryFifoPreviewUrl({ itemId: filters.itemId || null })}>FIFO preview</LedgerButton>
            {filters.itemId ? <LedgerButton href={inventoryTraceabilityUrl(filters.itemId)}>Item traceability</LedgerButton> : null}
            <LedgerButton href={landedCostPreviewUrl({})}>Landed cost preview</LedgerButton>
            <LedgerButton href="/purchases/matching?reviewStatus=NEEDS_VARIANCE_REVIEW">Matching variance reviews</LedgerButton>
          </>
        }
      />

      <LedgerPageBody>
        {!organizationId ? <LedgerAlert tone="info">Log in and select an organization to load valuation variance previews.</LedgerAlert> : null}
        {organizationId && !canViewPage ? <LedgerAlert tone="info">Inventory valuation variance preview requires inventory view permission.</LedgerAlert> : null}
        {loading ? <LedgerLoadingState title="Loading valuation variance preview" /> : null}
        {error ? <LedgerAlert tone="danger">{error}</LedgerAlert> : null}

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

          <LedgerToolbar
            title="Variance filters"
            description="Filter the read-only variance preview by supplier, item, source, severity, date, or source document."
          >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4 xl:grid-cols-8">
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
          </div>
          </LedgerToolbar>

          <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <AmountSummary label="Total absolute variance" value={data.summary.totalAbsoluteVarianceAmount} />
            <AmountSummary label="Positive variance amount" value={data.summary.positiveVarianceAmount} />
            <AmountSummary label="Negative variance amount" value={data.summary.negativeVarianceAmount} />
          </section>

          {data.warnings.length > 0 ? (
            <LedgerAlert tone="warning" title="Warnings">
              <ul className="space-y-1">
                {data.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </LedgerAlert>
          ) : null}

          {data.supplierGroups.length === 0 ? (
            <LedgerEmptyState title="No valuation variance previews found for the selected filters." />
          ) : (
            <section className="space-y-4">
              {data.supplierGroups.map((group) => (
                <LedgerPanel key={group.supplierId}>
                  <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-steel">Supplier group</p>
                      {linkPermissions.supplier ? (
                        <Link href={partyDetailHref("supplier", group.supplierId)} className="text-base font-semibold text-palm hover:underline">
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
                  <LedgerDataTable minWidth="1320px" className="mt-4">
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
                    </LedgerDataTable>
                </LedgerPanel>
              ))}
            </section>
          )}
        </>
      ) : null}
      </LedgerPageBody>
    </LedgerPage>
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
  const detail = tone === "high" ? "Critical or high severity." : tone === "return" ? "Return-linked review." : tone === "review" ? "Matching review linked." : undefined;
  return <LedgerStatCard label={label} value={value} detail={detail} />;
}

function AmountSummary({ label, value }: { label: string; value: string }) {
  return <LedgerStatCard label={label} value={<LedgerMoney>{inventoryValuationVarianceAmountDisplay(value)}</LedgerMoney>} />;
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
    <LedgerFieldLabel>
      <LedgerFieldText>{label}</LedgerFieldText>
      <LedgerSelect value={value} onChange={(event) => onChange(event.target.value)}>
        {children}
      </LedgerSelect>
    </LedgerFieldLabel>
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
    <LedgerFieldLabel>
      <LedgerFieldText>{label}</LedgerFieldText>
      <LedgerInput
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </LedgerFieldLabel>
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
