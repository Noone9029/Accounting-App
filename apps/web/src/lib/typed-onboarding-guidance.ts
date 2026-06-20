import {
  getDefaultTypedOnboardingSelectorValue,
  resolveTypedOnboardingSelectorValue,
} from "./typed-onboarding-selector";
import type { TypedOnboardingArchetypeKey } from "./typed-onboarding";

export type TypedOnboardingGuidanceTone = "active" | "planning" | "blocked";

export interface TypedOnboardingGuidance {
  archetypeKey: TypedOnboardingArchetypeKey;
  headline: string;
  summary: string;
  emphasis: string[];
  activeNow: string[];
  plannedNext: string[];
  blockedUntilProven: string[];
  tone: TypedOnboardingGuidanceTone;
}

const guidanceByArchetype = {
  general_services: guidance("general_services", {
    headline: "Balanced first workflow",
    summary:
      "Focus on getting one customer sale from profile through report review before introducing deeper operating workflows.",
    emphasis: ["Organization profile", "VAT/tax profile", "customer", "invoice", "payment", "Profit & Loss review"],
    activeNow: [
      "Use active setup links for organization profile, accounts, tax rates, customers, invoices, payments, and reports.",
      "Save selected profile state through the LedgerByte onboarding API when an organization context is available.",
    ],
    plannedNext: [
      "Broader typed onboarding automation, audit review, and setup checklist integration remain planned.",
      "Future automation should wait for explicit backend and audit design.",
    ],
    blockedUntilProven: [
      "Object storage remains blocked unless separately approved and proven.",
      "Signed URLs remain blocked unless separately implemented and verified.",
    ],
    tone: "active",
  }),
  software_saas: guidance("software_saas", {
    headline: "Subscription-ready preview",
    summary:
      "Prioritize customer records, invoice/payment evidence, and reporting while keeping subscription templates as planned metadata.",
    emphasis: ["customer records", "invoice cadence", "payment evidence", "report review", "future subscription templates"],
    activeNow: [
      "Use active customer, invoice, payment, and report routes for the first accounting loop.",
      "Keep selected profile state in the LedgerByte onboarding API; do not use browser persistence.",
    ],
    plannedNext: [
      "Subscription billing profile remains planned metadata only.",
      "Broader typed onboarding automation, audit review, and setup checklist integration remain planned.",
    ],
    blockedUntilProven: [
      "Generated-document object storage remains blocked until separate approval and hosted proof exist.",
      "Signed URLs remain blocked until separately implemented, proven, and approved.",
    ],
    tone: "planning",
  }),
  agency: guidance("agency", {
    headline: "Client-services setup focus",
    summary:
      "Guide agencies toward client setup, invoice readiness, collections, and report review before project profitability templates are introduced.",
    emphasis: ["client records", "invoice workflow", "collections", "management reporting", "future project profitability"],
    activeNow: [
      "Use active customer, invoice, payment, and report routes.",
      "Keep setup guidance conservative while profile selection is saved through the LedgerByte onboarding API.",
    ],
    plannedNext: [
      "Project profitability templates remain planned metadata.",
      "Future automation should wait for explicit service design and tests.",
    ],
    blockedUntilProven: [
      "Object storage remains blocked unless separately approved and proven.",
      "Signed URLs remain blocked unless separately implemented and verified.",
    ],
    tone: "planning",
  }),
  trading: guidance("trading", {
    headline: "Trading workflow readiness",
    summary:
      "Emphasize item setup, purchasing, stock visibility, invoicing, payments, and reports without claiming automated trading operations.",
    emphasis: ["items", "purchase bills", "inventory balances", "sales invoices", "payment review"],
    activeNow: [
      "Use active item, purchase bill, inventory balance, sales, payment, and report links.",
      "Review inventory visibility without implying production inventory policy completion.",
    ],
    plannedNext: [
      "Broader typed onboarding automation, audit review, and setup checklist integration remain planned.",
      "Future automation for matching, replenishment, and deeper inventory policy remains planned.",
    ],
    blockedUntilProven: [
      "Object storage remains blocked unless separately approved and proven.",
      "Signed URLs remain blocked unless separately implemented and verified.",
    ],
    tone: "planning",
  }),
  ecommerce: guidance("ecommerce", {
    headline: "Commerce operations preview",
    summary:
      "Focus on catalog readiness, receivables, payment review, stock visibility, and reports while external channel mapping stays planned.",
    emphasis: ["item catalog", "sales flow", "payment evidence", "stock visibility", "future channel mapping"],
    activeNow: [
      "Use active item, customer, invoice, payment, inventory balance, and report routes.",
      "Keep channel guidance descriptive only; no external store is connected by this preview.",
    ],
    plannedNext: [
      "Commerce channel mapping remains planned metadata.",
      "Broader typed onboarding automation, audit review, and setup checklist integration remain planned.",
    ],
    blockedUntilProven: [
      "Object storage remains blocked unless separately approved and proven.",
      "Signed URLs remain blocked unless separately implemented and verified.",
    ],
    tone: "planning",
  }),
  contractor: guidance("contractor", {
    headline: "Contractor cost-capture preview",
    summary:
      "Guide contractor teams through customer setup, invoices, supplier cost capture, payments, and reports before job-cost templates exist.",
    emphasis: ["customer setup", "invoice workflow", "purchase bills", "payment review", "future job-cost templates"],
    activeNow: [
      "Use active customer, invoice, purchase bill, payment, and report routes.",
      "Save selected profile state through the LedgerByte onboarding API without browser persistence.",
    ],
    plannedNext: [
      "Job-cost onboarding remains planned metadata.",
      "Broader typed onboarding automation, audit review, and setup checklist integration remain planned.",
    ],
    blockedUntilProven: [
      "Object storage remains blocked unless separately approved and proven.",
      "Signed URLs remain blocked unless separately implemented and verified.",
    ],
    tone: "planning",
  }),
  multi_entity: guidance("multi_entity", {
    headline: "Multi-entity control preview",
    summary:
      "Emphasize organization structure, branch setup, roles, and report visibility while consolidation remains future work.",
    emphasis: ["organization profile", "branches", "roles", "report visibility", "future consolidation"],
    activeNow: [
      "Use active organization, branch, role, and report routes.",
      "Keep cross-entity guidance descriptive until persistence and reporting design are approved.",
    ],
    plannedNext: [
      "Entity consolidation templates remain planned metadata.",
      "Broader typed onboarding automation, audit review, and setup checklist integration remain planned.",
    ],
    blockedUntilProven: [
      "Object storage remains blocked unless separately approved and proven.",
      "Signed URLs remain blocked unless separately implemented and verified.",
    ],
    tone: "planning",
  }),
  ksa_zatca_readiness: guidance("ksa_zatca_readiness", {
    headline: "KSA local-readiness planning",
    summary:
      "Review local-readiness setup for KSA tax identity, contacts, invoices, and reports while production support remains blocked.",
    emphasis: ["local tax identity", "contact validation", "invoice readiness", "local-readiness settings", "report review"],
    activeNow: [
      "Use active setup links for local-readiness visibility and accounting setup.",
      "Keep this as local-readiness guidance only; no authority network submission is enabled here.",
    ],
    plannedNext: [
      "Specialist review, credential strategy, hosted proof, and audit evidence remain separate future work.",
      "Broader typed onboarding automation, audit review, and setup checklist integration remain planned.",
    ],
    blockedUntilProven: [
      "KSA production support remains blocked until credentials, signing custody, official validation, hosted proof, and approval are separately completed.",
      "Object storage and signed URLs remain blocked unless separately implemented, proven, and approved.",
    ],
    tone: "blocked",
  }),
  uae_einvoicing_readiness: guidance("uae_einvoicing_readiness", {
    headline: "UAE local-readiness planning",
    summary:
      "Review UAE local-readiness setup for tax identity, contacts, invoices, and reports; no FTA reporting is enabled by this preview.",
    emphasis: ["local tax identity", "contact validation", "invoice readiness", "provider-readiness tracking", "report review"],
    activeNow: [
      "Use active compliance and setup links for local-readiness visibility.",
      "Keep provider guidance descriptive only; no provider validation or network submission is connected here.",
    ],
    plannedNext: [
      "Official serializer alignment, real ASP integration, webhook flow, and evidence storage remain separate future work.",
      "Broader typed onboarding automation, audit review, and setup checklist integration remain planned.",
    ],
    blockedUntilProven: [
      "UAE provider use remains blocked until provider evidence, sandbox proof, security review, webhook flow, and approval are separately completed.",
      "Object storage and signed URLs remain blocked unless separately implemented, proven, and approved.",
    ],
    tone: "blocked",
  }),
} as const satisfies Record<TypedOnboardingArchetypeKey, TypedOnboardingGuidance>;

export function getDefaultTypedOnboardingGuidance(): TypedOnboardingGuidance {
  return getTypedOnboardingGuidance(getDefaultTypedOnboardingSelectorValue());
}

export function getTypedOnboardingGuidance(key: TypedOnboardingArchetypeKey): TypedOnboardingGuidance {
  return cloneGuidance(guidanceByArchetype[key]);
}

export function resolveTypedOnboardingGuidance(value: unknown): TypedOnboardingGuidance {
  return getTypedOnboardingGuidance(resolveTypedOnboardingSelectorValue(value));
}

export function getTypedOnboardingGuidanceTone(value: unknown): TypedOnboardingGuidanceTone {
  return resolveTypedOnboardingGuidance(value).tone;
}

export function getTypedOnboardingGuidanceWarnings(value: unknown): string[] {
  const guidance = resolveTypedOnboardingGuidance(value);
  return [...guidance.plannedNext, ...guidance.blockedUntilProven];
}

export function getTypedOnboardingComplianceCautions(value: unknown): string[] {
  const guidance = resolveTypedOnboardingGuidance(value);
  return guidance.blockedUntilProven.filter((item) => /KSA|UAE|provider|authority|Object storage|Signed URL|signed URL|storage/i.test(item));
}

function guidance(
  archetypeKey: TypedOnboardingArchetypeKey,
  input: Omit<TypedOnboardingGuidance, "archetypeKey">,
): TypedOnboardingGuidance {
  return {
    archetypeKey,
    ...input,
  };
}

function cloneGuidance(input: TypedOnboardingGuidance): TypedOnboardingGuidance {
  return {
    ...input,
    emphasis: [...input.emphasis],
    activeNow: [...input.activeNow],
    plannedNext: [...input.plannedNext],
    blockedUntilProven: [...input.blockedUntilProven],
  };
}
