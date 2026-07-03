"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useAppLocale } from "@/components/app-locale-provider";
import { StatusMessage } from "@/components/common/status-message";
import { CollectionCaseForm } from "@/components/forms/collection-case-form";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import type { CollectionCase } from "@/lib/types";

export default function EditCollectionCasePage() {
  const params = useParams<{ id: string }>();
  const organizationId = useActiveOrganizationId();
  const { tc } = useAppLocale();
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
          setError(loadError instanceof Error ? loadError.message : tc("Unable to load collection case."));
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
  }, [organizationId, params.id, tc]);

  return (
    <section>
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">{tc("Edit collection case")}</h1>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-steel">
            {tc("Update collection follow-up metadata without changing invoice balances, payment allocations, VAT, ZATCA, or email state.")}
          </p>
        </div>
        <Link href={collectionCase ? `/sales/collections/${collectionCase.id}` : "/sales/collections"} className="self-start rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          {tc("Back")}
        </Link>
      </div>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">{tc("Log in and select an organization to edit this collection case.")}</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">{tc("Loading collection case...")}</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
      </div>

      {collectionCase ? <CollectionCaseForm initialCase={collectionCase} /> : null}
    </section>
  );
}
