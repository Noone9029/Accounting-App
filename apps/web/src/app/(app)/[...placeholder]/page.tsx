const titleMap: Record<string, string> = {
  "get-started": "Get started",
  inbox: "Inbox",
  reports: "Reports",
  sales: "Sales",
  "sales/quotes": "Quotes & Proformas",
  "sales/invoices": "Invoices",
  "sales/customer-payments": "Customer payments",
  "sales/credit-notes": "Credit notes",
  "sales/cash-invoices": "Cash invoices",
  "sales/delivery-notes": "Delivery notes",
  "sales/api-invoices": "API invoices",
  purchases: "Purchases",
  "purchases/bills": "Bills",
  "purchases/supplier-payments": "Supplier payments",
  "purchases/cash-expenses": "Cash expenses",
  "purchases/debit-notes": "Debit notes",
  "purchases/purchase-orders": "Purchase orders",
  beneficiaries: "Beneficiaries",
  payroll: "Payroll & Employees",
  products: "Products & Services",
  accounting: "For accountants",
  "bank-accounts": "Bank accounts",
  "fixed-assets": "Fixed assets",
  "cost-centers": "Cost Centers",
  projects: "Projects",
  branches: "Branches",
  developer: "Developer",
  "developer/api-keys": "API keys",
  integrations: "Integrations",
  "document-templates": "Document templates",
};

export default async function PlaceholderPage({ params }: { params: Promise<{ placeholder: string[] }> }) {
  const { placeholder } = await params;
  const key = placeholder.join("/");
  const title = titleMap[key] ?? "Module";

  return (
    <section>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-ink">{title}</h1>
        <p className="mt-1 text-sm text-steel">Planned module route scaffold. This page does not provide working module actions yet.</p>
      </div>
      <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
        <div className="text-sm font-medium text-ink">Module not implemented yet</div>
        <p className="mt-1 text-sm text-steel">The route scaffold is in place for future build-out. No live integration, payroll, bank-feed, billing, ZATCA, email, posting, or production workflow runs from this placeholder.</p>
      </div>
    </section>
  );
}
