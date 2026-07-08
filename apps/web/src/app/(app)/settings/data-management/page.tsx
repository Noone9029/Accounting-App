import Link from "next/link";

const readinessSections = [
  {
    title: "Export readiness",
    status: "Planning only",
    body: "Inventory the datasets, filters, redaction rules, and audit events needed before a tenant data export can be exposed.",
    items: [
      "Scope exports by active organization and user permissions.",
      "Separate metadata manifests from document bodies and attachment bodies.",
      "Record export requests and downloads in audit logs before adding execution controls.",
    ],
  },
  {
    title: "Import readiness",
    status: "Not executable",
    body: "Plan import validation before any customer data can be written. No import parser, write path, or schema migration runs from this page.",
    items: [
      "Require dry-run validation and row-level error reporting before writes.",
      "Map contacts, items, opening balances, and documents to LedgerByte-owned schemas only.",
      "Keep fiscal locks, tenant boundaries, and audit attribution as hard requirements.",
    ],
  },
  {
    title: "Backup and restore boundaries",
    status: "Evidence required",
    body: "No backup or restore action is available here. Use the existing storage readiness surfaces for current proof gaps and evidence status.",
    items: [
      "Treat backup evidence as metadata until a verified non-production run is approved.",
      "Do not switch document storage providers from this route.",
      "Do not claim restore readiness without current restore-drill evidence.",
    ],
  },
];

const relatedLinks = [
  { href: "/settings/storage", label: "Storage readiness", description: "Review storage, backup, restore, and migration readiness evidence." },
  { href: "/documents", label: "Generated documents", description: "Review generated document archive metadata and download controls." },
  { href: "/settings/audit-logs", label: "Audit logs", description: "Review audit trails for settings, document, and data operations." },
];

export default function DataManagementSettingsPage() {
  return (
    <section>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-ink">Data management</h1>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-steel">
          A metadata-only planning view for tenant data export, import validation, backup evidence, and restore readiness. No export job is started from this page, and no customer data is imported, rewritten, uploaded, deleted, or restored here.
        </p>
      </div>

      <div className="mb-5 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900 shadow-panel">
        <div className="font-semibold text-ink">Execution boundary</div>
        <p className="mt-1">
          This settings page is read-only. It does not run imports, create exports, execute backups, restore data, change storage providers, rewrite generated documents, send files, or mutate hosted systems.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {readinessSections.map((section) => (
          <section key={section.title} className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-base font-semibold text-ink">{section.title}</h2>
              <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">{section.status}</span>
            </div>
            <p className="mt-3 text-sm leading-6 text-steel">{section.body}</p>
            <ul className="mt-4 space-y-2 text-sm leading-6 text-steel">
              {section.items.map((item) => (
                <li key={item} className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                  {item}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <section className="mt-5 rounded-md border border-slate-200 bg-white p-5 shadow-panel">
        <h2 className="text-base font-semibold text-ink">Existing evidence surfaces</h2>
        <p className="mt-1 text-sm leading-6 text-steel">
          Use these routes to inspect the current document, storage, and audit state before any later data-management implementation work.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          {relatedLinks.map((link) => (
            <Link key={link.href} href={link.href} aria-label={link.label} className="rounded-md border border-slate-200 px-4 py-3 text-sm hover:border-palm">
              <span className="block font-semibold text-ink">{link.label}</span>
              <span className="mt-1 block leading-5 text-steel">{link.description}</span>
            </Link>
          ))}
        </div>
      </section>
    </section>
  );
}
