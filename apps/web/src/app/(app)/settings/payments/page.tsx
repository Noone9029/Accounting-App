"use client";

import { FormEvent, useEffect, useState } from "react";
import { CreditCard, RefreshCw, ShieldCheck } from "lucide-react";
import { StatusMessage } from "@/components/common/status-message";
import { usePermissions } from "@/components/permissions/permission-provider";
import {
  LedgerActionBar,
  LedgerAlert,
  LedgerButton,
  LedgerFieldHelp,
  LedgerFieldLabel,
  LedgerFieldText,
  LedgerInput,
  LedgerPage,
  LedgerPageBody,
  LedgerPageHeader,
  LedgerPanel,
  LedgerStatusBadge,
  LedgerSummaryBand,
} from "@/components/ui/ledger-system";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { PERMISSIONS } from "@/lib/permissions";

type PaymentReadiness = {
  provider: "STRIPE";
  readOnly: boolean;
  noPaymentInitiated: boolean;
  noSecretsReturned: boolean;
  providerConfigured: boolean;
  paymentLinksEnabled: boolean;
  mockLinksEnabled: boolean;
  readyForNonProductionTest: boolean;
  webhookSecretConfigured: boolean;
  productionReady: boolean;
  blockers: string[];
  warnings: string[];
  config?: {
    status: string;
    displayName: string;
    publishableKeyLast4?: string | null;
    webhookSecretLast4?: string | null;
  } | null;
};

type InvoicePaymentLink = {
  id: string;
  status: string;
  paymentUrl?: string | null;
  noPaymentInitiated: boolean;
  providerConfigured: boolean;
  blockers: string[];
};

export default function PaymentReadinessPage() {
  const organizationId = useActiveOrganizationId();
  const { can } = usePermissions();
  const canCreatePaymentLink = can(PERMISSIONS.payments.paymentLinksCreate);
  const [readiness, setReadiness] = useState<PaymentReadiness | null>(null);
  const [linkResult, setLinkResult] = useState<InvoicePaymentLink | null>(null);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!organizationId) {
      return;
    }
    void loadReadiness();
  }, [organizationId]);

  async function loadReadiness() {
    setLoading(true);
    setError("");
    try {
      const result = await apiRequest<PaymentReadiness>("/payments/provider-readiness");
      setReadiness(result);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load payment readiness.");
    } finally {
      setLoading(false);
    }
  }

  async function createPaymentLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canCreatePaymentLink) {
      return;
    }
    const formData = new FormData(event.currentTarget);
    const invoiceId = String(formData.get("invoiceId") ?? "").trim();
    const note = String(formData.get("note") ?? "").trim();
    setCreating(true);
    setError("");
    setLinkResult(null);
    try {
      const result = await apiRequest<InvoicePaymentLink>(`/sales-invoices/${invoiceId}/payment-link`, {
        method: "POST",
        body: { provider: "STRIPE", note: note || undefined },
      });
      setLinkResult(result);
      await loadReadiness();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Unable to create payment-link readiness record.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <LedgerPage>
      <LedgerPageHeader
        eyebrow="Provider readiness"
        title="Payment readiness"
        badge={<LedgerStatusBadge tone={readiness?.productionReady ? "success" : "warning"}>{readiness?.productionReady ? "Provider enabled" : "Provider not configured"}</LedgerStatusBadge>}
        description="Stripe payment-link groundwork is visible here without initiating real payments by default. Webhook signing and provider keys remain explicit configuration requirements."
        actions={<LedgerButton icon={RefreshCw} onClick={() => void loadReadiness()} disabled={loading}>Refresh</LedgerButton>}
      />

      <LedgerPageBody>
        <LedgerSummaryBand tone="warning">
          Payment links are beta readiness until provider configuration, webhook signing, accounting status mapping, and reconciliation evidence are approved. Secret keys and webhook secrets are never displayed.
        </LedgerSummaryBand>

        {!organizationId ? <StatusMessage type="info">Log in and select an organization to load payment readiness.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading payment readiness...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}

        {readiness ? (
          <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(380px,0.8fr)]">
            <LedgerPanel>
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-1 h-5 w-5 text-palm" aria-hidden="true" />
                <div>
                  <h2 className="text-base font-semibold text-ink">Stripe readiness</h2>
                  <p className="mt-1 text-sm leading-6 text-steel">Provider status is read-only in this beta surface. Configuration changes stay outside this screen until provider operations are approved.</p>
                </div>
              </div>
              <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                <ReadinessField label="Provider configured" value={readiness.providerConfigured ? "Yes" : "No"} />
                <ReadinessField label="Payment links enabled" value={readiness.paymentLinksEnabled ? "Yes" : "No"} />
                <ReadinessField label="Webhook secret configured" value={readiness.webhookSecretConfigured ? "Yes" : "No"} />
                <ReadinessField label="Mock links enabled" value={readiness.mockLinksEnabled ? "Yes" : "No"} />
                <ReadinessField label="Secrets returned" value={readiness.noSecretsReturned ? "No" : "Review required"} />
                <ReadinessField label="Production ready" value={readiness.productionReady ? "Yes" : "No"} />
              </dl>

              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                <LedgerAlert tone={readiness.blockers.length ? "warning" : "success"} title="Blockers">
                  {readiness.blockers.length ? (
                    <ul className="list-disc pl-5">
                      {readiness.blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}
                    </ul>
                  ) : (
                    "No readiness blockers returned by the API."
                  )}
                </LedgerAlert>
                <LedgerAlert tone="info" title="Warnings">
                  <ul className="list-disc pl-5">
                    {readiness.warnings.map((warning) => <li key={warning}>{warning}</li>)}
                  </ul>
                </LedgerAlert>
              </div>
            </LedgerPanel>

            <LedgerPanel>
              <form onSubmit={createPaymentLink} className="space-y-3">
                <div className="flex items-start gap-3">
                  <CreditCard className="mt-1 h-5 w-5 text-palm" aria-hidden="true" />
                  <div>
                    <h2 className="text-base font-semibold text-ink">Invoice payment-link check</h2>
                    <p className="mt-1 text-sm leading-6 text-steel">Creates a readiness record for a finalized sales invoice. Real Stripe payment creation remains disabled unless the backend config explicitly enables it.</p>
                  </div>
                </div>
                <LedgerFieldLabel>
                  <LedgerFieldText>Sales invoice ID</LedgerFieldText>
                  <LedgerInput name="invoiceId" required placeholder="Finalized sales invoice UUID" />
                  <LedgerFieldHelp>Provider-disabled responses are expected until Stripe readiness is complete.</LedgerFieldHelp>
                </LedgerFieldLabel>
                <LedgerFieldLabel>
                  <LedgerFieldText>Internal note</LedgerFieldText>
                  <LedgerInput name="note" placeholder="Optional readiness note" />
                </LedgerFieldLabel>
                <LedgerActionBar>
                  <LedgerButton type="submit" icon={CreditCard} variant="primary" disabled={!canCreatePaymentLink || creating}>
                    {creating ? "Checking..." : "Create readiness record"}
                  </LedgerButton>
                </LedgerActionBar>
              </form>

              {linkResult ? (
                <div className="mt-4 rounded-md border border-line bg-slate-50 p-3 text-sm">
                  <div className="font-semibold text-ink">Payment-link result</div>
                  <dl className="mt-2 space-y-2">
                    <ReadinessField label="Status" value={linkResult.status.replace(/_/g, " ")} />
                    <ReadinessField label="No payment initiated" value={linkResult.noPaymentInitiated ? "Yes" : "Review required"} />
                    <ReadinessField label="Payment URL" value={linkResult.paymentUrl ?? "Not created"} />
                  </dl>
                </div>
              ) : null}
            </LedgerPanel>
          </section>
        ) : null}
      </LedgerPageBody>
    </LedgerPage>
  );
}

function ReadinessField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-mist px-3 py-2">
      <dt className="text-xs font-semibold uppercase tracking-wide text-steel">{label}</dt>
      <dd className="mt-1 break-words text-sm font-medium text-ink">{value}</dd>
    </div>
  );
}
