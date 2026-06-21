import Link from "next/link";

const packSections = [
  {
    title: "Pack contents",
    items: [
      "Accounting reports stay sourced from LedgerByte report routes.",
      "Aging, cash flow, revenue, customer, product, and P&L summaries need journal-aware review before any bundling work.",
      "Generated document records remain review targets, not write targets from this page.",
    ],
  },
  {
    title: "Generation boundary",
    items: [
      "No report pack is generated, downloaded, emailed, or archived from this planning route.",
      "No accounting calculation, posting, document mutation, export job, or background task runs here.",
      "Any future execution must be explicit, tenant scoped, permission checked, and separately reviewed.",
    ],
  },
  {
    title: "Review workflow",
    items: [
      "Use existing reports to validate source numbers before a pack design is accepted.",
      "Review generated documents separately before relying on any archived sales or purchase document.",
      "Keep report-pack approval evidence separate from provider, storage, and compliance readiness evidence.",
    ],
  },
];

export default function ReportPacksPage() {
  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand">Planning-only</p>
          <h1 className="mt-2 text-2xl font-semibold text-ink">Report packs</h1>
          <p className="mt-2 max-w-3xl text-sm text-steel">
            A read-only planning surface for future report bundles. It records the review boundaries LedgerByte needs before
            bundling existing reports into a customer-facing pack.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/reports" className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-ink shadow-panel">
            Open reports
          </Link>
          <Link href="/documents" className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-ink shadow-panel">
            Review generated documents
          </Link>
        </div>
      </div>

      <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
        Report packs are not executable in this slice. This page makes the boundary visible while the underlying reports,
        permissions, and review evidence are assessed independently.
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {packSections.map((section) => (
          <article key={section.title} className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
            <h2 className="text-base font-semibold text-ink">{section.title}</h2>
            <ul className="mt-4 space-y-3 text-sm text-steel">
              {section.items.map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}
