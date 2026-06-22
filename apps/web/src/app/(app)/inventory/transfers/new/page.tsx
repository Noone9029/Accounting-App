"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import {
  LedgerAlert,
  LedgerButton,
  LedgerFieldLabel,
  LedgerFieldText,
  LedgerFormSection,
  LedgerInput,
  LedgerLoadingState,
  LedgerPage,
  LedgerPageBody,
  LedgerPageHeader,
  LedgerSelect,
  LedgerSummaryBand,
} from "@/components/ui/ledger-system";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { inventoryOperationalWarning, validateWarehouseTransferInput } from "@/lib/inventory";
import type { Item, Warehouse, WarehouseTransfer } from "@/lib/types";

function todayInputValue(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function NewWarehouseTransferPage() {
  const router = useRouter();
  const organizationId = useActiveOrganizationId();
  const [items, setItems] = useState<Item[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [itemId, setItemId] = useState("");
  const [fromWarehouseId, setFromWarehouseId] = useState("");
  const [toWarehouseId, setToWarehouseId] = useState("");
  const [quantity, setQuantity] = useState("1.0000");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const trackedItems = items.filter((item) => item.inventoryTracking && item.status === "ACTIVE");
  const activeWarehouses = warehouses.filter((warehouse) => warehouse.status === "ACTIVE");

  useEffect(() => {
    if (!organizationId) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    Promise.all([apiRequest<Item[]>("/items"), apiRequest<Warehouse[]>("/warehouses")])
      .then(([itemResult, warehouseResult]) => {
        if (cancelled) {
          return;
        }
        const activeTracked = itemResult.filter((item) => item.inventoryTracking && item.status === "ACTIVE");
        const active = warehouseResult.filter((warehouse) => warehouse.status === "ACTIVE");
        setItems(itemResult);
        setWarehouses(warehouseResult);
        setItemId((current) => current || activeTracked[0]?.id || "");
        setFromWarehouseId((current) => current || active[0]?.id || "");
        setToWarehouseId((current) => current || active.find((warehouse) => warehouse.id !== active[0]?.id)?.id || "");
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load transfer form data.");
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

  async function createTransfer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const validationError = validateWarehouseTransferInput({ itemId, fromWarehouseId, toWarehouseId, quantity });
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    const formData = new FormData(event.currentTarget);
    try {
      const transfer = await apiRequest<WarehouseTransfer>("/warehouse-transfers", {
        method: "POST",
        body: {
          itemId,
          fromWarehouseId,
          toWarehouseId,
          transferDate: String(formData.get("transferDate")),
          quantity,
          unitCost: String(formData.get("unitCost") || "") || undefined,
          description: String(formData.get("description") || "") || undefined,
        },
      });
      router.push(`/inventory/transfers/${transfer.id}`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to create warehouse transfer.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <LedgerPage>
      <LedgerPageHeader
        eyebrow="Inventory"
        title="New warehouse transfer"
        description="Post a stock transfer between active warehouses."
        actions={<LedgerButton href="/inventory/transfers">Back</LedgerButton>}
      />

      <LedgerSummaryBand tone="warning">{inventoryOperationalWarning()}</LedgerSummaryBand>
      <NewWarehouseTransferGuidance />

      <LedgerPageBody>
        {!organizationId ? <LedgerAlert tone="info">Log in and select an organization to create warehouse transfers.</LedgerAlert> : null}
        {loading ? <LedgerLoadingState title="Loading form data" /> : null}
        {error ? <LedgerAlert tone="danger">{error}</LedgerAlert> : null}
        {!loading && organizationId && trackedItems.length === 0 ? <LedgerAlert tone="info">No active inventory-tracked items are available. Create a tracked product before transferring stock.</LedgerAlert> : null}
        {!loading && organizationId && activeWarehouses.length < 2 ? <LedgerAlert tone="info">At least two active warehouses are required before stock can move between locations.</LedgerAlert> : null}

        <form onSubmit={createTransfer}>
          <LedgerFormSection title="Transfer details" description="Posting creates one out movement and one in movement for the same quantity.">
            <LedgerFieldLabel>
              <LedgerFieldText>Item</LedgerFieldText>
              <LedgerSelect value={itemId} onChange={(event) => setItemId(event.target.value)} required>
                <option value="">Select item</option>
                {trackedItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}{item.sku ? ` (${item.sku})` : ""}
                  </option>
                ))}
              </LedgerSelect>
            </LedgerFieldLabel>
            <LedgerFieldLabel>
              <LedgerFieldText>From warehouse</LedgerFieldText>
              <LedgerSelect value={fromWarehouseId} onChange={(event) => setFromWarehouseId(event.target.value)} required>
                <option value="">Select source</option>
                {activeWarehouses.map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.code} {warehouse.name}
                  </option>
                ))}
              </LedgerSelect>
            </LedgerFieldLabel>
            <LedgerFieldLabel>
              <LedgerFieldText>To warehouse</LedgerFieldText>
              <LedgerSelect value={toWarehouseId} onChange={(event) => setToWarehouseId(event.target.value)} required>
                <option value="">Select destination</option>
                {activeWarehouses.map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.code} {warehouse.name}
                  </option>
                ))}
              </LedgerSelect>
            </LedgerFieldLabel>
            <LedgerFieldLabel>
              <LedgerFieldText>Transfer date</LedgerFieldText>
              <LedgerInput name="transferDate" type="date" required defaultValue={todayInputValue()} />
            </LedgerFieldLabel>
            <LedgerFieldLabel>
              <LedgerFieldText>Quantity</LedgerFieldText>
              <LedgerInput value={quantity} onChange={(event) => setQuantity(event.target.value)} required />
            </LedgerFieldLabel>
            <LedgerFieldLabel>
              <LedgerFieldText>Unit cost</LedgerFieldText>
              <LedgerInput name="unitCost" placeholder="Optional" />
            </LedgerFieldLabel>
            <LedgerFieldLabel className="md:col-span-2">
              <LedgerFieldText>Description</LedgerFieldText>
              <LedgerInput name="description" placeholder="Memo" />
            </LedgerFieldLabel>
            <div className="flex justify-end gap-3 md:col-span-2">
              <LedgerButton href="/inventory/transfers">Cancel</LedgerButton>
              <LedgerButton type="submit" disabled={submitting || trackedItems.length === 0 || activeWarehouses.length < 2} variant="primary">
                {submitting ? "Posting..." : "Post transfer"}
              </LedgerButton>
            </div>
          </LedgerFormSection>
        </form>
      </LedgerPageBody>
    </LedgerPage>
  );
}

export function NewWarehouseTransferGuidance() {
  return (
    <LedgerSummaryBand tone="info">
      <h2 className="text-base font-semibold text-ink">Before you post</h2>
      <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div>
          <p className="font-semibold text-ink">Source decreases</p>
          <p className="mt-1">The source warehouse quantity goes down for the selected tracked item.</p>
        </div>
        <div>
          <p className="font-semibold text-ink">Destination increases</p>
          <p className="mt-1">The destination warehouse receives the same quantity, so organization-wide quantity is unchanged.</p>
        </div>
        <div>
          <p className="font-semibold text-ink">Audit trail</p>
          <p className="mt-1">Ledger rows are kept as stock movements. If the transfer is voided later, reversal rows are added instead of deleting history.</p>
        </div>
      </div>
    </LedgerSummaryBand>
  );
}
