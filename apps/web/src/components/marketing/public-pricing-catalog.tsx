"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { apiRequest } from "@/lib/api";

type Catalog = { plans: Array<{ key: string; displayName: string; amountMinor: number; seats: number }>; selfServiceEnabled: boolean; seller: { legalName: string | null } };
export function PublicPricingCatalog({ locale }: { locale: "en" | "ar" }) {
  const ar = locale === "ar";
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => { apiRequest<Catalog>("/billing/catalog", { auth: false, organizationId: null }).then(setCatalog).catch(() => setError(true)); }, []);
  return <section className="mx-auto max-w-6xl px-6 py-16">
    <h1 className="text-4xl font-semibold">{ar ? "خطط شهرية لمحاسبة أعمالك" : "Monthly plans for your back office"}</h1>
    <p className="mt-4 max-w-3xl text-slate-600">{ar ? "للمنشآت التجارية ومتاجر التجزئة السعودية. تجربة لمدة 14 يوماً دون بطاقة دفع. تشمل الخطط المحاسبة ومراجعة المخزون قبل الترحيل." : "For Saudi trading and retail businesses. Try the bookkeeping and inventory review workspace for 14 days without a card."}</p>
    {error ? <p role="alert" className="mt-6">{ar ? "تعذر تحميل الخطط. حاول مرة أخرى لاحقاً." : "Plans could not be loaded. Please try again later."}</p> : !catalog ? <p role="status" className="mt-6">{ar ? "جاري تحميل الخطط..." : "Loading plans..."}</p> : <>
      <div className="mt-10 grid gap-6 md:grid-cols-2">{catalog.plans.map((plan) => <article key={plan.key} className="rounded-md border border-emerald-950/10 bg-white p-8 shadow-sm">
        <h2 className="text-2xl font-semibold">{plan.displayName}</h2><p className="mt-4 text-4xl font-semibold">{plan.amountMinor / 100} <span className="text-base font-normal">{ar ? "ر.س / شهرياً" : "SAR / month"}</span></p>
        <p className="mt-4 text-slate-600">{ar ? `${plan.seats} مستخدمين بما فيهم المالك. تُحتسب الدعوات المعلقة ضمن الحد.` : `${plan.seats} seats including the owner. Pending invitations count toward your seat limit.`}</p>
        {catalog.selfServiceEnabled ? <Link href="/register" className="mt-6 inline-flex rounded-md bg-emerald-900 px-5 py-3 font-semibold text-white">{ar ? "ابدأ تجربة 14 يوماً" : "Start a 14-day trial"}</Link> : <p className="mt-6 font-medium">{ar ? "التسجيل الذاتي غير متاح حالياً." : "Self-service enrollment is not open in this environment."}</p>}
      </article>)}</div>
      <p className="mt-6 text-sm text-slate-600">{ar ? "تُعرض الضرائب المطبقة قبل إتمام الدفع. لا تشمل الخطط الإرسال إلى هيئة الزكاة والضريبة والجمارك أو الربط البنكي المباشر. تحصيل المدفوعات الفعلية غير مفعّل بعد." : "Applicable taxes are shown before checkout. Tax-authority submission and live banking are not included. Live payment collection is not enabled yet."}</p>
      {catalog.seller.legalName ? <p className="mt-3 text-sm text-slate-600">{ar ? "البائع:" : "Seller:"} {catalog.seller.legalName}, {ar ? "الإمارات العربية المتحدة" : "UAE"}</p> : null}
    </>}
  </section>;
}
