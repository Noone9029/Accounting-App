"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  LedgerAlert,
  LedgerButton,
  LedgerDataTable,
  LedgerFieldLabel,
  LedgerFieldText,
  LedgerFormSection,
  LedgerInput,
  LedgerLoadingState,
  LedgerMoney,
  LedgerPage,
  LedgerPageBody,
  LedgerPageHeader,
  LedgerSelect,
  LedgerSummaryBand,
} from "@/components/ui/ledger-system";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import {
  formatInventoryQuantity,
  hasRemainingInventoryQuantity,
  inventoryOperationalWarning,
  purchaseReceiptSourceTypeLabel,
  validatePurchaseReceiptInput,
} from "@/lib/inventory";
import { safeReturnToFromSearch } from "@/lib/parties";
import type { Contact, Item, PurchaseBill, PurchaseOrder, PurchaseReceipt, PurchaseReceivingStatus, PurchaseReceivingStatusLine, Warehouse } from "@/lib/types";

type SourceType = "purchaseOrder" | "purchaseBill" | "standalone";

function todayInputValue(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function NewPurchaseReceiptPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const organizationId = useActiveOrganizationId();
  const searchString = searchParams.toString();
  const [sourceType, setSourceType] = useState<SourceType>((searchParams.get("sourceType") as SourceType | null) ?? "purchaseOrder");
  const [sourceId, setSourceId] = useState(searchParams.get("purchaseOrderId") ?? searchParams.get("purchaseBillId") ?? "");
  const [supplierId, setSupplierId] = useState(searchParams.get("supplierId") ?? "");
  const returnTo = useMemo(() => safeReturnToFromSearch(searchString ? `?${searchString}` : ""), [searchString]);
  const [warehouseId, setWarehouseId] = useState("");
  const [standaloneItemId, setStandaloneItemId] = useState("");
  const [standaloneQuantity, setStandaloneQuantity] = useState("1.0000");
  const [standaloneUnitCost, setStandaloneUnitCost] = useState("");
  const [lineQuantities, setLineQuantities] = useState<Record<string, string>>({});
  const [lineUnitCosts, setLineUnitCosts] = useState<Record<string, string>>({});
  const [items, setItems] = useState<Item[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [suppliers, setSuppliers] = useState<Contact[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [purchaseBills, setPurchaseBills] = useState<PurchaseBill[]>([]);
  const [status, setStatus] = useState<PurchaseReceivingStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const activeWarehouses = warehouses.filter((warehouse) => warehouse.status === "ACTIVE");
  const trackedItems = items.filter((item) => item.inventoryTracking && item.status === "ACTIVE");
  const sourceLines = useMemo(() => status?.lines.filter((line) => line.inventoryTracking && hasRemainingInventoryQuantity(line.remainingQuantity)) ?? [], [status]);

  useEffect(() => {
    if (!organizationId) return;

    let cancelled = false;
    setLoading(true);
    setError("");

    Promise.all([apiRequest<Item[]>("/items"), apiRequest<Warehouse[]>("/warehouses"), apiRequest<Contact[]>("/contacts"), apiRequest<PurchaseOrder[]>("/purchase-orders"), apiRequest<PurchaseBill[]>("/purchase-bills")])
      .then(([itemResult, warehouseResult, contactResult, orderResult, billResult]) => {
        if (cancelled) return;
        setItems(itemResult);
        setWarehouses(warehouseResult);
        setSuppliers(contactResult.filter((contact) => contact.isActive && (contact.type === "SUPPLIER" || contact.type === "BOTH")));
        setPurchaseOrders(orderResult.filter((order) => !["DRAFT", "VOIDED"].includes(order.status)));
        setPurchaseBills(billResult.filter((bill) => bill.status === "FINALIZED"));
        setWarehouseId((current) => current || warehouseResult.find((warehouse) => warehouse.status === "ACTIVE" && warehouse.isDefault)?.id || warehouseResult.find((warehouse) => warehouse.status === "ACTIVE")?.id || "");
        setStandaloneItemId((current) => current || itemResult.find((item) => item.inventoryTracking && item.status === "ACTIVE")?.id || "");
      })
      .catch((loadError: unknown) => {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Unable to load receipt form data.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [organizationId]);

  useEffect(() => {
    if (!organizationId || sourceType === "standalone" || !sourceId) {
      setStatus(null);
      return;
    }

    let cancelled = false;
    setStatusLoading(true);
    setError("");
    const path = sourceType === "purchaseOrder" ? `/purchase-orders/${sourceId}/receiving-status` : `/purchase-bills/${sourceId}/receiving-status`;

    apiRequest<PurchaseReceivingStatus>(path)
      .then((result) => {
        if (cancelled) return;
        setStatus(result);
        const defaults: Record<string, string> = {};
        result.lines.forEach((line) => {
          if (line.inventoryTracking && hasRemainingInventoryQuantity(line.remainingQuantity)) {
            defaults[line.lineId] = line.remainingQuantity;
          }
        });
        setLineQuantities(defaults);
      })
      .catch((loadError: unknown) => {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Unable to load receiving status.");
      })
      .finally(() => {
        if (!cancelled) setStatusLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [organizationId, sourceType, sourceId]);

  async function createReceipt(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const lines =
      sourceType === "standalone"
        ? standaloneItemId && Number(standaloneQuantity) > 0
          ? [{ itemId: standaloneItemId, quantity: standaloneQuantity, unitCost: standaloneUnitCost || undefined }]
          : []
        : sourceLines
            .filter((line) => Number(lineQuantities[line.lineId] || 0) > 0)
            .map((line) => ({
              ...(sourceType === "purchaseOrder" ? { purchaseOrderLineId: line.lineId } : { purchaseBillLineId: line.lineId }),
              quantity: lineQuantities[line.lineId],
              unitCost: lineUnitCosts[line.lineId] || undefined,
            }));

    const validationError = validatePurchaseReceiptInput({ warehouseId, lineCount: lines.length });
    if (validationError) {
      setError(validationError);
      return;
    }
    if (sourceType !== "standalone" && !sourceId) {
      setError("Select a purchase source.");
      return;
    }
    if (sourceType === "standalone" && !supplierId) {
      setError("Select a supplier.");
      return;
    }

    setSubmitting(true);
    const formData = new FormData(event.currentTarget);
    try {
      const receipt = await apiRequest<PurchaseReceipt>("/purchase-receipts", {
        method: "POST",
        body: {
          ...(sourceType === "purchaseOrder" ? { purchaseOrderId: sourceId } : {}),
          ...(sourceType === "purchaseBill" ? { purchaseBillId: sourceId } : {}),
          ...(sourceType === "standalone" ? { supplierId } : {}),
          warehouseId,
          receiptDate: String(formData.get("receiptDate")),
          notes: String(formData.get("notes") || "") || undefined,
          lines,
        },
      });
      router.push(returnTo || `/inventory/purchase-receipts/${receipt.id}`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to create purchase receipt.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <LedgerPage>
      <LedgerPageHeader
        eyebrow="Inventory"
        title="New purchase receipt"
        description="Receive inventory into a warehouse without creating accounting journals."
        actions={<LedgerButton href={returnTo || "/inventory/purchase-receipts"}>Back</LedgerButton>}
      />

      <LedgerPageBody>
        <LedgerSummaryBand tone="warning">{inventoryOperationalWarning()}</LedgerSummaryBand>

        {!organizationId ? <LedgerAlert tone="info">Log in and select an organization to create purchase receipts.</LedgerAlert> : null}
        {loading ? <LedgerLoadingState title="Loading form data" /> : null}
        {statusLoading ? <LedgerLoadingState title="Loading receivable lines" /> : null}
        {error ? <LedgerAlert tone="danger">{error}</LedgerAlert> : null}

        <form onSubmit={createReceipt} className="space-y-5">
          <LedgerFormSection title="Receipt source" description="Choose the purchase source, receiving warehouse, and receipt date.">
            <LedgerFieldLabel>
              <LedgerFieldText>Source type</LedgerFieldText>
              <LedgerSelect
                value={sourceType}
                onChange={(event) => {
                  setSourceType(event.target.value as SourceType);
                  setSourceId("");
                  setStatus(null);
                }}
              >
                <option value="purchaseOrder">{purchaseReceiptSourceTypeLabel("purchaseOrder")}</option>
                <option value="purchaseBill">{purchaseReceiptSourceTypeLabel("purchaseBill")}</option>
                <option value="standalone">{purchaseReceiptSourceTypeLabel("standalone")}</option>
              </LedgerSelect>
            </LedgerFieldLabel>

            {sourceType === "purchaseOrder" ? (
              <SourceSelect label="Purchase order" value={sourceId} onChange={setSourceId} options={purchaseOrders.map((order) => ({ id: order.id, label: `${order.purchaseOrderNumber} - ${order.supplier?.displayName ?? order.supplier?.name ?? order.supplierId}` }))} />
            ) : null}
            {sourceType === "purchaseBill" ? (
              <SourceSelect label="Purchase bill" value={sourceId} onChange={setSourceId} options={purchaseBills.map((bill) => ({ id: bill.id, label: `${bill.billNumber} - ${bill.supplier?.displayName ?? bill.supplier?.name ?? bill.supplierId}` }))} />
            ) : null}
            {sourceType === "standalone" ? (
              <SourceSelect label="Supplier" value={supplierId} onChange={setSupplierId} options={suppliers.map((supplier) => ({ id: supplier.id, label: supplier.displayName ?? supplier.name }))} />
            ) : null}

            <LedgerFieldLabel>
              <LedgerFieldText>Warehouse</LedgerFieldText>
              <LedgerSelect value={warehouseId} onChange={(event) => setWarehouseId(event.target.value)} required>
                <option value="">Select warehouse</option>
                {activeWarehouses.map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>{warehouse.code} {warehouse.name}</option>
                ))}
              </LedgerSelect>
            </LedgerFieldLabel>

            <LedgerFieldLabel>
              <LedgerFieldText>Receipt date</LedgerFieldText>
              <LedgerInput name="receiptDate" type="date" required defaultValue={todayInputValue()} />
            </LedgerFieldLabel>
            <LedgerFieldLabel className="md:col-span-2">
              <LedgerFieldText>Notes</LedgerFieldText>
              <LedgerInput name="notes" placeholder="Optional" />
            </LedgerFieldLabel>
          </LedgerFormSection>

          {sourceType === "standalone" ? (
            <LedgerFormSection title="Standalone receipt line">
              <SourceSelect label="Item" value={standaloneItemId} onChange={setStandaloneItemId} options={trackedItems.map((item) => ({ id: item.id, label: `${item.name}${item.sku ? ` (${item.sku})` : ""}` }))} />
              <LineInput label="Quantity" value={standaloneQuantity} onChange={setStandaloneQuantity} />
              <LineInput label="Unit cost" value={standaloneUnitCost} onChange={setStandaloneUnitCost} placeholder="Optional" />
            </LedgerFormSection>
          ) : (
            <ReceivableLines lines={sourceLines} quantities={lineQuantities} unitCosts={lineUnitCosts} setQuantity={setLineQuantities} setUnitCost={setLineUnitCosts} />
          )}

          <div className="flex justify-end gap-3">
            <LedgerButton href={returnTo || "/inventory/purchase-receipts"}>Cancel</LedgerButton>
            <LedgerButton type="submit" disabled={submitting} variant="primary">
              {submitting ? "Posting..." : "Post receipt"}
            </LedgerButton>
          </div>
        </form>
      </LedgerPageBody>
    </LedgerPage>
  );
}

function SourceSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: Array<{ id: string; label: string }> }) {
  return (
    <LedgerFieldLabel>
      <LedgerFieldText>{label}</LedgerFieldText>
      <LedgerSelect value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">Select {label.toLowerCase()}</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>{option.label}</option>
        ))}
      </LedgerSelect>
    </LedgerFieldLabel>
  );
}

function LineInput({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <LedgerFieldLabel>
      <LedgerFieldText>{label}</LedgerFieldText>
      <LedgerInput value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </LedgerFieldLabel>
  );
}

function ReceivableLines({
  lines,
  quantities,
  unitCosts,
  setQuantity,
  setUnitCost,
}: {
  lines: PurchaseReceivingStatusLine[];
  quantities: Record<string, string>;
  unitCosts: Record<string, string>;
  setQuantity: (value: Record<string, string>) => void;
  setUnitCost: (value: Record<string, string>) => void;
}) {
  if (lines.length === 0) {
    return <LedgerAlert tone="info">No remaining inventory-tracked source lines are available to receive.</LedgerAlert>;
  }

  return (
    <LedgerFormSection title="Receivable lines" description="Only inventory-tracked source lines with remaining quantity are shown." className="[&_>div]:block">
      <LedgerDataTable minWidth="760px">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
          <tr>
            <th className="px-3 py-2">Item</th>
            <th className="px-3 py-2 text-right">Source qty</th>
            <th className="px-3 py-2 text-right">Received</th>
            <th className="px-3 py-2 text-right">Remaining</th>
            <th className="px-3 py-2">Receive qty</th>
            <th className="px-3 py-2">Unit cost</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {lines.map((line) => (
            <tr key={line.lineId}>
              <td className="px-3 py-2">{line.item ? `${line.item.name}${line.item.sku ? ` (${line.item.sku})` : ""}` : line.lineId}</td>
              <td className="px-3 py-2 text-right"><LedgerMoney>{formatInventoryQuantity(line.sourceQuantity)}</LedgerMoney></td>
              <td className="px-3 py-2 text-right"><LedgerMoney>{formatInventoryQuantity(line.receivedQuantity)}</LedgerMoney></td>
              <td className="px-3 py-2 text-right"><LedgerMoney>{formatInventoryQuantity(line.remainingQuantity)}</LedgerMoney></td>
              <td className="px-3 py-2">
                <LedgerInput value={quantities[line.lineId] ?? ""} onChange={(event) => setQuantity({ ...quantities, [line.lineId]: event.target.value })} className="w-32" />
              </td>
              <td className="px-3 py-2">
                <LedgerInput value={unitCosts[line.lineId] ?? ""} onChange={(event) => setUnitCost({ ...unitCosts, [line.lineId]: event.target.value })} placeholder="Optional" className="w-32" />
              </td>
            </tr>
          ))}
        </tbody>
      </LedgerDataTable>
    </LedgerFormSection>
  );
}
