"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { SalesQuoteForm } from "@/components/forms/sales-quote-form";
import { LedgerButton, LedgerPage, LedgerPageBody, LedgerPageHeader } from "@/components/ui/ledger-system";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import type { SalesQuote } from "@/lib/types";

export default function EditSalesQuotePage() {
  const params = useParams<{ id: string }>();
  const organizationId = useActiveOrganizationId();
  const [quote, setQuote] = useState<SalesQuote | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!organizationId || !params.id) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    apiRequest<SalesQuote>(`/sales-quotes/${params.id}`)
      .then((result) => {
        if (!cancelled) {
          setQuote(result);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load sales quote.");
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
        eyebrow="Sales quote"
        title="Edit sales quote"
        description="Update draft quote details before sharing it or marking it sent for tracking."
        actions={<LedgerButton href={quote ? `/sales/quotes/${quote.id}` : "/sales/quotes"}>Back to quote</LedgerButton>}
      />

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">Log in and select an organization to edit this sales quote.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading sales quote...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
      </div>

      {quote ? (
        <LedgerPageBody>
          <SalesQuoteForm initialQuote={quote} />
        </LedgerPageBody>
      ) : null}
    </LedgerPage>
  );
}
