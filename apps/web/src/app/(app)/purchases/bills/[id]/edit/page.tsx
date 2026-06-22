"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { PurchaseBillForm } from "@/components/forms/purchase-bill-form";
import { LedgerAlert, LedgerPage, LedgerPageBody, LedgerPageHeader } from "@/components/ui/ledger-system";
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
    <LedgerPage>
      <LedgerPageHeader eyebrow="Purchases" title="Edit purchase bill" description="Only draft bills can be changed." />
      <LedgerPageBody>
      <div className="space-y-3">
        {loading ? <StatusMessage type="loading">Loading purchase bill...</StatusMessage> : null}
        {error ? <LedgerAlert tone="danger">{error}</LedgerAlert> : null}
      </div>
      {bill ? <PurchaseBillForm initialBill={bill} /> : null}
      </LedgerPageBody>
    </LedgerPage>
  );
}
