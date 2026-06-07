import { expect, test, type Page, type Route } from "@playwright/test";
import { fixedVisualDate, visualApiUrl } from "./visual-fixtures";

type CollectionCaseStatus = "OPEN" | "IN_PROGRESS" | "PROMISED_TO_PAY" | "PAID" | "ON_HOLD" | "DISPUTED" | "CLOSED" | "CANCELLED";
type CollectionPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";
type CollectionActivityType =
  | "NOTE"
  | "CALL"
  | "EMAIL_PLANNED"
  | "REMINDER_PLANNED"
  | "PROMISE_TO_PAY"
  | "DISPUTE"
  | "ESCALATION"
  | "PAYMENT_RECEIVED_NOTE"
  | "CLOSED_NOTE";

const collectionCaseId = "collection-case-browser";
const invoiceId = "invoice-collection-source";
const customer = {
  id: "customer-collections",
  organizationId: "org-visual",
  name: "Collections Browser Customer",
  displayName: "Collections Browser Customer",
  type: "CUSTOMER",
  email: "collections.customer@example.test",
  phone: null,
  taxNumber: "300000000000444",
  isActive: true,
  addressLine1: "Collections Road",
  addressLine2: null,
  buildingNumber: "1600",
  district: "QA District",
  city: "Riyadh",
  postalCode: "12211",
  countryCode: "SA",
};
const fullCollectionPermissions = [
  "dashboard.view",
  "contacts.view",
  "salesInvoices.view",
  "salesInvoices.create",
  "salesInvoices.update",
];

test("collections workspace create edit lifecycle timeline invoice customer global search path", async ({ page }) => {
  const state = await installCollectionsWorkflowMocks(page);

  await page.goto("/sales/collections");
  await expect(page.getByRole("heading", { name: "Collections" })).toBeVisible();
  await expect(page.getByRole("link", { name: "New collection case" })).toBeVisible();
  await expect(page.getByText("Overdue amount").first()).toBeVisible();
  await expect(page.getByText("Overdue invoices").first()).toBeVisible();
  await expect(page.getByText("Open cases").first()).toBeVisible();
  await expect(page.getByText("Due today").first()).toBeVisible();
  await expect(page.getByText("Overdue follow-ups").first()).toBeVisible();
  await expect(page.getByText("Promised-to-pay").first()).toBeVisible();
  await expect(page.getByText("Disputed").first()).toBeVisible();
  await expect(page.getByText("Top overdue customers")).toBeVisible();
  await expect(page.getByText("Collections Browser Customer")).toBeVisible();
  await expect(page.getByText("Aging buckets")).toBeVisible();
  await expect(page.getByText("1-30 days")).toBeVisible();
  await expectCollectionsPageUsesSafeLabels(page);

  await page.getByRole("button", { name: "Create" }).click();
  await expect(page.getByRole("dialog", { name: "Create menu" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Collection case", exact: true })).toHaveAttribute("href", "/sales/collections/new");
  await page.keyboard.press("Escape");

  await page.getByRole("link", { name: "New collection case" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "New collection case" })).toBeVisible();
  await expect(page.getByLabel("Collection case number")).toHaveValue("COL-BRW-001");
  await collectionCustomerSelect(page).selectOption(customer.id);
  await expect(collectionInvoiceSelect(page)).toContainText("INV-COL-001");
  await collectionInvoiceSelect(page).selectOption(invoiceId);
  await expect(page.getByText(/Linked invoice\s+INV-COL-001/i)).toBeVisible();
  await expect(page.getByText(/outstanding balance\s+SAR\s*650\.00/i)).toBeVisible();
  await expect(page.getByText(/Due date/i)).toBeVisible();
  await expect(page.getByText(/Aging bucket\s+1-30 days/i)).toBeVisible();
  await page.getByLabel("Priority").selectOption("HIGH");
  await page.getByLabel("Next follow-up").fill("2026-05-22");
  await page.getByLabel("Next action date").fill("2026-05-22");
  await page.getByLabel("Promised payment date").fill("2026-05-25");
  await page.getByLabel("Promised amount").fill("300.0000");
  await page.getByLabel("Summary").fill("Call finance team for promise-to-pay confirmation.");
  await page.getByLabel("Internal notes").fill("Fake internal collection note for browser coverage.");
  await page.getByRole("button", { name: "Create collection case" }).click();

  await expect(page).toHaveURL(/\/sales\/collections\/collection-case-browser$/);
  expect(state.createdPayloads[0]).toEqual(
    expect.objectContaining({
      customerId: customer.id,
      salesInvoiceId: invoiceId,
      priority: "HIGH",
      promisedPaymentDate: "2026-05-25",
      promisedAmount: "300.0000",
    }),
  );

  await expect(page.getByRole("heading", { name: "COL-BRW-001" })).toBeVisible();
  await expect(page.getByText("Accounting boundary")).toBeVisible();
  await expect(page.getByText(/Customer statement balance: unchanged/i)).toBeVisible();
  await expect(page.getByRole("link", { name: "Collections Browser Customer" })).toHaveAttribute("href", `/customers/${customer.id}`);
  await expect(page.getByRole("link", { name: "INV-COL-001" })).toHaveAttribute("href", `/sales/invoices/${invoiceId}`);
  await expectCollectionsPageUsesSafeLabels(page);

  await page.getByRole("link", { name: "Edit" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Edit collection case" })).toBeVisible();
  await page.getByLabel("Priority").selectOption("URGENT");
  await page.getByLabel("Summary").fill("Updated collection follow-up summary.");
  await page.getByRole("button", { name: "Save collection case" }).click();
  await expect(page).toHaveURL(/\/sales\/collections\/collection-case-browser$/);
  expect(state.updatedPayloads[0]).toEqual(expect.objectContaining({ priority: "URGENT", summary: "Updated collection follow-up summary." }));

  await page.getByLabel("Activity note").fill("Fake note: customer asked for invoice copy.");
  await page.getByRole("button", { name: "Add activity" }).click();
  await expect(page.getByText("Collection activity added.")).toBeVisible();
  await expect(page.getByText("Fake note: customer asked for invoice copy.")).toBeVisible();

  await page.getByLabel("Activity type").selectOption("CALL");
  await page.getByLabel("Activity note").fill("Fake call: customer finance team confirmed review.");
  await page.getByRole("button", { name: "Add activity" }).click();
  await expect(page.getByText("Fake call: customer finance team confirmed review.")).toBeVisible();

  await page.getByLabel("Promise date").fill("2026-05-26");
  await page.getByLabel("Promised amount").fill("350.0000");
  await page.getByRole("button", { name: "Mark promised" }).click();
  await expect(page.getByText("Promised to pay status saved.")).toBeVisible();
  await expect(page.getByText("Promised to pay").first()).toBeVisible();

  await page.getByRole("button", { name: "Mark disputed" }).click();
  await expect(page.getByText("Disputed status saved.")).toBeVisible();
  await expect(page.getByText("Disputed").first()).toBeVisible();

  await page.getByRole("button", { name: "Put on hold" }).click();
  await expect(page.getByText("On hold status saved.")).toBeVisible();
  await expect(page.getByText("On hold").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Start" })).toBeVisible();
  await page.getByRole("button", { name: "Start" }).click();
  await expect(page.getByText("In progress status saved.")).toBeVisible();
  await expect(page.getByText("In progress").first()).toBeVisible();

  await page.getByRole("button", { name: "Close" }).click();
  await expect(page.getByText("Closed status saved.")).toBeVisible();
  await expect(page.getByText("Closed").first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Edit" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Add activity" })).toHaveCount(0);
  await expect(page.getByText("Activity timeline")).toBeVisible();
  await expect(state.invoice.balanceDue).toBe("650.0000");
  expect(state.invoiceMutationRequests).toBe(0);
  expect(state.paymentMutationRequests).toBe(0);
  expect(state.creditNoteMutationRequests).toBe(0);
  expect(state.refundMutationRequests).toBe(0);
  expect(state.emailRequests).toBe(0);
  expect(state.paymentLinkRequests).toBe(0);
  expect(state.zatcaMutationRequests).toBe(0);
  expect(state.inventoryRequests).toBe(0);

  await page.goto(`/sales/invoices/${invoiceId}`);
  await expect(page.getByRole("heading", { name: "INV-COL-001" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Related collection cases" })).toBeVisible();
  await expect(page.getByRole("link", { name: "COL-BRW-001" })).toHaveAttribute("href", `/sales/collections/${collectionCaseId}`);
  await expect(page.getByText(/Collections records help track follow-up work/i)).toBeVisible();
  await expect(state.invoice.balanceDue).toBe("650.0000");

  await page.goto(`/customers/${customer.id}`);
  await expect(page.getByRole("heading", { level: 1, name: "Collections Browser Customer" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Customer collections" })).toBeVisible();
  await expect(page.getByText("Open receivable").first()).toBeVisible();
  await expect(page.getByText(/SAR\s*650\.00/).first()).toBeVisible();
  await expect(page.getByText("Collection amount effect")).toBeVisible();
  await expect(page.getByText("0.0000")).toBeVisible();
  await expect(page.getByRole("row", { name: /COL-BRW-001/ }).getByRole("link", { name: "Open" })).toHaveAttribute("href", `/sales/collections/${collectionCaseId}`);

  await page.getByPlaceholder("Search transactions, contacts, reports, and pages").fill("COL-BRW");
  await expect(page.getByRole("option", { name: /COL-BRW-001.*Collection case/ })).toBeVisible();
  await page.getByRole("option", { name: /COL-BRW-001.*Collection case/ }).click();
  await expect(page).toHaveURL(/\/sales\/collections\/collection-case-browser$/);
  await expect(page.getByRole("heading", { name: "COL-BRW-001" })).toBeVisible();
  expect(state.consoleErrors).toEqual([]);
});

test("collections restricted viewer duplicate invoice and terminal cases hide unsafe actions", async ({ page }) => {
  const state = await installCollectionsWorkflowMocks(page, {
    permissions: ["contacts.view", "salesInvoices.view"],
    collectionCase: makeCollectionCase("IN_PROGRESS"),
  });

  await page.goto("/sales/collections");
  await expect(page.getByRole("heading", { name: "Collections" })).toBeVisible();
  await expect(page.getByRole("link", { name: "New collection case" })).toHaveCount(0);
  await page.getByRole("button", { name: "Create" }).click();
  await expect(page.getByRole("link", { name: "Collection case", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Collection case", exact: true })).toBeDisabled();
  await page.keyboard.press("Escape");

  await page.goto(`/sales/collections/${collectionCaseId}`);
  await expect(page.getByRole("heading", { name: "COL-BRW-001" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Edit" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Start" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Mark promised" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Mark disputed" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Put on hold" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Close" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Cancel" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Add activity" })).toHaveCount(0);
  await expectCollectionsPageUsesSafeLabels(page);

  state.permissions = fullCollectionPermissions;
  state.collectionCase = makeCollectionCase("IN_PROGRESS");
  await page.goto(`/sales/invoices/${invoiceId}`);
  await expect(page.getByRole("heading", { name: "Related collection cases" })).toBeVisible();
  await expect(page.getByRole("link", { name: "COL-BRW-001" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Create collection case" })).toHaveCount(0);

  for (const status of ["CLOSED", "CANCELLED"] as CollectionCaseStatus[]) {
    state.collectionCase = makeCollectionCase(status);
    await page.goto(`/sales/collections/${collectionCaseId}`);
    await expect(page.getByRole("heading", { name: "COL-BRW-001" })).toBeVisible();
    await expect(page.getByText(statusLabel(status)).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Edit" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Add activity" })).toHaveCount(0);
    await page.goto(`/sales/collections/${collectionCaseId}/edit`);
    await expect(page.getByText("Collection case cannot be edited")).toBeVisible();
  }
  expect(state.consoleErrors).toEqual([]);
});

test("collections activity timeline uses safe planned and note-only labels", async ({ page }) => {
  const state = await installCollectionsWorkflowMocks(page, {
    collectionCase: makeCollectionCase("IN_PROGRESS", {
      activities: [
        makeActivity("NOTE", "Fake note activity."),
        makeActivity("CALL", "Fake call activity."),
        makeActivity("REMINDER_PLANNED", "Fake planned reminder record."),
        makeActivity("EMAIL_PLANNED", "Fake planned email record."),
        makeActivity("PROMISE_TO_PAY", "Fake promise tracking activity."),
        makeActivity("DISPUTE", "Fake dispute tracking activity."),
        makeActivity("ESCALATION", "Fake escalation note."),
        makeActivity("PAYMENT_RECEIVED_NOTE", "Fake payment-received note only."),
        makeActivity("CLOSED_NOTE", "Fake closure note."),
      ],
    }),
  });

  await page.goto(`/sales/collections/${collectionCaseId}`);
  await expect(page.getByRole("heading", { name: "Activity timeline" })).toBeVisible();
  const timeline = page.locator("div").filter({ has: page.getByRole("heading", { name: "Activity timeline" }) }).last();
  for (const label of ["Note", "Call", "Reminder planned", "Email planned", "Promise to pay", "Dispute", "Escalation", "Payment received note", "Closed note"]) {
    await expect(timeline.locator(".py-3", { hasText: label }).first()).toBeVisible();
  }
  await expect(page.getByText(/Payment received note is an internal note only/i)).toBeVisible();
  await expectCollectionsPageUsesSafeLabels(page);
  expect(state.consoleErrors).toEqual([]);
});

async function installCollectionsWorkflowMocks(page: Page, options: Partial<CollectionsWorkflowState> = {}) {
  const state: CollectionsWorkflowState = {
    permissions: options.permissions ?? fullCollectionPermissions,
    collectionCase: options.collectionCase ?? null,
    invoice: options.invoice ?? makeInvoice(),
    createdPayloads: [],
    updatedPayloads: [],
    invoiceMutationRequests: 0,
    paymentMutationRequests: 0,
    creditNoteMutationRequests: 0,
    refundMutationRequests: 0,
    emailRequests: 0,
    paymentLinkRequests: 0,
    zatcaMutationRequests: 0,
    inventoryRequests: 0,
    consoleErrors: [],
  };

  await page.route(`${visualApiUrl}/**`, (route) => fulfillCollectionsApiRoute(route, state));
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
      window.localStorage.setItem("ledgerbyte.accessToken", "collections-browser-token");
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

async function fulfillCollectionsApiRoute(route: Route, state: CollectionsWorkflowState) {
  const request = route.request();
  const url = new URL(request.url());
  const pathname = url.pathname;
  const method = request.method();

  if (pathname === "/auth/me") {
    return json(route, {
      id: "collections-user",
      email: "collections.browser@example.test",
      name: "Collections Browser Tester",
      memberships: [
        {
          id: "collections-membership",
          status: "ACTIVE",
          organization: { id: "org-visual", name: "Collections Browser Co", baseCurrency: "SAR" },
          role: { id: "collections-role", name: "Collections Browser Role", permissions: state.permissions },
        },
      ],
    });
  }

  if (pathname === "/search" && method === "GET") {
    const query = url.searchParams.get("query") ?? "";
    const results = state.collectionCase && query.toLowerCase().includes("col")
      ? [
          {
            id: `collection-case-${state.collectionCase.id}`,
            category: "Transactions",
            label: state.collectionCase.caseNumber,
            href: `/sales/collections/${state.collectionCase.id}`,
            resultType: "Collection case",
            detail: `${customer.displayName} / ${state.collectionCase.status}`,
            amount: state.collectionCase.salesInvoice?.balanceDue ?? "0.0000",
            date: state.collectionCase.nextActionAt ?? state.collectionCase.followUpDate,
          },
        ]
      : [];
    return json(route, { query, results });
  }
  if (pathname === "/contacts" && method === "GET") {
    return json(route, [customer]);
  }
  if (pathname === "/collections/summary" && method === "GET") {
    return json(route, makeSummary(state.collectionCase ? 1 : 0));
  }
  if (pathname === "/collections/next-number" && method === "GET") {
    if (!state.permissions.includes("salesInvoices.create")) {
      return json(route, { message: "You do not have permission to create collection cases." }, 403);
    }
    return json(route, {
      caseNumber: "COL-BRW-001",
      helperText: "Assigned from the collection case sequence when saved.",
    });
  }
  if (pathname === "/collections" && method === "GET") {
    return json(route, state.collectionCase ? [state.collectionCase] : []);
  }
  if (pathname === "/collections" && method === "POST") {
    if (!state.permissions.includes("salesInvoices.create")) {
      return json(route, { message: "You do not have permission to create collection cases." }, 403);
    }
    const payload = request.postDataJSON();
    state.createdPayloads.push(payload);
    state.collectionCase = makeCollectionCase("OPEN", collectionCasePayloadOverrides(payload));
    return json(route, state.collectionCase, 201);
  }
  if (pathname === `/collections/${collectionCaseId}` && method === "GET") {
    return json(route, state.collectionCase ?? makeCollectionCase("OPEN"));
  }
  if (pathname === `/collections/${collectionCaseId}` && method === "PATCH") {
    if (!state.permissions.includes("salesInvoices.update")) {
      return json(route, { message: "You do not have permission to update collection cases." }, 403);
    }
    const payload = request.postDataJSON();
    state.updatedPayloads.push(payload);
    state.collectionCase = makeCollectionCase(String(payload.status ?? state.collectionCase?.status ?? "OPEN") as CollectionCaseStatus, {
      ...preserveCollectionCaseOverrides(state.collectionCase ?? makeCollectionCase("OPEN")),
      ...collectionCasePayloadOverrides(payload),
    });
    return json(route, state.collectionCase);
  }
  if (pathname.startsWith(`/collections/${collectionCaseId}/`) && method === "POST") {
    return fulfillCollectionCaseAction(route, state, pathname);
  }
  if (pathname === `/collections/customer/${customer.id}` && method === "GET") {
    return json(route, state.collectionCase ? [state.collectionCase] : []);
  }
  if (pathname === `/collections/invoice/${invoiceId}` && method === "GET") {
    return json(route, state.collectionCase && state.collectionCase.salesInvoiceId === invoiceId ? [state.collectionCase] : []);
  }
  if (pathname === "/sales-invoices/open" && method === "GET") {
    return json(route, url.searchParams.get("customerId") === customer.id ? [state.invoice] : []);
  }
  if (pathname === `/sales-invoices/${invoiceId}`) {
    if (method !== "GET") {
      state.invoiceMutationRequests += 1;
      return json(route, { message: "Collection browser fixture blocks invoice mutations." }, 405);
    }
    return json(route, state.invoice);
  }
  if (pathname === `/sales-invoices/${invoiceId}/stock-issue-status` && method === "GET") {
    return json(route, { sourceId: invoiceId, sourceNumber: state.invoice.invoiceNumber, sourceStatus: state.invoice.status, status: "NOT_REQUIRED", issueStatus: "NOT_REQUIRED", issuedQuantity: "0.0000", remainingQuantity: "0.0000", lines: [] });
  }
  if (pathname.startsWith(`/sales-invoices/${invoiceId}/zatca`)) {
    if (method !== "GET") {
      state.zatcaMutationRequests += 1;
    }
    return json(route, { productionCompliance: false, localOnly: true, noMutation: true, warnings: ["Collections browser test keeps ZATCA disabled."] });
  }
  if (pathname === "/delivery-notes" && method === "GET") {
    return json(route, []);
  }
  if (pathname === `/contacts/customers/${customer.id}` && method === "GET") {
    return json(route, customerPartyDetail(state));
  }
  if (pathname.startsWith("/customer-payments") && method !== "GET") {
    state.paymentMutationRequests += 1;
    return json(route, { message: "Collection browser fixture blocks payment mutations." }, 405);
  }
  if (pathname.startsWith("/credit-notes") && method !== "GET") {
    state.creditNoteMutationRequests += 1;
    return json(route, { message: "Collection browser fixture blocks credit note mutations." }, 405);
  }
  if (pathname.startsWith("/customer-refunds") && method !== "GET") {
    state.refundMutationRequests += 1;
    return json(route, { message: "Collection browser fixture blocks refund mutations." }, 405);
  }
  if (pathname.includes("email")) {
    state.emailRequests += 1;
    return json(route, { message: "Collection browser fixture blocks email behavior." }, 405);
  }
  if (pathname.includes("payment-link")) {
    state.paymentLinkRequests += 1;
    return json(route, { message: "Collection browser fixture blocks payment links." }, 405);
  }
  if (pathname.includes("inventory") || pathname.includes("stock")) {
    state.inventoryRequests += 1;
    return json(route, { message: "Collection browser fixture blocks inventory behavior." }, 405);
  }
  if (pathname === "/attachments" && method === "GET") {
    return json(route, []);
  }

  return json(route, { message: `No collections workflow fixture for ${method} ${pathname}` }, 404);
}

function fulfillCollectionCaseAction(route: Route, state: CollectionsWorkflowState, pathname: string) {
  if (!state.permissions.includes("salesInvoices.update")) {
    return json(route, { message: "You do not have permission to update collection cases." }, 403);
  }
  if (!state.collectionCase) {
    state.collectionCase = makeCollectionCase("OPEN");
  }
  if (state.collectionCase.status === "CLOSED" || state.collectionCase.status === "CANCELLED") {
    return json(route, { message: "Closed or cancelled collection cases cannot be edited." }, 400);
  }
  const payload = route.request().postDataJSON();
  if (pathname.endsWith("/activities")) {
    const activityType = String(payload.activityType) as CollectionActivityType;
    const activity = makeActivity(activityType, String(payload.note ?? "Fake collection activity."), {
      nextFollowUpDate: payload.nextFollowUpDate ?? null,
      promisedPaymentDate: payload.promisedPaymentDate ?? null,
      promisedAmount: payload.promisedAmount ?? null,
    });
    const statusFromActivity = activityStatus(activityType);
    state.collectionCase = makeCollectionCase(statusFromActivity ?? state.collectionCase.status, {
      ...preserveCollectionCaseOverrides(state.collectionCase),
      activities: [activity, ...(state.collectionCase.activities ?? [])],
      lastActivityAt: fixedVisualDate,
      nextActionAt: payload.nextFollowUpDate ?? state.collectionCase.nextActionAt,
      promisedPaymentDate: payload.promisedPaymentDate ?? state.collectionCase.promisedPaymentDate,
      promisedAmount: payload.promisedAmount ?? state.collectionCase.promisedAmount,
    });
    return json(route, state.collectionCase);
  }

  const actionStatus: Record<string, CollectionCaseStatus> = {
    start: "IN_PROGRESS",
    "mark-promised": "PROMISED_TO_PAY",
    "mark-disputed": "DISPUTED",
    hold: "ON_HOLD",
    close: "CLOSED",
    cancel: "CANCELLED",
  };
  const action = pathname.split("/").at(-1) ?? "";
  state.collectionCase = makeCollectionCase(actionStatus[action] ?? state.collectionCase.status, {
    ...preserveCollectionCaseOverrides(state.collectionCase),
    nextActionAt: payload.nextActionAt ?? state.collectionCase.nextActionAt,
    promisedPaymentDate: payload.promisedPaymentDate ?? state.collectionCase.promisedPaymentDate,
    promisedAmount: payload.promisedAmount ?? state.collectionCase.promisedAmount,
  });
  return json(route, state.collectionCase);
}

function makeCollectionCase(status: CollectionCaseStatus, overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: collectionCaseId,
    organizationId: "org-visual",
    caseNumber: "COL-BRW-001",
    customerId: customer.id,
    salesInvoiceId: invoiceId,
    status,
    priority: "HIGH" as CollectionPriority,
    followUpDate: "2026-05-22T00:00:00.000Z",
    promisedPaymentDate: "2026-05-25T00:00:00.000Z",
    promisedAmount: "300.0000",
    assignedToUserId: null,
    lastActivityAt: null,
    nextActionAt: "2026-05-22T00:00:00.000Z",
    summary: "Call finance team for promise-to-pay confirmation.",
    notes: "Fake internal collection note for browser coverage.",
    createdById: "collections-user",
    updatedById: "collections-user",
    createdAt: fixedVisualDate,
    updatedAt: fixedVisualDate,
    customer,
    salesInvoice: makeInvoice(),
    assignedTo: null,
    createdBy: { id: "collections-user", name: "Collections Browser Tester", email: "collections.browser@example.test" },
    updatedBy: { id: "collections-user", name: "Collections Browser Tester", email: "collections.browser@example.test" },
    activities: [],
    invoiceSettled: false,
    nonPostingNotice: "Collections records help track follow-up work. They do not post journals, allocate payments, send emails, create payment links, file VAT, call ZATCA, or change invoice balances.",
    ...overrides,
  };
}

function makeInvoice() {
  return {
    id: invoiceId,
    organizationId: "org-visual",
    invoiceNumber: "INV-COL-001",
    customerId: customer.id,
    branchId: null,
    issueDate: "2026-04-15T00:00:00.000Z",
    dueDate: "2026-05-01T00:00:00.000Z",
    currency: "SAR",
    status: "FINALIZED",
    taxMode: "TAX_EXCLUSIVE",
    subtotal: "1000.0000",
    discountTotal: "0.0000",
    taxableTotal: "1000.0000",
    taxTotal: "150.0000",
    total: "1150.0000",
    balanceDue: "650.0000",
    notes: "Fake collection source invoice.",
    terms: "Net 15.",
    finalizedAt: "2026-04-15T10:00:00.000Z",
    journalEntryId: "journal-invoice-collection-source",
    reversalJournalEntryId: null,
    customer,
    branch: null,
    journalEntry: { id: "journal-invoice-collection-source", entryNumber: "JE-COL-001", status: "POSTED" },
    reversalJournalEntry: null,
    paymentAllocations: [],
    paymentUnappliedAllocations: [],
    creditNoteAllocations: [],
    creditNotes: [],
    lines: [],
  };
}

function makeActivity(activityType: CollectionActivityType, note: string, overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: `activity-${activityType.toLowerCase()}`,
    organizationId: "org-visual",
    collectionCaseId,
    customerId: customer.id,
    salesInvoiceId: invoiceId,
    activityType,
    activityDate: fixedVisualDate,
    note,
    nextFollowUpDate: null,
    promisedPaymentDate: null,
    promisedAmount: null,
    createdById: "collections-user",
    createdAt: fixedVisualDate,
    createdBy: { id: "collections-user", name: "Collections Browser Tester", email: "collections.browser@example.test" },
    ...overrides,
  };
}

function makeSummary(openCollectionCaseCount: number) {
  return {
    totalOverdueAmount: "650.0000",
    overdueInvoiceCount: 1,
    openCollectionCaseCount,
    casesDueToday: 1,
    casesOverdueForFollowUp: 1,
    promisedToPayTotal: "300.0000",
    disputedTotal: "125.0000",
    topCustomersByOverdueAmount: [
      {
        customerId: customer.id,
        customerName: customer.displayName,
        overdueAmount: "650.0000",
        overdueInvoiceCount: 1,
      },
    ],
    agingBuckets: [{ bucket: "1-30 days", amount: "650.0000" }],
    safeWording: "Collections records track follow-up work only.",
  };
}

function collectionCasePayloadOverrides(payload: Record<string, unknown> | null) {
  return {
    customerId: String(payload?.customerId ?? customer.id),
    salesInvoiceId: (payload?.salesInvoiceId as string | null | undefined) ?? invoiceId,
    priority: (payload?.priority as CollectionPriority | undefined) ?? "HIGH",
    followUpDate: payload?.followUpDate ? `${payload.followUpDate}T00:00:00.000Z` : "2026-05-22T00:00:00.000Z",
    nextActionAt: payload?.nextActionAt ? `${payload.nextActionAt}T00:00:00.000Z` : "2026-05-22T00:00:00.000Z",
    promisedPaymentDate: payload?.promisedPaymentDate ? `${payload.promisedPaymentDate}T00:00:00.000Z` : "2026-05-25T00:00:00.000Z",
    promisedAmount: (payload?.promisedAmount as string | undefined) ?? "300.0000",
    summary: (payload?.summary as string | undefined) ?? "Call finance team for promise-to-pay confirmation.",
    notes: (payload?.notes as string | undefined) ?? "Fake internal collection note for browser coverage.",
  };
}

function preserveCollectionCaseOverrides(collectionCase: ReturnType<typeof makeCollectionCase>) {
  return {
    customerId: collectionCase.customerId,
    salesInvoiceId: collectionCase.salesInvoiceId,
    priority: collectionCase.priority,
    followUpDate: collectionCase.followUpDate,
    nextActionAt: collectionCase.nextActionAt,
    promisedPaymentDate: collectionCase.promisedPaymentDate,
    promisedAmount: collectionCase.promisedAmount,
    summary: collectionCase.summary,
    notes: collectionCase.notes,
    activities: collectionCase.activities,
  };
}

function customerPartyDetail(state: CollectionsWorkflowState) {
  return {
    contact: customer,
    openReceivableBalance: state.invoice.balanceDue,
    overdueReceivableBalance: state.invoice.balanceDue,
    lastTransactionDate: state.invoice.issueDate,
    notes: "Fake collections browser customer.",
    transactions: [
      {
        id: `SalesInvoice:${state.invoice.id}`,
        sourceType: "SalesInvoice",
        sourceId: state.invoice.id,
        date: state.invoice.issueDate,
        dueDate: state.invoice.dueDate,
        type: "Invoice",
        transactionNumber: state.invoice.invoiceNumber,
        currency: state.invoice.currency,
        subtotal: state.invoice.subtotal,
        taxAmount: state.invoice.taxTotal,
        total: state.invoice.total,
        balanceDue: state.invoice.balanceDue,
        status: state.invoice.status,
      },
    ],
  };
}

function activityStatus(activityType: CollectionActivityType): CollectionCaseStatus | null {
  switch (activityType) {
    case "PROMISE_TO_PAY":
      return "PROMISED_TO_PAY";
    case "DISPUTE":
      return "DISPUTED";
    case "PAYMENT_RECEIVED_NOTE":
      return "PAID";
    case "CLOSED_NOTE":
      return "CLOSED";
    default:
      return null;
  }
}

function collectionCustomerSelect(page: Page) {
  return page.locator("form select").nth(0);
}

function collectionInvoiceSelect(page: Page) {
  return page.locator("form select").nth(1);
}

async function expectCollectionsPageUsesSafeLabels(page: Page) {
  const text = (await page.locator("body").innerText())
    .replace(/Email planned/gi, "")
    .replace(/Reminder planned/gi, "")
    .replace(/Payment received note/gi, "")
    .replace(/Promise to pay/gi, "")
    .replace(/does not post[^.]*\./gi, "")
    .replace(/do not post[^.]*\./gi, "");
  expect(text).not.toMatch(/email sent/i);
  expect(text).not.toMatch(/reminder sent/i);
  expect(text).not.toMatch(/payment link created/i);
  expect(text).not.toMatch(/payment allocated/i);
  expect(text).not.toMatch(/payment posted/i);
  expect(text).not.toMatch(/invoice was paid/i);
  expect(text).not.toMatch(/journal posted/i);
  expect(text).not.toMatch(/VAT filed/i);
  expect(text).not.toMatch(/ZATCA called/i);
  expect(text).not.toMatch(/legal action/i);
}

function statusLabel(status: CollectionCaseStatus) {
  return status
    .split("_")
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(" ");
}

function json(route: Route, payload: unknown, status = 200) {
  return route.fulfill({ status, contentType: "application/json", body: JSON.stringify(payload) });
}

interface CollectionsWorkflowState {
  permissions: string[];
  collectionCase: ReturnType<typeof makeCollectionCase> | null;
  invoice: ReturnType<typeof makeInvoice>;
  createdPayloads: Record<string, unknown>[];
  updatedPayloads: Record<string, unknown>[];
  invoiceMutationRequests: number;
  paymentMutationRequests: number;
  creditNoteMutationRequests: number;
  refundMutationRequests: number;
  emailRequests: number;
  paymentLinkRequests: number;
  zatcaMutationRequests: number;
  inventoryRequests: number;
  consoleErrors: string[];
}
