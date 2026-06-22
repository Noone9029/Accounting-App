"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePermissions } from "@/components/permissions/permission-provider";
import {
  LedgerActionBar,
  LedgerAlert,
  LedgerButton,
  LedgerDataTable,
  LedgerDate,
  LedgerEmptyState,
  LedgerFieldLabel,
  LedgerFieldText,
  LedgerFilterBar,
  LedgerInput,
  LedgerLoadingState,
  LedgerMetricGrid,
  LedgerPage,
  LedgerPageBody,
  LedgerPageHeader,
  LedgerPanel,
  LedgerSection,
  LedgerSelect,
  LedgerStatCard,
  LedgerStatusBadge,
  LedgerSummaryBand,
  type LedgerStatusTone,
} from "@/components/ui/ledger-system";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { formatOptionalDate } from "@/lib/invoice-display";
import { formatInventoryQuantity, inventoryValuationVariancePreviewUrl } from "@/lib/inventory";
import { partyDetailHref } from "@/lib/parties";
import { PERMISSIONS } from "@/lib/permissions";
import type {
  PurchaseMatchingContext,
  PurchaseMatchingExceptionItem,
  PurchaseMatchingExceptionSeverity,
  PurchaseMatchingExceptionsResponse,
  PurchaseMatchingExceptionType,
  PurchaseMatchingReview,
  PurchaseMatchingReviewReason,
  PurchaseMatchingReviewStatus,
} from "@/lib/types";

const SEVERITY_OPTIONS: PurchaseMatchingExceptionSeverity[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];
const EXCEPTION_TYPE_OPTIONS: PurchaseMatchingExceptionType[] = [
  "OVER_BILLED",
  "OVER_RECEIVED",
  "NOT_RECEIVED",
  "NOT_BILLED",
  "PARTIALLY_MATCHED",
  "RECEIPT_PENDING_BILL",
  "BILL_PENDING_RECEIPT",
  "REVIEW_REQUIRED",
];
const SOURCE_TYPE_OPTIONS: PurchaseMatchingContext[] = ["purchaseOrder", "purchaseBill", "purchaseReceipt"];
const REVIEW_STATUS_OPTIONS: Array<PurchaseMatchingReviewStatus | "NONE"> = [
  "NONE",
  "OPEN",
  "IN_REVIEW",
  "WAITING_FOR_SUPPLIER",
  "WAITING_FOR_RECEIPT",
  "WAITING_FOR_BILL",
  "ACCEPTED_AS_TIMING_DIFFERENCE",
  "NEEDS_VARIANCE_REVIEW",
  "NEEDS_RETURN_REVIEW",
  "RESOLVED",
  "CANCELLED",
];
const REVIEW_REASON_OPTIONS: PurchaseMatchingReviewReason[] = [
  "QUANTITY_MISMATCH",
  "PRICE_MISMATCH",
  "RECEIPT_MISSING",
  "BILL_MISSING",
  "OVER_RECEIVED",
  "OVER_BILLED",
  "SUPPLIER_DISPUTE",
  "TIMING_DIFFERENCE",
  "DATA_ENTRY_REVIEW",
  "OTHER",
];
type ReviewAction =
  | "start"
  | "mark-waiting-for-supplier"
  | "mark-timing-difference"
  | "mark-needs-variance-review"
  | "mark-needs-return-review"
  | "resolve"
  | "cancel";

export default function PurchaseMatchingExceptionsPage() {
  const organizationId = useActiveOrganizationId();
  const { can, canAny } = usePermissions();
  const [data, setData] = useState<PurchaseMatchingExceptionsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    supplierId: "",
    severity: "",
    exceptionType: "",
    sourceType: "",
    reviewStatus: "",
    reasonCode: "",
    search: "",
  });

  const canViewPage = canAny(PERMISSIONS.purchaseOrders.view, PERMISSIONS.purchaseBills.view, PERMISSIONS.purchaseReceiving.view);
  const canManageReviews = canAny(PERMISSIONS.purchaseOrders.update, PERMISSIONS.purchaseBills.update, PERMISSIONS.purchaseReceiving.create);
  const canCreateReturns = canAny(PERMISSIONS.purchaseBills.create, PERMISSIONS.purchaseBills.update, PERMISSIONS.purchaseReceiving.create);
  const canViewValuationVariances = can(PERMISSIONS.inventory.view);

  const path = useMemo(() => {
    const params = new URLSearchParams();
    if (filters.supplierId) params.set("supplierId", filters.supplierId);
    if (filters.severity) params.set("severity", filters.severity);
    if (filters.exceptionType) params.set("exceptionType", filters.exceptionType);
    if (filters.sourceType) params.set("sourceType", filters.sourceType);
    if (filters.reviewStatus) params.set("reviewStatus", filters.reviewStatus);
    if (filters.reasonCode) params.set("reasonCode", filters.reasonCode);
    if (filters.search.trim()) params.set("search", filters.search.trim());
    const query = params.toString();
    return `/purchase-matching/exceptions${query ? `?${query}` : ""}`;
  }, [filters.exceptionType, filters.reasonCode, filters.reviewStatus, filters.search, filters.severity, filters.sourceType, filters.supplierId]);

  useEffect(() => {
    let active = true;
    if (!organizationId || !canViewPage) {
      setData(null);
      return;
    }

    setLoading(true);
    setError(null);
    apiRequest<PurchaseMatchingExceptionsResponse>(path)
      .then((result) => {
        if (active) setData(result);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : "Unable to load purchase matching exceptions.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [canViewPage, organizationId, path]);

  const supplierOptions = useMemo(() => data?.groups.map((group) => ({ id: group.supplierId, name: group.supplierName })) ?? [], [data]);

  const linkPermissions = {
    purchaseOrder: can(PERMISSIONS.purchaseOrders.view),
    purchaseBill: can(PERMISSIONS.purchaseBills.view),
    purchaseReceipt: can(PERMISSIONS.purchaseReceiving.view),
    supplier: can(PERMISSIONS.contacts.view),
  };

  async function handleReviewAction(item: PurchaseMatchingExceptionItem, action: ReviewAction) {
    setActionError(null);
    setActionMessage(null);
    setActiveAction(`${item.id}:${action}`);
    try {
      if (action === "start") {
        await apiRequest<PurchaseMatchingReview>("/purchase-matching/reviews", {
          method: "POST",
          body: {
            sourceType: item.sourceType,
            sourceId: item.sourceId,
            supplierId: item.supplierId,
            exceptionType: item.exceptionType,
            severity: item.severity,
          },
        });
      } else if (item.reviewId) {
        await apiRequest<PurchaseMatchingReview>(`/purchase-matching/reviews/${item.reviewId}/${action}`, { method: "POST" });
      }
      const refreshed = await apiRequest<PurchaseMatchingExceptionsResponse>(path);
      setData(refreshed);
      setActionMessage("Review status updated. Review actions do not post journals, update AP balances, change inventory quantities, book variances, create returns, or contact suppliers.");
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Unable to update purchase matching review.");
    } finally {
      setActiveAction(null);
    }
  }

  return (
    <LedgerPage>
      <LedgerPageHeader
        eyebrow="Purchases"
        title="Purchase Matching Exceptions"
        description="PO, bill, and receipt mismatch review for follow-up classification."
      />

      <LedgerPageBody>
        <LedgerSummaryBand tone="warning">
          Purchase matching is review-only. It highlights quantity exceptions and review status, but does not post journals, update AP balances, change inventory quantities, book variances, create returns, or contact suppliers.
        </LedgerSummaryBand>

        {!organizationId ? <LedgerAlert tone="info">Log in and select an organization to load purchase matching exceptions.</LedgerAlert> : null}
        {organizationId && !canViewPage ? <LedgerAlert tone="info">Purchase matching exceptions require purchase order, purchase bill, or purchase receiving view permission.</LedgerAlert> : null}
        {loading ? <LedgerLoadingState title="Loading purchase matching exceptions" description="Fetching supplier groups, exception counts, and review status." /> : null}
        {error ? <LedgerAlert tone="danger">{error}</LedgerAlert> : null}
        {actionMessage ? <LedgerAlert tone="success">{actionMessage}</LedgerAlert> : null}
        {actionError ? <LedgerAlert tone="danger">{actionError}</LedgerAlert> : null}

        {data ? (
          <>
            <LedgerMetricGrid className="md:grid-cols-3 xl:grid-cols-6">
              <LedgerStatCard label="Total exceptions" value={data.summary.totalExceptionCount} />
              <LedgerStatCard label="Critical" value={data.summary.criticalCount} />
              <LedgerStatCard label="High" value={data.summary.highCount} />
              <LedgerStatCard label="Over billed" value={data.summary.overBilledCount} />
              <LedgerStatCard label="Over received" value={data.summary.overReceivedCount} />
              <LedgerStatCard label="Pending bill/receipt" value={data.summary.billPendingReceiptCount + data.summary.receiptPendingBillCount} />
            </LedgerMetricGrid>

            <LedgerPanel>
              <LedgerFilterBar>
                <LedgerFieldLabel className="min-w-[12rem] flex-1">
                  <LedgerFieldText>Supplier</LedgerFieldText>
                  <LedgerSelect value={filters.supplierId} onChange={(event) => setFilters((current) => ({ ...current, supplierId: event.target.value }))}>
                    <option value="">All suppliers</option>
                    {supplierOptions.map((supplier) => (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </option>
                    ))}
                  </LedgerSelect>
                </LedgerFieldLabel>
                <FilterSelect
                  label="Severity"
                  value={filters.severity}
                  options={SEVERITY_OPTIONS}
                  optionLabel={severityLabel}
                  onChange={(value) => setFilters((current) => ({ ...current, severity: value }))}
                />
                <FilterSelect
                  label="Exception type"
                  value={filters.exceptionType}
                  options={EXCEPTION_TYPE_OPTIONS}
                  optionLabel={exceptionTypeLabel}
                  onChange={(value) => setFilters((current) => ({ ...current, exceptionType: value }))}
                />
                <FilterSelect
                  label="Source type"
                  value={filters.sourceType}
                  options={SOURCE_TYPE_OPTIONS}
                  optionLabel={sourceTypeLabel}
                  onChange={(value) => setFilters((current) => ({ ...current, sourceType: value }))}
                />
                <FilterSelect
                  label="Review status"
                  value={filters.reviewStatus}
                  options={REVIEW_STATUS_OPTIONS}
                  optionLabel={reviewStatusLabel}
                  onChange={(value) => setFilters((current) => ({ ...current, reviewStatus: value }))}
                />
                <FilterSelect
                  label="Reason"
                  value={filters.reasonCode}
                  options={REVIEW_REASON_OPTIONS}
                  optionLabel={reasonLabel}
                  onChange={(value) => setFilters((current) => ({ ...current, reasonCode: value }))}
                />
                <LedgerFieldLabel className="min-w-[14rem] flex-1">
                  <LedgerFieldText>Search</LedgerFieldText>
                  <LedgerInput
                    value={filters.search}
                    onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
                    placeholder="Supplier or document number"
                  />
                </LedgerFieldLabel>
              </LedgerFilterBar>
            </LedgerPanel>

            {data.groups.length === 0 ? (
              <LedgerEmptyState
                title="No purchase matching exceptions found"
                description="Try a different supplier, review status, exception type, or document search."
              />
            ) : (
              <section className="space-y-4">
                {data.groups.map((group) => (
                  <LedgerSection
                    key={group.supplierId}
                    title="Supplier exceptions"
                    description={
                      <div>
                        <div className="text-xs uppercase tracking-wide text-steel">Supplier</div>
                        {linkPermissions.supplier ? (
                          <Link href={partyDetailHref("supplier", group.supplierId)} className="text-base font-semibold text-palm hover:underline">
                            {group.supplierName}
                          </Link>
                        ) : (
                          <div className="text-base font-semibold text-ink">{group.supplierName}</div>
                        )}
                      </div>
                    }
                    action={
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <LedgerStatusBadge tone={severityTone(group.highestSeverity)}>{severityLabel(group.highestSeverity)}</LedgerStatusBadge>
                        <span className="text-steel">{group.totalExceptionCount} exceptions</span>
                        <span className="text-steel">{group.outstandingReviewCount} review required</span>
                      </div>
                    }
                    className="p-0"
                  >
                    <LedgerDataTable minWidth="1280px" className="rounded-t-none border-0 shadow-none">
                      <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
                        <tr>
                          <th className="px-3 py-2">Source</th>
                          <th className="px-3 py-2">Exception</th>
                          <th className="px-3 py-2">Review</th>
                          <th className="px-3 py-2 text-right">Ordered</th>
                          <th className="px-3 py-2 text-right">Billed</th>
                          <th className="px-3 py-2 text-right">Received</th>
                          <th className="px-3 py-2 text-right">Remaining bill</th>
                          <th className="px-3 py-2 text-right">Remaining receipt</th>
                          <th className="px-3 py-2">Related links</th>
                          <th className="px-3 py-2">Latest date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {group.items.map((item) => (
                          <ExceptionRow
                            key={item.id}
                            item={item}
                            linkPermissions={linkPermissions}
                            canManageReviews={canManageReviews}
                            canCreateReturns={canCreateReturns}
                            canViewValuationVariances={canViewValuationVariances}
                            activeAction={activeAction}
                            onReviewAction={handleReviewAction}
                          />
                        ))}
                      </tbody>
                    </LedgerDataTable>
                  </LedgerSection>
                ))}
              </section>
            )}
          </>
        ) : null}
      </LedgerPageBody>
    </LedgerPage>
  );
}

function FilterSelect<T extends string>({
  label,
  value,
  options,
  optionLabel,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly T[];
  optionLabel: (value: T) => string;
  onChange: (value: string) => void;
}) {
  return (
    <LedgerFieldLabel className="min-w-[12rem] flex-1">
      <LedgerFieldText>{label}</LedgerFieldText>
      <LedgerSelect value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">All</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {optionLabel(option)}
          </option>
        ))}
      </LedgerSelect>
    </LedgerFieldLabel>
  );
}

function ExceptionRow({
  item,
  linkPermissions,
  canManageReviews,
  canCreateReturns,
  canViewValuationVariances,
  activeAction,
  onReviewAction,
}: {
  item: PurchaseMatchingExceptionItem;
  linkPermissions: Record<PurchaseMatchingContext | "supplier", boolean>;
  canManageReviews: boolean;
  canCreateReturns: boolean;
  canViewValuationVariances: boolean;
  activeAction: string | null;
  onReviewAction: (item: PurchaseMatchingExceptionItem, action: ReviewAction) => void;
}) {
  const sourceCanLink = linkPermissions[item.sourceType];
  const isFinalReview = item.reviewStatus === "RESOLVED" || item.reviewStatus === "CANCELLED";
  return (
    <tr>
      <td className="px-3 py-3">
        <div className="font-medium">
          {sourceCanLink ? (
            <Link href={item.sourceHref} className="text-palm hover:underline">
              {item.sourceNumber}
            </Link>
          ) : (
            <span className="text-ink">{item.sourceNumber}</span>
          )}
        </div>
        <div className="text-xs text-steel">{sourceTypeLabel(item.sourceType)}</div>
        <div className="text-xs text-steel">{item.itemName ?? item.lineDescription}</div>
      </td>
      <td className="px-3 py-3">
        <LedgerStatusBadge tone={severityTone(item.severity)}>{exceptionTypeLabel(item.exceptionType)}</LedgerStatusBadge>
        <div className="mt-1 text-xs text-steel">{item.exceptionLabel}</div>
      </td>
      <td className="px-3 py-3">
        <div className="space-y-2">
          <div>
            <LedgerStatusBadge tone={reviewStatusTone(item.reviewStatus)}>{reviewStatusLabel(item.reviewStatus ?? "NONE")}</LedgerStatusBadge>
            {item.reasonCode ? <div className="mt-1 text-xs text-steel">{reasonLabel(item.reasonCode)}</div> : null}
            {item.assignedTo ? <div className="mt-1 text-xs text-steel">Assigned to {item.assignedTo.name}</div> : null}
            {item.reviewStatus === "NEEDS_RETURN_REVIEW" ? <div className="mt-1 text-xs font-medium text-amber-700">Return review needed</div> : null}
            {item.reviewStatus === "NEEDS_VARIANCE_REVIEW" && item.reviewId && canViewValuationVariances ? (
              <Link
                href={inventoryValuationVariancePreviewUrl({ matchingReviewId: item.reviewId, sourceType: "matchingReview" })}
                className="mt-1 block text-xs font-medium text-palm hover:underline"
              >
                Valuation variance preview
              </Link>
            ) : null}
            {item.purchaseReturnHref && item.purchaseReturnNumber ? (
              <Link href={item.purchaseReturnHref} className="mt-1 block text-xs font-medium text-palm hover:underline">
                Return {item.purchaseReturnNumber}
              </Link>
            ) : canCreateReturns && item.reviewId && item.reviewStatus === "NEEDS_RETURN_REVIEW" ? (
              <Link href={purchaseReturnCreateHref(item)} className="mt-1 block text-xs font-medium text-palm hover:underline">
                Create purchase return
              </Link>
            ) : null}
          </div>
          {canManageReviews ? (
            <LedgerActionBar className="max-w-[300px] gap-1 sm:flex-row">
              {!item.reviewId ? (
                <ReviewActionButton
                  label="Start review"
                  active={activeAction === `${item.id}:start`}
                  onClick={() => onReviewAction(item, "start")}
                />
              ) : isFinalReview ? null : (
                <>
                  <ReviewActionButton
                    label="Waiting for supplier"
                    active={activeAction === `${item.id}:mark-waiting-for-supplier`}
                    onClick={() => onReviewAction(item, "mark-waiting-for-supplier")}
                  />
                  <ReviewActionButton
                    label="Timing difference"
                    active={activeAction === `${item.id}:mark-timing-difference`}
                    onClick={() => onReviewAction(item, "mark-timing-difference")}
                  />
                  <ReviewActionButton
                    label="Variance review"
                    active={activeAction === `${item.id}:mark-needs-variance-review`}
                    onClick={() => onReviewAction(item, "mark-needs-variance-review")}
                  />
                  <ReviewActionButton
                    label="Return review"
                    active={activeAction === `${item.id}:mark-needs-return-review`}
                    onClick={() => onReviewAction(item, "mark-needs-return-review")}
                  />
                  <ReviewActionButton label="Resolve" active={activeAction === `${item.id}:resolve`} onClick={() => onReviewAction(item, "resolve")} />
                  <ReviewActionButton label="Cancel" active={activeAction === `${item.id}:cancel`} onClick={() => onReviewAction(item, "cancel")} />
                </>
              )}
            </LedgerActionBar>
          ) : null}
        </div>
      </td>
      <td className="px-3 py-3 text-right font-mono text-xs">{item.orderedQuantity === null ? "-" : formatInventoryQuantity(item.orderedQuantity)}</td>
      <td className="px-3 py-3 text-right font-mono text-xs">{formatInventoryQuantity(item.billedQuantity)}</td>
      <td className="px-3 py-3 text-right font-mono text-xs">{formatInventoryQuantity(item.receivedQuantity)}</td>
      <td className="px-3 py-3 text-right font-mono text-xs">{item.remainingToBill === null ? "-" : formatInventoryQuantity(item.remainingToBill)}</td>
      <td className="px-3 py-3 text-right font-mono text-xs">{formatInventoryQuantity(item.remainingToReceive)}</td>
      <td className="px-3 py-3">
        <div className="flex flex-col gap-1">
          <RecordLink label="PO" href={item.purchaseOrderHref} number={item.purchaseOrderNumber} allowed={linkPermissions.purchaseOrder} />
          <RecordLink label="Bill" href={item.purchaseBillHref} number={item.purchaseBillNumber} allowed={linkPermissions.purchaseBill} />
          <RecordLink label="Receipt" href={item.purchaseReceiptHref} number={item.purchaseReceiptNumber} allowed={linkPermissions.purchaseReceipt} />
        </div>
      </td>
      <td className="px-3 py-3"><LedgerDate>{formatOptionalDate(item.latestRelevantDate, "-")}</LedgerDate></td>
    </tr>
  );
}

function purchaseReturnCreateHref(item: PurchaseMatchingExceptionItem): string {
  const params = new URLSearchParams({
    matchingReviewId: item.reviewId ?? "",
    supplierId: item.supplierId,
    sourceType: item.sourceType,
    sourceId: item.sourceId,
  });
  return `/purchases/returns/new?${params.toString()}`;
}

function ReviewActionButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <LedgerButton
      type="button"
      onClick={onClick}
      disabled={active}
      size="sm"
      variant="quiet"
    >
      {active ? "Updating..." : label}
    </LedgerButton>
  );
}

function RecordLink({ label, href, number, allowed }: { label: string; href: string | null; number: string | null; allowed: boolean }) {
  if (!number) {
    return <span className="text-xs text-steel">{label}: -</span>;
  }
  if (!href || !allowed) {
    return (
      <span className="text-xs text-steel">
        {label}: {number}
      </span>
    );
  }
  return (
    <Link href={href} className="text-xs font-medium text-palm hover:underline">
      {label}: {number}
    </Link>
  );
}

function sourceTypeLabel(value: PurchaseMatchingContext): string {
  if (value === "purchaseOrder") return "Purchase order";
  if (value === "purchaseBill") return "Purchase bill";
  return "Purchase receipt";
}

function severityLabel(value: PurchaseMatchingExceptionSeverity): string {
  if (value === "CRITICAL") return "Critical";
  if (value === "HIGH") return "High";
  if (value === "MEDIUM") return "Medium";
  return "Low";
}

function exceptionTypeLabel(value: PurchaseMatchingExceptionType): string {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function reviewStatusLabel(value: PurchaseMatchingReviewStatus | "NONE"): string {
  if (value === "NONE") return "No review started";
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function reasonLabel(value: PurchaseMatchingReviewReason): string {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function severityTone(severity: PurchaseMatchingExceptionSeverity): LedgerStatusTone {
  if (severity === "CRITICAL") return "danger";
  if (severity === "HIGH") return "warning";
  if (severity === "MEDIUM") return "neutral";
  return "success";
}

function reviewStatusTone(status: PurchaseMatchingReviewStatus | null): LedgerStatusTone {
  if (!status) return "neutral";
  if (status === "RESOLVED") return "success";
  if (status === "CANCELLED") return "neutral";
  if (status === "NEEDS_VARIANCE_REVIEW" || status === "NEEDS_RETURN_REVIEW") return "warning";
  if (status === "WAITING_FOR_SUPPLIER" || status === "WAITING_FOR_RECEIPT" || status === "WAITING_FOR_BILL") return "warning";
  return "info";
}
