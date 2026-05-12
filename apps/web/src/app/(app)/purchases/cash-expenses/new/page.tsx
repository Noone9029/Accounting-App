import { CashExpenseForm } from "@/components/forms/cash-expense-form";

export default function NewCashExpensePage() {
  return (
    <section>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-ink">Post cash expense</h1>
        <p className="mt-1 text-sm text-steel">Record direct paid expenses without creating accounts payable.</p>
      </div>
      <CashExpenseForm />
    </section>
  );
}
