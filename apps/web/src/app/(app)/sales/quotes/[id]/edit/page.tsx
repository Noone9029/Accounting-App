"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { SalesQuoteForm } from "@/components/forms/sales-quote-form";
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
    <section>
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Edit sales quote</h1>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-steel">Update draft quote details before sharing it or marking it sent for tracking.</p>
        </div>
        <Link href={quote ? `/sales/quotes/${quote.id}` : "/sales/quotes"} className="self-start rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          Back to quote
        </Link>
      </div>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">Log in and select an organization to edit this sales quote.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading sales quote...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
      </div>

      {quote ? (
        <div className="mt-5">
          <SalesQuoteForm initialQuote={quote} />
        </div>
      ) : null}
    </section>
  );
}
