export const LEDGERBYTE_MARKETS = ["GENERIC", "KSA", "UAE"] as const;

export type LedgerByteMarket = (typeof LEDGERBYTE_MARKETS)[number];

export interface LedgerByteEdition {
  market: LedgerByteMarket;
  marketLabel: string;
  countryLabel: string;
  brandSubline: string;
  topbarSubtitle: string;
  shellFooter: string;
  defaultCurrency: string;
  complianceNavLabel: string;
  complianceNavHref: string;
  complianceReadinessLabel: string;
  complianceReadinessHref: string;
  complianceReadinessActionLabel: string;
  complianceReadinessTitle: string;
  complianceReadinessExplanation: string;
  complianceDashboardNote: string;
  invoiceComplianceTitle: string;
  invoiceComplianceDescription: string;
  invoiceComplianceChecks: {
    localReadinessLabel: string;
    localReadinessDetail: string;
    disconnectedLabel: string;
    disconnectedDetail: string;
  };
  complianceModules: {
    zatca: boolean;
    uaeEinvoicing: boolean;
  };
  isGeneric: boolean;
  isKsa: boolean;
  isUae: boolean;
  showZatca: boolean;
  showUaeEinvoicing: boolean;
  showCountryCompliance: boolean;
  showsKsaZatca: boolean;
  showsUaeEinvoicing: boolean;
}

const editions: Record<LedgerByteMarket, LedgerByteEdition> = {
  GENERIC: {
    market: "GENERIC",
    marketLabel: "Generic",
    countryLabel: "Global",
    brandSubline: "Accounting workspace",
    topbarSubtitle: "Accounting workspace",
    shellFooter: "Accounting workspace. Controlled beta review only.",
    defaultCurrency: "USD",
    complianceNavLabel: "Compliance readiness",
    complianceNavHref: "/settings/compliance",
    complianceReadinessLabel: "Compliance readiness",
    complianceReadinessHref: "/settings/compliance",
    complianceReadinessActionLabel: "Review compliance readiness",
    complianceReadinessTitle: "Compliance readiness visibility",
    complianceReadinessExplanation:
      "Country-specific compliance modules are hidden in the generic workspace. VAT and accounting review remains available without enabling tax-authority submission workflows.",
    complianceDashboardNote:
      "Generic compliance surfaces stay limited to VAT and accounting review. Country-specific eInvoicing modules are disabled in this workspace.",
    invoiceComplianceTitle: "Accounting readiness",
    invoiceComplianceDescription: "Local invoice review only. No tax-authority submission or provider reporting is enabled.",
    invoiceComplianceChecks: {
      localReadinessLabel: "Local invoice review",
      localReadinessDetail: "Customer and invoice fields are checked locally before finalization.",
      disconnectedLabel: "No authority submission",
      disconnectedDetail: "No eInvoicing provider, tax-authority reporting, or certification claim is made from this form.",
    },
    complianceModules: { zatca: false, uaeEinvoicing: false },
    isGeneric: true,
    isKsa: false,
    isUae: false,
    showZatca: false,
    showUaeEinvoicing: false,
    showCountryCompliance: false,
    showsKsaZatca: false,
    showsUaeEinvoicing: false,
  },
  KSA: {
    market: "KSA",
    marketLabel: "KSA",
    countryLabel: "Saudi Arabia",
    brandSubline: "KSA accounting workspace",
    topbarSubtitle: "KSA controlled beta",
    shellFooter: "KSA ZATCA readiness. Local readiness validation only.",
    defaultCurrency: "SAR",
    complianceNavLabel: "ZATCA readiness",
    complianceNavHref: "/settings/zatca",
    complianceReadinessLabel: "ZATCA readiness",
    complianceReadinessHref: "/settings/zatca",
    complianceReadinessActionLabel: "Review ZATCA readiness",
    complianceReadinessTitle: "ZATCA local readiness visibility",
    complianceReadinessExplanation:
      "ZATCA status shown here is local readiness only: real ZATCA network is disabled, production compliance remains false, OTP and CSID are still required, and clearance, reporting, and PDF/A-3 are not implemented.",
    complianceDashboardNote:
      "ZATCA readiness means local XML, QR, and hash readiness only. No production ZATCA submission, clearance, reporting, or compliance claim is enabled.",
    invoiceComplianceTitle: "ZATCA readiness",
    invoiceComplianceDescription: "Local ZATCA readiness only. No production clearance, reporting, or compliance claim is enabled.",
    invoiceComplianceChecks: {
      localReadinessLabel: "Local ZATCA readiness",
      localReadinessDetail: "Customer and invoice fields can be checked locally before later ZATCA preparation.",
      disconnectedLabel: "ZATCA network disabled",
      disconnectedDetail: "No production submission, clearance, reporting, or certification claim is made from this form.",
    },
    complianceModules: { zatca: true, uaeEinvoicing: false },
    isGeneric: false,
    isKsa: true,
    isUae: false,
    showZatca: true,
    showUaeEinvoicing: false,
    showCountryCompliance: true,
    showsKsaZatca: true,
    showsUaeEinvoicing: false,
  },
  UAE: {
    market: "UAE",
    marketLabel: "UAE",
    countryLabel: "United Arab Emirates",
    brandSubline: "UAE accounting workspace",
    topbarSubtitle: "UAE controlled beta",
    shellFooter: "UAE eInvoicing-ready. Local readiness validation only.",
    defaultCurrency: "AED",
    complianceNavLabel: "UAE eInvoicing readiness",
    complianceNavHref: "/settings/compliance",
    complianceReadinessLabel: "UAE eInvoicing readiness",
    complianceReadinessHref: "/settings/compliance",
    complianceReadinessActionLabel: "Review UAE readiness",
    complianceReadinessTitle: "UAE eInvoicing local readiness visibility",
    complianceReadinessExplanation:
      "UAE eInvoicing status shown here is local readiness validation only: ASP validation is not connected, no FTA reporting is enabled, and controlled-beta evidence does not prove production compliance.",
    complianceDashboardNote:
      "UAE eInvoicing-ready means local readiness validation only. ASP validation is not connected and there is no FTA reporting yet.",
    invoiceComplianceTitle: "UAE eInvoicing-ready",
    invoiceComplianceDescription: "Local readiness validation only. ASP validation not connected. No FTA reporting yet.",
    invoiceComplianceChecks: {
      localReadinessLabel: "Local readiness validation",
      localReadinessDetail: "Customer and invoice fields are checked locally before later PINT-AE preparation.",
      disconnectedLabel: "ASP validation not connected",
      disconnectedDetail: "No provider submission, no FTA reporting, and no certification claim is made from this form.",
    },
    complianceModules: { zatca: false, uaeEinvoicing: true },
    isGeneric: false,
    isKsa: false,
    isUae: true,
    showZatca: false,
    showUaeEinvoicing: true,
    showCountryCompliance: true,
    showsKsaZatca: false,
    showsUaeEinvoicing: true,
  },
};

export function normalizeLedgerByteMarket(value: string | null | undefined): LedgerByteMarket {
  const normalized = value?.trim().toUpperCase();
  return normalized === "KSA" || normalized === "UAE" || normalized === "GENERIC" ? normalized : "GENERIC";
}

export function getLedgerByteMarket(): LedgerByteMarket {
  return normalizeLedgerByteMarket(process.env.NEXT_PUBLIC_LEDGERBYTE_MARKET ?? process.env.LEDGERBYTE_MARKET);
}

export function getLedgerByteEdition(market: LedgerByteMarket = getLedgerByteMarket()): LedgerByteEdition {
  return editions[market];
}

export function isKsaEdition(market: LedgerByteMarket = getLedgerByteMarket()): boolean {
  return market === "KSA";
}

export function isUaeEdition(market: LedgerByteMarket = getLedgerByteMarket()): boolean {
  return market === "UAE";
}
