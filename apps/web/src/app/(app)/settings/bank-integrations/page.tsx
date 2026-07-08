"use client";

import { useEffect, useState } from "react";
import { Ban, Landmark, RefreshCw, ShieldCheck } from "lucide-react";
import { StatusMessage } from "@/components/common/status-message";
import {
  LedgerAlert,
  LedgerButton,
  LedgerPage,
  LedgerPageBody,
  LedgerPageHeader,
  LedgerPanel,
  LedgerStatCard,
  LedgerStatusBadge,
  LedgerSummaryBand,
} from "@/components/ui/ledger-system";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import type { BankIntegrationReadinessResponse, BankIntegrationReadinessSurface } from "@/lib/types";

export default function BankIntegrationSettingsPage() {
  const organizationId = useActiveOrganizationId();
  const [readiness, setReadiness] = useState<BankIntegrationReadinessResponse | null>(null);
  const [loading, setLoading] = useState(false);
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
      setReadiness(await apiRequest<BankIntegrationReadinessResponse>("/bank-integrations/readiness"));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load bank integration readiness.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <LedgerPage>
      <LedgerPageHeader
        eyebrow="Provider readiness"
        title="Bank integration readiness"
        badge={<LedgerStatusBadge tone={readiness?.provider === "MOCK_WIO" ? "warning" : "draft"}>{readiness?.providerStateLabel ?? "Provider not configured"}</LedgerStatusBadge>}
        description="Wio-shaped bank integration groundwork for future direct feeds, beneficiary mapping, vendor payment requests, and reconciliation status."
        actions={<LedgerButton icon={RefreshCw} onClick={() => void loadReadiness()} disabled={loading}>Refresh</LedgerButton>}
      />

      <LedgerPageBody>
        <LedgerSummaryBand tone="warning">
          Readiness only. LedgerByte does not connect to Wio, store bank credentials, fetch live bank feeds, or move money from this surface.
        </LedgerSummaryBand>

        {!organizationId ? <StatusMessage type="info">Log in and select an organization to load bank integration readiness.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading bank integration readiness...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}

        {readiness ? (
          <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.75fr)]">
            <LedgerPanel>
              <div className="flex items-start gap-3">
                <Landmark className="mt-1 h-5 w-5 text-palm" aria-hidden="true" />
                <div>
                  <h2 className="text-base font-semibold text-ink">Wio placeholder status</h2>
                  <p className="mt-1 text-sm leading-6 text-steel">
                    Provider state is explicit and conservative. Local mock mode is fixture-only; future Wio provider work remains blocked until a real adapter, credentials custody, approvals, and audit evidence exist.
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <LedgerStatCard label="Connections" value={String(readiness.counts.connections)} />
                <LedgerStatCard label="Feed accounts" value={String(readiness.counts.feedAccounts)} />
                <LedgerStatCard label="Payment requests" value={String(readiness.counts.paymentRequests)} />
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <SafetyField label="Secrets returned" value={readiness.noSecretsReturned ? "No" : "Review required"} />
                <SafetyField label="Bank credentials stored" value={readiness.noBankCredentialsStored ? "No" : "Review required"} />
                <SafetyField label="Real Wio API calls" value={readiness.noRealWioApiCalls ? "No" : "Review required"} />
                <SafetyField label="Money movement" value={readiness.noMoneyMovement ? "No" : "Review required"} />
              </div>

              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                <ReadinessCard title="Bank connections" surface={readiness.surfaces.bankConnection} />
                <ReadinessCard title="Bank feeds" surface={readiness.surfaces.bankFeed} />
                <ReadinessCard title="Beneficiary mapping" surface={readiness.surfaces.beneficiaryMapping} />
                <ReadinessCard title="Vendor payment requests" surface={readiness.surfaces.vendorPayment} />
              </div>
            </LedgerPanel>

            <LedgerPanel>
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-1 h-5 w-5 text-palm" aria-hidden="true" />
                <div>
                  <h2 className="text-base font-semibold text-ink">Safety matrix</h2>
                  <p className="mt-1 text-sm leading-6 text-steel">
                    Manual import and reconciliation remain supported. Live Wio credentials, API callbacks, beneficiary bank secrets, and payment release are not implemented.
                  </p>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                <LedgerAlert tone="warning" title="Disabled-provider messaging">
                  Provider state labels are limited to Disabled, Local Mock Only, Blocked, Needs Configuration, and Future Provider.
                </LedgerAlert>
                <LedgerAlert tone="info" title="Warnings">
                  <ul className="list-disc pl-5">
                    {readiness.warnings.map((warning) => <li key={warning}>{warning}</li>)}
                  </ul>
                </LedgerAlert>
                <LedgerAlert tone="danger" title="Release blocked">
                  Vendor payment request release remains blocked until a future real provider implementation is approved. Manual external release records are review metadata only.
                </LedgerAlert>
              </div>
            </LedgerPanel>
          </section>
        ) : null}
      </LedgerPageBody>
    </LedgerPage>
  );
}

function ReadinessCard({ title, surface }: { title: string; surface: BankIntegrationReadinessSurface }) {
  const blocked = surface.blockers.length > 0 || surface.releaseBlocked;
  return (
    <div className="rounded-md border border-line bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-ink">{title}</h3>
          <p className="mt-1 text-xs font-medium uppercase tracking-wide text-steel">{surface.provider}</p>
        </div>
        <LedgerStatusBadge tone={blocked ? "warning" : "success"}>{String(surface.status).replace(/_/g, " ")}</LedgerStatusBadge>
      </div>
      <p className="mt-3 text-sm text-steel">{surface.stateLabel}</p>
      {surface.blockers.length ? (
        <ul className="mt-3 space-y-1 text-sm text-rosewood">
          {surface.blockers.map((blocker) => (
            <li key={blocker} className="flex gap-2">
              <Ban className="mt-0.5 h-4 w-4 flex-none" aria-hidden="true" />
              <span>{blocker}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function SafetyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-mist px-3 py-2">
      <dt className="text-xs font-semibold uppercase tracking-wide text-steel">{label}</dt>
      <dd className="mt-1 break-words text-sm font-medium text-ink">{value}</dd>
    </div>
  );
}
