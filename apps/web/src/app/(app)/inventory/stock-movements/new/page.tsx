"use client";

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
import { inventoryOperationalWarning, stockMovementTypeLabel } from "@/lib/inventory";
import type { Item, StockMovement, StockMovementType, Warehouse } from "@/lib/types";

const movementTypes: StockMovementType[] = ["OPENING_BALANCE"];

function todayInputValue(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function NewStockMovementPage() {
  const organizationId = useActiveOrganizationId();
  const [items, setItems] = useState<Item[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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
          setError(loadError instanceof Error ? loadError.message : "Unable to load movement form data.");
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

  async function createMovement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setSubmitting(true);
    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      const created = await apiRequest<StockMovement>("/stock-movements", {
        method: "POST",
        body: {
          itemId: String(formData.get("itemId")),
          warehouseId: String(formData.get("warehouseId")),
          movementDate: String(formData.get("movementDate")),
          type: String(formData.get("type")) as StockMovementType,
          quantity: String(formData.get("quantity")),
          unitCost: String(formData.get("unitCost") || "") || undefined,
          description: String(formData.get("description") || "") || undefined,
        },
      });
      setSuccess(`Created stock movement ${stockMovementTypeLabel(created.type)}.`);
      form.reset();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Unable to create stock movement.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <LedgerPage>
      <LedgerPageHeader
        eyebrow="Inventory"
        title="New stock movement"
        description="Create a manual opening balance for a tracked item."
        actions={<LedgerButton href="/inventory/stock-movements">Back</LedgerButton>}
      />

      <LedgerSummaryBand tone="warning">{inventoryOperationalWarning()}</LedgerSummaryBand>

      <LedgerPageBody>
        {!organizationId ? <LedgerAlert tone="info">Log in and select an organization to create stock movements.</LedgerAlert> : null}
        {loading ? <LedgerLoadingState title="Loading form data" /> : null}
        {error ? <LedgerAlert tone="danger">{error}</LedgerAlert> : null}
        {success ? <LedgerAlert tone="success">{success}</LedgerAlert> : null}
        {!loading && organizationId && trackedItems.length === 0 ? <LedgerAlert tone="info">No active inventory-tracked items are available.</LedgerAlert> : null}
        {!loading && organizationId && activeWarehouses.length === 0 ? <LedgerAlert tone="info">No active warehouses are available.</LedgerAlert> : null}

        <form onSubmit={createMovement}>
          <LedgerFormSection title="Opening balance movement" description="Opening balance rows are explicit operational stock movements.">
            <LedgerFieldLabel>
              <LedgerFieldText>Item</LedgerFieldText>
              <LedgerSelect name="itemId" required>
                <option value="">Select item</option>
                {trackedItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}{item.sku ? ` (${item.sku})` : ""}
                  </option>
                ))}
              </LedgerSelect>
            </LedgerFieldLabel>
            <LedgerFieldLabel>
              <LedgerFieldText>Warehouse</LedgerFieldText>
              <LedgerSelect name="warehouseId" required>
                <option value="">Select warehouse</option>
                {activeWarehouses.map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.code} {warehouse.name}
                  </option>
                ))}
              </LedgerSelect>
            </LedgerFieldLabel>
            <LedgerFieldLabel>
              <LedgerFieldText>Type</LedgerFieldText>
              <LedgerSelect name="type" required>
                {movementTypes.map((type) => (
                  <option key={type} value={type}>
                    {stockMovementTypeLabel(type)}
                  </option>
                ))}
              </LedgerSelect>
            </LedgerFieldLabel>
            <LedgerFieldLabel>
              <LedgerFieldText>Date</LedgerFieldText>
              <LedgerInput name="movementDate" type="date" required defaultValue={todayInputValue()} />
            </LedgerFieldLabel>
            <LedgerFieldLabel>
              <LedgerFieldText>Quantity</LedgerFieldText>
              <LedgerInput name="quantity" required defaultValue="1.0000" />
            </LedgerFieldLabel>
            <LedgerFieldLabel>
              <LedgerFieldText>Unit cost</LedgerFieldText>
              <LedgerInput name="unitCost" placeholder="Optional" />
            </LedgerFieldLabel>
            <LedgerFieldLabel className="md:col-span-2">
              <LedgerFieldText>Description</LedgerFieldText>
              <LedgerInput name="description" placeholder="Reason or memo" />
            </LedgerFieldLabel>
            <div className="flex items-end">
              <LedgerButton type="submit" disabled={submitting || trackedItems.length === 0 || activeWarehouses.length === 0} variant="primary">
                {submitting ? "Creating..." : "Create movement"}
              </LedgerButton>
            </div>
          </LedgerFormSection>
        </form>
      </LedgerPageBody>
    </LedgerPage>
  );
}
