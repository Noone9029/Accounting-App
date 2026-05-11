"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { CreditNoteForm } from "@/components/forms/credit-note-form";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import type { CreditNote } from "@/lib/types";

export default function EditCreditNotePage() {
  const params = useParams<{ id: string }>();
  const organizationId = useActiveOrganizationId();
  const [creditNote, setCreditNote] = useState<CreditNote | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!organizationId || !params.id) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    apiRequest<CreditNote>(`/credit-notes/${params.id}`)
      .then((result) => {
        if (!cancelled) {
          setCreditNote(result);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load credit note.");
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
          <h1 className="text-2xl font-semibold text-ink">Edit credit note</h1>
          <p className="mt-1 text-sm text-steel">Draft credit notes can be edited before finalization.</p>
        </div>
        <Link href={creditNote ? `/sales/credit-notes/${creditNote.id}` : "/sales/credit-notes"} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          Back
        </Link>
      </div>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">Log in and select an organization to edit credit notes.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading credit note...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
      </div>

      {creditNote ? <div className="mt-5"><CreditNoteForm initialCreditNote={creditNote} /></div> : null}
    </section>
  );
}
