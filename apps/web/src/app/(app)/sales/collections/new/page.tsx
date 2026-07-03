"use client";

import { useAppLocale } from "@/components/app-locale-provider";
import { CollectionCaseForm } from "@/components/forms/collection-case-form";

export default function NewCollectionCasePage() {
  const { tc } = useAppLocale();

  return (
    <section>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-ink">{tc("New collection case")}</h1>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-steel">
          {tc("Track Sales/AR follow-up work against a customer or outstanding invoice without posting accounting or sending payment/email actions.")}
        </p>
      </div>
      <CollectionCaseForm />
    </section>
  );
}
