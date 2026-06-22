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
import { inventoryAdjustmentTypeLabel, inventoryOperationalWarning } from "@/lib/inventory";
import type { InventoryAdjustment, InventoryAdjustmentType, Item, Warehouse } from "@/lib/types";

const adjustmentTypes: InventoryAdjustmentType[] = ["INCREASE", "DECREASE"];

function todayInputValue(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function NewInventoryAdjustmentPage() {
  const router = useRouter();
  const organizationId = useActiveOrganizationId();
  const [items, setItems] = useState<Item[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
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
        if (!cancelled) {
          setItems(itemResult);
          setWarehouses(warehouseResult);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load adjustment form data.");
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

  async function createAdjustment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    const formData = new FormData(event.currentTarget);

    try {
      const adjustment = await apiRequest<InventoryAdjustment>("/inventory-adjustments", {
        method: "POST",
        body: {
          itemId: String(formData.get("itemId")),
          warehouseId: String(formData.get("warehouseId")),
          type: String(formData.get("type")) as InventoryAdjustmentType,
          adjustmentDate: String(formData.get("adjustmentDate")),
          quantity: String(formData.get("quantity")),
          unitCost: String(formData.get("unitCost") || "") || undefined,
          reason: String(formData.get("reason") || "") || undefined,
        },
      });
      router.push(`/inventory/adjustments/${adjustment.id}`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to create inventory adjustment.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <LedgerPage>
      <LedgerPageHeader
        eyebrow="Inventory"
        title="New inventory adjustment"
        description="Create a draft adjustment for reviewer approval."
        actions={<LedgerButton href="/inventory/adjustments">Back</LedgerButton>}
      />

      <LedgerSummaryBand tone="warning">{inventoryOperationalWarning()}</LedgerSummaryBand>

      <LedgerPageBody>
        {!organizationId ? <LedgerAlert tone="info">Log in and select an organization to create inventory adjustments.</LedgerAlert> : null}
        {loading ? <LedgerLoadingState title="Loading form data" /> : null}
        {error ? <LedgerAlert tone="danger">{error}</LedgerAlert> : null}
        {!loading && organizationId && trackedItems.length === 0 ? <LedgerAlert tone="info">No active inventory-tracked items are available.</LedgerAlert> : null}
        {!loading && organizationId && activeWarehouses.length === 0 ? <LedgerAlert tone="info">No active warehouses are available.</LedgerAlert> : null}

        <form onSubmit={createAdjustment}>
          <InventoryAdjustmentFormFields
            trackedItems={trackedItems}
            activeWarehouses={activeWarehouses}
            submitting={submitting}
            submitLabel={submitting ? "Saving..." : "Save draft"}
            cancelHref="/inventory/adjustments"
          />
        </form>
      </LedgerPageBody>
    </LedgerPage>
  );
}

export function InventoryAdjustmentFormFields({
  trackedItems,
  activeWarehouses,
  submitting,
  submitLabel,
  cancelHref,
  adjustment,
}: {
  trackedItems: Item[];
  activeWarehouses: Warehouse[];
  submitting: boolean;
  submitLabel: string;
  cancelHref: string;
  adjustment?: InventoryAdjustment;
}) {
  return (
    <LedgerFormSection title="Adjustment details" description="Draft adjustments do not move stock until approval.">
      <LedgerFieldLabel>
        <LedgerFieldText>Item</LedgerFieldText>
        <LedgerSelect name="itemId" required defaultValue={adjustment?.itemId}>
          {!adjustment ? <option value="">Select item</option> : null}
          {trackedItems.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}{item.sku ? ` (${item.sku})` : ""}
            </option>
          ))}
        </LedgerSelect>
      </LedgerFieldLabel>
      <LedgerFieldLabel>
        <LedgerFieldText>Warehouse</LedgerFieldText>
        <LedgerSelect name="warehouseId" required defaultValue={adjustment?.warehouseId}>
          {!adjustment ? <option value="">Select warehouse</option> : null}
          {activeWarehouses.map((warehouse) => (
            <option key={warehouse.id} value={warehouse.id}>
              {warehouse.code} {warehouse.name}
            </option>
          ))}
        </LedgerSelect>
      </LedgerFieldLabel>
      <LedgerFieldLabel>
        <LedgerFieldText>Type</LedgerFieldText>
        <LedgerSelect name="type" required defaultValue={adjustment?.type}>
          {adjustmentTypes.map((type) => (
            <option key={type} value={type}>
              {inventoryAdjustmentTypeLabel(type)}
            </option>
          ))}
        </LedgerSelect>
      </LedgerFieldLabel>
      <LedgerFieldLabel>
        <LedgerFieldText>Date</LedgerFieldText>
        <LedgerInput name="adjustmentDate" type="date" required defaultValue={adjustment ? adjustment.adjustmentDate.slice(0, 10) : todayInputValue()} />
      </LedgerFieldLabel>
      <LedgerFieldLabel>
        <LedgerFieldText>Quantity</LedgerFieldText>
        <LedgerInput name="quantity" required defaultValue={adjustment?.quantity ?? "1.0000"} />
      </LedgerFieldLabel>
      <LedgerFieldLabel>
        <LedgerFieldText>Unit cost</LedgerFieldText>
        <LedgerInput name="unitCost" defaultValue={adjustment?.unitCost ?? ""} placeholder="Optional" />
      </LedgerFieldLabel>
      <LedgerFieldLabel className="md:col-span-2">
        <LedgerFieldText>Reason</LedgerFieldText>
        <LedgerInput name="reason" defaultValue={adjustment?.reason ?? ""} placeholder="Reason or memo" />
      </LedgerFieldLabel>
      <div className="flex justify-end gap-3 md:col-span-2">
        <LedgerButton href={cancelHref}>Cancel</LedgerButton>
        <LedgerButton type="submit" disabled={submitting || trackedItems.length === 0 || activeWarehouses.length === 0} variant="primary">
          {submitLabel}
        </LedgerButton>
      </div>
    </LedgerFormSection>
  );
}
