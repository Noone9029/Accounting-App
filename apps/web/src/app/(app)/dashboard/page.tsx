const metrics = [
  { label: "Cash", value: "SAR 0.00" },
  { label: "Receivables", value: "SAR 0.00" },
  { label: "Payables", value: "SAR 0.00" },
  { label: "VAT position", value: "SAR 0.00" },
];

export default function DashboardPage() {
  return (
    <section>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-ink">Dashboard</h1>
        <p className="mt-1 text-sm text-steel">Accounting overview placeholder for ledger-backed metrics.</p>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {metrics.map((metric) => (
          <div key={metric.label} className="rounded-md border border-slate-200 bg-white p-4 shadow-panel">
            <div className="text-xs font-medium uppercase tracking-wide text-steel">{metric.label}</div>
            <div className="mt-2 text-xl font-semibold text-ink">{metric.value}</div>
          </div>
        ))}
      </div>
      <div className="mt-6 rounded-md border border-slate-200 bg-white p-5 shadow-panel">
        <h2 className="text-base font-semibold text-ink">Foundation status</h2>
        <div className="mt-4 grid grid-cols-1 gap-3 text-sm text-slate-700 md:grid-cols-3">
          <div className="rounded-md bg-mist px-3 py-2">Double-entry engine scaffolded</div>
          <div className="rounded-md bg-mist px-3 py-2">Tenant isolation via organization context</div>
          <div className="rounded-md bg-mist px-3 py-2">ZATCA package boundary reserved</div>
        </div>
      </div>
    </section>
  );
}
