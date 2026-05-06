"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { SalesInvoiceForm } from "@/components/forms/sales-invoice-form";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import type { SalesInvoice } from "@/lib/types";

export default function EditSalesInvoicePage() {
  const params = useParams<{ id: string }>();
  const organizationId = useActiveOrganizationId();
  const [invoice, setInvoice] = useState<SalesInvoice | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!organizationId || !params.id) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    apiRequest<SalesInvoice>(`/sales-invoices/${params.id}`)
      .then((result) => {
        if (!cancelled) {
          setInvoice(result);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load sales invoice.");
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
          <h1 className="text-2xl font-semibold text-ink">Edit sales invoice</h1>
          <p className="mt-1 text-sm text-steel">Draft invoices can be edited before finalization.</p>
        </div>
        <Link href={invoice ? `/sales/invoices/${invoice.id}` : "/sales/invoices"} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          Back
        </Link>
      </div>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">Log in and select an organization to edit invoices.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading invoice...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
      </div>

      {invoice ? <div className="mt-5"><SalesInvoiceForm initialInvoice={invoice} /></div> : null}
    </section>
  );
}
