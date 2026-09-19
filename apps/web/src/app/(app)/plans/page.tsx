"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppLocale } from "@/components/app-locale-provider";
import { usePermissions } from "@/components/permissions/permission-provider";
import { StatusMessage } from "@/components/common/status-message";
import { LedgerButton, LedgerPage, LedgerPageBody, LedgerPageHeader, LedgerPanel, LedgerStatusBadge, LedgerSummaryBand } from "@/components/ui/ledger-system";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { PERMISSIONS } from "@/lib/permissions";

type Catalog = { plans: Array<{ key: "STARTER" | "GROWTH"; displayName: string; amountMinor: number; seats: number }>; trialDays: number; selfServiceEnabled: boolean; seller: { legalName: string | null }; taxDisplay: string };
type Version = { key: string; planVersionId: string };
type Status = { subscription: { status: string; planKey: string } | null; providerReadiness: { checkoutEnabled: boolean } };

export default function PlansPage() {
  const organizationId = useActiveOrganizationId();
  const router = useRouter();
  const { locale } = useAppLocale();
  const { can } = usePermissions();
  const canManage = can(PERMISSIONS.billing.manage);
  const label = useCallback((en: string, ar: string) => locale === "ar" ? ar : en, [locale]);
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [versions, setVersions] = useState<Version[]>([]);
  const [billing, setBilling] = useState<Status | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    apiRequest<Catalog>("/billing/catalog", { auth: false, organizationId: null })
      .then(setCatalog)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : label("Unable to load plans.", "تعذر تحميل الخطط.")));
  }, [label]);
  useEffect(() => {
    if (!organizationId) return;
    Promise.all([apiRequest<Version[]>("/billing/plans"), apiRequest<Status>("/billing/status")])
      .then(([nextVersions, status]) => { setVersions(nextVersions); setBilling(status); })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : label("Unable to load billing.", "تعذر تحميل معلومات الاشتراك.")));
  }, [organizationId, label]);
  async function select(planKey: "STARTER" | "GROWTH") {
    if (!canManage) return;
    setBusy(true); setError("");
    try {
      if (!billing?.subscription) { await apiRequest("/billing/trial", { method: "POST", body: { planKey } }); router.push("/dashboard"); return; }
      const version = versions.find((item) => item.key === planKey);
      if (!version) throw new Error(label("This plan is not configured for checkout.", "هذه الخطة غير مهيأة للدفع حالياً."));
      const result = await apiRequest<{ prepared: boolean; redirectUrl?: string }>("/billing/checkout", { method: "POST", body: { planVersionId: version.planVersionId, returnRouteKey: "plans" } });
      if (!result.prepared || !result.redirectUrl || new URL(result.redirectUrl).hostname !== "checkout.stripe.com") throw new Error(label("Checkout is unavailable in this environment.", "الدفع غير متاح في هذه البيئة."));
      window.location.assign(result.redirectUrl);
    } catch (e) { setError(e instanceof Error ? e.message : label("Unable to continue.", "تعذرت المتابعة.")); } finally { setBusy(false); }
  }
  const hasPaidSubscription = billing?.subscription && ["ACTIVE", "GRACE", "CANCEL_AT_PERIOD_END"].includes(billing.subscription.status);
  return <LedgerPage><LedgerPageHeader
    eyebrow={label("Organization subscription", "اشتراك المنشأة")}
    title={label("Plans", "الخطط")}
    badge={<LedgerStatusBadge tone="info">{label("Monthly · SAR", "شهرياً · ر.س")}</LedgerStatusBadge>}
    description={label("Choose your seats. Both plans include the bookkeeping workspace and inventory review workflows.", "اختر عدد المستخدمين. تشمل الخطتان مساحة العمل المحاسبية ومراجعة المخزون.")}
  /><LedgerPageBody>
    <LedgerSummaryBand tone="warning">{label("Back-office accounting only. Tax-authority submission and live banking are not included. Payment collection is currently limited to separately configured Stripe test mode.", "للمحاسبة الإدارية فقط. لا تشمل الخطط الإرسال إلى هيئة الزكاة والضريبة والجمارك أو الربط البنكي المباشر. تحصيل المدفوعات متاح حالياً في وضع Stripe التجريبي فقط بعد إعداده بشكل منفصل.")}</LedgerSummaryBand>
    {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
    {!organizationId ? <StatusMessage type="info">{label("Log in and create an organization to choose a plan.", "سجّل الدخول وأنشئ منشأة لاختيار خطة.")}</StatusMessage> : null}
    {catalog ? <>
      <section className="grid gap-4 md:grid-cols-2">{catalog.plans.map((plan) => <LedgerPanel key={plan.key}>
        <h2 className="text-xl font-semibold text-ink">{plan.displayName}</h2>
        <p className="mt-2 text-3xl font-semibold text-ink">{label("SAR", "ر.س")} {plan.amountMinor / 100}<span className="text-sm font-normal text-steel">{label(" / month", " / شهرياً")}</span></p>
        <p className="mt-3 text-sm text-steel">{label(`${plan.seats} seats, including the owner. Active members and pending invitations count toward your limit.`, `عدد المستخدمين ${plan.seats} بمن فيهم المالك. يُحتسب الأعضاء النشطون والدعوات المعلقة ضمن الحد المسموح.`)}</p>
        <p className="mt-2 text-sm text-steel">{label(`${catalog.trialDays}-day trial. No card required.`, `تجربة لمدة ${catalog.trialDays} يوماً دون بطاقة دفع.`)}</p>
        <div className="mt-5">{hasPaidSubscription
          ? <LedgerButton href="/settings/billing">{label("Manage subscription", "إدارة الاشتراك")}</LedgerButton>
          : <LedgerButton variant="primary" disabled={busy || !canManage || !organizationId || !billing || (!billing.subscription ? !catalog.selfServiceEnabled : !billing.providerReadiness.checkoutEnabled)} onClick={() => void select(plan.key)}>
            {busy ? label("Working...", "جارٍ التنفيذ...") : billing?.subscription ? label(`Subscribe to ${plan.displayName} (test)`, `اشترك في ${plan.displayName} (تجريبي)`) : label(`Start ${plan.displayName} trial`, `ابدأ تجربة ${plan.displayName}`)}
          </LedgerButton>}
        </div>
      </LedgerPanel>)}</section>
      <p className="text-sm text-steel">{label(catalog.taxDisplay, "تُعرض الضرائب المطبقة قبل إتمام الدفع.")} {catalog.seller.legalName ? label(`Sold by ${catalog.seller.legalName}, UAE.`, `البائع: ${catalog.seller.legalName}، الإمارات العربية المتحدة.`) : label("Seller legal details must be completed before paid launch.", "يجب استكمال البيانات القانونية للبائع قبل إطلاق الاشتراكات المدفوعة.")}</p>
      {billing?.subscription && !hasPaidSubscription ? <p className="text-sm text-steel">{label("Choosing Subscribe starts the monthly subscription immediately after successful checkout. Your remaining trial does not create a second paid subscription.", "يبدأ الاشتراك الشهري فور إتمام الدفع بنجاح. لا تنشئ المدة المتبقية من التجربة اشتراكاً مدفوعاً آخر.")}</p> : null}
    </> : <StatusMessage type="loading">{label("Loading plans...", "جارٍ تحميل الخطط...")}</StatusMessage>}
  </LedgerPageBody></LedgerPage>;
}
