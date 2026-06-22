"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { StatusMessage } from "@/components/common/status-message";
import { CollectionCaseForm } from "@/components/forms/collection-case-form";
import {
  LedgerAlert,
  LedgerButton,
  LedgerPage,
  LedgerPageBody,
  LedgerPageHeader,
} from "@/components/ui/ledger-system";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import type { CollectionCase } from "@/lib/types";

export default function EditCollectionCasePage() {
  const params = useParams<{ id: string }>();
  const organizationId = useActiveOrganizationId();
  const [collectionCase, setCollectionCase] = useState<CollectionCase | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!organizationId || !params.id) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    apiRequest<CollectionCase>(`/collections/${params.id}`)
      .then((result) => {
        if (!cancelled) {
          setCollectionCase(result);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load collection case.");
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
        eyebrow="Sales collections"
        title="Edit collection case"
        description="Update collection follow-up metadata without changing invoice balances, payment allocations, VAT, ZATCA, or email state."
        actions={
          <LedgerButton href={collectionCase ? `/sales/collections/${collectionCase.id}` : "/sales/collections"} icon={ArrowLeft}>
            Back
          </LedgerButton>
        }
      />

      <LedgerPageBody>
        <div className="space-y-3">
          {!organizationId ? <LedgerAlert tone="info">Log in and select an organization to edit this collection case.</LedgerAlert> : null}
          {loading ? <StatusMessage type="loading">Loading collection case...</StatusMessage> : null}
          {error ? <LedgerAlert tone="danger">{error}</LedgerAlert> : null}
        </div>

        {collectionCase ? <CollectionCaseForm initialCase={collectionCase} /> : null}
      </LedgerPageBody>
    </LedgerPage>
  );
}
