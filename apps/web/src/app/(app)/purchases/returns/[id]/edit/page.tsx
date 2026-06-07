"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { PurchaseReturnForm } from "@/components/forms/purchase-return-form";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import type { PurchaseReturn } from "@/lib/types";

export default function EditPurchaseReturnPage() {
  const params = useParams<{ id: string }>();
  const organizationId = useActiveOrganizationId();
  const [purchaseReturn, setPurchaseReturn] = useState<PurchaseReturn | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!organizationId || !params.id) return;
    let cancelled = false;
    setLoading(true);
    setError("");

    apiRequest<PurchaseReturn>(`/purchase-returns/${params.id}`)
      .then((result) => {
        if (!cancelled) setPurchaseReturn(result);
      })
      .catch((loadError) => {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Unable to load purchase return.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [organizationId, params.id]);

  return (
    <section>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-ink">Edit purchase return</h1>
        <p className="mt-1 text-sm text-steel">Draft purchase returns can be edited before submission.</p>
      </div>
      {loading ? <StatusMessage type="loading">Loading purchase return...</StatusMessage> : null}
      {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
      {purchaseReturn ? <PurchaseReturnForm initialReturn={purchaseReturn} /> : null}
    </section>
  );
}
