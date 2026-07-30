"use client";

import { useEffect, useState } from "react";
import { CreditCard, RefreshCw, ShieldCheck } from "lucide-react";
import { StatusMessage } from "@/components/common/status-message";
import { usePermissions } from "@/components/permissions/permission-provider";
import { LedgerActionBar, LedgerAlert, LedgerButton, LedgerPage, LedgerPageBody, LedgerPageHeader, LedgerPanel, LedgerStatusBadge, LedgerSummaryBand } from "@/components/ui/ledger-system";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { PERMISSIONS } from "@/lib/permissions";

type BillingStatus = { account: { provider: string; status: string } | null; subscription: { id: string; status: string; interval: string; planKey: string; planName: string; trialEndsAt: string | null; graceDeadline: string | null; currentPeriodEndsAt: string | null; cancelAtPeriodEnd: boolean; version: number } | null; access: { accessMode: string; enforcementMode: string }; providerReadiness: { status: string; warnings: string[] } };

export default function BillingSettingsPage() {
  const organizationId = useActiveOrganizationId();
  const { can } = usePermissions();
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const canManage = can(PERMISSIONS.billing.manage);
  const load = async () => { setLoading(true); setError(""); try { setStatus(await apiRequest<BillingStatus>("/billing/status")); } catch (e) { setError(e instanceof Error ? e.message : "Unable to load billing status."); } finally { setLoading(false); } };
  useEffect(() => { if (organizationId) void load(); }, [organizationId]);
  const subscription = status?.subscription;
  const lifecycleNote = subscription?.status === "GRACE" ? "Your grace period is active. Billing access remains available while the provider boundary stays disabled." : subscription?.status === "SUSPENDED" ? "Accounting changes are read-only. Billing status and support access remain available." : subscription?.status === "TRIALING" ? "Your trial is active. No payment collection is enabled in this local foundation." : "Subscription collection and provider execution remain disabled.";
  return <LedgerPage>
    <LedgerPageHeader eyebrow="Organization controls" title="Billing and subscription" badge={<LedgerStatusBadge tone="warning">Local foundation</LedgerStatusBadge>} description="Review your local subscription state, access policy, and future plan options. LedgerByte is not collecting payments on this page." actions={<LedgerButton icon={RefreshCw} onClick={() => void load()} disabled={loading}>Refresh</LedgerButton>} />
    <LedgerPageBody>
      <LedgerSummaryBand tone="warning">No payment collection, public pricing, provider portal, or checkout is enabled. Provider execution requires a separately approved test-mode gate.</LedgerSummaryBand>
      {!organizationId ? <StatusMessage type="info">Log in and select an organization to view billing.</StatusMessage> : null}
      {loading ? <StatusMessage type="loading">Loading billing status...</StatusMessage> : null}{error ? <StatusMessage type="error">{error}</StatusMessage> : null}
      {status ? <section className="grid gap-4 lg:grid-cols-2"><LedgerPanel><div className="flex gap-3"><ShieldCheck className="mt-1 h-5 w-5 text-palm" aria-hidden="true" /><div><h2 className="font-semibold text-ink">Current access</h2><p className="mt-1 text-sm text-steel">{lifecycleNote}</p></div></div><dl className="mt-4 grid gap-3 sm:grid-cols-2"><Field label="Access mode" value={status.access.accessMode.replace(/_/g, " ")} /><Field label="Enforcement" value={status.access.enforcementMode} /><Field label="Plan" value={subscription?.planName ?? "Controlled beta"} /><Field label="Subscription state" value={subscription?.status?.replace(/_/g, " ") ?? "No subscription record"} /></dl></LedgerPanel><LedgerPanel><div className="flex gap-3"><CreditCard className="mt-1 h-5 w-5 text-palm" aria-hidden="true" /><div><h2 className="font-semibold text-ink">Billing actions</h2><p className="mt-1 text-sm text-steel">Actions stay visible to authorized owners and admins, but provider execution is disabled.</p></div></div><LedgerActionBar><LedgerButton href="/plans" variant="secondary">Review plans</LedgerButton><LedgerButton disabled={!canManage} variant="primary">Manage subscription (disabled)</LedgerButton></LedgerActionBar>{!canManage ? <LedgerAlert tone="info" title="Billing permission required">Your role can review subscription status but cannot manage billing.</LedgerAlert> : null}</LedgerPanel></section> : null}
    </LedgerPageBody>
  </LedgerPage>;
}
function Field({ label, value }: { label: string; value: string }) { return <div className="rounded-md bg-mist px-3 py-2"><dt className="text-xs font-semibold uppercase tracking-wide text-steel">{label}</dt><dd className="mt-1 text-sm font-medium text-ink">{value}</dd></div>; }
