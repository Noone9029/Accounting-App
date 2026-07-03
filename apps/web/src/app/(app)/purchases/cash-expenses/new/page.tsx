"use client";

import { useAppLocale } from "@/components/app-locale-provider";
import { CashExpenseForm } from "@/components/forms/cash-expense-form";

export default function NewCashExpensePage() {
  const { tc } = useAppLocale();

  return (
    <section>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-ink">{tc("Post cash expense")}</h1>
        <p className="mt-1 text-sm text-steel">{tc("Record direct paid expenses without creating accounts payable.")}</p>
      </div>
      <CashExpenseForm />
    </section>
  );
}
