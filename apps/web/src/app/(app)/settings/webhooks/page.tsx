import { BellRing, ListChecks, RotateCcw, ShieldCheck } from "lucide-react";
import {
  LedgerAlert,
  LedgerPage,
  LedgerPageBody,
  LedgerPageHeader,
  LedgerPanel,
  LedgerStatusBadge,
  LedgerSummaryBand,
} from "@/components/ui/ledger-system";

export default function WebhookSettingsPage() {
  return (
    <LedgerPage>
      <LedgerPageHeader
        eyebrow="Integration readiness"
        title="Webhook outbox"
        badge={<LedgerStatusBadge tone="draft">Disabled</LedgerStatusBadge>}
        description="Outbound webhook and event outbox groundwork for local proof only. No external webhook delivery is enabled by default."
      />

      <LedgerPageBody>
        <LedgerSummaryBand tone="warning">
          Webhook delivery is disabled by default. MOCK_LOCAL can record local delivery attempts only; it does not call external URLs, store webhook secrets, or send provider payloads.
        </LedgerSummaryBand>

        <section className="grid gap-4 lg:grid-cols-4">
          <LedgerPanel>
            <div className="flex items-start gap-3">
              <BellRing className="mt-1 h-5 w-5 text-palm" aria-hidden="true" />
              <div>
                <h2 className="text-sm font-semibold text-ink">Delivery mode</h2>
                <p className="mt-1 text-sm text-steel">Default state blocks outbound delivery and external URLs.</p>
                <LedgerStatusBadge tone="draft">Disabled</LedgerStatusBadge>
              </div>
            </div>
          </LedgerPanel>
          <LedgerPanel>
            <div className="flex items-start gap-3">
              <ListChecks className="mt-1 h-5 w-5 text-palm" aria-hidden="true" />
              <div>
                <h2 className="text-sm font-semibold text-ink">Event catalog</h2>
                <p className="mt-1 text-sm text-steel">Invoice, payment, document, bank, and supplier payout events are catalogued.</p>
                <LedgerStatusBadge tone="info">Ready for Local Proof</LedgerStatusBadge>
              </div>
            </div>
          </LedgerPanel>
          <LedgerPanel>
            <div className="flex items-start gap-3">
              <RotateCcw className="mt-1 h-5 w-5 text-palm" aria-hidden="true" />
              <div>
                <h2 className="text-sm font-semibold text-ink">Retry states</h2>
                <p className="mt-1 text-sm text-steel">Queued, mock delivered, retry scheduled, failed, and blocked states are modeled.</p>
                <LedgerStatusBadge tone="warning">Needs Production Approval</LedgerStatusBadge>
              </div>
            </div>
          </LedgerPanel>
          <LedgerPanel>
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-1 h-5 w-5 text-palm" aria-hidden="true" />
              <div>
                <h2 className="text-sm font-semibold text-ink">Secrets</h2>
                <p className="mt-1 text-sm text-steel">Signing secrets are not stored until secret custody is approved.</p>
                <LedgerStatusBadge tone="draft">Not stored</LedgerStatusBadge>
              </div>
            </div>
          </LedgerPanel>
        </section>

        <LedgerAlert tone="info" title="Production boundary">
          Production webhook delivery still needs endpoint approval, signing-secret custody, retry/backoff operations, monitoring, and rate-limit review. This page is readiness status only.
        </LedgerAlert>
      </LedgerPageBody>
    </LedgerPage>
  );
}
