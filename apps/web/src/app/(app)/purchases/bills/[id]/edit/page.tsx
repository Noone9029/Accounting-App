"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { PurchaseBillForm } from "@/components/forms/purchase-bill-form";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import type { PurchaseBill } from "@/lib/types";

export default function EditPurchaseBillPage() {
  const params = useParams<{ id: string }>();
  const organizationId = useActiveOrganizationId();
  const [bill, setBill] = useState<PurchaseBill | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!organizationId || !params.id) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    apiRequest<PurchaseBill>(`/purchase-bills/${params.id}`)
      .then((result) => {
        if (!cancelled) {
          setBill(result);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load purchase bill.");
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
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-ink">Edit purchase bill</h1>
        <p className="mt-1 text-sm text-steel">Only draft bills can be changed.</p>
      </div>
      <div className="space-y-3">
        {loading ? <StatusMessage type="loading">Loading purchase bill...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
      </div>
      {bill ? <PurchaseBillForm initialBill={bill} /> : null}
    </section>
  );
}
