"use client";

import { useEffect, useState } from "react";
import { CreditCard, RefreshCw, ShieldCheck } from "lucide-react";
import { StatusMessage } from "@/components/common/status-message";
import { usePermissions } from "@/components/permissions/permission-provider";
import { LedgerActionBar, LedgerAlert, LedgerButton, LedgerPage, LedgerPageBody, LedgerPageHeader, LedgerPanel, LedgerStatusBadge, LedgerSummaryBand } from "@/components/ui/ledger-system";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { PERMISSIONS } from "@/lib/permissions";

type BillingStatus = { account: { provider: string; status: string } | null; subscription: { id: string; status: string; interval: string; planKey: string; planName: string; trialEndsAt: string | null; graceDeadline: string | null; currentPeriodEndsAt: string | null; cancelAtPeriodEnd: boolean; version: number; scheduledChange?: { planName: string; effectiveAt: string } | null } | null; access: { accessMode: string; enforcementMode: string }; providerReadiness: { status: string; warnings: string[]; portalEnabled?: boolean; networkEnabled?: boolean } };

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
  async function portal() {
    setLoading(true); setError("");
    try { const result = await apiRequest<{ prepared: boolean; redirectUrl?: string }>("/billing/portal", { method: "POST" }); if (!result.prepared || !result.redirectUrl || new URL(result.redirectUrl).hostname !== "billing.stripe.com") throw new Error("Subscription portal is unavailable."); window.location.assign(result.redirectUrl); }
    catch (e) { setError(e instanceof Error ? e.message : "Unable to open portal."); } finally { setLoading(false); }
  }
  async function subscriptionAction(action: "cancel" | "reactivate") {
    if (!subscription || !window.confirm(action === "cancel" ? "Cancel renewal at the end of your current paid period? Your records will remain available." : "Resume renewal for this subscription?")) return;
    setLoading(true); setError("");
    try { await apiRequest(`/billing/subscriptions/${subscription.id}/${action}`, { method: "POST", body: { expectedVersion: subscription.version, correlationId: crypto.randomUUID() } }); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : "Unable to update subscription."); } finally { setLoading(false); }
  }
  async function changePlan() {
    if (!subscription || !window.confirm(subscription.planKey === "STARTER" ? "Upgrade to Growth for SAR 299/month? Stripe will invoice the prorated difference and apply the upgrade after successful payment." : "Downgrade to Starter for SAR 149/month at renewal? You must first have no more than 3 active or invited members.")) return;
    setLoading(true); setError("");
    try { const plans = await apiRequest<Array<{ key: string; planVersionId: string }>>("/billing/plans"); const target = plans.find((plan) => plan.key === (subscription.planKey === "STARTER" ? "GROWTH" : "STARTER")); if (!target) throw new Error("Target plan is unavailable."); await apiRequest(`/billing/subscriptions/${subscription.id}/plan-change`, { method: "POST", body: { expectedVersion: subscription.version, correlationId: crypto.randomUUID(), targetPlanVersionId: target.planVersionId, effectiveAt: subscription.currentPeriodEndsAt ?? new Date(Date.now() + 60000).toISOString() } }); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : "Unable to change plans."); } finally { setLoading(false); }
  }
  const lifecycleNote = status?.access.accessMode === "READ_ONLY" ? "Accounting changes are read-only. Your records, billing and support remain available." : subscription?.status === "GRACE" ? "Update your payment method before the grace deadline to keep editing." : subscription?.status === "TRIALING" ? "Your 14-day trial is active. No card is required." : "Manage your subscription and review access below.";
  return <LedgerPage>
    <LedgerPageHeader eyebrow="Organization controls" title="Billing and subscription" badge={<LedgerStatusBadge tone="warning">Test mode</LedgerStatusBadge>} description="Review your subscription, dates and available billing actions." actions={<LedgerButton icon={RefreshCw} onClick={() => void load()} disabled={loading || !organizationId}>Refresh</LedgerButton>} />
    <LedgerPageBody>
      <LedgerSummaryBand tone="warning">Live billing is not enabled. Stripe test mode is available only when configured. A checkout return page does not confirm payment; this page shows verified subscription status.</LedgerSummaryBand>
      {!organizationId ? <StatusMessage type="info">Log in and select an organization to view billing.</StatusMessage> : null}
      {loading ? <StatusMessage type="loading">Loading billing status...</StatusMessage> : null}{error ? <StatusMessage type="error">{error}</StatusMessage> : null}
      {status ? <section className="grid gap-4 lg:grid-cols-2"><LedgerPanel><div className="flex gap-3"><ShieldCheck className="mt-1 h-5 w-5 text-palm" aria-hidden="true" /><div><h2 className="font-semibold text-ink">Current access</h2><p className="mt-1 text-sm text-steel">{lifecycleNote}</p></div></div><dl className="mt-4 grid gap-3 sm:grid-cols-2"><Field label="Access mode" value={status.access.accessMode === "FULL" ? "Available" : status.access.accessMode === "READ_ONLY" ? "Read only" : "Choose a plan"} /><Field label="Plan" value={subscription?.planName ?? "Choose a plan"} /><Field label="Subscription state" value={subscription?.status?.replace(/_/g, " ") ?? "No subscription record"} /><Field label="Trial ends" value={subscription?.trialEndsAt ? new Date(subscription.trialEndsAt).toLocaleDateString() : "Not available"} /><Field label="Next renewal or period end" value={subscription?.currentPeriodEndsAt ? new Date(subscription.currentPeriodEndsAt).toLocaleDateString() : "Not available"} /><Field label="Grace deadline" value={subscription?.graceDeadline ? new Date(subscription.graceDeadline).toLocaleDateString() : "Not available"} /></dl>{subscription?.scheduledChange ? <p className="mt-4 text-sm text-steel">Requested plan: {subscription.scheduledChange.planName}. Changes await confirmation. A lower seat limit is reserved now; downgrades take effect at renewal.</p> : null}</LedgerPanel><LedgerPanel><div className="flex gap-3"><CreditCard className="mt-1 h-5 w-5 text-palm" aria-hidden="true" /><div><h2 className="font-semibold text-ink">Billing actions</h2><p className="mt-1 text-sm text-steel">Only authorized owners and admins can manage billing. Records remain available after cancellation.</p></div></div><LedgerActionBar><LedgerButton href="/plans" variant="secondary">Review plans</LedgerButton><LedgerButton disabled={!canManage || loading || !status.providerReadiness.portalEnabled} onClick={() => void portal()} variant="primary">Manage payment method</LedgerButton>{subscription?.status === "ACTIVE" ? <><LedgerButton disabled={!canManage || loading || !status.providerReadiness.networkEnabled} onClick={() => void changePlan()}>Change plan</LedgerButton><LedgerButton disabled={!canManage || loading || !status.providerReadiness.networkEnabled} onClick={() => void subscriptionAction("cancel")}>Cancel renewal</LedgerButton></> : null}{subscription?.status === "CANCEL_AT_PERIOD_END" ? <LedgerButton disabled={!canManage || loading || !status.providerReadiness.networkEnabled} onClick={() => void subscriptionAction("reactivate")}>Resume renewal</LedgerButton> : null}</LedgerActionBar>{!canManage ? <LedgerAlert tone="info" title="Billing permission required">Your role can review subscription status but cannot manage billing.</LedgerAlert> : null}</LedgerPanel></section> : null}
    </LedgerPageBody>
  </LedgerPage>;
}
function Field({ label, value }: { label: string; value: string }) { return <div className="rounded-md bg-mist px-3 py-2"><dt className="text-xs font-semibold uppercase tracking-wide text-steel">{label}</dt><dd className="mt-1 text-sm font-medium text-ink">{value}</dd></div>; }
