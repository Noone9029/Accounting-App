"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { StatusMessage } from "@/components/common/status-message";
import { RecurringInvoiceForm } from "@/components/forms/recurring-invoice-form";
import { LedgerAlert, LedgerButton, LedgerPage, LedgerPageBody, LedgerPageHeader } from "@/components/ui/ledger-system";
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
    <LedgerPage>
      <LedgerPageHeader
        eyebrow="Sales"
        title="Edit recurring invoice template"
        description="Update draft recurring details before activation."
        actions={
          <LedgerButton href={template ? `/sales/recurring-invoices/${template.id}` : "/sales/recurring-invoices"} icon={ArrowLeft}>
            Back to template
          </LedgerButton>
        }
      />

      <LedgerPageBody>
        <div className="space-y-3">
          {!organizationId ? <LedgerAlert tone="info">Log in and select an organization to edit this recurring invoice template.</LedgerAlert> : null}
          {loading ? <StatusMessage type="loading">Loading recurring invoice template...</StatusMessage> : null}
          {error ? <LedgerAlert tone="danger">{error}</LedgerAlert> : null}
        </div>

        {template ? (
          <RecurringInvoiceForm initialTemplate={template} />
        ) : null}
      </LedgerPageBody>
    </LedgerPage>
  );
}
