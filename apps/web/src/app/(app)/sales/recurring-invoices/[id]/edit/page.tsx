"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { RecurringInvoiceForm } from "@/components/forms/recurring-invoice-form";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import type { RecurringInvoiceTemplate } from "@/lib/types";

export default function EditRecurringInvoicePage() {
  const params = useParams<{ id: string }>();
  const organizationId = useActiveOrganizationId();
  const [template, setTemplate] = useState<RecurringInvoiceTemplate | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!organizationId || !params.id) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    apiRequest<RecurringInvoiceTemplate>(`/recurring-invoices/${params.id}`)
      .then((result) => {
        if (!cancelled) {
          setTemplate(result);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load recurring invoice template.");
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
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Edit recurring invoice template</h1>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-steel">Update draft recurring details before activation.</p>
        </div>
        <Link href={template ? `/sales/recurring-invoices/${template.id}` : "/sales/recurring-invoices"} className="self-start rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          Back to template
        </Link>
      </div>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">Log in and select an organization to edit this recurring invoice template.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading recurring invoice template...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
      </div>

      {template ? (
        <div className="mt-5">
          <RecurringInvoiceForm initialTemplate={template} />
        </div>
      ) : null}
    </section>
  );
}
