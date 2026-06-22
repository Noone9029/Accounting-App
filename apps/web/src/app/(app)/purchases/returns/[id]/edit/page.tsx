"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { PurchaseReturnForm } from "@/components/forms/purchase-return-form";
import { LedgerAlert, LedgerLoadingState, LedgerPage, LedgerPageBody, LedgerPageHeader } from "@/components/ui/ledger-system";
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
    <LedgerPage>
      <LedgerPageHeader
        eyebrow="Purchases"
        title="Edit purchase return"
        description="Draft purchase returns can be edited before submission."
      />
      <LedgerPageBody>
        {loading ? <LedgerLoadingState title="Loading purchase return" description="Fetching the saved return before opening the editable form." /> : null}
        {error ? <LedgerAlert tone="danger">{error}</LedgerAlert> : null}
        {purchaseReturn ? <PurchaseReturnForm initialReturn={purchaseReturn} /> : null}
      </LedgerPageBody>
    </LedgerPage>
  );
}
