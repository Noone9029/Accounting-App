"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { SalesInventoryReturnForm } from "@/components/forms/sales-inventory-return-form";
import { StatusMessage } from "@/components/common/status-message";
import {
  LedgerAlert,
  LedgerButton,
  LedgerPage,
  LedgerPageBody,
  LedgerPageHeader,
} from "@/components/ui/ledger-system";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import type { SalesInventoryReturn } from "@/lib/types";

export default function EditSalesInventoryReturnPage() {
  const params = useParams<{ id: string }>();
  const organizationId = useActiveOrganizationId();
  const [salesReturn, setSalesReturn] = useState<SalesInventoryReturn | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!organizationId || !params.id) return;
    let cancelled = false;
    setLoading(true);
    setError("");

    apiRequest<SalesInventoryReturn>(`/sales-inventory-returns/${params.id}`)
      .then((result) => {
        if (!cancelled) setSalesReturn(result);
      })
      .catch((loadError: unknown) => {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Unable to load sales inventory return.");
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
        eyebrow="Sales inventory"
        title="Edit sales inventory return"
        description="Only draft customer stock returns can be edited."
        actions={
          <LedgerButton href={salesReturn ? `/sales/inventory-returns/${salesReturn.id}` : "/sales/inventory-returns"} icon={ArrowLeft}>
            Back
          </LedgerButton>
        }
      />

      <LedgerPageBody>
        {!organizationId ? <LedgerAlert tone="info">Log in and select an organization to edit this return.</LedgerAlert> : null}
        {loading ? <StatusMessage type="loading">Loading sales inventory return...</StatusMessage> : null}
        {error ? <LedgerAlert tone="danger">{error}</LedgerAlert> : null}
        {salesReturn ? <SalesInventoryReturnForm initialSalesInventoryReturn={salesReturn} /> : null}
      </LedgerPageBody>
    </LedgerPage>
  );
}
