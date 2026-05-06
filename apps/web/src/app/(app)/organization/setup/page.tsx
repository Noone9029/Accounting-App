import { OrganizationSetupForm } from "@/components/forms/organization-setup-form";

export default function OrganizationSetupPage() {
  return (
    <section>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-ink">Organization setup</h1>
        <p className="mt-1 text-sm text-steel">Creates tenant foundation data: owner role, default branch, chart of accounts, tax rates, fiscal year, and sequences.</p>
      </div>
      <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
        <OrganizationSetupForm />
      </div>
    </section>
  );
}
