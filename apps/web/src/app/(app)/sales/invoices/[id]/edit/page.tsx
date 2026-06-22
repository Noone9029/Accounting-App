"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { SalesInvoiceForm } from "@/components/forms/sales-invoice-form";
import { LedgerButton, LedgerPage, LedgerPageBody, LedgerPageHeader } from "@/components/ui/ledger-system";
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
    <LedgerPage>
      <LedgerPageHeader
        eyebrow="Sales invoice"
        title="Edit sales invoice"
        description="Draft invoices can be edited before finalization."
        actions={<LedgerButton href={invoice ? `/sales/invoices/${invoice.id}` : "/sales/invoices"}>Back</LedgerButton>}
      />

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">Log in and select an organization to edit invoices.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading invoice...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
      </div>

      {invoice ? (
        <LedgerPageBody>
          <SalesInvoiceForm initialInvoice={invoice} />
        </LedgerPageBody>
      ) : null}
    </LedgerPage>
  );
}
