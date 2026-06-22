import {
  ArrowLeft,
  ArrowRight,
  Banknote,
  BookOpen,
  Boxes,
  CheckCircle2,
  FileArchive,
  FileText,
  Globe2,
  LayoutDashboard,
  LockKeyhole,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import type { ComponentType, ReactNode, SVGProps } from "react";
import { getLedgerByteEdition, type LedgerByteMarket } from "@/lib/edition";

export type MarketingLocale = "en" | "ar";
export type MarketingPageKey = "home" | "product" | "workflows" | "readiness" | "pricing" | "resources";

type MarketingNavItem = {
  key: Exclude<MarketingPageKey, "home">;
  label: string;
};

type MarketingCard = {
  title: string;
  description: string;
  meta?: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
};

type MarketingContent = {
  locale: MarketingLocale;
  dir: "ltr" | "rtl";
  brandSubline: string;
  defaultCurrency: string;
  nav: MarketingNavItem[];
  languageLabel: string;
  languageHref: string;
  betaLogin: string;
  secondaryCta: string;
  heroTitle: string;
  heroBody: string;
  heroFootnote: string;
  proofLabel: string;
  dashboardTitle: string;
  dashboardSubtitle: string;
  dashboardRows: readonly { label: string; value: string; tone: "good" | "watch" | "quiet" }[];
  dashboardPanels: readonly { title: string; body: string; icon: ComponentType<SVGProps<SVGSVGElement>> }[];
  sectionTitle: string;
  sectionBody: string;
  workflowTitle: string;
  workflowBody: string;
  readinessTitle: string;
  readinessBody: string;
  pricingTitle: string;
  pricingBody: string;
  resourcesTitle: string;
  resourcesBody: string;
  cards: readonly MarketingCard[];
  workflows: readonly MarketingCard[];
  readiness: readonly MarketingCard[];
  resources: readonly MarketingCard[];
  footerNote: string;
};

type DetailContent = {
  title: string;
  body: string;
  introCards: readonly MarketingCard[];
  detailTitle: string;
  detailBody: string;
  detailCards: readonly MarketingCard[];
  closingTitle: string;
  closingBody: string;
};

const localizedPathByKey: Record<MarketingLocale, Record<MarketingPageKey, string>> = {
  en: {
    home: "/",
    product: "/product",
    workflows: "/workflows",
    readiness: "/readiness",
    pricing: "/pricing",
    resources: "/resources",
  },
  ar: {
    home: "/ar",
    product: "/ar/product",
    workflows: "/ar/workflows",
    readiness: "/ar/readiness",
    pricing: "/ar/pricing",
    resources: "/ar/resources",
  },
};

const forbiddenClaims = [/production compliant/i, /certified zatca/i, /live bank feeds/i, /public trial/i, /automated VAT filing/i];

export const marketingContent: Record<MarketingLocale, MarketingContent> = {
  en: {
    locale: "en",
    dir: "ltr",
    brandSubline: "Accounting workspace",
    defaultCurrency: "USD",
    nav: [
      { key: "product", label: "Product" },
      { key: "workflows", label: "Workflows" },
      { key: "readiness", label: "Readiness" },
      { key: "pricing", label: "Pricing" },
      { key: "resources", label: "Resources" },
    ],
    languageLabel: "العربية",
    languageHref: "/ar",
    betaLogin: "Beta login",
    secondaryCta: "View product preview",
    heroTitle: "Accounting built for controlled workspaces.",
    heroBody:
      "LedgerByte is a coming-soon accounting workspace for teams that need invoices, payments, purchases, inventory, documents, roles, and readiness evidence in one controlled place.",
    heroFootnote: "Private beta access only. Public plans open after product, accountant, and operations review.",
    proofLabel: "Product evidence from the beta workspace",
    dashboardTitle: "LedgerByte control desk",
    dashboardSubtitle: "Invoices, payments, reports, banking imports, and readiness checks share one operating view.",
    dashboardRows: [
      { label: "Invoice INV-1042", value: "Ready for payment", tone: "good" },
      { label: "VAT summary", value: "Review period", tone: "watch" },
      { label: "Bank import", value: "Manual preview", tone: "quiet" },
      { label: "Compliance readiness", value: "Groundwork visible", tone: "watch" },
    ],
    dashboardPanels: [
      { title: "Receivables", body: "Invoice, credit note, receipt, and customer statement paths.", icon: ReceiptText },
      { title: "Reports", body: "General ledger, P&L, balance sheet, VAT summary, and aging views.", icon: LayoutDashboard },
      { title: "Controls", body: "Roles, audit logs, document archive, and storage readiness.", icon: ShieldCheck },
    ],
    sectionTitle: "A complete public story for a serious accounting product",
    sectionBody:
      "The website explains what LedgerByte already demonstrates in beta, what remains gated, and why invited users can trust the workflow boundaries.",
    workflowTitle: "One workspace for the daily accounting loop",
    workflowBody: "Move from customer invoice to payment, from purchase bill to supplier statement, and from import review to reporting without losing the audit trail.",
    readinessTitle: "Readiness without overclaiming",
    readinessBody:
      "LedgerByte shows operational readiness evidence for accounting workflows, documents, storage, email, and compliance groundwork while keeping production-only claims out of the public site.",
    pricingTitle: "Private beta access, public plans later",
    pricingBody:
      "Public pricing is intentionally held until beta review, accountant feedback, hosting operations, and support workflows are ready.",
    resourcesTitle: "Resources for careful beta review",
    resourcesBody:
      "Use the public resources area to understand beta boundaries, sample workflows, accountant review material, and readiness notes before entering the product.",
    cards: [
      {
        title: "Accounting workspace structure",
        description: "Designed around VAT-aware invoices, customer and supplier ledgers, purchase flows, and review-ready presentation.",
        meta: "Regional fit",
        icon: Globe2,
      },
      {
        title: "Product evidence first",
        description: "The public site shows real module concepts from LedgerByte instead of vague marketing screens.",
        meta: "Beta workspace",
        icon: LayoutDashboard,
      },
      {
        title: "Controlled by role and audit trail",
        description: "Sensitive workflows are framed around roles, permissions, archive records, and reviewable actions.",
        meta: "Trust layer",
        icon: LockKeyhole,
      },
    ],
    workflows: [
      { title: "Sales and AR", description: "Invoices, customer payments, credit notes, refunds, statements, and report drill-downs.", icon: ReceiptText },
      { title: "Purchases and AP", description: "Purchase orders, bills, supplier payments, debit notes, supplier statements, and payment status.", icon: FileText },
      { title: "Banking review", description: "Manual statement import preview, transaction review, matching, reconciliation, and close history.", icon: Banknote },
      { title: "Inventory operations", description: "Warehouses, stock movements, receipts, issues, adjustments, transfers, and valuation views.", icon: Boxes },
    ],
    readiness: [
      { title: "Accounting MVP", description: "Core AR, AP, banking, inventory, reports, and document flows are visible for beta review.", meta: "Beta visible", icon: CheckCircle2 },
      { title: "Compliance readiness groundwork", description: "Local readiness surfaces are presented as groundwork only, without provider or certification claims.", meta: "No certification claim", icon: ShieldCheck },
      { title: "Operations gate", description: "Hosted backup, object storage, monitoring, email delivery, and support evidence remain review gates.", meta: "Coming soon", icon: Sparkles },
    ],
    resources: [
      { title: "Beta access guide", description: "How invited testers should enter, review workflows, and avoid real customer data during beta.", icon: UsersRound },
      { title: "Accountant review packet", description: "The review path for chart of accounts, reports, statements, PDFs, and accounting wording.", icon: BookOpen },
      { title: "Readiness scorecard", description: "A plain-language status view of product areas, blockers, and next review priorities.", icon: FileArchive },
    ],
    footerNote: "LedgerByte is in private beta. Public launch, production operations, and official compliance claims remain gated by review.",
  },
  ar: {
    locale: "ar",
    dir: "rtl",
    brandSubline: "مساحة عمل محاسبية",
    defaultCurrency: "USD",
    nav: [
      { key: "product", label: "المنتج" },
      { key: "workflows", label: "مسارات العمل" },
      { key: "readiness", label: "الجاهزية" },
      { key: "pricing", label: "الأسعار" },
      { key: "resources", label: "الموارد" },
    ],
    languageLabel: "English",
    languageHref: "/",
    betaLogin: "دخول النسخة التجريبية",
    secondaryCta: "عرض لمحة المنتج",
    heroTitle: "دفاتر أوضح لأعمال الخليج",
    heroBody:
      "ليدجر بايت مساحة محاسبية قادمة لفرق تحتاج إلى الفواتير، المدفوعات، المشتريات، المخزون، المستندات، الصلاحيات، ومؤشرات الجاهزية في مكان واحد مضبوط.",
    heroFootnote: "الدخول متاح للنسخة التجريبية الخاصة فقط. الخطط العامة تفتح بعد مراجعة المنتج والمحاسبين والتشغيل.",
    proofLabel: "دليل المنتج من مساحة البيتا",
    dashboardTitle: "لوحة تحكم ليدجر بايت",
    dashboardSubtitle: "الفواتير، المدفوعات، التقارير، مراجعة كشوف البنك، وفحوص الجاهزية في عرض تشغيلي واحد.",
    dashboardRows: [
      { label: "فاتورة INV-1042", value: "جاهزة للدفع", tone: "good" },
      { label: "ملخص الضريبة", value: "مراجعة الفترة", tone: "watch" },
      { label: "استيراد بنكي", value: "معاينة يدوية", tone: "quiet" },
      { label: "جاهزية الامتثال", value: "أساسيات ظاهرة", tone: "watch" },
    ],
    dashboardPanels: [
      { title: "المدينون", body: "الفواتير، الإشعارات، الإيصالات، وكشوف العملاء.", icon: ReceiptText },
      { title: "التقارير", body: "الأستاذ العام، الأرباح والخسائر، الميزانية، الضريبة، والأعمار.", icon: LayoutDashboard },
      { title: "الضبط", body: "الأدوار، سجل التدقيق، أرشيف المستندات، وجاهزية التخزين.", icon: ShieldCheck },
    ],
    sectionTitle: "موقع عام كامل لمنتج محاسبي جاد",
    sectionBody: "الموقع يوضح ما يظهر في البيتا، وما يبقى ضمن حدود المراجعة، ولماذا يستطيع المستخدم المدعو فهم نطاق العمل بثقة.",
    workflowTitle: "مساحة واحدة للدورة المحاسبية اليومية",
    workflowBody: "من فاتورة العميل إلى الدفع، ومن فاتورة المورد إلى الكشف، ومن مراجعة الاستيراد إلى التقارير مع أثر تدقيق واضح.",
    readinessTitle: "جاهزية بلا مبالغة",
    readinessBody: "يعرض ليدجر بايت مؤشرات جاهزية لمسارات المحاسبة والمستندات والتخزين والبريد وأساسيات الامتثال مع إبقاء وعود الإنتاج خارج الموقع العام.",
    pricingTitle: "دخول بيتا خاص، والخطط العامة لاحقا",
    pricingBody: "يتم تأجيل الأسعار العامة حتى تنتهي مراجعة البيتا، وملاحظات المحاسب، وجاهزية التشغيل والاستضافة والدعم.",
    resourcesTitle: "موارد لمراجعة بيتا دقيقة",
    resourcesBody: "منطقة الموارد تشرح حدود البيتا، ومسارات العمل، ومواد مراجعة المحاسب، وملاحظات الجاهزية قبل الدخول إلى المنتج.",
    cards: [
      {
        title: "هيكل مساحة محاسبية",
        description: "فواتير واعية بالضريبة، دفاتر عملاء وموردين، مشتريات، وعرض جاهز للمراجعة.",
        meta: "ملاءمة محلية",
        icon: Globe2,
      },
      {
        title: "الدليل من المنتج أولا",
        description: "يعرض الموقع مفاهيم وحدات حقيقية من ليدجر بايت بدلا من شاشات تسويقية عامة.",
        meta: "مساحة البيتا",
        icon: LayoutDashboard,
      },
      {
        title: "صلاحيات وأثر تدقيق",
        description: "المسارات الحساسة موضحة من خلال الأدوار، الصلاحيات، الأرشفة، والإجراءات القابلة للمراجعة.",
        meta: "طبقة الثقة",
        icon: LockKeyhole,
      },
    ],
    workflows: [
      { title: "المبيعات والمدينون", description: "الفواتير، مدفوعات العملاء، الإشعارات الدائنة، المبالغ المعادة، الكشوف، والتقارير.", icon: ReceiptText },
      { title: "المشتريات والدائنون", description: "أوامر الشراء، فواتير الموردين، المدفوعات، الإشعارات المدينة، وكشوف الموردين.", icon: FileText },
      { title: "مراجعة البنك", description: "معاينة استيراد كشف البنك يدويا، مراجعة الحركات، المطابقة، والتسوية.", icon: Banknote },
      { title: "تشغيل المخزون", description: "المستودعات، حركات المخزون، الاستلام، الصرف، التسويات، التحويلات، وعروض القيمة.", icon: Boxes },
    ],
    readiness: [
      { title: "أساس محاسبي للبيتا", description: "مسارات المدينين والدائنين والبنوك والمخزون والتقارير والمستندات ظاهرة للمراجعة.", meta: "ظاهر في البيتا", icon: CheckCircle2 },
      { title: "أساسيات جاهزية الامتثال", description: "مسارات الجاهزية المحلية تعرض كأساس تقني فقط.", meta: "بلا ادعاء اعتماد", icon: ShieldCheck },
      { title: "بوابة التشغيل", description: "النسخ الاحتياطي والاستضافة والتخزين والمراقبة وتسليم البريد والدعم تبقى ضمن بوابات المراجعة.", meta: "قريبا", icon: Sparkles },
    ],
    resources: [
      { title: "دليل دخول البيتا", description: "كيف يدخل المختبرون المدعوون، ويراجعون المسارات، ويتجنبون بيانات العملاء الحقيقية.", icon: UsersRound },
      { title: "حزمة مراجعة المحاسب", description: "مسار مراجعة الحسابات، التقارير، الكشوف، ملفات PDF، وصياغة المحاسبة.", icon: BookOpen },
      { title: "بطاقة الجاهزية", description: "عرض واضح لحالة مناطق المنتج، العوائق، وأولويات المراجعة القادمة.", icon: FileArchive },
    ],
    footerNote: "ليدجر بايت في بيتا خاص. الإطلاق العام والتشغيل وادعاءات الامتثال الرسمية تبقى مرتبطة بالمراجعة.",
  },
};

export function marketingContentForMarket(
  locale: MarketingLocale,
  market: LedgerByteMarket = getLedgerByteEdition().market,
): MarketingContent {
  const base = marketingContent[locale];
  const edition = getLedgerByteEdition(market);

  if (market === "KSA") {
    return {
      ...base,
      brandSubline: locale === "en" ? "KSA accounting workspace" : "مساحة محاسبية للسعودية",
      defaultCurrency: edition.defaultCurrency,
      heroTitle: locale === "en" ? "Accounting built for Saudi workflows." : base.heroTitle,
      readinessBody:
        locale === "en"
          ? "LedgerByte shows operational readiness evidence for accounting workflows, documents, storage, email, and ZATCA groundwork while keeping production-only claims out of the public site."
          : base.readinessBody,
      dashboardRows: base.dashboardRows.map((row) =>
        row.label === "Compliance readiness" || row.label === "جاهزية الامتثال"
          ? { ...row, label: locale === "en" ? "ZATCA readiness" : "جاهزية زاتكا" }
          : row,
      ),
      readiness: base.readiness.map((card) =>
        card.title === "Compliance readiness groundwork"
          ? {
              ...card,
              title: "ZATCA readiness groundwork",
              description: "Local XML, QR, hash, CSR, and SDK readiness surfaces are presented as groundwork only.",
            }
          : card,
      ),
    };
  }

  if (market === "UAE") {
    return {
      ...base,
      brandSubline: locale === "en" ? "UAE accounting workspace" : "مساحة محاسبية للإمارات",
      defaultCurrency: edition.defaultCurrency,
      heroTitle: locale === "en" ? "Accounting built for UAE workflows." : base.heroTitle,
      readinessBody:
        locale === "en"
          ? "LedgerByte shows operational readiness evidence for accounting workflows, documents, storage, email, and UAE eInvoicing/PINT-AE groundwork while keeping production-only claims out of the public site."
          : base.readinessBody,
      dashboardRows: base.dashboardRows.map((row) =>
        row.label === "Compliance readiness" || row.label === "جاهزية الامتثال"
          ? { ...row, label: locale === "en" ? "UAE eInvoicing readiness" : "جاهزية الفوترة الإلكترونية الإماراتية" }
          : row,
      ),
      readiness: base.readiness.map((card) =>
        card.title === "Compliance readiness groundwork"
          ? {
              ...card,
              title: "UAE eInvoicing/PINT-AE readiness",
              description: "Local readiness surfaces are framed around UAE eInvoicing and PINT-AE preparation without provider or accreditation claims.",
            }
          : card,
      ),
    };
  }

  return {
    ...base,
    defaultCurrency: edition.defaultCurrency,
  };
}

export const marketingDetails: Record<MarketingLocale, Record<Exclude<MarketingPageKey, "home">, DetailContent>> = {
  en: {
    product: {
      title: "A product-led accounting workspace for invited beta teams",
      body: "LedgerByte presents the real working surfaces a finance team needs to review: dashboards, invoices, payments, reports, documents, permissions, and readiness checks.",
      introCards: marketingContent.en.cards,
      detailTitle: "The public site mirrors the product structure",
      detailBody: "Each section points to a real LedgerByte area so prospects see the shape of the workspace before they enter beta.",
      detailCards: [
        { title: "Receivables", description: "Invoice, credit note, receipt, and customer statement paths.", icon: ReceiptText },
        { title: "Reports", description: "General ledger, P&L, balance sheet, VAT summary, and aging views.", icon: LayoutDashboard },
        { title: "Controls", description: "Roles, audit logs, document archive, and storage readiness.", icon: ShieldCheck },
      ],
      closingTitle: "Built for careful review",
      closingBody: "The product story stays complete without implying the software is open for public launch.",
    },
    workflows: {
      title: "Accounting workflows that keep source records connected",
      body: "LedgerByte is organized around everyday transaction loops rather than isolated screens.",
      introCards: marketingContent.en.workflows,
      detailTitle: "From source document to report",
      detailBody: "The workflow pages explain what moves, what stays locked for review, and where users inspect the audit trail.",
      detailCards: [
        { title: "First sale", description: "Customer, invoice, payment, ledger, and P&L path for early beta validation.", icon: ReceiptText },
        { title: "Supplier loop", description: "Supplier, purchase bill, supplier payment, debit note, and AP aging flow.", icon: FileText },
        { title: "Reconciliation loop", description: "Manual import, transaction review, match, reconciliation summary, and close history.", icon: Banknote },
      ],
      closingTitle: "No hidden automation promises",
      closingBody: "Where a workflow remains manual or review-gated, the public copy says so directly.",
    },
    readiness: {
      title: "Readiness evidence, shown with conservative boundaries",
      body: "The readiness page tells beta users where LedgerByte is strong, where it is still gated, and what needs operational proof before launch.",
      introCards: marketingContent.en.readiness,
      detailTitle: "What readiness means here",
      detailBody: "Readiness is framed as reviewable evidence, not a shortcut to legal or operational sign-off.",
      detailCards: [
        { title: "Documents and archive", description: "Generated PDFs, archive rows, attachment groundwork, and storage readiness are visible.", icon: FileArchive },
        { title: "Security controls", description: "Role-based navigation, permission guards, audit logs, and beta access management shape the trust model.", icon: LockKeyhole },
        { title: "Compliance groundwork", description: "Local readiness surfaces remain carefully named as groundwork until later official steps are complete.", icon: ShieldCheck },
      ],
      closingTitle: "Public wording stays aligned with the product",
      closingBody: "The page avoids claims that would outrun the current implementation or review status.",
    },
    pricing: {
      title: "Private beta access, public plans later",
      body: marketingContent.en.pricingBody,
      introCards: [
        { title: "Invited beta", description: "Existing invited testers use beta login to access their workspace.", meta: "Active path", icon: LockKeyhole },
        { title: "Public launch", description: "Self-serve plans open only after readiness gates are reviewed.", meta: "Coming soon", icon: Sparkles },
        { title: "Support model", description: "Pricing waits for support, hosting, operations, and accountant feedback to settle.", meta: "Under review", icon: UsersRound },
      ],
      detailTitle: "Why plans are not listed yet",
      detailBody: "The website should feel complete like Xero and Wafeq, but LedgerByte's pricing promise must match its current private-beta stage.",
      detailCards: [
        { title: "No self-serve signup push", description: "The public site guides invited users to login and keeps casual visitors in coming-soon context.", icon: LockKeyhole },
        { title: "No feature overreach", description: "Plan descriptions will wait until the final beta feature set and operations baseline are reviewed.", icon: CheckCircle2 },
        { title: "Regional packaging later", description: "Country and currency packaging can be added when launch scope is approved.", icon: Globe2 },
      ],
      closingTitle: "Clear today, expandable later",
      closingBody: "The page establishes trust now and leaves room for real public plans without reworking the site structure.",
    },
    resources: {
      title: "Resources for beta users, accountants, and operators",
      body: marketingContent.en.resourcesBody,
      introCards: marketingContent.en.resources,
      detailTitle: "What visitors can learn before entering beta",
      detailBody: "Resources translate the internal audit and review work into public, careful language.",
      detailCards: [
        { title: "Beta workflow notes", description: "Explain the expected first review path and where testers should focus.", icon: BookOpen },
        { title: "Accounting review", description: "Frame statements, reports, and PDF outputs as accountant-review material.", icon: FileText },
        { title: "Readiness notes", description: "Summarize what is ready for beta and what remains gated.", icon: FileArchive },
      ],
      closingTitle: "Useful without exposing internals",
      closingBody: "Resource cards stay public-safe and avoid operational secrets, credentials, customer data, or compliance overreach.",
    },
  },
  ar: {
    product: {
      title: "مساحة محاسبية تقودها واجهات المنتج لفرق البيتا",
      body: "يعرض ليدجر بايت أسطح العمل التي يحتاج فريق مالي إلى مراجعتها: اللوحات، الفواتير، المدفوعات، التقارير، المستندات، الصلاحيات، وفحوص الجاهزية.",
      introCards: marketingContent.ar.cards,
      detailTitle: "الموقع العام يعكس بنية المنتج",
      detailBody: "كل قسم يشير إلى منطقة فعلية في ليدجر بايت حتى يرى الزائر شكل مساحة العمل قبل دخول البيتا.",
      detailCards: [
        { title: "المدينون", description: "الفواتير، الإشعارات، الإيصالات، وكشوف العملاء.", icon: ReceiptText },
        { title: "التقارير", description: "الأستاذ العام، الأرباح والخسائر، الميزانية، الضريبة، والأعمار.", icon: LayoutDashboard },
        { title: "الضبط", description: "الأدوار، سجل التدقيق، أرشيف المستندات، وجاهزية التخزين.", icon: ShieldCheck },
      ],
      closingTitle: "مصمم للمراجعة الدقيقة",
      closingBody: "قصة المنتج تبقى كاملة من دون الإيحاء بأن البرنامج مفتوح للإطلاق العام.",
    },
    workflows: {
      title: "مسارات محاسبية تبقي السجلات مرتبطة",
      body: "ينظم ليدجر بايت العمل حول دورات المعاملات اليومية بدلا من شاشات منفصلة.",
      introCards: marketingContent.ar.workflows,
      detailTitle: "من المستند إلى التقرير",
      detailBody: "تشرح صفحات المسارات ما يتحرك، وما يبقى مقيدا للمراجعة، وأين يفحص المستخدم أثر التدقيق.",
      detailCards: [
        { title: "أول عملية بيع", description: "عميل، فاتورة، دفعة، دفتر، ومسار أرباح وخسائر لمراجعة البيتا.", icon: ReceiptText },
        { title: "دورة المورد", description: "مورد، فاتورة شراء، دفع للمورد، إشعار مدين، وأعمار الدائنين.", icon: FileText },
        { title: "دورة التسوية", description: "استيراد يدوي، مراجعة حركة، مطابقة، ملخص تسوية، وتاريخ إغلاق.", icon: Banknote },
      ],
      closingTitle: "بلا وعود تشغيل مخفية",
      closingBody: "عندما يبقى مسار ما يدويا أو مقيدا بالمراجعة، يذكر الموقع ذلك بوضوح.",
    },
    readiness: {
      title: "دلائل جاهزية بحدود محافظة",
      body: "توضح صفحة الجاهزية نقاط قوة ليدجر بايت، وما يبقى ضمن البوابات، وما يحتاج إلى إثبات تشغيلي قبل الإطلاق.",
      introCards: marketingContent.ar.readiness,
      detailTitle: "ما معنى الجاهزية هنا",
      detailBody: "الجاهزية تعني دليلا قابلا للمراجعة، لا بديلا عن الاعتماد القانوني أو التشغيلي.",
      detailCards: [
        { title: "المستندات والأرشيف", description: "ملفات PDF، سجلات الأرشيف، أساس المرفقات، وجاهزية التخزين ظاهرة.", icon: FileArchive },
        { title: "ضوابط الأمان", description: "التنقل حسب الدور، حراس الصلاحيات، سجلات التدقيق، وإدارة دخول البيتا.", icon: LockKeyhole },
        { title: "أساسيات زاتكا", description: "تبقى أسطح الجاهزية المحلية مسماة كأساس تقني حتى تكتمل الخطوات الرسمية اللاحقة.", icon: ShieldCheck },
      ],
      closingTitle: "الصياغة العامة تتبع المنتج",
      closingBody: "تتجنب الصفحة وعودا تتجاوز حالة التنفيذ أو المراجعة الحالية.",
    },
    pricing: {
      title: "دخول بيتا خاص، والخطط العامة لاحقا",
      body: marketingContent.ar.pricingBody,
      introCards: [
        { title: "بيتا للمدعوين", description: "المختبرون المدعوون يستخدمون دخول النسخة التجريبية للوصول إلى مساحاتهم.", meta: "المسار الحالي", icon: LockKeyhole },
        { title: "الإطلاق العام", description: "الخطط الذاتية تفتح فقط بعد مراجعة بوابات الجاهزية.", meta: "قريبا", icon: Sparkles },
        { title: "نموذج الدعم", description: "الأسعار تنتظر استقرار الدعم والاستضافة والتشغيل وملاحظات المحاسب.", meta: "قيد المراجعة", icon: UsersRound },
      ],
      detailTitle: "لماذا لا تظهر الخطط الآن",
      detailBody: "يجب أن يبدو الموقع كاملا مثل المواقع المحاسبية الجادة، لكن وعد الأسعار يجب أن يطابق مرحلة البيتا الخاصة.",
      detailCards: [
        { title: "بلا دفع لتسجيل عام", description: "الموقع يوجه المستخدم المدعو إلى الدخول ويبقي الزائر العام في سياق قريبا.", icon: LockKeyhole },
        { title: "بلا توسع في الوعود", description: "وصف الباقات ينتظر مراجعة مزايا البيتا النهائية وخط التشغيل.", icon: CheckCircle2 },
        { title: "تغليف محلي لاحقا", description: "يمكن إضافة الدول والعملات عندما يعتمد نطاق الإطلاق.", icon: Globe2 },
      ],
      closingTitle: "واضح الآن وقابل للتوسع لاحقا",
      closingBody: "تؤسس الصفحة الثقة الآن وتترك مساحة لخطط عامة حقيقية دون إعادة بناء هيكل الموقع.",
    },
    resources: {
      title: "موارد لمستخدمي البيتا والمحاسبين والتشغيل",
      body: marketingContent.ar.resourcesBody,
      introCards: marketingContent.ar.resources,
      detailTitle: "ما الذي يتعلمه الزائر قبل دخول البيتا",
      detailBody: "تترجم الموارد أعمال التدقيق والمراجعة الداخلية إلى لغة عامة ومحافظة.",
      detailCards: [
        { title: "ملاحظات مسار البيتا", description: "تشرح مسار المراجعة الأول والمتوقع، وأين يركز المختبر.", icon: BookOpen },
        { title: "مراجعة محاسبية", description: "تضع الكشوف والتقارير ومخرجات PDF كمواد مراجعة للمحاسب.", icon: FileText },
        { title: "ملاحظات الجاهزية", description: "تلخص ما هو جاهز للبيتا وما يبقى ضمن بوابات المراجعة.", icon: FileArchive },
      ],
      closingTitle: "مفيد من دون كشف الداخل",
      closingBody: "تبقى بطاقات الموارد آمنة للنشر ولا تعرض أسرارا تشغيلية أو بيانات عملاء أو وعودا تتجاوز النطاق.",
    },
  },
};

export function marketingPath(locale: MarketingLocale, key: MarketingPageKey) {
  return localizedPathByKey[locale][key];
}

export function alternateMarketingPath(locale: MarketingLocale, key: MarketingPageKey) {
  return localizedPathByKey[locale === "en" ? "ar" : "en"][key];
}

export function marketingMetadata(locale: MarketingLocale, key: MarketingPageKey) {
  const content = marketingContentForMarket(locale);
  const title = key === "home" ? content.heroTitle : marketingDetails[locale][key].title;
  const description = key === "home" ? content.heroBody : marketingDetails[locale][key].body;
  const path = marketingPath(locale, key);
  const alternatePath = alternateMarketingPath(locale, key);

  return {
    title: `${stripTrailingPunctuation(title)} | LedgerByte`,
    description,
    alternates: {
      canonical: path,
      languages: locale === "en" ? { ar: alternatePath, en: path } : { en: alternatePath, ar: path },
    },
  };
}

export function MarketingHomePage({ locale }: { locale: MarketingLocale }) {
  const content = marketingContentForMarket(locale);

  assertNoForbiddenClaims(content);

  return (
    <MarketingShell locale={locale} pageKey="home">
      <section className="relative overflow-hidden px-4 pb-14 pt-7 sm:px-6 lg:px-8 lg:pb-20">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[minmax(0,0.92fr)_minmax(520px,1.08fr)] lg:items-center">
          <div className="max-w-3xl">
            <div className="mb-8 flex max-w-xl items-center gap-3 rounded-md border border-emerald-900/10 bg-white px-4 py-2 text-sm text-slate-700 shadow-sm">
              <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-800" aria-hidden="true" />
              <span>{content.heroFootnote}</span>
            </div>
            <h1 className="max-w-4xl text-balance text-5xl font-semibold leading-[0.98] tracking-normal text-slate-950 sm:text-6xl lg:text-7xl">
              {content.heroTitle}
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-700">{content.heroBody}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <MarketingButton href="/login" variant="primary">
                {content.betaLogin}
              </MarketingButton>
              <MarketingButton href="#product-preview" variant="secondary">
                {content.secondaryCta}
              </MarketingButton>
            </div>
          </div>
          <ProductPreview content={content} />
        </div>
      </section>

      <section id="product-preview" className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeader title={content.sectionTitle} body={content.sectionBody} align={locale === "ar" ? "right" : "left"} />
          <CardGrid cards={content.cards} className="mt-10" />
        </div>
      </section>

      <SplitSection
        locale={locale}
        title={content.workflowTitle}
        body={content.workflowBody}
        cards={content.workflows}
        linkHref={marketingPath(locale, "workflows")}
        linkLabel={locale === "en" ? "Explore workflows" : "استعراض المسارات"}
      />

      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl rounded-md border border-amber-900/10 bg-amber-50 p-6 shadow-panel sm:p-10 lg:p-12">
          <div className="grid gap-10 lg:grid-cols-[0.92fr_1.08fr] lg:items-start">
            <SectionHeader title={content.readinessTitle} body={content.readinessBody} align={locale === "ar" ? "right" : "left"} />
            <CardGrid cards={content.readiness} compact />
          </div>
        </div>
      </section>

      <SplitSection
        locale={locale}
        title={content.resourcesTitle}
        body={content.resourcesBody}
        cards={content.resources}
        linkHref={marketingPath(locale, "resources")}
        linkLabel={locale === "en" ? "Read beta resources" : "قراءة موارد البيتا"}
      />
    </MarketingShell>
  );
}

export function MarketingDetailPage({ locale, pageKey }: { locale: MarketingLocale; pageKey: Exclude<MarketingPageKey, "home"> }) {
  const content = marketingContentForMarket(locale);
  const detail = marketingDetails[locale][pageKey];

  assertNoForbiddenClaims({ content, detail });

  return (
    <MarketingShell locale={locale} pageKey={pageKey}>
      <section className="px-4 pb-14 pt-10 sm:px-6 lg:px-8 lg:pb-20">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[minmax(0,0.95fr)_minmax(420px,0.75fr)] lg:items-end">
          <div>
            <p className="mb-5 text-sm font-semibold uppercase tracking-[0.24em] text-emerald-800">{content.nav.find((item) => item.key === pageKey)?.label}</p>
            <h1 className="max-w-4xl text-balance text-4xl font-semibold leading-tight text-slate-950 sm:text-5xl lg:text-6xl">{detail.title}</h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-700">{detail.body}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <MarketingButton href="/login" variant="primary">
                {content.betaLogin}
              </MarketingButton>
              <MarketingButton href={alternateMarketingPath(locale, pageKey)} variant="secondary">
                {content.languageLabel}
              </MarketingButton>
            </div>
          </div>
          <MiniLedger locale={locale} />
        </div>
      </section>

      <section className="px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <CardGrid cards={detail.introCards} />
        </div>
      </section>

      <section className="px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.86fr_1.14fr] lg:items-start">
          <SectionHeader title={detail.detailTitle} body={detail.detailBody} align={locale === "ar" ? "right" : "left"} />
          <CardGrid cards={detail.detailCards} compact />
        </div>
      </section>

      <section className="px-4 pb-20 pt-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl rounded-md bg-slate-950 p-8 text-white shadow-panel sm:p-10 lg:p-12">
          <div className="max-w-3xl">
            <h2 className="text-3xl font-semibold sm:text-4xl">{detail.closingTitle}</h2>
            <p className="mt-4 text-base leading-7 text-slate-300">{detail.closingBody}</p>
            <Link href="/login" className="mt-8 inline-flex items-center gap-2 rounded-md bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-50">
              {content.betaLogin}
              {locale === "ar" ? <ArrowLeft className="h-4 w-4" aria-hidden="true" /> : <ArrowRight className="h-4 w-4" aria-hidden="true" />}
            </Link>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}

function MarketingShell({
  locale,
  pageKey,
  children,
}: {
  locale: MarketingLocale;
  pageKey: MarketingPageKey;
  children: ReactNode;
}) {
  const content = marketingContentForMarket(locale);

  return (
    <main
      lang={locale}
      dir={content.dir}
      className="min-h-screen bg-slate-50 text-slate-950 [font-family:Manrope,Readex_Pro,ui-sans-serif,system-ui,sans-serif]"
    >
      <header className="sticky top-0 z-30 border-b border-emerald-950/10 bg-white/90 px-4 py-4 backdrop-blur sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <Link href={marketingPath(locale, "home")} className="group flex min-w-0 items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-emerald-900 text-sm font-bold text-white shadow-sm">LB</span>
            <span className="min-w-0">
              <span className="block text-base font-semibold leading-5 text-slate-950">LedgerByte</span>
              <span className="block truncate text-xs text-slate-600">{content.brandSubline}</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm font-medium text-slate-700 lg:flex" aria-label={locale === "en" ? "Public navigation" : "التنقل العام"}>
            {content.nav.map((item) => (
              <Link
                key={item.key}
                href={marketingPath(locale, item.key)}
                className={pageKey === item.key ? "text-emerald-900" : "transition hover:text-emerald-900"}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex shrink-0 items-center gap-2">
            <Link href={content.languageHref} className="hidden rounded-md border border-emerald-950/10 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-emerald-900/20 hover:text-emerald-900 sm:inline-flex">
              {content.languageLabel}
            </Link>
            <Link href="/login" className="rounded-md bg-emerald-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-950">
              {content.betaLogin}
            </Link>
          </div>
        </div>
        <nav className="mx-auto mt-4 flex max-w-7xl gap-2 overflow-x-auto pb-1 text-sm lg:hidden" aria-label={locale === "en" ? "Mobile public navigation" : "تنقل عام مختصر"}>
          {content.nav.map((item) => (
            <Link
              key={item.key}
              href={marketingPath(locale, item.key)}
              className={`whitespace-nowrap rounded-md border px-3 py-2 font-medium ${
                pageKey === item.key ? "border-emerald-900 bg-emerald-50 text-emerald-900" : "border-emerald-950/10 bg-white text-slate-700"
              }`}
            >
              {item.label}
            </Link>
          ))}
          <Link href={content.languageHref} className="whitespace-nowrap rounded-md border border-emerald-950/10 bg-white px-3 py-2 font-medium text-slate-700">
            {content.languageLabel}
          </Link>
        </nav>
      </header>
      {children}
      <footer className="border-t border-emerald-950/10 bg-white px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-[0.9fr_1.1fr]">
          <div>
            <div className="text-lg font-semibold text-slate-950">LedgerByte</div>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600">{content.footerNote}</p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            {content.nav.map((item) => (
              <Link key={item.key} href={marketingPath(locale, item.key)} className="text-slate-600 transition hover:text-emerald-900">
                {item.label}
              </Link>
            ))}
            <Link href="/login" className="font-semibold text-emerald-900">
              {locale === "en" ? "Beta access" : "الوصول للبيتا"}
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

function ProductPreview({ content }: { content: MarketingContent }) {
  return (
    <div id="product-preview-card" className="relative" aria-label={content.proofLabel}>
      <div className="relative overflow-hidden rounded-md border border-emerald-950/10 bg-white shadow-panel">
        <div className="border-b border-slate-200 bg-slate-950 px-5 py-4 text-white">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">{content.dashboardTitle}</div>
              <div className="mt-1 text-xs text-slate-300">{content.dashboardSubtitle}</div>
            </div>
            <div className="flex gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
              <span className="h-2.5 w-2.5 rounded-full bg-slate-500" />
            </div>
          </div>
        </div>
        <div className="grid gap-5 p-5 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-3">
            {content.dashboardRows.map((row) => (
              <div key={`${row.label}-${row.value}`} className="flex items-center justify-between gap-4 rounded-md border border-line bg-mist px-4 py-3">
                <span className="text-sm font-medium text-slate-800">{row.label}</span>
                <span className={`rounded-md px-3 py-1 text-xs font-semibold ${rowToneClass(row.tone)}`}>{row.value}</span>
              </div>
            ))}
            <div className="rounded-md border border-emerald-900/10 bg-emerald-50 p-4">
              <div className="flex items-center justify-between text-sm font-semibold text-emerald-950">
                <span>Cash movement</span>
                <span>{content.defaultCurrency}</span>
              </div>
              <div className="mt-4 flex h-28 items-end gap-2" aria-hidden="true">
                {[38, 62, 48, 74, 55, 86, 68, 92].map((height, index) => (
                  <span key={height + index} className="flex-1 rounded-t-md bg-emerald-800/80" style={{ height: `${height}%` }} />
                ))}
              </div>
            </div>
          </div>
          <div className="grid gap-3">
            {content.dashboardPanels.map((panel) => {
              const Icon = panel.icon;
              return (
                <div key={panel.title} className="rounded-md border border-line bg-panel p-4 shadow-sm">
                  <div className="flex items-center gap-3">
                    <span className="grid h-9 w-9 place-items-center rounded-md bg-emerald-900 text-white">
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <div>
                      <div className="text-sm font-semibold text-slate-950">{panel.title}</div>
                      <div className="mt-1 text-xs leading-5 text-slate-600">{panel.body}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniLedger({ locale }: { locale: MarketingLocale }) {
  const rows =
    locale === "en"
      ? [
          ["Invoice", "INV-1042", "Posted"],
          ["Payment", "PAY-221", "Allocated"],
          ["Report", "P&L", "Ready"],
        ]
      : [
          ["فاتورة", "INV-1042", "مرحلة"],
          ["دفعة", "PAY-221", "مخصصة"],
          ["تقرير", "P&L", "جاهز"],
        ];

  return (
    <div className="rounded-md border border-emerald-950/10 bg-white p-5 shadow-panel">
      <div className="mb-4 flex items-center justify-between">
        <div className="text-sm font-semibold text-slate-950">{locale === "en" ? "Beta workspace sample" : "مثال من مساحة البيتا"}</div>
        <span className="rounded-md bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">{locale === "en" ? "Coming soon" : "قريبا"}</span>
      </div>
      <div className="space-y-2">
        {rows.map(([type, number, status]) => (
          <div key={`${type}-${number}`} className="grid grid-cols-3 gap-3 rounded-md bg-slate-50 px-4 py-3 text-sm">
            <span className="font-medium text-slate-950">{type}</span>
            <span className="text-slate-600">{number}</span>
            <span className="text-emerald-800">{status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SplitSection({
  locale,
  title,
  body,
  cards,
  linkHref,
  linkLabel,
}: {
  locale: MarketingLocale;
  title: string;
  body: string;
  cards: readonly MarketingCard[];
  linkHref: string;
  linkLabel: string;
}) {
  return (
    <section className="px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:items-start">
        <div>
          <SectionHeader title={title} body={body} align={locale === "ar" ? "right" : "left"} />
          <Link href={linkHref} className="mt-7 inline-flex items-center gap-2 rounded-md border border-emerald-900/20 bg-white px-5 py-3 text-sm font-semibold text-emerald-900 shadow-sm transition hover:bg-emerald-50">
            {linkLabel}
            {locale === "ar" ? <ArrowLeft className="h-4 w-4" aria-hidden="true" /> : <ArrowRight className="h-4 w-4" aria-hidden="true" />}
          </Link>
        </div>
        <CardGrid cards={cards} compact />
      </div>
    </section>
  );
}

function SectionHeader({ title, body, align }: { title: string; body: string; align: "left" | "right" }) {
  return (
    <div className={align === "right" ? "text-right" : "text-left"}>
      <h2 className="max-w-3xl text-balance text-3xl font-semibold leading-tight text-slate-950 sm:text-4xl">{title}</h2>
      <p className="mt-4 max-w-3xl text-base leading-7 text-slate-700">{body}</p>
    </div>
  );
}

function CardGrid({ cards, compact = false, className = "" }: { cards: readonly MarketingCard[]; compact?: boolean; className?: string }) {
  return (
    <div className={`grid gap-4 ${compact ? "md:grid-cols-2" : "md:grid-cols-3"} ${className}`}>
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <article key={card.title} className="rounded-md border border-emerald-950/10 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-panel motion-reduce:transform-none">
            <div className="mb-5 flex items-center justify-between gap-4">
              <span className="grid h-11 w-11 place-items-center rounded-md bg-emerald-900 text-white">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              {card.meta ? <span className="rounded-md bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{card.meta}</span> : null}
            </div>
            <h3 className="text-lg font-semibold leading-6 text-slate-950">{card.title}</h3>
            <p className="mt-3 text-sm leading-6 text-slate-600">{card.description}</p>
          </article>
        );
      })}
    </div>
  );
}

function MarketingButton({ href, variant, children }: { href: string; variant: "primary" | "secondary"; children: ReactNode }) {
  const classes =
    variant === "primary"
      ? "bg-emerald-900 text-white hover:bg-emerald-950"
      : "border border-emerald-900/20 bg-white text-emerald-900 hover:bg-emerald-50";

  return (
    <Link href={href} className={`inline-flex items-center justify-center rounded-md px-5 py-3 text-sm font-semibold shadow-sm transition ${classes}`}>
      {children}
    </Link>
  );
}

function rowToneClass(tone: "good" | "watch" | "quiet") {
  if (tone === "good") {
    return "bg-emerald-100 text-emerald-900";
  }
  if (tone === "watch") {
    return "bg-amber-100 text-amber-900";
  }
  return "bg-slate-200 text-slate-700";
}

function stripTrailingPunctuation(value: string) {
  return value.replace(/[.،]+$/u, "");
}

function assertNoForbiddenClaims(input: unknown) {
  if (process.env.NODE_ENV === "production") {
    return;
  }

  const serialized = JSON.stringify(input);
  const match = forbiddenClaims.find((pattern) => pattern.test(serialized));
  if (match) {
    throw new Error(`Marketing content includes unsupported public claim: ${match}`);
  }
}
