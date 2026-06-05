"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { DeliveryNoteForm } from "@/components/forms/delivery-note-form";
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
    <section>
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Edit delivery note</h1>
          <p className="mt-1 text-sm text-steel">Draft-only delivery-note changes. Issued, delivered, cancelled, and voided notes are locked.</p>
        </div>
        <Link href={deliveryNote ? `/sales/delivery-notes/${deliveryNote.id}` : "/sales/delivery-notes"} className="self-start rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          Back
        </Link>
      </div>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">Log in and select an organization to edit this delivery note.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading delivery note...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
      </div>

      {deliveryNote ? (
        <div className="mt-5">
          <DeliveryNoteForm initialDeliveryNote={deliveryNote} />
        </div>
      ) : null}
    </section>
  );
}
