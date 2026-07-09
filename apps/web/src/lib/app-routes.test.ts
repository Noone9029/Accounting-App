import {
  APP_ROUTES,
  getAppRouteByKey,
  getMobileShellRoutes,
  getRoutesBySection,
  getVisibleShellRoutes,
  isKnownAppRoute,
} from "./app-routes";

describe("app route registry", () => {
  it("uses unique route keys and active hrefs", () => {
    const keys = APP_ROUTES.map((route) => route.key);
    const activeHrefs = APP_ROUTES.filter((route) => route.capabilityStatus === "active").map((route) => route.href);

    expect(new Set(keys).size).toBe(keys.length);
    expect(new Set(activeHrefs).size).toBe(activeHrefs.length);
  });

  it("keeps active route labels and descriptions usable", () => {
    for (const route of APP_ROUTES.filter((candidate) => candidate.capabilityStatus === "active")) {
      expect(route.label.trim()).toBe(route.label);
      expect(route.label.length).toBeGreaterThan(1);
      expect(route.description.trim()).toBe(route.description);
      expect(route.description.length).toBeGreaterThan(12);
    }
  });

  it("returns only active shell and mobile routes from visibility helpers", () => {
    const shellRoutes = getVisibleShellRoutes();
    const mobileRoutes = getMobileShellRoutes();

    expect(shellRoutes.length).toBeGreaterThan(10);
    expect(mobileRoutes.map((route) => route.key)).toEqual([
      "dashboard",
      "setup",
      "customers",
      "suppliers",
      "sales.invoice.new",
      "sales.customerPayment.new",
      "tax.workspace",
      "reports",
    ]);
    expect([...shellRoutes, ...mobileRoutes].every((route) => route.capabilityStatus === "active")).toBe(true);
  });

  it("keeps planned capabilities out of active shell helpers", () => {
    const plannedKeys = ["inbox", "ai.proposals", "reportPacks", "integrationHealth"] as const;
    const shellKeys = getVisibleShellRoutes().map((route) => route.key);
    const mobileKeys = getMobileShellRoutes().map((route) => route.key);

    for (const key of plannedKeys) {
      expect(getAppRouteByKey(key)?.capabilityStatus).toBe("planned");
      expect(shellKeys).not.toContain(key);
      expect(mobileKeys).not.toContain(key);
    }
  });

  it("represents major current app areas", () => {
    expect(getAppRouteByKey("dashboard")?.href).toBe("/dashboard");
    expect(getAppRouteByKey("setup")?.href).toBe("/setup");
    expect(getAppRouteByKey("customers")?.href).toBe("/customers");
    expect(getAppRouteByKey("suppliers")?.href).toBe("/suppliers");
    expect(getAppRouteByKey("sales.invoice.list")?.href).toBe("/sales/invoices");
    expect(getAppRouteByKey("sales.creditNote.list")?.href).toBe("/sales/credit-notes");
    expect(getAppRouteByKey("purchase.bill.list")?.href).toBe("/purchases/bills");
    expect(getAppRouteByKey("purchase.debitNote.list")?.href).toBe("/purchases/debit-notes");
    expect(getAppRouteByKey("purchase.supplierPayoutRequest.list")?.href).toBe("/purchases/supplier-payout-requests");
    expect(getAppRouteByKey("documents")?.href).toBe("/documents");
    expect(getAppRouteByKey("documentInbox")?.href).toBe("/document-inbox");
    expect(getAppRouteByKey("reports")?.href).toBe("/reports");
    expect(getAppRouteByKey("settings.storage")?.href).toBe("/settings/storage");
    expect(getAppRouteByKey("settings.payments")?.href).toBe("/settings/payments");
    expect(getAppRouteByKey("settings.bankIntegrations")?.href).toBe("/settings/bank-integrations");
    expect(getAppRouteByKey("settings.apiDocs")?.href).toBe("/settings/api-docs");
    expect(getAppRouteByKey("settings.webhooks")?.href).toBe("/settings/webhooks");
    expect(getAppRouteByKey("settings.compliance")?.href).toBe("/settings/compliance");
    expect(getAppRouteByKey("settings.zatca")?.href).toBe("/settings/zatca");
    expect(getAppRouteByKey("contacts")?.href).toBe("/contacts");
  });

  it("tags compliance, storage, and provider-sensitive routes", () => {
    expect(getAppRouteByKey("settings.storage")?.sensitivity).toEqual(expect.arrayContaining(["storage"]));
    expect(getAppRouteByKey("settings.compliance")?.sensitivity).toEqual(expect.arrayContaining(["compliance", "provider"]));
    expect(getAppRouteByKey("settings.zatca")?.sensitivity).toEqual(expect.arrayContaining(["compliance", "provider"]));
    expect(getAppRouteByKey("documents")?.sensitivity).toEqual(expect.arrayContaining(["storage"]));
    expect(getAppRouteByKey("documentInbox")?.sensitivity).toEqual(expect.arrayContaining(["storage", "provider"]));
    expect(getAppRouteByKey("settings.payments")?.sensitivity).toEqual(expect.arrayContaining(["provider"]));
    expect(getAppRouteByKey("settings.bankIntegrations")?.sensitivity).toEqual(expect.arrayContaining(["provider"]));
    expect(getAppRouteByKey("settings.webhooks")?.sensitivity).toEqual(expect.arrayContaining(["provider"]));
    expect(getAppRouteByKey("purchase.supplierPayoutRequest.list")?.sensitivity).toEqual(expect.arrayContaining(["provider"]));
  });

  it("looks up routes by section and known href without production-source vendor references", () => {
    expect(getRoutesBySection("sales").map((route) => route.key)).toEqual(
      expect.arrayContaining(["sales.invoice.list", "sales.creditNote.list", "sales.customerPayment.list"]),
    );
    expect(isKnownAppRoute("/sales/invoices")).toBe(true);
    expect(isKnownAppRoute("sales.invoice.list")).toBe(true);
    expect(isKnownAppRoute("/not-a-ledgerbyte-route")).toBe(false);
    expect(JSON.stringify(APP_ROUTES)).not.toMatch(new RegExp("Open" + "Books", "i"));
  });
});
