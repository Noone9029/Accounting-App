import Link from "next/link";
import { BankAccountProfileForm } from "@/components/forms/bank-account-profile-form";

export default function NewBankAccountPage() {
  return (
    <section>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Link bank account</h1>
          <p className="mt-1 text-sm text-steel">Create a cash/bank profile for an existing posting asset account.</p>
        </div>
        <Link href="/bank-accounts" className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          Back
        </Link>
      </div>

      <BankAccountProfileForm />
    </section>
  );
}
