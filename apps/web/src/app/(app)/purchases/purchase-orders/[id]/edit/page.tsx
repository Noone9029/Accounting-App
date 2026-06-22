"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { PurchaseOrderForm } from "@/components/forms/purchase-order-form";
import { LedgerAlert, LedgerButton, LedgerPage, LedgerPageBody, LedgerPageHeader } from "@/components/ui/ledger-system";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import type { PurchaseOrder } from "@/lib/types";

export default function EditPurchaseOrderPage() {
  const params = useParams<{ id: string }>();
  const organizationId = useActiveOrganizationId();
  const [order, setOrder] = useState<PurchaseOrder | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!organizationId || !params.id) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    apiRequest<PurchaseOrder>(`/purchase-orders/${params.id}`)
      .then((result) => {
        if (!cancelled) {
          setOrder(result);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load purchase order.");
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

  return (
    <LedgerPage>
      <LedgerPageHeader
        eyebrow="Purchases"
        title="Edit purchase order"
        description="Draft purchase orders can be changed before approval."
        actions={
          <LedgerButton href={order ? `/purchases/purchase-orders/${order.id}` : "/purchases/purchase-orders"}>
          Back
          </LedgerButton>
        }
      />

      <LedgerPageBody>
        {!organizationId ? <LedgerAlert tone="info">Log in and select an organization to load purchase orders.</LedgerAlert> : null}
        {loading ? <LedgerAlert tone="info">Loading purchase order...</LedgerAlert> : null}
        {error ? <LedgerAlert tone="danger">{error}</LedgerAlert> : null}

      {order ? <PurchaseOrderForm initialOrder={order} /> : null}
      </LedgerPageBody>
    </LedgerPage>
  );
}
