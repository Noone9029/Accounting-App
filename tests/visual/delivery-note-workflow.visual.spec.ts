import { expect, test, type Page, type Route } from "@playwright/test";
import { fixedVisualDate, visualApiUrl } from "./visual-fixtures";

type DeliveryNoteStatus = "DRAFT" | "ISSUED" | "DELIVERED" | "CANCELLED" | "VOIDED";

const deliveryNoteId = "delivery-note-browser";
const customer = {
  id: "customer-delivery",
  organizationId: "org-visual",
  name: "Delivery Browser Customer",
  displayName: "Delivery Browser Customer",
  type: "CUSTOMER",
  email: "delivery.customer@example.test",
  phone: null,
  taxNumber: "300000000000333",
  isActive: true,
  addressLine1: "Delivery Road",
  addressLine2: null,
  buildingNumber: "1500",
  district: "QA District",
  city: "Riyadh",
  postalCode: "12211",
  countryCode: "SA",
};
const otherCustomer = {
  ...customer,
  id: "customer-other",
  name: "Other Delivery Customer",
  displayName: "Other Delivery Customer",
  email: "other.delivery@example.test",
};
const item = {
  id: "item-delivery-service",
  organizationId: "org-visual",
  sku: "DB-SVC",
  name: "Delivery service",
  description: "Browser delivery service",
  type: "SERVICE",
  status: "ACTIVE",
  sellingPrice: "100.0000",
};
const sourceInvoiceId = "invoice-delivery-source";
const sourceQuoteId = "quote-delivery-source";
const fullDeliveryNotePermissions = [
  "dashboard.view",
  "contacts.view",
  "salesInvoices.view",
  "salesInvoices.create",
  "salesInvoices.update",
  "generatedDocuments.view",
  "generatedDocuments.download",
];

test("delivery note list create edit lifecycle PDF archive global search and customer activity path", async ({ page }) => {
  const state = await installDeliveryNoteWorkflowMocks(page);

  await page.goto("/sales/delivery-notes");
  await expect(page.getByRole("heading", { name: "Delivery notes" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Create delivery note" })).toBeVisible();
  await expectDeliveryNotePageUsesSafeLabels(page);

  await page.getByRole("button", { name: "Create" }).click();
  await expect(page.getByRole("dialog", { name: "Create menu" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Delivery note", exact: true })).toHaveAttribute("href", "/sales/delivery-notes/new");
  await page.keyboard.press("Escape");

  await page.getByPlaceholder("Search transactions, contacts, reports, and pages").fill("delivery note");
  await expect(page.getByRole("option", { name: /Delivery Notes/ })).toBeVisible();
  await expect(page.getByText("Open transaction page")).toBeVisible();
  await page.keyboard.press("Escape");

  await page.getByRole("link", { name: "Create delivery note" }).click();
  await expect(page.getByRole("heading", { name: "New delivery note" })).toBeVisible();
  await expect(page.getByLabel("Delivery note number")).toHaveValue("DN-BRW-001");
  await expect(page.getByText(/do not create journals, AR balances, VAT filing, ZATCA submission, payment, email, or inventory movement/i)).toBeVisible();

  await customerSelect(page).selectOption(customer.id);
  await page.getByLabel("Issue date").fill("2026-06-04");
  await page.getByLabel("Delivery date").fill("2026-06-05");
  await page.getByLabel("Reference").fill("DN-BROWSER-DIRECT");
  await page.getByLabel("Delivery address").fill("Warehouse Gate 4\nRiyadh QA District");
  await page.getByLabel("Item for delivery note line 1").selectOption(item.id);
  await expect(page.getByLabel("Description for delivery note line 1")).toHaveValue("Browser delivery service");
  await page.getByLabel("Quantity for delivery note line 1").fill("2.0000");
  await page.getByLabel("Unit for delivery note line 1").fill("each");
  await expect(page.getByText("1 delivery line")).toBeVisible();

  await page.getByRole("button", { name: "Create draft delivery note" }).click();
  await expect(page).toHaveURL(/\/sales\/delivery-notes\/delivery-note-browser$/);
  expect(state.createdPayloads[0]).toEqual(
    expect.objectContaining({
      customerId: customer.id,
      relatedSalesInvoiceId: null,
      relatedSalesQuoteId: null,
      deliveryAddress: "Warehouse Gate 4\nRiyadh QA District",
      lines: [expect.objectContaining({ description: "Browser delivery service", quantity: "2.0000" })],
    }),
  );

  await expect(page.getByRole("heading", { name: "DN-BRW-001" })).toBeVisible();
  await expect(page.getByText(/This Delivery Note is a non-posting fulfillment document/i)).toBeVisible();
  await expect(page.getByText("Direct delivery note with no source document link.")).toBeVisible();
  await expectDeliveryNotePageUsesSafeLabels(page);

  await page.getByRole("link", { name: "Edit" }).click();
  await expect(page.getByRole("heading", { name: "Edit delivery note" })).toBeVisible();
  await page.getByLabel("Reference").fill("DN-BROWSER-UPDATED");
  await page.getByLabel("Instructions").fill("Recipient signature required.");
  await page.getByRole("button", { name: "Save draft delivery note" }).click();
  await expect(page).toHaveURL(/\/sales\/delivery-notes\/delivery-note-browser$/);
  expect(state.updatedPayloads[0]).toEqual(expect.objectContaining({ reference: "DN-BROWSER-UPDATED", instructions: "Recipient signature required." }));

  await page.getByRole("button", { name: "Issue" }).click();
  await expect(page.getByText(/DN-BRW-001 is now issued/i)).toBeVisible();
  await expect(page.getByText("Issued").first()).toBeVisible();
  await page.getByRole("button", { name: "Mark delivered" }).click();
  await expect(page.getByText(/DN-BRW-001 is now delivered/i)).toBeVisible();
  await expect(page.getByText("Delivered").first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Edit" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Issue" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Mark delivered" })).toHaveCount(0);

  const pdfResponsePromise = page.waitForResponse((response) => response.url().endsWith(`/delivery-notes/${deliveryNoteId}/pdf`));
  await page.getByRole("button", { name: "Download delivery note PDF" }).click();
  const pdfResponse = await pdfResponsePromise;
  expect(pdfResponse.status()).toBe(200);
  expect(pdfResponse.headers()["content-type"]).toContain("application/pdf");
  expect(pdfResponse.headers()["content-disposition"]).toContain("delivery-note-DN-BRW-001.pdf");
  expect(Number(pdfResponse.headers()["content-length"] ?? "0")).toBeGreaterThan(0);
  await expect(page.getByText("delivery-note-DN-BRW-001.pdf")).toBeVisible();
  expect(state.archiveDocuments).toHaveLength(1);

  const archiveDownloadPromise = page.waitForResponse((response) => response.url().endsWith("/generated-documents/generated-delivery-note-doc-1/download"));
  await page.getByRole("button", { name: "Download archived PDF" }).click();
  const archiveResponse = await archiveDownloadPromise;
  expect(archiveResponse.status()).toBe(200);
  expect(archiveResponse.headers()["content-type"]).toContain("application/pdf");
  expect(state.archiveDocuments).toHaveLength(1);

  await page.goto(`/customers/${customer.id}`);
  await expect(page.getByRole("heading", { level: 1, name: "Delivery Browser Customer" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Delivery notes\s+1/ })).toBeVisible();
  await expect(page.getByRole("cell", { name: "Delivery note (non-posting fulfillment)" })).toBeVisible();
  await expect(page.getByRole("row", { name: /Delivery note \(non-posting fulfillment\).*DN-BRW-001.*SAR\s*0\.00/i })).toBeVisible();
  await expect(page.getByText("Open receivable")).toBeVisible();
  await expect(page.getByText(/SAR\s*0\.00/).first()).toBeVisible();

  await page.goto("/documents");
  await expect(page.getByRole("heading", { name: "Documents" })).toBeVisible();
  await expect(page.getByLabel("Document type")).toContainText("Delivery Note");
  await expect(page.getByRole("cell", { name: "Delivery Note", exact: true }).first()).toBeVisible();
  await expect(page.getByRole("cell", { name: "delivery-note-DN-BRW-001.pdf" })).toBeVisible();

  await page.getByPlaceholder("Search transactions, contacts, reports, and pages").fill("DN-BRW");
  await expect(page.getByRole("option", { name: /DN-BRW-001.*Delivery note/ })).toBeVisible();
  await page.getByRole("option", { name: /DN-BRW-001.*Delivery note/ }).click();
  await expect(page).toHaveURL(/\/sales\/delivery-notes\/delivery-note-browser$/);
  await expect(page.getByRole("heading", { name: "DN-BRW-001" })).toBeVisible();
  expect(state.invoiceMutationRequests).toBe(0);
  expect(state.quoteMutationRequests).toBe(0);
  expect(state.consoleErrors).toEqual([]);
});

test("delivery note source invoice and accepted quote copy paths do not mutate source records", async ({ page }) => {
  const state = await installDeliveryNoteWorkflowMocks(page);

  await page.goto("/sales/delivery-notes/new");
  await expect(page.getByRole("heading", { name: "New delivery note" })).toBeVisible();
  await expect(page.getByLabel("Source invoice")).toContainText("INV-DN-001");
  await expect(page.getByLabel("Source invoice")).not.toContainText("INV-DN-VOID");
  await expect(page.getByLabel("Accepted quote source")).toContainText("QUO-DN-001");
  await expect(page.getByLabel("Accepted quote source")).not.toContainText("QUO-DN-DRAFT");

  await page.getByLabel("Source invoice").selectOption(sourceInvoiceId);
  await expect(customerSelect(page)).toHaveValue(customer.id);
  await expect(page.getByLabel("Reference")).toHaveValue("INV-DN-001");
  await expect(page.getByLabel("Description for delivery note line 1")).toHaveValue("Source invoice fulfillment line");
  await page.getByLabel("Issue date").fill("2026-06-04");
  await page.getByLabel("Delivery date").fill("2026-06-06");
  await page.getByLabel("Delivery address").fill("Invoice source dock");
  await page.getByRole("button", { name: "Create draft delivery note" }).click();
  await expect(page).toHaveURL(/\/sales\/delivery-notes\/delivery-note-browser$/);
  expect(state.createdPayloads.at(-1)).toEqual(
    expect.objectContaining({
      relatedSalesInvoiceId: sourceInvoiceId,
      relatedSalesQuoteId: null,
      lines: [expect.objectContaining({ sourceSalesInvoiceLineId: "invoice-line-delivery-source" })],
    }),
  );
  await expect(page.getByText("Invoice line")).toBeVisible();
  await expect(page.getByText("Source invoice", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "INV-DN-001" })).toBeVisible();

  await page.getByRole("link", { name: "INV-DN-001" }).click();
  await expect(page).toHaveURL(/\/sales\/invoices\/invoice-delivery-source$/);
  await expect(page.getByRole("heading", { name: "INV-DN-001" })).toBeVisible();
  await expect(page.getByText("Finalized/posted").first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Related delivery notes" })).toBeVisible();
  await expect(page.getByText(/fulfillment documents/i)).toBeVisible();
  await expect(page.getByRole("link", { name: "DN-BRW-001" })).toHaveAttribute("href", `/sales/delivery-notes/${deliveryNoteId}`);
  expect(state.invoice.status).toBe("FINALIZED");
  expect(state.invoiceMutationRequests).toBe(0);

  await page.goto("/sales/delivery-notes/new");
  await page.getByLabel("Accepted quote source").selectOption(sourceQuoteId);
  await expect(customerSelect(page)).toHaveValue(customer.id);
  await expect(page.getByLabel("Reference")).toHaveValue("QUO-DN-001");
  await expect(page.getByLabel("Description for delivery note line 1")).toHaveValue("Accepted quote fulfillment line");
  await page.getByLabel("Issue date").fill("2026-06-04");
  await page.getByLabel("Delivery date").fill("2026-06-06");
  await page.getByLabel("Delivery address").fill("Quote source dock");
  await page.getByRole("button", { name: "Create draft delivery note" }).click();
  await expect(page).toHaveURL(/\/sales\/delivery-notes\/delivery-note-browser$/);
  expect(state.createdPayloads.at(-1)).toEqual(
    expect.objectContaining({
      relatedSalesInvoiceId: null,
      relatedSalesQuoteId: sourceQuoteId,
      lines: [expect.objectContaining({ sourceSalesQuoteLineId: "quote-line-delivery-source" })],
    }),
  );
  await expect(page.getByText("Quote line")).toBeVisible();
  await expect(page.getByText("Source quote", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "QUO-DN-001" })).toBeVisible();

  await page.getByRole("link", { name: "QUO-DN-001" }).click();
  await expect(page).toHaveURL(/\/sales\/quotes\/quote-delivery-source$/);
  await expect(page.getByRole("heading", { name: "QUO-DN-001" })).toBeVisible();
  await expect(page.getByText("Accepted").first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Related delivery notes" })).toBeVisible();
  await expect(page.getByText(/Delivery notes linked to quotes remain operational and non-posting/i)).toBeVisible();
  await expect(page.getByRole("link", { name: "DN-BRW-001" })).toHaveAttribute("href", `/sales/delivery-notes/${deliveryNoteId}`);
  expect(state.quote.status).toBe("ACCEPTED");
  expect(state.quoteMutationRequests).toBe(0);
  expect(state.consoleErrors).toEqual([]);
});

test("restricted delivery note viewer and blocked statuses hide unsafe actions", async ({ page }) => {
  const state = await installDeliveryNoteWorkflowMocks(page, {
    permissions: ["contacts.view", "salesInvoices.view", "generatedDocuments.view"],
    deliveryNote: makeDeliveryNote("ISSUED"),
    archiveDocuments: [makeDeliveryNoteArchive()],
  });

  await page.goto("/sales/delivery-notes");
  await expect(page.getByRole("heading", { name: "Delivery notes" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Create delivery note" })).toHaveCount(0);

  await page.getByRole("button", { name: "Create" }).click();
  await expect(page.getByRole("link", { name: "Delivery note", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Delivery note", exact: true })).toBeDisabled();
  await page.keyboard.press("Escape");

  await page.goto(`/sales/delivery-notes/${deliveryNoteId}`);
  await expect(page.getByRole("heading", { name: "DN-BRW-001" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Edit" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Issue" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Mark delivered" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Cancel" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Void" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Download delivery note PDF" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Download archived PDF" })).toHaveCount(0);
  await expect(page.getByText("delivery-note-DN-BRW-001.pdf")).toBeVisible();
  await expectDeliveryNotePageUsesSafeLabels(page);
  expect(state.pdfRequests).toBe(0);
  expect(state.archiveDownloadRequests).toBe(0);
  expect(state.consoleErrors).toEqual([]);
});

test("delivery note terminal statuses and empty issue path stay blocked", async ({ page }) => {
  const state = await installDeliveryNoteWorkflowMocks(page);
  const terminalStatuses: DeliveryNoteStatus[] = ["DELIVERED", "CANCELLED", "VOIDED"];

  for (const status of terminalStatuses) {
    state.deliveryNote = makeDeliveryNote(status);
    await page.goto(`/sales/delivery-notes/${deliveryNoteId}`);
    await expect(page.getByRole("heading", { name: "DN-BRW-001" })).toBeVisible();
    await expect(page.getByText(statusLabel(status)).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Edit" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Issue" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Mark delivered" })).toHaveCount(0);

    if (status !== "CANCELLED") {
      await expect(page.getByRole("button", { name: "Cancel" })).toHaveCount(0);
    }
    await expectDeliveryNotePageUsesSafeLabels(page);
  }

  state.deliveryNote = makeDeliveryNote("DRAFT", { lines: [] });
  await page.goto(`/sales/delivery-notes/${deliveryNoteId}`);
  await expect(page.getByRole("button", { name: "Issue" })).toBeVisible();
  await page.getByRole("button", { name: "Issue" }).click();
  await expect(page.getByText("Delivery notes require at least one line before issue.")).toBeVisible();
  expect(unexpectedConsoleErrors(state.consoleErrors)).toEqual([]);
});

async function installDeliveryNoteWorkflowMocks(page: Page, options: Partial<DeliveryNoteWorkflowState> = {}) {
  const state: DeliveryNoteWorkflowState = {
    permissions: options.permissions ?? fullDeliveryNotePermissions,
    deliveryNote: options.deliveryNote ?? makeDeliveryNote("DRAFT"),
    archiveDocuments: options.archiveDocuments ?? [],
    invoice: options.invoice ?? makeSourceInvoice(),
    quote: options.quote ?? makeSourceQuote(),
    createdPayloads: [],
    updatedPayloads: [],
    pdfRequests: 0,
    archiveDownloadRequests: 0,
    invoiceMutationRequests: 0,
    quoteMutationRequests: 0,
    consoleErrors: [],
  };

  await page.route(`${visualApiUrl}/**`, (route) => fulfillDeliveryNoteApiRoute(route, state));
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
      window.localStorage.setItem("ledgerbyte.accessToken", "delivery-note-browser-token");
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

async function fulfillDeliveryNoteApiRoute(route: Route, state: DeliveryNoteWorkflowState) {
  const request = route.request();
  const url = new URL(request.url());
  const pathname = url.pathname;
  const method = request.method();

  if (pathname === "/auth/me") {
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: "delivery-note-user",
        email: "delivery.browser@example.test",
        name: "Delivery Browser Tester",
        memberships: [
          {
            id: "delivery-note-membership",
            status: "ACTIVE",
            organization: { id: "org-visual", name: "Delivery Browser Co", baseCurrency: "SAR" },
            role: { id: "delivery-note-role", name: "Delivery Note Browser Role", permissions: state.permissions },
          },
        ],
      }),
    });
  }

  if (pathname === "/search" && method === "GET") {
    const query = url.searchParams.get("query") ?? "";
    const results = query.toLowerCase().includes("dn") || query.toLowerCase().includes("delivery")
      ? [
          {
            id: `delivery-note-${state.deliveryNote.id}`,
            category: "Transactions",
            label: state.deliveryNote.deliveryNoteNumber,
            href: `/sales/delivery-notes/${state.deliveryNote.id}`,
            resultType: "Delivery note",
            detail: customer.displayName,
            amount: "0.0000",
            date: state.deliveryNote.issueDate,
            status: state.deliveryNote.status,
            keywords: [state.deliveryNote.deliveryNoteNumber, "delivery note", "fulfillment"],
          },
        ]
      : [];
    return json(route, { query, results });
  }

  if (pathname === "/contacts" && method === "GET") {
    return json(route, [customer, otherCustomer]);
  }
  if (pathname === "/items" && method === "GET") {
    return json(route, [item]);
  }
  if (pathname === "/branches" && method === "GET") {
    return json(route, []);
  }
  if (pathname === "/attachments" && method === "GET") {
    return json(route, []);
  }
  if (pathname === "/sales-invoices" && method === "GET") {
    return json(route, [state.invoice, makeVoidedSourceInvoice(), { ...state.invoice, id: "invoice-other-customer", invoiceNumber: "INV-DN-OTHER", customerId: otherCustomer.id, customer: otherCustomer }]);
  }
  if (pathname === "/sales-quotes" && method === "GET") {
    return json(route, [state.quote, makeSourceQuote({ id: "quote-draft-source", quoteNumber: "QUO-DN-DRAFT", status: "DRAFT" })]);
  }
  if (pathname === `/sales-invoices/${sourceInvoiceId}`) {
    if (method !== "GET") {
      state.invoiceMutationRequests += 1;
      return json(route, { message: "Source invoice mutations are not part of delivery note browser coverage." }, 405);
    }
    return json(route, state.invoice);
  }
  if (pathname === `/sales-invoices/${sourceInvoiceId}/stock-issue-status` && method === "GET") {
    return json(route, { sourceId: sourceInvoiceId, sourceNumber: "INV-DN-001", sourceStatus: state.invoice.status, status: "NOT_REQUIRED", issueStatus: "NOT_REQUIRED", issuedQuantity: "0.0000", remainingQuantity: "0.0000", lines: [] });
  }
  if (pathname.startsWith(`/sales-invoices/${sourceInvoiceId}/zatca`) && method === "GET") {
    return json(route, { productionCompliance: false, localOnly: true, noMutation: true, warnings: ["Delivery note browser test keeps ZATCA disabled."] });
  }
  if (pathname === `/sales-quotes/${sourceQuoteId}`) {
    if (method !== "GET") {
      state.quoteMutationRequests += 1;
      return json(route, { message: "Source quote mutations are not part of delivery note browser coverage." }, 405);
    }
    return json(route, state.quote);
  }
  if (pathname === "/delivery-notes/next-number" && method === "GET") {
    if (!state.permissions.includes("salesInvoices.create")) {
      return json(route, { message: "You do not have permission to create delivery notes." }, 403);
    }
    return json(route, {
      deliveryNoteNumber: "DN-BRW-001",
      editable: false,
      overrideAllowed: false,
      helperText: "Preview only. The delivery note number is assigned from the delivery note sequence when the draft is saved.",
    });
  }
  if (pathname === "/delivery-notes" && method === "GET") {
    const customerId = url.searchParams.get("customerId");
    const rows = customerId && customerId !== state.deliveryNote.customerId ? [] : [deliveryNoteListRow(state.deliveryNote)];
    return json(route, rows);
  }
  if (pathname === "/delivery-notes" && method === "POST") {
    if (!state.permissions.includes("salesInvoices.create")) {
      return json(route, { message: "You do not have permission to create delivery notes." }, 403);
    }
    const payload = request.postDataJSON();
    state.createdPayloads.push(payload);
    state.deliveryNote = makeDeliveryNote("DRAFT", deliveryNotePayloadOverrides(payload));
    return json(route, state.deliveryNote, 201);
  }
  if (pathname === `/delivery-notes/${deliveryNoteId}` && method === "GET") {
    return json(route, state.deliveryNote);
  }
  if (pathname === `/delivery-notes/${deliveryNoteId}` && method === "PATCH") {
    if (!state.permissions.includes("salesInvoices.update")) {
      return json(route, { message: "You do not have permission to update delivery notes." }, 403);
    }
    const payload = request.postDataJSON();
    state.updatedPayloads.push(payload);
    state.deliveryNote = makeDeliveryNote("DRAFT", { ...preserveDeliveryNoteOverrides(state.deliveryNote), ...deliveryNotePayloadOverrides(payload) });
    return json(route, state.deliveryNote);
  }
  if (pathname === `/delivery-notes/${deliveryNoteId}/issue` && method === "POST") {
    if (!state.permissions.includes("salesInvoices.update")) {
      return json(route, { message: "You do not have permission to issue delivery notes." }, 403);
    }
    if (state.deliveryNote.status !== "DRAFT") {
      return json(route, { message: "Only draft delivery notes can be issued." }, 400);
    }
    if ((state.deliveryNote.lines ?? []).length === 0) {
      return json(route, { message: "Delivery notes require at least one line before issue." }, 400);
    }
    state.deliveryNote = makeDeliveryNote("ISSUED", { ...preserveDeliveryNoteOverrides(state.deliveryNote), issuedAt: fixedVisualDate });
    return json(route, state.deliveryNote);
  }
  if (pathname === `/delivery-notes/${deliveryNoteId}/mark-delivered` && method === "POST") {
    if (!state.permissions.includes("salesInvoices.update")) {
      return json(route, { message: "You do not have permission to mark delivery notes delivered." }, 403);
    }
    if (state.deliveryNote.status !== "ISSUED") {
      return json(route, { message: "Only issued delivery notes can be marked delivered." }, 400);
    }
    state.deliveryNote = makeDeliveryNote("DELIVERED", { ...preserveDeliveryNoteOverrides(state.deliveryNote), deliveredAt: fixedVisualDate });
    return json(route, state.deliveryNote);
  }
  if (pathname === `/delivery-notes/${deliveryNoteId}/cancel` && method === "POST") {
    if (!state.permissions.includes("salesInvoices.update")) {
      return json(route, { message: "You do not have permission to cancel delivery notes." }, 403);
    }
    if (state.deliveryNote.status !== "DRAFT" && state.deliveryNote.status !== "ISSUED") {
      return json(route, { message: "Only draft or issued delivery notes can be cancelled." }, 400);
    }
    state.deliveryNote = makeDeliveryNote("CANCELLED", { ...preserveDeliveryNoteOverrides(state.deliveryNote), cancelledAt: fixedVisualDate });
    return json(route, state.deliveryNote);
  }
  if (pathname === `/delivery-notes/${deliveryNoteId}/void` && method === "POST") {
    if (!state.permissions.includes("salesInvoices.update")) {
      return json(route, { message: "You do not have permission to void delivery notes." }, 403);
    }
    if (state.deliveryNote.status !== "ISSUED") {
      return json(route, { message: "Only issued delivery notes can be voided." }, 400);
    }
    state.deliveryNote = makeDeliveryNote("VOIDED", { ...preserveDeliveryNoteOverrides(state.deliveryNote), voidedAt: fixedVisualDate });
    return json(route, state.deliveryNote);
  }
  if (pathname === `/delivery-notes/${deliveryNoteId}/pdf` && method === "GET") {
    state.pdfRequests += 1;
    if (!state.permissions.includes("generatedDocuments.download")) {
      return json(route, { message: "You do not have permission to generate or download PDF outputs." }, 403);
    }
    if (state.archiveDocuments.length === 0) {
      state.archiveDocuments.push(makeDeliveryNoteArchive());
    }
    return pdf(route, "delivery-note-DN-BRW-001.pdf");
  }
  if (pathname === "/generated-documents" && method === "GET") {
    const documentType = url.searchParams.get("documentType");
    const sourceId = url.searchParams.get("sourceId");
    const rows = state.archiveDocuments.filter((document) => (!documentType || document.documentType === documentType) && (!sourceId || document.sourceId === sourceId));
    return json(route, rows);
  }
  if (pathname === "/generated-documents/generated-delivery-note-doc-1/download" && method === "GET") {
    state.archiveDownloadRequests += 1;
    return pdf(route, "delivery-note-DN-BRW-001.pdf");
  }
  if (pathname === `/contacts/customers/${customer.id}` && method === "GET") {
    return json(route, customerPartyDetail(state.deliveryNote));
  }

  return json(route, { message: `No delivery note workflow fixture for ${method} ${pathname}` }, 404);
}

function makeDeliveryNote(status: DeliveryNoteStatus, overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: deliveryNoteId,
    organizationId: "org-visual",
    deliveryNoteNumber: "DN-BRW-001",
    customerId: customer.id,
    branchId: null,
    status,
    issueDate: "2026-06-04T00:00:00.000Z",
    deliveryDate: "2026-06-05T00:00:00.000Z",
    reference: "DN-BROWSER",
    relatedSalesInvoiceId: null,
    relatedSalesQuoteId: null,
    relatedSalesStockIssueId: null,
    deliveryAddress: "Warehouse Gate 4\nRiyadh QA District",
    notes: "Browser delivery note.",
    instructions: "Recipient signature required.",
    issuedAt: null,
    deliveredAt: null,
    cancelledAt: null,
    voidedAt: null,
    customer,
    branch: null,
    relatedSalesInvoice: null,
    relatedSalesQuote: null,
    relatedSalesStockIssue: null,
    lines: [makeDeliveryLine()],
    ...overrides,
  };
}

function makeDeliveryLine(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "delivery-note-line-1",
    organizationId: "org-visual",
    deliveryNoteId,
    itemId: item.id,
    description: "Browser delivery service",
    quantity: "2.0000",
    unitOfMeasure: "each",
    sourceSalesInvoiceLineId: null,
    sourceSalesQuoteLineId: null,
    sourceSalesStockIssueLineId: null,
    sortOrder: 0,
    item,
    ...overrides,
  };
}

function deliveryNotePayloadOverrides(payload: Record<string, unknown> | null) {
  const lines = Array.isArray(payload?.lines) ? (payload.lines as Record<string, unknown>[]) : [];
  const sourceInvoice = payload?.relatedSalesInvoiceId === sourceInvoiceId ? { id: sourceInvoiceId, invoiceNumber: "INV-DN-001", status: "FINALIZED", issueDate: "2026-06-03T00:00:00.000Z", total: "115.0000" } : null;
  const sourceQuote = payload?.relatedSalesQuoteId === sourceQuoteId ? { id: sourceQuoteId, quoteNumber: "QUO-DN-001", status: "ACCEPTED", issueDate: "2026-06-02T00:00:00.000Z", total: "115.0000" } : null;

  return {
    customerId: String(payload?.customerId ?? customer.id),
    issueDate: String(payload?.issueDate ?? "2026-06-04T00:00:00.000Z"),
    deliveryDate: (payload?.deliveryDate as string | null | undefined) ?? "2026-06-05T00:00:00.000Z",
    reference: (payload?.reference as string | undefined) ?? "DN-BROWSER",
    relatedSalesInvoiceId: (payload?.relatedSalesInvoiceId as string | null | undefined) ?? null,
    relatedSalesQuoteId: (payload?.relatedSalesQuoteId as string | null | undefined) ?? null,
    relatedSalesInvoice: sourceInvoice,
    relatedSalesQuote: sourceQuote,
    deliveryAddress: (payload?.deliveryAddress as string | undefined) ?? "Warehouse Gate 4\nRiyadh QA District",
    notes: (payload?.notes as string | undefined) ?? "Browser delivery note.",
    instructions: (payload?.instructions as string | undefined) ?? "Recipient signature required.",
    lines: lines.length
      ? lines.map((line, index) =>
          makeDeliveryLine({
            id: `delivery-note-line-${index + 1}`,
            itemId: String(line.itemId ?? item.id),
            description: String(line.description ?? "Browser delivery service"),
            quantity: String(line.quantity ?? "1.0000"),
            unitOfMeasure: (line.unitOfMeasure as string | undefined) ?? "each",
            sourceSalesInvoiceLineId: (line.sourceSalesInvoiceLineId as string | undefined) ?? null,
            sourceSalesQuoteLineId: (line.sourceSalesQuoteLineId as string | undefined) ?? null,
          }),
        )
      : [],
  };
}

function preserveDeliveryNoteOverrides(deliveryNote: ReturnType<typeof makeDeliveryNote>) {
  return {
    customerId: deliveryNote.customerId,
    issueDate: deliveryNote.issueDate,
    deliveryDate: deliveryNote.deliveryDate,
    reference: deliveryNote.reference,
    relatedSalesInvoiceId: deliveryNote.relatedSalesInvoiceId,
    relatedSalesQuoteId: deliveryNote.relatedSalesQuoteId,
    relatedSalesInvoice: deliveryNote.relatedSalesInvoice,
    relatedSalesQuote: deliveryNote.relatedSalesQuote,
    deliveryAddress: deliveryNote.deliveryAddress,
    notes: deliveryNote.notes,
    instructions: deliveryNote.instructions,
    lines: deliveryNote.lines,
  };
}

function deliveryNoteListRow(deliveryNote: ReturnType<typeof makeDeliveryNote>) {
  return {
    ...deliveryNote,
    lines: undefined,
    _count: { lines: deliveryNote.lines?.length ?? 0 },
  };
}

function makeSourceInvoice() {
  return {
    id: sourceInvoiceId,
    organizationId: "org-visual",
    invoiceNumber: "INV-DN-001",
    customerId: customer.id,
    branchId: null,
    issueDate: "2026-06-03T00:00:00.000Z",
    dueDate: "2026-06-20T00:00:00.000Z",
    currency: "SAR",
    status: "FINALIZED",
    taxMode: "TAX_EXCLUSIVE",
    subtotal: "100.0000",
    discountTotal: "0.0000",
    taxableTotal: "100.0000",
    taxTotal: "15.0000",
    total: "115.0000",
    balanceDue: "115.0000",
    notes: "Source invoice for delivery note browser coverage.",
    terms: "Net 15.",
    finalizedAt: "2026-06-03T10:00:00.000Z",
    journalEntryId: "journal-invoice-delivery-source",
    reversalJournalEntryId: null,
    customer,
    branch: null,
    journalEntry: { id: "journal-invoice-delivery-source", entryNumber: "JE-DN-001", status: "POSTED" },
    reversalJournalEntry: null,
    paymentAllocations: [],
    paymentUnappliedAllocations: [],
    creditNoteAllocations: [],
    creditNotes: [],
    lines: [
      {
        id: "invoice-line-delivery-source",
        invoiceId: sourceInvoiceId,
        itemId: item.id,
        description: "Source invoice fulfillment line",
        quantity: "3.0000",
        unitPrice: "100.0000",
        discountRate: "0.0000",
        discountAmount: "0.0000",
        taxRateId: "tax-15-delivery",
        accountId: "revenue-account-delivery",
        lineSubtotal: "100.0000",
        lineTax: "15.0000",
        lineGrossAmount: "100.0000",
        taxableAmount: "100.0000",
        taxAmount: "15.0000",
        lineTotal: "115.0000",
        item,
        taxRate: { id: "tax-15-delivery", name: "VAT 15%", rate: "15.0000", scope: "BOTH", category: "STANDARD" },
        account: { id: "revenue-account-delivery", code: "4010", name: "Sales revenue", type: "REVENUE" },
      },
    ],
  };
}

function makeVoidedSourceInvoice() {
  return {
    ...makeSourceInvoice(),
    id: "invoice-voided-source",
    invoiceNumber: "INV-DN-VOID",
    status: "VOIDED",
  };
}

function makeSourceQuote(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: sourceQuoteId,
    organizationId: "org-visual",
    quoteNumber: "QUO-DN-001",
    customerId: customer.id,
    branchId: null,
    status: "ACCEPTED",
    issueDate: "2026-06-02T00:00:00.000Z",
    expiryDate: "2026-06-30T00:00:00.000Z",
    reference: "RFQ-DN",
    currency: "SAR",
    taxMode: "TAX_EXCLUSIVE",
    subtotal: "100.0000",
    discountTotal: "0.0000",
    taxableTotal: "100.0000",
    taxTotal: "15.0000",
    total: "115.0000",
    notes: "Accepted quote for delivery note browser coverage.",
    terms: "Accepted terms.",
    convertedSalesInvoiceId: null,
    convertedAt: null,
    sentAt: "2026-06-02T10:00:00.000Z",
    acceptedAt: "2026-06-03T10:00:00.000Z",
    rejectedAt: null,
    expiredAt: null,
    cancelledAt: null,
    customer,
    branch: null,
    convertedSalesInvoice: null,
    lines: [
      {
        id: "quote-line-delivery-source",
        organizationId: "org-visual",
        quoteId: sourceQuoteId,
        itemId: item.id,
        description: "Accepted quote fulfillment line",
        accountId: "revenue-account-delivery",
        quantity: "4.0000",
        unitPrice: "100.0000",
        discountRate: "0.0000",
        taxRateId: "tax-15-delivery",
        lineGrossAmount: "100.0000",
        discountAmount: "0.0000",
        taxableAmount: "100.0000",
        taxAmount: "15.0000",
        lineSubtotal: "100.0000",
        lineTotal: "115.0000",
        sortOrder: 0,
        item,
        account: { id: "revenue-account-delivery", code: "4010", name: "Sales revenue", type: "REVENUE" },
        taxRate: { id: "tax-15-delivery", name: "VAT 15%", rate: "15.0000", scope: "BOTH", category: "STANDARD" },
      },
    ],
    ...overrides,
  };
}

function makeDeliveryNoteArchive() {
  return {
    id: "generated-delivery-note-doc-1",
    organizationId: "org-visual",
    documentType: "DELIVERY_NOTE",
    sourceType: "DeliveryNote",
    sourceId: deliveryNoteId,
    documentNumber: "DN-BRW-001",
    filename: "delivery-note-DN-BRW-001.pdf",
    mimeType: "application/pdf",
    storageProvider: "DATABASE",
    storageKey: null,
    contentHash: "delivery-note-pdf-hash",
    sizeBytes: 48,
    status: "GENERATED",
    generatedById: "delivery-note-user",
    generatedAt: fixedVisualDate,
    createdAt: fixedVisualDate,
  };
}

function customerPartyDetail(deliveryNote: ReturnType<typeof makeDeliveryNote>) {
  return {
    contact: customer,
    openReceivableBalance: "0.0000",
    overdueReceivableBalance: "0.0000",
    lastTransactionDate: deliveryNote.issueDate,
    notes: "Fake delivery note browser customer.",
    transactions: [
      {
        id: `DeliveryNote:${deliveryNote.id}`,
        sourceType: "DeliveryNote",
        sourceId: deliveryNote.id,
        date: deliveryNote.issueDate,
        dueDate: deliveryNote.deliveryDate,
        type: "Delivery note (non-posting fulfillment)",
        transactionNumber: deliveryNote.deliveryNoteNumber,
        currency: "SAR",
        subtotal: "0.0000",
        taxAmount: "0.0000",
        total: "0.0000",
        balanceDue: "0.0000",
        status: deliveryNote.status,
      },
    ],
  };
}

function customerSelect(page: Page) {
  return page.locator("form select").first();
}

async function expectDeliveryNotePageUsesSafeLabels(page: Page) {
  const text = (await page.locator("body").innerText())
    .replace(/not a tax invoice/gi, "")
    .replace(/not tax invoices/gi, "")
    .replace(/does not create[^.]*\./gi, "")
    .replace(/do not create[^.]*\./gi, "")
    .replace(/do not post accounting or move inventory by themselves/gi, "")
    .replace(/not a tax invoice, payment, posting, or stock movement/gi, "");
  expect(text).not.toMatch(/Tax Invoice/i);
  expect(text).not.toMatch(/posted delivery note/i);
  expect(text).not.toMatch(/journal posted/i);
  expect(text).not.toMatch(/AR created/i);
  expect(text).not.toMatch(/VAT filed/i);
  expect(text).not.toMatch(/ZATCA compliant/i);
  expect(text).not.toMatch(/PDF\/A-3/i);
  expect(text).not.toMatch(/email sent/i);
  expect(text).not.toMatch(/payment collected/i);
  expect(text).not.toMatch(/inventory moved/i);
}

function statusLabel(status: DeliveryNoteStatus) {
  return status
    .split("_")
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(" ");
}

function json(route: Route, payload: unknown, status = 200) {
  return route.fulfill({ status, contentType: "application/json", body: JSON.stringify(payload) });
}

function pdf(route: Route, filename: string) {
  const body = "%PDF-1.4\n% LedgerByte fake delivery note PDF\n%%EOF";
  return route.fulfill({
    status: 200,
    contentType: "application/pdf",
    headers: {
      "content-disposition": `attachment; filename="${filename}"`,
      "content-length": String(body.length),
    },
    body,
  });
}

function unexpectedConsoleErrors(errors: string[]): string[] {
  return errors.filter((error) => !error.includes("Failed to load resource: the server responded with a status of 400"));
}

interface DeliveryNoteWorkflowState {
  permissions: string[];
  deliveryNote: ReturnType<typeof makeDeliveryNote>;
  archiveDocuments: ReturnType<typeof makeDeliveryNoteArchive>[];
  invoice: ReturnType<typeof makeSourceInvoice>;
  quote: ReturnType<typeof makeSourceQuote>;
  createdPayloads: Record<string, unknown>[];
  updatedPayloads: Record<string, unknown>[];
  pdfRequests: number;
  archiveDownloadRequests: number;
  invoiceMutationRequests: number;
  quoteMutationRequests: number;
  consoleErrors: string[];
}
