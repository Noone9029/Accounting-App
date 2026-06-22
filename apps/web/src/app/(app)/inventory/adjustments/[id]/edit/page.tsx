"use client";

import { useParams, useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import {
  LedgerAlert,
  LedgerButton,
  LedgerLoadingState,
  LedgerPage,
  LedgerPageBody,
  LedgerPageHeader,
  LedgerSummaryBand,
} from "@/components/ui/ledger-system";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { inventoryOperationalWarning } from "@/lib/inventory";
import type { InventoryAdjustment, InventoryAdjustmentType, Item, Warehouse } from "@/lib/types";
import { InventoryAdjustmentFormFields } from "../../new/page";

export default function EditInventoryAdjustmentPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const organizationId = useActiveOrganizationId();
  const [adjustment, setAdjustment] = useState<InventoryAdjustment | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const trackedItems = items.filter((item) => item.inventoryTracking && item.status === "ACTIVE");
  const activeWarehouses = warehouses.filter((warehouse) => warehouse.status === "ACTIVE");

  useEffect(() => {
    if (!organizationId || !params.id) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    Promise.all([
      apiRequest<InventoryAdjustment>(`/inventory-adjustments/${params.id}`),
      apiRequest<Item[]>("/items"),
      apiRequest<Warehouse[]>("/warehouses"),
    ])
      .then(([adjustmentResult, itemResult, warehouseResult]) => {
        if (!cancelled) {
          setAdjustment(adjustmentResult);
          setItems(itemResult);
          setWarehouses(warehouseResult);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load inventory adjustment.");
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
  }, [organizationId, params.id]);

  async function updateAdjustment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!adjustment) {
      return;
    }
    setError("");
    setSubmitting(true);
    const formData = new FormData(event.currentTarget);

    try {
      const updated = await apiRequest<InventoryAdjustment>(`/inventory-adjustments/${adjustment.id}`, {
        method: "PATCH",
        body: {
          itemId: String(formData.get("itemId")),
          warehouseId: String(formData.get("warehouseId")),
          type: String(formData.get("type")) as InventoryAdjustmentType,
          adjustmentDate: String(formData.get("adjustmentDate")),
          quantity: String(formData.get("quantity")),
          unitCost: String(formData.get("unitCost") || "") || null,
          reason: String(formData.get("reason") || "") || null,
        },
      });
      router.push(`/inventory/adjustments/${updated.id}`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to update inventory adjustment.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <LedgerPage>
      <LedgerPageHeader
        eyebrow="Inventory"
        title="Edit inventory adjustment"
        description="Draft adjustments can be edited before approval."
        actions={<LedgerButton href={adjustment ? `/inventory/adjustments/${adjustment.id}` : "/inventory/adjustments"}>Back</LedgerButton>}
      />

      <LedgerSummaryBand tone="warning">{inventoryOperationalWarning()}</LedgerSummaryBand>

      <LedgerPageBody>
        {!organizationId ? <LedgerAlert tone="info">Log in and select an organization to edit inventory adjustments.</LedgerAlert> : null}
        {loading ? <LedgerLoadingState title="Loading inventory adjustment" /> : null}
        {error ? <LedgerAlert tone="danger">{error}</LedgerAlert> : null}
        {adjustment && adjustment.status !== "DRAFT" ? <LedgerAlert tone="danger">Only draft inventory adjustments can be edited.</LedgerAlert> : null}

        {adjustment && adjustment.status === "DRAFT" ? (
          <form onSubmit={updateAdjustment}>
            <InventoryAdjustmentFormFields
              trackedItems={trackedItems}
              activeWarehouses={activeWarehouses}
              submitting={submitting}
              submitLabel={submitting ? "Saving..." : "Save"}
              cancelHref={`/inventory/adjustments/${adjustment.id}`}
              adjustment={adjustment}
            />
          </form>
        ) : null}
      </LedgerPageBody>
    </LedgerPage>
  );
}
