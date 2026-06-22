import { ArrowRight, CircleDashed, ShieldAlert } from "lucide-react";
import {
  LedgerButton,
  LedgerMetadataRow,
  LedgerPage,
  LedgerPageBody,
  LedgerPageHeader,
  LedgerPanel,
  LedgerStatusBadge,
  LedgerSummaryBand,
} from "@/components/ui/ledger-system";

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
    <LedgerPage>
      <LedgerPageHeader
        eyebrow="Planned route"
        title={title}
        badge={<LedgerStatusBadge tone="draft">Placeholder</LedgerStatusBadge>}
        description="Planned module route scaffold. This page does not provide working module actions yet."
        actions={<LedgerButton href="/dashboard" icon={ArrowRight}>Back to dashboard</LedgerButton>}
      />
      <LedgerPageBody>
        <LedgerSummaryBand tone="warning">
          The route scaffold is in place for future build-out. No live integration, payroll, bank-feed, billing, ZATCA,
          email, posting, or production workflow runs from this placeholder.
        </LedgerSummaryBand>

        <LedgerPanel>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-sm font-semibold text-ink">
                <CircleDashed className="h-4 w-4 text-steel" aria-hidden="true" />
                Module not implemented yet
              </div>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-steel">
                This authenticated app-shell route is intentionally non-actionable until the module is implemented and
                connected to real permissions, tests, and review evidence.
              </p>
            </div>
            <ShieldAlert className="h-5 w-5 flex-none text-amber-700" aria-hidden="true" />
          </div>

          <div className="mt-4">
            <LedgerMetadataRow
              items={[
                { label: "Route", value: `/${key}` },
                { label: "Status", value: "Planned placeholder" },
                { label: "Actions", value: "Disabled" },
                { label: "Runtime", value: "No workflow execution" },
              ]}
            />
          </div>
        </LedgerPanel>
      </LedgerPageBody>
    </LedgerPage>
  );
}
