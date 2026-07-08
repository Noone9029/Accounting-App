import {
  LedgerPage,
  LedgerPageBody,
  LedgerPageHeader,
  LedgerStatusBadge,
  LedgerSummaryBand,
  LedgerWorkflowCard,
} from "@/components/ui/ledger-system";

const adminSections = [
  {
    title: "Team and roles",
    description: "Manage memberships, role matrices, and controlled-beta access boundaries.",
    href: "/settings/team",
    status: "Access control",
  },
  {
    title: "Documents and numbering",
    description: "Review PDF defaults, document numbering, archive behavior, and generated document limitations.",
    href: "/settings/documents",
    status: "Generated output",
  },
  {
    title: "Storage and backup",
    description: "Inspect storage readiness, metadata-only backup evidence, and blocked object-storage execution paths.",
    href: "/settings/storage",
    status: "Readiness",
  },
  {
    title: "Payment readiness",
    description: "Review Stripe payment-link beta readiness, disabled-provider state, webhook requirements, and payload redaction boundaries.",
    href: "/settings/payments",
    status: "Provider gated",
  },
  {
    title: "Bank integration readiness",
    description: "Review Wio-shaped readiness, disabled-provider state, feed blockers, beneficiary mapping, and vendor payment release boundaries.",
    href: "/settings/bank-integrations",
    status: "Wio placeholder",
  },
  {
    title: "API docs",
    description: "Open the local/internal OpenAPI docs and review the beta API surface without production-public claims.",
    href: "/settings/api-docs",
    status: "Internal docs",
  },
  {
    title: "Webhook outbox",
    description: "Review outbound webhook and event outbox readiness without enabling external delivery or storing signing secrets.",
    href: "/settings/webhooks",
    status: "Disabled",
  },
  {
    title: "Email outbox",
    description: "Review local outbox records where supported. Provider sending remains explicit and bounded.",
    href: "/settings/email-outbox",
    status: "Local review",
  },
  {
    title: "Banking accounting",
    description: "Configure manual banking accounting controls and review posting boundaries.",
    href: "/settings/banking-accounting",
    status: "Manual controls",
  },
  {
    title: "Compliance readiness",
    description: "Track local readiness and edition-aware compliance fields without production submission claims.",
    href: "/settings/compliance",
    status: "Controlled beta",
  },
  {
    title: "ZATCA readiness",
    description: "Review local KSA readiness, CSR dry-run fields, and disabled network execution boundaries.",
    href: "/settings/zatca",
    status: "Local only",
  },
  {
    title: "Security and audit",
    description: "Review audit logs, session/security surfaces, and retention-related evidence.",
    href: "/settings/security",
    status: "Controls",
  },
];

export default function SettingsPage() {
  return (
    <LedgerPage>
      <LedgerPageHeader
        eyebrow="Administration"
        title="Settings"
        badge={<LedgerStatusBadge tone="info">Controlled beta</LedgerStatusBadge>}
        description="Grouped admin surfaces for access, documents, storage, email, banking controls, compliance readiness, and audit review."
      />

      <LedgerPageBody>
        <LedgerSummaryBand tone="warning">
          Settings are review and configuration surfaces only. They do not run hosted migrations, provider calls, storage moves, tax-authority submissions, email sends, or compliance operations.
        </LedgerSummaryBand>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-label="Settings sections">
          {adminSections.map((section) => (
            <LedgerWorkflowCard
              key={section.href}
              title={section.title}
              description={section.description}
              href={section.href}
              status={<LedgerStatusBadge tone="draft">{section.status}</LedgerStatusBadge>}
            />
          ))}
        </section>
      </LedgerPageBody>
    </LedgerPage>
  );
}
