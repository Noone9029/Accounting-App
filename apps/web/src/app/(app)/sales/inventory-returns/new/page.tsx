"use client";

import Link from "next/link";
import { useAppLocale } from "@/components/app-locale-provider";
import { SalesInventoryReturnForm } from "@/components/forms/sales-inventory-return-form";

export default function NewSalesInventoryReturnPage() {
  const { tc } = useAppLocale();

  return (
    <section>
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">{tc("New sales inventory return")}</h1>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-steel">{tc("Record customer-returned stock as an operational document. Stock movement is posted later through the explicit action.")}</p>
        </div>
        <Link href="/sales/inventory-returns" className="self-start rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          {tc("Back")}
        </Link>
      </div>
      <SalesInventoryReturnForm />
    </section>
  );
}
