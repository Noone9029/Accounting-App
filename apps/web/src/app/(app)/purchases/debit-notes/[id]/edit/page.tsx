"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { PurchaseDebitNoteForm } from "@/components/forms/purchase-debit-note-form";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import type { PurchaseDebitNote } from "@/lib/types";

export default function EditPurchaseDebitNotePage() {
  const params = useParams<{ id: string }>();
  const organizationId = useActiveOrganizationId();
  const [debitNote, setDebitNote] = useState<PurchaseDebitNote | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!organizationId || !params.id) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    apiRequest<PurchaseDebitNote>(`/purchase-debit-notes/${params.id}`)
      .then((result) => {
        if (!cancelled) {
          setDebitNote(result);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load debit note.");
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
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-ink">Edit debit note</h1>
        <p className="mt-1 text-sm text-steel">Only draft debit notes can be changed.</p>
      </div>
      <div className="space-y-3">
        {loading ? <StatusMessage type="loading">Loading debit note...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
      </div>
      {debitNote ? <PurchaseDebitNoteForm initialDebitNote={debitNote} /> : null}
    </section>
  );
}
