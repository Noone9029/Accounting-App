"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { PurchaseDebitNoteForm } from "@/components/forms/purchase-debit-note-form";
import { LedgerAlert, LedgerPage, LedgerPageBody, LedgerPageHeader } from "@/components/ui/ledger-system";
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
    <LedgerPage>
      <LedgerPageHeader eyebrow="Purchases" title="Edit debit note" description="Only draft debit notes can be changed." />
      <LedgerPageBody>
      <div className="space-y-3">
        {loading ? <StatusMessage type="loading">Loading debit note...</StatusMessage> : null}
        {error ? <LedgerAlert tone="danger">{error}</LedgerAlert> : null}
      </div>
      {debitNote ? <PurchaseDebitNoteForm initialDebitNote={debitNote} /> : null}
      </LedgerPageBody>
    </LedgerPage>
  );
}
