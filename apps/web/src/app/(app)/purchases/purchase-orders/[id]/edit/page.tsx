"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { PurchaseOrderForm } from "@/components/forms/purchase-order-form";
import { StatusMessage } from "@/components/common/status-message";
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
    <section>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Edit purchase order</h1>
          <p className="mt-1 text-sm text-steel">Draft purchase orders can be changed before approval.</p>
        </div>
        <Link href={order ? `/purchases/purchase-orders/${order.id}` : "/purchases/purchase-orders"} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          Back
        </Link>
      </div>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">Log in and select an organization to load purchase orders.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading purchase order...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
      </div>

      {order ? <PurchaseOrderForm initialOrder={order} /> : null}
    </section>
  );
}
