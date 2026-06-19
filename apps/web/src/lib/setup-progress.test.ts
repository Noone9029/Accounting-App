import {
  FIRST_ACCOUNTING_WORKFLOW_PROGRESS_KEYS,
  getFirstAccountingWorkflowProgressItems,
  getPlannedSetupProgressItems,
  getSetupProgressItem,
  getSetupProgressItems,
  setupProgressStatusFromChecklistStatus,
} from "./setup-progress";
import { getAppRouteByKey, isKnownAppRoute } from "./app-routes";
import type { DashboardOnboardingChecklist, DashboardOnboardingChecklistItem } from "./types";

describe("setup progress metadata", () => {
  it("centralizes setup progress metadata with active registry-backed routes", () => {
    const items = getSetupProgressItems(sampleChecklist());

    expect(items.map((item) => [item.key, item.category, item.title])).toEqual([
      ["organization_profile", "business_profile", "Organization profile"],
      ["chart_of_accounts", "business_profile", "Chart of accounts"],
      ["tax_profile", "compliance", "VAT/tax profile"],
      ["customer_created", "contacts", "First customer"],
      ["first_invoice", "sales", "First invoice"],
      ["bank_payment_method", "integrations", "Bank/payment method"],
      ["first_payment", "sales", "First payment"],
      ["first_report", "reports", "First report"],
      ["zatca_local_readiness_visible", "compliance", "Compliance readiness visibility"],
      ["contact_vat_id_validation", "contacts", "Contact VAT/ID validation"],
      ["storage_readiness_checked", "storage", "Storage readiness"],
    ]);

    for (const item of items) {
      expect(item.routeKey ? getAppRouteByKey(item.routeKey)?.capabilityStatus : "missing").toBe("active");
      expect(item.href ? isKnownAppRoute(item.href.split("?")[0] ?? item.href) : false).toBe(true);
      expect(item.actionable).toBe(true);
    }
  });

  it("derives setup progress status without marking broader onboarding as complete", () => {
    expect(setupProgressStatusFromChecklistStatus("COMPLETE")).toBe("complete");
    expect(setupProgressStatusFromChecklistStatus("WARNING")).toBe("needs_attention");
    expect(setupProgressStatusFromChecklistStatus("INCOMPLETE")).toBe("needs_attention");
    expect(getSetupProgressItem(sampleChecklist().items[2]!)?.status).toBe("needs_attention");
  });

  it("preserves the first accounting workflow ordering from centralized metadata", () => {
    expect(FIRST_ACCOUNTING_WORKFLOW_PROGRESS_KEYS).toEqual([
      "organization_profile",
      "tax_profile",
      "customer_created",
      "first_invoice",
      "first_payment",
      "first_report",
    ]);
    expect(getFirstAccountingWorkflowProgressItems(sampleChecklist()).map((item) => item.key)).toEqual(FIRST_ACCOUNTING_WORKFLOW_PROGRESS_KEYS);
  });

  it("keeps planned setup progress metadata non-actionable and away from future route links", () => {
    const plannedItems = getPlannedSetupProgressItems();

    expect(plannedItems).toEqual([
      expect.objectContaining({
        key: "typed_onboarding_state",
        status: "planned",
        actionable: false,
      }),
    ]);
    expect(plannedItems[0]?.href).toBeUndefined();
    expect(JSON.stringify(plannedItems)).not.toMatch(/\/inbox|\/ai|report-packs|integration/i);
  });

  it("fails safely for unknown checklist items and avoids production-source vendor references", () => {
    const unknown = checklistItem("unknown_future_item", "Unknown future item", "INCOMPLETE", "/inbox");

    expect(getSetupProgressItem(unknown)).toEqual(
      expect.objectContaining({
        key: "unknown_future_item",
        status: "blocked",
        actionable: false,
        href: undefined,
        blockerCode: "SETUP_PROGRESS_ROUTE_UNAVAILABLE",
      }),
    );
    expect(JSON.stringify(getSetupProgressItems(sampleChecklist()))).not.toMatch(new RegExp("Open" + "Books", "i"));
  });
});

function sampleChecklist(): DashboardOnboardingChecklist {
  return {
    readOnly: true,
    noMutation: true,
    tenantScoped: true,
    organizationId: "org-1",
    generatedAt: "2026-05-18T00:00:00.000Z",
    status: "BLOCKED",
    readinessScore: 27,
    completedCount: 3,
    totalCount: 11,
    productionCompliance: false,
    zatcaProductionCompliance: false,
    realZatcaNetworkEnabled: false,
    signedXmlBodyPersistenceAllowed: false,
    qrPayloadBodyPersistenceAllowed: false,
    blockers: [],
    warnings: [],
    recommendedNextSteps: [],
    items: [
      checklistItem("organization_profile", "Organization profile complete", "COMPLETE", "/organization/setup"),
      checklistItem("chart_of_accounts", "Chart of accounts available", "COMPLETE", "/accounts"),
      checklistItem("tax_profile", "VAT/tax profile complete", "INCOMPLETE", "/tax-rates"),
      checklistItem("customer_created", "At least one customer", "INCOMPLETE", "/customers"),
      checklistItem("first_invoice", "At least one sales invoice", "WARNING", "/sales/invoices"),
      checklistItem("bank_payment_method", "Payment method or bank account configured", "INCOMPLETE", "/bank-accounts"),
      checklistItem("first_payment", "At least one customer payment", "INCOMPLETE", "/sales/customer-payments"),
      checklistItem("first_report", "First reportable activity", "INCOMPLETE", "/reports/profit-and-loss"),
      checklistItem("zatca_local_readiness_visible", "Compliance readiness visible", "WARNING", "/settings/compliance"),
      checklistItem("contact_vat_id_validation", "Contact VAT and ID validation ready", "COMPLETE", "/customers"),
      checklistItem("storage_readiness_checked", "Backup and storage readiness checked", "WARNING", "/settings/storage"),
    ],
  };
}

function checklistItem(
  id: string,
  label: string,
  status: DashboardOnboardingChecklistItem["status"],
  href: string,
): DashboardOnboardingChecklistItem {
  return {
    id,
    label,
    status,
    description: `${label} description.`,
    href,
    evidence: [],
    blockers: [],
    warnings: [],
  };
}
