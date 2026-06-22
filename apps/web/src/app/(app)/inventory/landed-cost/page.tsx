"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
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
  LedgerSection,
  LedgerSelect,
  LedgerSummaryBand,
  LedgerToolbar,
} from "@/components/ui/ledger-system";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { formatOptionalDate } from "@/lib/invoice-display";
import {
  formatInventoryQuantity,
  inventoryFifoPreviewUrl,
  landedCostAllocationMethodLabel,
  landedCostCategoryLabel,
  landedCostSourceTypeLabel,
} from "@/lib/inventory";
import { PERMISSIONS } from "@/lib/permissions";
import type { LandedCostAllocationMethod, LandedCostCategory, LandedCostPreviewResponse, LandedCostSourceType } from "@/lib/types";

const LANDED_COST_CATEGORIES: LandedCostCategory[] = ["FREIGHT", "CUSTOMS_DUTY", "INSURANCE", "HANDLING", "BROKERAGE", "STORAGE", "OTHER"];
const ALLOCATION_METHODS: LandedCostAllocationMethod[] = ["BY_VALUE", "BY_QUANTITY", "EQUAL", "MANUAL"];
const SOURCE_TYPES: LandedCostSourceType[] = ["PURCHASE_RECEIPT", "PURCHASE_BILL", "PURCHASE_ORDER"];
const SAFE_HELPER_TEXT =
  "This preview allocates estimated landed costs across inventory receipt or bill lines. It does not post journals, update inventory valuation, change AP balances, create cost layers, or affect VAT. FIFO remains preview-only.";

interface CostLineForm {
  id: string;
  category: LandedCostCategory;
  description: string;
  amount: string;
  currency: string;
  supplierId: string;
}

export default function LandedCostPreviewPage() {
  const organizationId = useActiveOrganizationId();
  const searchParams = useSearchParams();
  const { can } = usePermissions();
  const initialSourceType = safeSourceType(searchParams.get("sourceType"));
  const [sourceType, setSourceType] = useState<LandedCostSourceType>(initialSourceType);
  const [sourceId, setSourceId] = useState(searchParams.get("sourceId") ?? "");
  const [costLines, setCostLines] = useState<CostLineForm[]>([newCostLine()]);
  const [allocationMethod, setAllocationMethod] = useState<LandedCostAllocationMethod>("BY_VALUE");
  const [manualAllocations, setManualAllocations] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<LandedCostPreviewResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const canViewPage = can(PERMISSIONS.inventory.view);
  const canViewReceiptSource = can(PERMISSIONS.purchaseReceiving.view);
  const canViewBillSource = can(PERMISSIONS.purchaseBills.view);
  const canViewOrderSource = can(PERMISSIONS.purchaseOrders.view);
  const canViewSelectedSource =
    sourceType === "PURCHASE_RECEIPT" ? canViewReceiptSource : sourceType === "PURCHASE_BILL" ? canViewBillSource : canViewOrderSource;
  const sourcePermissionMessage = sourceType === "PURCHASE_RECEIPT"
    ? "Purchase receipt source preview requires purchase receiving view permission."
    : sourceType === "PURCHASE_BILL"
      ? "Purchase bill source preview requires purchase bills view permission."
      : "Purchase order landed cost preview is deferred, and source visibility requires purchase orders view permission.";

  const allocationByLineId = useMemo(() => new Map(preview?.allocation.map((line) => [line.sourceLineId, line]) ?? []), [preview]);
  const sourceHref = preview?.source ? sourceDocumentHref(preview.source.sourceType, preview.source.sourceId) : null;
  const canLinkPreviewSource =
    preview?.source?.sourceType === "PURCHASE_RECEIPT"
      ? canViewReceiptSource
      : preview?.source?.sourceType === "PURCHASE_BILL"
        ? canViewBillSource
        : preview?.source?.sourceType === "PURCHASE_ORDER"
          ? canViewOrderSource
          : false;

  async function submitPreview() {
    if (!organizationId || !canViewPage) return;
    setLoading(true);
    setError("");
    try {
      const result = await apiRequest<LandedCostPreviewResponse>("/inventory/landed-cost/preview", {
        method: "POST",
        body: {
          sourceType,
          sourceId: sourceId.trim(),
          allocationMethod,
          costLines: costLines.map((line) => ({
            category: line.category,
            description: line.description.trim() || undefined,
            amount: line.amount || "0.0000",
            currency: line.currency.trim() || undefined,
            supplierId: line.supplierId.trim() || undefined,
          })),
          manualAllocations:
            allocationMethod === "MANUAL"
              ? (preview?.baseLines ?? []).map((line) => ({ sourceLineId: line.sourceLineId, amount: manualAllocations[line.sourceLineId] || "0.0000" }))
              : undefined,
        },
      });
      setPreview(result);
    } catch (previewError) {
      setError(previewError instanceof Error ? previewError.message : "Unable to generate landed cost preview.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <LedgerPage>
      <LedgerPageHeader
        eyebrow="Inventory valuation"
        title="Landed Cost Preview"
        description={SAFE_HELPER_TEXT}
        actions={
          <>
            <LedgerButton href={inventoryFifoPreviewUrl({})}>FIFO preview</LedgerButton>
            <LedgerButton href="/inventory/valuation-variances">Valuation variance preview</LedgerButton>
          </>
        }
      />

      <LedgerPageBody>
        {!organizationId ? <LedgerAlert tone="info">Log in and select an organization to preview landed cost allocation.</LedgerAlert> : null}
        {organizationId && !canViewPage ? <LedgerAlert tone="info">Landed cost preview requires inventory view permission.</LedgerAlert> : null}
        {organizationId && canViewPage && !canViewSelectedSource ? <LedgerAlert tone="info">{sourcePermissionMessage}</LedgerAlert> : null}
        {error ? <LedgerAlert tone="danger">{error}</LedgerAlert> : null}
        {loading ? <LedgerLoadingState title="Generating landed cost preview" /> : null}

      <LedgerToolbar
        title="Source selector"
        description="Choose an eligible purchase receipt or purchase bill source. Purchase order support returns a blocker in this sprint."
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[240px_1fr_auto] md:items-end">
          <LedgerFieldLabel>
            <LedgerFieldText>Source type</LedgerFieldText>
            <LedgerSelect
              value={sourceType}
              onChange={(event) => setSourceType(event.target.value as LandedCostSourceType)}
            >
              {SOURCE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {landedCostSourceTypeLabel(type)}
                </option>
              ))}
            </LedgerSelect>
          </LedgerFieldLabel>
          <LedgerFieldLabel>
            <LedgerFieldText>Source document ID</LedgerFieldText>
            <LedgerInput
              value={sourceId}
              onChange={(event) => setSourceId(event.target.value)}
              placeholder="Paste receipt or bill ID"
            />
          </LedgerFieldLabel>
          <LedgerButton
            type="button"
            variant="primary"
            onClick={submitPreview}
            disabled={!organizationId || !canViewPage || !canViewSelectedSource || !sourceId.trim() || loading}
          >
            Preview
          </LedgerButton>
        </div>
      </LedgerToolbar>

      <LedgerSection
        title="Cost lines"
        description="Model freight, customs, insurance, handling, brokerage, storage, or other estimated landed costs."
        action={<LedgerButton type="button" onClick={() => setCostLines((current) => [...current, newCostLine()])}>Add cost line</LedgerButton>}
      >
        <div className="space-y-3">
          {costLines.map((line, index) => (
            <div key={line.id} className="grid grid-cols-1 gap-3 md:grid-cols-[180px_1fr_150px_110px_150px_auto] md:items-end">
              <LedgerFieldLabel>
                <LedgerFieldText>Category {index + 1}</LedgerFieldText>
                <LedgerSelect
                  value={line.category}
                  onChange={(event) => updateCostLine(line.id, { category: event.target.value as LandedCostCategory }, setCostLines)}
                >
                  {LANDED_COST_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {landedCostCategoryLabel(category)}
                    </option>
                  ))}
                </LedgerSelect>
              </LedgerFieldLabel>
              <LedgerFieldLabel>
                <LedgerFieldText>Description {index + 1}</LedgerFieldText>
                <LedgerInput
                  value={line.description}
                  onChange={(event) => updateCostLine(line.id, { description: event.target.value }, setCostLines)}
                  placeholder="Optional"
                />
              </LedgerFieldLabel>
              <LedgerFieldLabel>
                <LedgerFieldText>Cost amount {index + 1}</LedgerFieldText>
                <LedgerInput
                  inputMode="decimal"
                  value={line.amount}
                  onChange={(event) => updateCostLine(line.id, { amount: event.target.value }, setCostLines)}
                />
              </LedgerFieldLabel>
              <LedgerFieldLabel>
                <LedgerFieldText>Currency {index + 1}</LedgerFieldText>
                <LedgerInput
                  value={line.currency}
                  onChange={(event) => updateCostLine(line.id, { currency: event.target.value.toUpperCase() }, setCostLines)}
                  maxLength={3}
                />
              </LedgerFieldLabel>
              <LedgerFieldLabel>
                <LedgerFieldText>Supplier ID {index + 1}</LedgerFieldText>
                <LedgerInput
                  value={line.supplierId}
                  onChange={(event) => updateCostLine(line.id, { supplierId: event.target.value }, setCostLines)}
                  placeholder="Optional"
                />
              </LedgerFieldLabel>
              <LedgerButton
                type="button"
                onClick={() => setCostLines((current) => (current.length > 1 ? current.filter((candidate) => candidate.id !== line.id) : current))}
              >
                Remove
              </LedgerButton>
            </div>
          ))}
        </div>
      </LedgerSection>

      <LedgerSection
        title="Allocation method"
        description="Choose how the estimated landed costs are spread across eligible inventory lines."
      >
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {ALLOCATION_METHODS.map((method) => (
            <label
              key={method}
              className={`rounded-md border px-3 py-2 text-sm font-medium ${allocationMethod === method ? "border-ink bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-700"}`}
            >
              <input
                type="radio"
                name="allocationMethod"
                value={method}
                checked={allocationMethod === method}
                onChange={() => setAllocationMethod(method)}
                className="sr-only"
              />
              {landedCostAllocationMethodLabel(method)}
            </label>
          ))}
        </div>
        {allocationMethod === "MANUAL" ? (
          <div className="space-y-3 rounded-md border border-line bg-mist p-3">
            <h3 className="text-sm font-semibold text-ink">Manual allocations</h3>
            {preview?.baseLines.length ? (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {preview.baseLines.map((line) => (
                  <LedgerFieldLabel key={line.sourceLineId}>
                    <LedgerFieldText>{line.itemName} allocation</LedgerFieldText>
                    <LedgerInput
                      inputMode="decimal"
                      value={manualAllocations[line.sourceLineId] ?? ""}
                      onChange={(event) => setManualAllocations((current) => ({ ...current, [line.sourceLineId]: event.target.value }))}
                      placeholder="0.0000"
                    />
                  </LedgerFieldLabel>
                ))}
              </div>
            ) : (
              <p className="text-sm text-steel">Generate a preview once to load source lines, then enter manual line allocations.</p>
            )}
          </div>
        ) : null}
      </LedgerSection>

      <LedgerSection title="Preview result">
        {!preview ? <LedgerEmptyState title="No preview generated yet." /> : null}
        {preview ? (
          <>
            {preview.source ? (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                <Metric label="Source" value={preview.source.sourceNumber} href={canLinkPreviewSource && sourceHref ? sourceHref : null} />
                <Metric label="Supplier" value={preview.source.supplier.displayName ?? preview.source.supplier.name} />
                <Metric label="Date" value={formatOptionalDate(preview.source.date, "-")} />
                <Metric label="Method" value={landedCostAllocationMethodLabel(preview.allocationMethod)} />
              </div>
            ) : null}
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <Metric label="Base inventory value" value={formatInventoryQuantity(preview.totals.baseInventoryValue)} />
              <Metric label="Total landed cost" value={formatInventoryQuantity(preview.totals.totalLandedCosts)} />
              <Metric label="Preview landed inventory value" value={formatInventoryQuantity(preview.totals.previewLandedInventoryValue)} />
            </div>
            {preview.blockers.length > 0 ? (
              <LedgerAlert tone="danger" title="Blockers">
                <ul className="mt-2 space-y-1">
                  {preview.blockers.map((blocker) => (
                    <li key={blocker}>{blocker}</li>
                  ))}
                </ul>
              </LedgerAlert>
            ) : null}
            {preview.warnings.length > 0 ? (
              <LedgerAlert tone="warning" title="Warnings">
                <ul className="mt-2 space-y-1">
                  {preview.warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              </LedgerAlert>
            ) : null}
            {preview.baseLines.length > 0 ? (
              <LedgerDataTable minWidth="960px">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
                    <tr>
                      <th className="px-3 py-2">Item</th>
                      <th className="px-3 py-2 text-right">Quantity</th>
                      <th className="px-3 py-2 text-right">Base unit cost</th>
                      <th className="px-3 py-2 text-right">Base value</th>
                      <th className="px-3 py-2 text-right">Allocated cost</th>
                      <th className="px-3 py-2 text-right">Preview landed unit cost</th>
                      <th className="px-3 py-2 text-right">Preview landed line value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {preview.baseLines.map((line) => {
                      const allocation = allocationByLineId.get(line.sourceLineId);
                      return (
                        <tr key={line.sourceLineId}>
                          <td className="px-3 py-3">
                            <div className="font-medium text-ink">{line.itemName}</div>
                            <div className="text-xs text-steel">{line.itemSku ?? line.sourceLineId}</div>
                            {line.returnedQuantity !== "0.0000" ? <div className="text-xs text-amber-700">Returned {formatInventoryQuantity(line.returnedQuantity)}</div> : null}
                          </td>
                          <td className="px-3 py-3 text-right"><LedgerMoney>{formatInventoryQuantity(line.quantity)}</LedgerMoney></td>
                          <td className="px-3 py-3 text-right"><LedgerMoney>{formatInventoryQuantity(line.baseUnitCost)}</LedgerMoney></td>
                          <td className="px-3 py-3 text-right"><LedgerMoney>{formatInventoryQuantity(line.baseLineValue)}</LedgerMoney></td>
                          <td className="px-3 py-3 text-right"><LedgerMoney>{allocation ? formatInventoryQuantity(allocation.allocatedLandedCost) : "-"}</LedgerMoney></td>
                          <td className="px-3 py-3 text-right"><LedgerMoney>{allocation ? formatInventoryQuantity(allocation.previewLandedUnitCost) : "-"}</LedgerMoney></td>
                          <td className="px-3 py-3 text-right"><LedgerMoney>{allocation ? formatInventoryQuantity(allocation.previewLandedLineValue) : "-"}</LedgerMoney></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </LedgerDataTable>
            ) : null}
          </>
        ) : null}
      </LedgerSection>

        <LedgerSummaryBand>
          <span className="font-semibold text-ink">Safe limitations: </span>
          This sprint is planning-only: no landed cost documents are saved, no inventory item cost is updated, no moving average or FIFO layer is created, no AP or bill balance is changed, no VAT report is affected, no supplier payment or debit note/refund is created, no email is sent, and no ZATCA call is made.
        </LedgerSummaryBand>
      </LedgerPageBody>
    </LedgerPage>
  );
}

function Metric({ label, value, href }: { label: string; value: string; href?: string | null }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs uppercase tracking-wide text-steel">{label}</p>
      {href ? (
        <Link href={href} className="mt-1 block font-medium text-palm hover:underline">
          {value}
        </Link>
      ) : (
        <p className="mt-1 font-medium text-ink">{value}</p>
      )}
    </div>
  );
}

function newCostLine(): CostLineForm {
  return {
    id: `line-${Math.random().toString(36).slice(2)}`,
    category: "FREIGHT",
    description: "",
    amount: "0.0000",
    currency: "",
    supplierId: "",
  };
}

function updateCostLine(
  id: string,
  patch: Partial<CostLineForm>,
  setCostLines: (updater: (current: CostLineForm[]) => CostLineForm[]) => void,
) {
  setCostLines((current) => current.map((line) => (line.id === id ? { ...line, ...patch } : line)));
}

function safeSourceType(value: string | null): LandedCostSourceType {
  if (value === "PURCHASE_BILL" || value === "PURCHASE_ORDER") return value;
  return "PURCHASE_RECEIPT";
}

function sourceDocumentHref(sourceType: LandedCostSourceType, sourceId: string): string {
  if (sourceType === "PURCHASE_RECEIPT") return `/inventory/purchase-receipts/${sourceId}`;
  if (sourceType === "PURCHASE_BILL") return `/purchases/bills/${sourceId}`;
  return `/purchases/purchase-orders/${sourceId}`;
}
