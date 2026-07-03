"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useAppLocale } from "@/components/app-locale-provider";
import { SalesInventoryReturnForm } from "@/components/forms/sales-inventory-return-form";
import { StatusMessage } from "@/components/common/status-message";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import type { SalesInventoryReturn } from "@/lib/types";

export default function EditSalesInventoryReturnPage() {
  const params = useParams<{ id: string }>();
  const organizationId = useActiveOrganizationId();
  const { tc } = useAppLocale();
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
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : tc("Unable to load sales inventory return."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [organizationId, params.id, tc]);

  return (
    <section>
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">{tc("Edit sales inventory return")}</h1>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-steel">{tc("Only draft customer stock returns can be edited.")}</p>
        </div>
        <Link href={salesReturn ? `/sales/inventory-returns/${salesReturn.id}` : "/sales/inventory-returns"} className="self-start rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          {tc("Back")}
        </Link>
      </div>

      {!organizationId ? <StatusMessage type="info">{tc("Log in and select an organization to edit this return.")}</StatusMessage> : null}
      {loading ? <StatusMessage type="loading">{tc("Loading sales inventory return...")}</StatusMessage> : null}
      {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
      {salesReturn ? <SalesInventoryReturnForm initialSalesInventoryReturn={salesReturn} /> : null}
    </section>
  );
}
