"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { StatusMessage } from "@/components/common/status-message";
import { DeliveryNoteForm } from "@/components/forms/delivery-note-form";
import { LedgerAlert, LedgerButton, LedgerPage, LedgerPageBody, LedgerPageHeader } from "@/components/ui/ledger-system";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import type { DeliveryNote } from "@/lib/types";

export default function EditDeliveryNotePage() {
  const params = useParams<{ id: string }>();
  const organizationId = useActiveOrganizationId();
  const [deliveryNote, setDeliveryNote] = useState<DeliveryNote | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!organizationId || !params.id) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    apiRequest<DeliveryNote>(`/delivery-notes/${params.id}`)
      .then((result) => {
        if (!cancelled) {
          setDeliveryNote(result);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load delivery note.");
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
        title="Edit delivery note"
        description="Draft-only delivery-note changes. Issued, delivered, cancelled, and voided notes are locked."
        actions={
          <LedgerButton href={deliveryNote ? `/sales/delivery-notes/${deliveryNote.id}` : "/sales/delivery-notes"} icon={ArrowLeft}>
          Back
          </LedgerButton>
        }
      />

      <LedgerPageBody>
        <div className="space-y-3">
        {!organizationId ? <LedgerAlert tone="info">Log in and select an organization to edit this delivery note.</LedgerAlert> : null}
        {loading ? <StatusMessage type="loading">Loading delivery note...</StatusMessage> : null}
        {error ? <LedgerAlert tone="danger">{error}</LedgerAlert> : null}
      </div>

      {deliveryNote ? (
          <DeliveryNoteForm initialDeliveryNote={deliveryNote} />
      ) : null}
      </LedgerPageBody>
    </LedgerPage>
  );
}
