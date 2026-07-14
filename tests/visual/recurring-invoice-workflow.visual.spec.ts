import { expect, test, type Page, type Route } from "@playwright/test";
import { fixedVisualDate, visualApiUrl } from "./visual-fixtures";

type RecurringStatus = "DRAFT" | "ACTIVE" | "PAUSED" | "ENDED" | "CANCELLED";
type RecurringFrequency = "WEEKLY" | "MONTHLY" | "QUARTERLY" | "YEARLY";
type TaxMode = "TAX_EXCLUSIVE" | "TAX_INCLUSIVE" | "NO_TAX";

const templateId = "recurring-browser";
const customer = {
  id: "customer-recurring",
  organizationId: "org-visual",
  name: "Recurring Browser Customer",
  displayName: "Recurring Browser Customer",
  type: "CUSTOMER",
  email: "recurring.customer@example.test",
  phone: null,
  taxNumber: "300000000000222",
  isActive: true,
  addressLine1: "Recurring Road",
  addressLine2: null,
  buildingNumber: "1400",
  district: "QA District",
  city: "Riyadh",
  postalCode: "12211",
  countryCode: "SA",
};
const revenueAccount = {
  id: "revenue-account-recurring",
  code: "4010",
  name: "Sales revenue",
  type: "REVENUE",
  isActive: true,
  allowPosting: true,
};
const taxRate = {
  id: "tax-15-recurring",
  name: "VAT 15%",
  rate: "15.0000",
  scope: "BOTH",
  category: "STANDARD",
  isActive: true,
};
const item = {
  id: "item-recurring-service",
  organizationId: "org-visual",
  sku: "RB-SVC",
  name: "Managed service",
  description: "Browser recurring managed service",
  type: "SERVICE",
  status: "ACTIVE",
  sellingPrice: "100.0000",
  revenueAccountId: revenueAccount.id,
  salesTaxRateId: taxRate.id,
  revenueAccount,
  salesTaxRate: taxRate,
};
const fullRecurringPermissions = [
  "dashboard.view",
  "contacts.view",
  "salesInvoices.view",
  "salesInvoices.create",
  "salesInvoices.update",
];

test("recurring invoice list create edit lifecycle generate and customer activity path", async ({ page }) => {
  const state = await installRecurringWorkflowMocks(page);

  await page.goto("/sales/recurring-invoices");
  await expect(page.getByRole("heading", { name: "Recurring invoices" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Create template" })).toBeVisible();
  await expectRecurringPageUsesSafeLabels(page);

  await page.getByRole("button", { name: "Create" }).click();
  await expect(page.getByRole("dialog", { name: "Create menu" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Recurring invoice template" })).toHaveAttribute("href", "/sales/recurring-invoices/new");
  await page.keyboard.press("Escape");

  await page.getByPlaceholder("Search transactions, contacts, reports, and pages").fill("recurring invoice");
  await expect(page.getByRole("option", { name: /Recurring Invoices/ })).toBeVisible();
  await expect(page.getByText("Open transaction page")).toBeVisible();
  await page.keyboard.press("Escape");

  await page.getByRole("link", { name: "Create template" }).click();
  await expect(page.getByRole("heading", { name: "New recurring invoice template" })).toBeVisible();
  await expect(page.getByLabel("Template number")).toHaveValue("REC-BRW-001");

  await page.getByLabel("Customer").selectOption(customer.id);
  await page.getByLabel("Template name").fill("Monthly browser support");
  await page.getByLabel("Start date").fill("2026-06-15");
  await page.getByLabel("Next run date").fill("2026-06-15");
  await page.getByLabel("End date").fill("2026-12-31");
  await page.getByLabel("Payment terms days").fill("15");
  await page.getByLabel("Item for recurring invoice line 1").selectOption(item.id);
  await page.getByLabel("Search posting account for recurring invoice line 1").fill("Sales revenue");
  await expect(page.getByLabel("Description for recurring invoice line 1")).toHaveValue("Browser recurring managed service");
  await expect(page.getByLabel("Posting account for recurring invoice line 1", { exact: true })).toHaveValue(revenueAccount.id);
  await expect(page.getByLabel("Posting account for recurring invoice line 1", { exact: true })).toContainText("4010 Sales revenue");
  await expect(page.locator("form")).toContainText(/SAR\s*115\.00/);

  await expect(page.getByText("Schedule preview")).toBeVisible();
  await expect(page.getByText("Jun 15, 2026 to Jul 14, 2026")).toBeVisible();
  await expect(page.getByText("Jun 30, 2026")).toBeVisible();
  await expect(page.getByText("Jul 15, 2026")).toBeVisible();

  await page.getByLabel("Frequency").selectOption("WEEKLY");
  await expect(page.getByText("Jun 15, 2026 to Jun 21, 2026")).toBeVisible();
  await expect(page.getByText("Jun 22, 2026").first()).toBeVisible();
  await page.getByLabel("Frequency").selectOption("QUARTERLY");
  await expect(page.getByText("Sep 15, 2026")).toBeVisible();
  await page.getByLabel("Frequency").selectOption("YEARLY");
  await expect(page.getByText("Jun 15, 2026 to Jun 14, 2027")).toBeVisible();
  await page.getByLabel("Frequency").selectOption("MONTHLY");

  await page.getByLabel("Tax mode").selectOption("TAX_INCLUSIVE");
  await expect(page.locator("form")).toContainText(/SAR\s*13\.04/);
  await expect(page.locator("form")).toContainText(/SAR\s*100\.00/);
  await page.getByLabel("Tax mode").selectOption("NO_TAX");
  await expect(page.getByLabel("Tax rate for recurring invoice line 1")).toBeDisabled();
  await expect(page.locator("form")).toContainText(/SAR\s*0\.00/);
  await page.getByLabel("Tax mode").selectOption("TAX_EXCLUSIVE");
  await page.getByLabel("Tax rate for recurring invoice line 1").selectOption(taxRate.id);

  await page.getByRole("button", { name: "Create draft template" }).click();
  await expect(page).toHaveURL(/\/sales\/recurring-invoices\/recurring-browser$/);
  expect(state.createdPayload).toEqual(
    expect.objectContaining({
      customerId: customer.id,
      frequency: "MONTHLY",
      paymentTermsDays: 15,
      taxMode: "TAX_EXCLUSIVE",
      lines: [expect.objectContaining({ accountId: revenueAccount.id, taxRateId: taxRate.id })],
    }),
  );

  await expect(page.getByRole("heading", { name: "REC-BRW-001" })).toBeVisible();
  await expect(page.getByText("Recurring templates do not post accounting entries.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Generate invoice now" })).toHaveCount(0);
  await expectRecurringPageUsesSafeLabels(page);

  await page.getByRole("link", { name: "Edit" }).click();
  await expect(page.getByRole("heading", { name: "Edit recurring invoice template" })).toBeVisible();
  await expect(page.getByLabel("Posting account for recurring invoice line 1", { exact: true })).toHaveValue(revenueAccount.id);
  await expect(page.getByText("Schedule preview")).toBeVisible();
  await page.getByLabel("Reference").fill("REC-BROWSER-UPDATED");
  await page.getByRole("button", { name: "Save draft template" }).click();
  await expect(page).toHaveURL(/\/sales\/recurring-invoices\/recurring-browser$/);
  expect(state.updatedPayload).toEqual(expect.objectContaining({ reference: "REC-BROWSER-UPDATED" }));

  await page.getByRole("button", { name: "Activate" }).click();
  await expect(page.getByText(/is now active/i)).toBeVisible();
  await expect(page.getByRole("button", { name: "Generate invoice now" })).toBeVisible();
  await page.getByRole("button", { name: "Pause" }).click();
  await expect(page.getByText(/is now paused/i)).toBeVisible();
  await expect(page.getByRole("button", { name: "Generate invoice now" })).toHaveCount(0);
  await page.getByRole("button", { name: "Resume" }).click();
  await expect(page.getByText(/is now active/i)).toBeVisible();

  await page.getByRole("button", { name: "Generate invoice now" }).click();
  await expect(page.getByText(/Generated draft invoice INV-REC-BRW-001/i)).toBeVisible();
  await expect(page.getByRole("link", { name: "Open draft invoice INV-REC-BRW-001" })).toBeVisible();
  await expect(page.getByText("Run date Jun 15, 2026")).toBeVisible();
  await expect(page.getByText("Jul 15, 2026").first()).toBeVisible();
  expect(state.generateRequests).toBe(1);
  expect(state.invoice).toEqual(expect.objectContaining({ status: "DRAFT", journalEntryId: null, finalizedAt: null }));

  await page.getByRole("link", { name: "Open draft invoice INV-REC-BRW-001" }).click();
  await expect(page).toHaveURL(/\/sales\/invoices\/invoice-from-recurring$/);
  await expect(page.getByRole("heading", { name: "INV-REC-BRW-001" })).toBeVisible();
  await expect(page.getByText("Draft").first()).toBeVisible();

  await page.goto(`/customers/${customer.id}`);
  await expect(page.getByRole("heading", { level: 1, name: "Recurring Browser Customer" })).toBeVisible();
  await expect(page.getByText("Recurring templates")).toBeVisible();
  await expect(page.getByRole("cell", { name: "Recurring invoice template (non-posting)" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "REC-BRW-001", exact: true })).toBeVisible();
  await expect(page.getByRole("row", { name: /Recurring invoice template \(non-posting\).*REC-BRW-001.*SAR\s*0\.00/i })).toBeVisible();
  await expect(page.getByRole("cell", { name: "INV-REC-BRW-001", exact: true })).toBeVisible();
  expect(unexpectedConsoleErrors(state.consoleErrors)).toEqual([]);
});

test("restricted recurring viewer cannot create edit lifecycle or generate invoices", async ({ page }) => {
  const state = await installRecurringWorkflowMocks(page, {
    permissions: ["contacts.view", "salesInvoices.view"],
    template: makeTemplate("ACTIVE"),
  });

  await page.goto("/sales/recurring-invoices");
  await expect(page.getByRole("heading", { name: "Recurring invoices" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Create template" })).toHaveCount(0);

  await page.getByRole("button", { name: "Create" }).click();
  await expect(page.getByRole("link", { name: "Recurring invoice template" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Recurring invoice template" })).toBeDisabled();
  await page.keyboard.press("Escape");

  await page.goto(`/sales/recurring-invoices/${templateId}`);
  await expect(page.getByRole("heading", { name: "REC-BRW-001" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Edit" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Pause" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Resume" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "End" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Cancel" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Generate invoice now" })).toHaveCount(0);
  await expectRecurringPageUsesSafeLabels(page);
  expect(state.generateRequests).toBe(0);
  expect(unexpectedConsoleErrors(state.consoleErrors)).toEqual([]);
});

test("recurring detail blocks ineligible and duplicate generation paths", async ({ page }) => {
  const state = await installRecurringWorkflowMocks(page);
  const ineligibleStatuses: RecurringStatus[] = ["DRAFT", "PAUSED", "ENDED", "CANCELLED"];

  for (const status of ineligibleStatuses) {
    state.template = makeTemplate(status);
    await page.goto(`/sales/recurring-invoices/${templateId}`);
    await expect(page.getByRole("heading", { name: "REC-BRW-001" })).toBeVisible();
    await expect(page.getByText(statusLabel(status)).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Generate invoice now" })).toHaveCount(0);

    if (status === "ENDED" || status === "CANCELLED") {
      await expect(page.getByRole("link", { name: "Edit" })).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Activate" })).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Pause" })).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Resume" })).toHaveCount(0);
    }
  }

  state.template = makeTemplate("ACTIVE");
  state.duplicateGenerationError = true;
  await page.goto(`/sales/recurring-invoices/${templateId}`);
  await expect(page.getByRole("button", { name: "Generate invoice now" })).toBeVisible();
  await page.getByRole("button", { name: "Generate invoice now" }).click();
  await expect(page.getByText(/already been generated/i)).toBeVisible();
  expect(state.invoice).toBeNull();
  expect(unexpectedConsoleErrors(state.consoleErrors)).toEqual([]);
});

async function installRecurringWorkflowMocks(page: Page, options: Partial<RecurringWorkflowState> = {}) {
  const state: RecurringWorkflowState = {
    permissions: options.permissions ?? fullRecurringPermissions,
    template: options.template ?? makeTemplate("DRAFT"),
    invoice: options.invoice ?? null,
    createdPayload: null,
    updatedPayload: null,
    generateRequests: 0,
    duplicateGenerationError: options.duplicateGenerationError ?? false,
    consoleErrors: [],
  };

  await page.route(`${visualApiUrl}/**`, (route) => fulfillRecurringApiRoute(route, state));
  await page.route("**/favicon.ico", (route) => route.fulfill({ status: 204, body: "" }));
  await page.addInitScript(
    ({ fixedNow }) => {
      const fixedTimestamp = Date.parse(fixedNow);
      const OriginalDate = Date;
      class FixedDate extends OriginalDate {
        constructor(...args: ConstructorParameters<DateConstructor>) {
          super(...(args.length ? args : [fixedTimestamp]));
        }

        static now() {
          return fixedTimestamp;
        }
      }
      window.Date = FixedDate as DateConstructor;
      window.localStorage.setItem("ledgerbyte.accessToken", "recurring-browser-token");
      window.localStorage.setItem("ledgerbyte.activeOrganizationId", "org-visual");
    },
    { fixedNow: fixedVisualDate },
  );

  page.on("console", (message) => {
    if (message.type() === "error" && !message.text().includes("favicon.ico")) {
      state.consoleErrors.push(message.text());
    }
  });
  page.on("pageerror", (error) => state.consoleErrors.push(error.message));

  return state;
}

async function fulfillRecurringApiRoute(route: Route, state: RecurringWorkflowState) {
  const request = route.request();
  const url = new URL(request.url());
  const pathname = url.pathname;
  const method = request.method();

  if (pathname === "/auth/me") {
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: "recurring-user",
        email: "recurring.browser@example.test",
        name: "Recurring Browser Tester",
        memberships: [
          {
            id: "recurring-membership",
            status: "ACTIVE",
            organization: { id: "org-visual", name: "Recurring Browser Co", baseCurrency: "SAR" },
            role: { id: "recurring-role", name: "Recurring Browser Role", permissions: state.permissions },
          },
        ],
      }),
    });
  }

  if (pathname === "/search" && method === "GET") {
    return json(route, { query: url.searchParams.get("query") ?? "", results: [] });
  }
  if (pathname === "/contacts" && method === "GET") {
    return json(route, [customer]);
  }
  if (pathname === "/items" && method === "GET") {
    return json(route, [item]);
  }
  if (pathname === "/accounts" && method === "GET") {
    return json(route, [revenueAccount, { id: "system-account", code: "9999", name: "System only", type: "LIABILITY", isActive: true, allowPosting: false }]);
  }
  if (pathname === "/tax-rates" && method === "GET") {
    return json(route, [taxRate]);
  }
  if (pathname === "/branches" && method === "GET") {
    return json(route, []);
  }
  if (pathname === "/attachments" && method === "GET") {
    return json(route, []);
  }
  if (pathname === "/recurring-invoices/next-number" && method === "GET") {
    return json(route, {
      templateNumber: "REC-BRW-001",
      editable: false,
      overrideAllowed: false,
      helperText: "Preview only. The recurring template number is assigned from the recurring invoice sequence when the draft template is saved.",
    });
  }
  if (pathname === "/recurring-invoices" && method === "GET") {
    return json(route, [state.template]);
  }
  if (pathname === "/recurring-invoices" && method === "POST") {
    state.createdPayload = request.postDataJSON();
    state.template = makeTemplate("DRAFT", templatePayloadOverrides(state.createdPayload));
    return json(route, state.template, 201);
  }
  if (pathname === `/recurring-invoices/${templateId}` && method === "GET") {
    return json(route, state.template);
  }
  if (pathname === `/recurring-invoices/${templateId}` && method === "PATCH") {
    state.updatedPayload = request.postDataJSON();
    state.template = makeTemplate("DRAFT", {
      ...templatePayloadOverrides(state.updatedPayload),
      reference: state.updatedPayload.reference ?? state.template.reference,
    });
    return json(route, state.template);
  }
  if (pathname === `/recurring-invoices/${templateId}/preview` && method === "GET") {
    return json(route, makePreview(state.template));
  }
  if (pathname === `/recurring-invoices/${templateId}/activate` && method === "POST") {
    state.template = makeTemplate("ACTIVE", preserveTemplateOverrides(state.template));
    return json(route, state.template);
  }
  if (pathname === `/recurring-invoices/${templateId}/pause` && method === "POST") {
    state.template = makeTemplate("PAUSED", preserveTemplateOverrides(state.template));
    return json(route, state.template);
  }
  if (pathname === `/recurring-invoices/${templateId}/resume` && method === "POST") {
    state.template = makeTemplate("ACTIVE", preserveTemplateOverrides(state.template));
    return json(route, state.template);
  }
  if (pathname === `/recurring-invoices/${templateId}/end` && method === "POST") {
    state.template = makeTemplate("ENDED", preserveTemplateOverrides(state.template));
    return json(route, state.template);
  }
  if (pathname === `/recurring-invoices/${templateId}/cancel` && method === "POST") {
    state.template = makeTemplate("CANCELLED", preserveTemplateOverrides(state.template));
    return json(route, state.template);
  }
  if (pathname === `/recurring-invoices/${templateId}/generate-now` && method === "POST") {
    state.generateRequests += 1;
    if (state.duplicateGenerationError) {
      return json(route, { message: "An invoice has already been generated for this recurring template run date." }, 400);
    }
    if (state.template.status !== "ACTIVE") {
      return json(route, { message: "Only active recurring invoice templates can generate draft invoices." }, 400);
    }
    state.invoice = makeDraftInvoiceFromRecurring();
    state.template = makeTemplate("ACTIVE", {
      ...preserveTemplateOverrides(state.template),
      lastRunDate: "2026-06-15T00:00:00.000Z",
      nextRunDate: "2026-07-15T00:00:00.000Z",
      runs: [makeRun()],
    });
    return json(route, { template: state.template, invoice: state.invoice, run: makeRun() });
  }
  if (pathname === "/sales-invoices/invoice-from-recurring" && method === "GET") {
    return json(route, state.invoice ?? makeDraftInvoiceFromRecurring());
  }
  if (pathname === "/sales-invoices/invoice-from-recurring/stock-issue-status" && method === "GET") {
    return json(route, { sourceId: "invoice-from-recurring", sourceNumber: "INV-REC-BRW-001", sourceStatus: "DRAFT", issueStatus: "NOT_REQUIRED", issuedQuantity: "0.0000", remainingQuantity: "0.0000", lines: [] });
  }
  if (pathname.startsWith("/sales-invoices/invoice-from-recurring/zatca") && method === "GET") {
    return json(route, { productionCompliance: false, localOnly: true, noMutation: true, warnings: ["Recurring workflow test keeps ZATCA disabled."] });
  }
  if (pathname === `/contacts/customers/${customer.id}` && method === "GET") {
    return json(route, customerPartyDetail(state.template, state.invoice));
  }

  return json(route, { message: `No recurring workflow fixture for ${method} ${pathname}` }, 404);
}

function makeTemplate(status: RecurringStatus, overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: templateId,
    organizationId: "org-visual",
    templateNumber: "REC-BRW-001",
    name: "Monthly browser support",
    customerId: customer.id,
    branchId: null,
    status,
    startDate: "2026-06-15T00:00:00.000Z",
    endDate: "2026-12-31T00:00:00.000Z",
    nextRunDate: "2026-06-15T00:00:00.000Z",
    lastRunDate: null,
    frequency: "MONTHLY" as RecurringFrequency,
    interval: 1,
    dayOfMonth: 15,
    dayOfWeek: null,
    monthOfYear: null,
    invoiceDateMode: "RUN_DATE",
    paymentTermsDays: 15,
    reference: "REC-BROWSER",
    currency: "SAR",
    taxMode: "TAX_EXCLUSIVE" as TaxMode,
    subtotal: "100.0000",
    discountTotal: "0.0000",
    taxableTotal: "100.0000",
    taxTotal: "15.0000",
    total: "115.0000",
    notes: "Browser recurring template note.",
    terms: "Generated drafts are reviewed separately.",
    customer,
    branch: null,
    lines: [
      {
        id: "recurring-line-1",
        organizationId: "org-visual",
        templateId,
        itemId: item.id,
        description: "Browser recurring managed service",
        accountId: revenueAccount.id,
        quantity: "1.0000",
        unitPrice: "100.0000",
        discountRate: "0.0000",
        taxRateId: taxRate.id,
        lineGrossAmount: "100.0000",
        discountAmount: "0.0000",
        taxableAmount: "100.0000",
        taxAmount: "15.0000",
        lineSubtotal: "100.0000",
        lineTotal: "115.0000",
        sortOrder: 0,
        item,
        account: revenueAccount,
        taxRate,
      },
    ],
    runs: [],
    ...overrides,
  };
}

function preserveTemplateOverrides(template: ReturnType<typeof makeTemplate>) {
  return {
    name: template.name,
    reference: template.reference,
    startDate: template.startDate,
    endDate: template.endDate,
    nextRunDate: template.nextRunDate,
    lastRunDate: template.lastRunDate,
    frequency: template.frequency,
    interval: template.interval,
    paymentTermsDays: template.paymentTermsDays,
    taxMode: template.taxMode,
    subtotal: template.subtotal,
    discountTotal: template.discountTotal,
    taxableTotal: template.taxableTotal,
    taxTotal: template.taxTotal,
    total: template.total,
    lines: template.lines,
    runs: template.runs,
  };
}

function templatePayloadOverrides(payload: Record<string, unknown> | null) {
  const line = Array.isArray(payload?.lines) ? (payload.lines[0] as Record<string, unknown>) : null;
  const taxMode = (payload?.taxMode as TaxMode | undefined) ?? "TAX_EXCLUSIVE";
  const taxTotal = taxMode === "NO_TAX" ? "0.0000" : taxMode === "TAX_INCLUSIVE" ? "13.0435" : "15.0000";
  const taxableTotal = taxMode === "NO_TAX" ? "100.0000" : taxMode === "TAX_INCLUSIVE" ? "86.9565" : "100.0000";
  const total = taxMode === "TAX_EXCLUSIVE" ? "115.0000" : "100.0000";

  return {
    name: (payload?.name as string | undefined) ?? "Monthly browser support",
    reference: (payload?.reference as string | undefined) ?? "REC-BROWSER",
    startDate: (payload?.startDate as string | undefined) ?? "2026-06-15T00:00:00.000Z",
    endDate: (payload?.endDate as string | undefined) ?? "2026-12-31T00:00:00.000Z",
    nextRunDate: (payload?.nextRunDate as string | undefined) ?? "2026-06-15T00:00:00.000Z",
    frequency: (payload?.frequency as RecurringFrequency | undefined) ?? "MONTHLY",
    interval: Number(payload?.interval ?? 1),
    paymentTermsDays: Number(payload?.paymentTermsDays ?? 15),
    taxMode,
    subtotal: "100.0000",
    taxableTotal,
    taxTotal,
    total,
    lines: [
      {
        ...makeTemplate("DRAFT").lines[0],
        description: String(line?.description ?? "Browser recurring managed service"),
        accountId: String(line?.accountId ?? revenueAccount.id),
        taxRateId: taxMode === "NO_TAX" ? null : String(line?.taxRateId ?? taxRate.id),
        taxableAmount: taxableTotal,
        taxAmount: taxTotal,
        lineTotal: total,
        taxRate: taxMode === "NO_TAX" ? null : taxRate,
      },
    ],
  };
}

function makePreview(template: ReturnType<typeof makeTemplate>) {
  const nextRun = String(template.nextRunDate).startsWith("2026-07-15") ? "2026-07-15T00:00:00.000Z" : "2026-06-15T00:00:00.000Z";
  const dueDate = nextRun.startsWith("2026-07-15") ? "2026-07-30T00:00:00.000Z" : "2026-06-30T00:00:00.000Z";
  const periodEnd = nextRun.startsWith("2026-07-15") ? "2026-08-14T00:00:00.000Z" : "2026-07-14T00:00:00.000Z";

  return {
    templateId: template.id,
    templateNumber: template.templateNumber,
    status: template.status,
    nextInvoiceDate: nextRun,
    dueDate,
    periodCovered: { startDate: nextRun, endDate: periodEnd },
    customer: template.customer,
    taxMode: template.taxMode,
    subtotal: template.subtotal,
    discountTotal: template.discountTotal,
    taxableTotal: template.taxableTotal,
    taxTotal: template.taxTotal,
    total: template.total,
    lines: template.lines,
    nextOccurrences: nextRun.startsWith("2026-07-15")
      ? ["2026-07-15T00:00:00.000Z", "2026-08-15T00:00:00.000Z", "2026-09-15T00:00:00.000Z"]
      : ["2026-06-15T00:00:00.000Z", "2026-07-15T00:00:00.000Z", "2026-08-15T00:00:00.000Z"],
    blockers: template.status === "ACTIVE" ? [] : [`Template status is ${template.status}; only active templates can generate invoices.`],
    previewOnly: true,
  };
}

function makeRun() {
  return {
    id: "run-recurring-1",
    organizationId: "org-visual",
    templateId,
    runDate: "2026-06-15T00:00:00.000Z",
    invoiceDate: "2026-06-15T00:00:00.000Z",
    dueDate: "2026-06-30T00:00:00.000Z",
    periodStart: "2026-06-15T00:00:00.000Z",
    periodEnd: "2026-07-14T00:00:00.000Z",
    generatedInvoiceId: "invoice-from-recurring",
    generatedById: "recurring-user",
    createdAt: fixedVisualDate,
    generatedInvoice: { id: "invoice-from-recurring", invoiceNumber: "INV-REC-BRW-001", status: "DRAFT", issueDate: "2026-06-15T00:00:00.000Z", total: "115.0000" },
  };
}

function makeDraftInvoiceFromRecurring() {
  return {
    id: "invoice-from-recurring",
    organizationId: "org-visual",
    invoiceNumber: "INV-REC-BRW-001",
    customerId: customer.id,
    branchId: null,
    recurringInvoiceTemplateId: templateId,
    issueDate: "2026-06-15T00:00:00.000Z",
    dueDate: "2026-06-30T00:00:00.000Z",
    currency: "SAR",
    status: "DRAFT",
    taxMode: "TAX_EXCLUSIVE",
    subtotal: "100.0000",
    discountTotal: "0.0000",
    taxableTotal: "100.0000",
    taxTotal: "15.0000",
    total: "115.0000",
    balanceDue: "115.0000",
    notes: "Browser recurring template note.",
    terms: "Generated drafts are reviewed separately.",
    finalizedAt: null,
    journalEntryId: null,
    reversalJournalEntryId: null,
    customer,
    branch: null,
    journalEntry: null,
    reversalJournalEntry: null,
    paymentAllocations: [],
    paymentUnappliedAllocations: [],
    creditNoteAllocations: [],
    creditNotes: [],
    lines: [
      {
        id: "invoice-line-from-recurring",
        invoiceId: "invoice-from-recurring",
        itemId: item.id,
        description: "Browser recurring managed service",
        quantity: "1.0000",
        unitPrice: "100.0000",
        discountRate: "0.0000",
        discountAmount: "0.0000",
        taxRateId: taxRate.id,
        accountId: revenueAccount.id,
        lineSubtotal: "100.0000",
        lineTax: "15.0000",
        lineGrossAmount: "100.0000",
        taxableAmount: "100.0000",
        taxAmount: "15.0000",
        lineTotal: "115.0000",
        item,
        taxRate,
        account: revenueAccount,
      },
    ],
  };
}

function customerPartyDetail(template: ReturnType<typeof makeTemplate>, invoice: ReturnType<typeof makeDraftInvoiceFromRecurring> | null) {
  const transactions = [
    {
      id: `RecurringInvoiceTemplate:${template.id}`,
      sourceType: "RecurringInvoiceTemplate",
      sourceId: template.id,
      date: template.nextRunDate,
      dueDate: template.endDate,
      type: "Recurring invoice template (non-posting)",
      transactionNumber: template.templateNumber,
      currency: template.currency,
      subtotal: template.subtotal,
      taxAmount: template.taxTotal,
      total: template.total,
      balanceDue: "0.0000",
      status: template.status,
    },
  ];

  if (invoice) {
    transactions.push({
      id: `SalesInvoice:${invoice.id}`,
      sourceType: "SalesInvoice",
      sourceId: invoice.id,
      date: invoice.issueDate,
      dueDate: invoice.dueDate,
      type: "Invoice",
      transactionNumber: invoice.invoiceNumber,
      currency: invoice.currency,
      subtotal: invoice.subtotal,
      taxAmount: invoice.taxTotal,
      total: invoice.total,
      balanceDue: invoice.balanceDue,
      status: invoice.status,
    });
  }

  return {
    contact: customer,
    openReceivableBalance: "0.0000",
    overdueReceivableBalance: "0.0000",
    lastTransactionDate: invoice?.issueDate ?? template.nextRunDate,
    notes: "Fake recurring browser customer.",
    transactions,
  };
}

function statusLabel(status: RecurringStatus) {
  return status
    .split("_")
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(" ");
}

async function expectRecurringPageUsesSafeLabels(page: Page) {
  const text = (await page.locator("body").innerText()).replace(/No automatic scheduler[^.]*\./gi, "");
  expect(text).not.toMatch(/posted recurring invoice/i);
  expect(text).not.toMatch(/finalized automatically/i);
  expect(text).not.toMatch(/email sent/i);
  expect(text).not.toMatch(/payment collected/i);
  expect(text).not.toMatch(/VAT filed/i);
  expect(text).not.toMatch(/ZATCA compliant/i);
  expect(text).not.toMatch(/PDF\/A-3/i);
}

function json(route: Route, payload: unknown, status = 200) {
  return route.fulfill({ status, contentType: "application/json", body: JSON.stringify(payload) });
}

function unexpectedConsoleErrors(errors: string[]): string[] {
  return errors.filter(
    (error) =>
      !error.includes("Failed to load resource: the server responded with a status of 400") &&
      !error.includes("Failed to load resource: the server responded with a status of 404")
  );
}

interface RecurringWorkflowState {
  permissions: string[];
  template: ReturnType<typeof makeTemplate>;
  invoice: ReturnType<typeof makeDraftInvoiceFromRecurring> | null;
  createdPayload: Record<string, unknown> | null;
  updatedPayload: Record<string, unknown> | null;
  generateRequests: number;
  duplicateGenerationError: boolean;
  consoleErrors: string[];
}
