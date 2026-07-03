"use client";

import { useAppLocale } from "@/components/app-locale-provider";
import { PurchaseReturnForm } from "@/components/forms/purchase-return-form";

export default function NewPurchaseReturnPage() {
  const { tc } = useAppLocale();

  return (
    <section>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-ink">{tc("Create purchase return")}</h1>
        <p className="mt-1 text-sm text-steel">{tc("Save a non-posting operational return document for supplier review.")}</p>
      </div>
      <PurchaseReturnForm />
    </section>
  );
}
