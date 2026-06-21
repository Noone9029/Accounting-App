"use client";

import { ArrowLeft } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { CreditNoteForm } from "@/components/forms/credit-note-form";
import { LedgerButton, LedgerPage, LedgerPageBody, LedgerPageHeader } from "@/components/ui/ledger-system";
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
    <LedgerPage>
      <LedgerPageHeader
        eyebrow="Sales"
        title="Edit credit note"
        description="Draft credit notes can be edited before finalization."
        actions={
          <LedgerButton href={creditNote ? `/sales/credit-notes/${creditNote.id}` : "/sales/credit-notes"} icon={ArrowLeft}>
            Back
          </LedgerButton>
        }
      />

      <LedgerPageBody>
        <div className="space-y-3">
          {!organizationId ? <StatusMessage type="info">Log in and select an organization to edit credit notes.</StatusMessage> : null}
          {loading ? <StatusMessage type="loading">Loading credit note...</StatusMessage> : null}
          {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        </div>

        {creditNote ? <CreditNoteForm initialCreditNote={creditNote} /> : null}
      </LedgerPageBody>
    </LedgerPage>
  );
}
