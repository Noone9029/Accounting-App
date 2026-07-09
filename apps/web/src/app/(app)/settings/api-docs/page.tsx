import { BookOpen, ExternalLink, Gauge, KeyRound, LockKeyhole, Repeat2 } from "lucide-react";
import {
  LedgerAlert,
  LedgerButton,
  LedgerPage,
  LedgerPageBody,
  LedgerPageHeader,
  LedgerPanel,
  LedgerStatusBadge,
  LedgerSummaryBand,
  LedgerWorkflowCard,
} from "@/components/ui/ledger-system";
import { apiBaseUrl } from "@/lib/api";

const docsUrl = `${apiBaseUrl}/api/docs`;

export default function ApiDocsSettingsPage() {
  return (
    <LedgerPage>
      <LedgerPageHeader
        eyebrow="Developer surface"
        title="API docs"
        badge={<LedgerStatusBadge tone="info">Beta readiness</LedgerStatusBadge>}
        description="OpenAPI documentation for the selected beta endpoints. The API docs route is enabled by default only outside production, or when the backend explicitly opts in."
        actions={<LedgerButton href={docsUrl} icon={ExternalLink}>Open /api/docs</LedgerButton>}
      />

      <LedgerPageBody>
        <LedgerSummaryBand tone="warning">
          These docs do not mean the API is public production infrastructure. Provider-backed routes remain gated, and UI copy should continue to say beta readiness or provider not configured unless real evidence exists.
        </LedgerSummaryBand>

        <section className="grid gap-4 lg:grid-cols-4">
          <LedgerPanel>
            <div className="flex items-start gap-3">
              <LockKeyhole className="mt-1 h-5 w-5 text-palm" aria-hidden="true" />
              <div>
                <h2 className="text-sm font-semibold text-ink">Public API v1</h2>
                <p className="mt-1 text-sm text-steel">Disabled by default. Current proof routes remain authenticated and admin-gated.</p>
                <LedgerStatusBadge tone="draft">Internal Only</LedgerStatusBadge>
              </div>
            </div>
          </LedgerPanel>
          <LedgerPanel>
            <div className="flex items-start gap-3">
              <Repeat2 className="mt-1 h-5 w-5 text-palm" aria-hidden="true" />
              <div>
                <h2 className="text-sm font-semibold text-ink">Idempotency</h2>
                <p className="mt-1 text-sm text-steel">One local proof route stores hashed keys and safe response summaries only.</p>
                <LedgerStatusBadge tone="info">Ready for Local Proof</LedgerStatusBadge>
              </div>
            </div>
          </LedgerPanel>
          <LedgerPanel>
            <div className="flex items-start gap-3">
              <Gauge className="mt-1 h-5 w-5 text-palm" aria-hidden="true" />
              <div>
                <h2 className="text-sm font-semibold text-ink">Rate limits</h2>
                <p className="mt-1 text-sm text-steel">Production-like enablement fails closed without an approved strategy.</p>
                <LedgerStatusBadge tone="warning">Needs Production Approval</LedgerStatusBadge>
              </div>
            </div>
          </LedgerPanel>
          <LedgerPanel>
            <div className="flex items-start gap-3">
              <KeyRound className="mt-1 h-5 w-5 text-palm" aria-hidden="true" />
              <div>
                <h2 className="text-sm font-semibold text-ink">API keys and OAuth</h2>
                <p className="mt-1 text-sm text-steel">Placeholder only. No production API secrets or OAuth clients are issued.</p>
                <LedgerStatusBadge tone="draft">Disabled</LedgerStatusBadge>
              </div>
            </div>
          </LedgerPanel>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <LedgerWorkflowCard
            title="Document inbox"
            description="Review uploaded bill and receipt extraction data before recording a reviewer decision."
            href="/document-inbox"
            status={<LedgerStatusBadge tone="warning">Review required</LedgerStatusBadge>}
          />
          <LedgerWorkflowCard
            title="Payment readiness"
            description="Inspect Stripe payment-link readiness, webhook requirements, and provider-disabled responses."
            href="/settings/payments"
            status={<LedgerStatusBadge tone="draft">Provider gated</LedgerStatusBadge>}
          />
          <LedgerWorkflowCard
            title="API route"
            description="/api/docs is disabled in production unless LEDGERBYTE_API_DOCS_ENABLED is explicitly true."
            href={docsUrl}
            status={<LedgerStatusBadge tone="info">OpenAPI</LedgerStatusBadge>}
          />
        </section>

        <LedgerPanel>
          <div className="flex items-start gap-3">
            <LockKeyhole className="mt-1 h-5 w-5 text-palm" aria-hidden="true" />
            <div>
              <h2 className="text-base font-semibold text-ink">Access model</h2>
              <p className="mt-1 text-sm leading-6 text-steel">
                The backend exposes the Swagger UI at /api/docs only for development-like environments by default. Production must opt in through LEDGERBYTE_API_DOCS_ENABLED=true, and endpoint guards still apply to authenticated API calls.
              </p>
            </div>
          </div>
        </LedgerPanel>

        <LedgerAlert tone="info" title="Stable DTO focus">
          <div className="flex items-start gap-2">
            <BookOpen className="mt-1 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>Current docs cover the active controllers, including invoices, bills, payments, contacts, bank accounts, reports, document inbox, and provider-readiness endpoints as those controllers are registered in NestJS.</span>
          </div>
        </LedgerAlert>
      </LedgerPageBody>
    </LedgerPage>
  );
}
