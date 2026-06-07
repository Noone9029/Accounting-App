import { expect, test, type Page, type Route } from "@playwright/test";
import { fixedVisualDate, visualApiUrl } from "./visual-fixtures";

type QuoteStatus = "DRAFT" | "SENT" | "ACCEPTED" | "REJECTED" | "EXPIRED" | "CANCELLED" | "CONVERTED";
type TaxMode = "TAX_EXCLUSIVE" | "TAX_INCLUSIVE" | "NO_TAX";

const quoteId = "quote-browser";
const customer = {
  id: "customer-1",
  organizationId: "org-visual",
  name: "Quote Browser Customer",
  displayName: "Quote Browser Customer",
  type: "CUSTOMER",
  email: "quote.customer@example.test",
  phone: null,
  taxNumber: "300000000000111",
  isActive: true,
  addressLine1: "Browser Road",
  addressLine2: null,
  buildingNumber: "1200",
  district: "QA District",
  city: "Riyadh",
  postalCode: "12211",
  countryCode: "SA",
};
const revenueAccount = {
  id: "revenue-account-1",
  code: "4010",
  name: "Sales revenue",
  type: "REVENUE",
  isActive: true,
  allowPosting: true,
};
const taxRate = {
  id: "tax-15",
  name: "VAT 15%",
  rate: "15.0000",
  scope: "BOTH",
  category: "STANDARD",
  isActive: true,
};
const item = {
  id: "item-quote-service",
  organizationId: "org-visual",
  sku: "QB-SVC",
  name: "Advisory service",
  description: "Browser advisory service",
  type: "SERVICE",
  status: "ACTIVE",
  sellingPrice: "100.0000",
  revenueAccountId: revenueAccount.id,
  salesTaxRateId: taxRate.id,
  revenueAccount,
  salesTaxRate: taxRate,
};
const fullQuotePermissions = [
  "dashboard.view",
  "contacts.view",
  "salesInvoices.view",
  "salesInvoices.create",
  "salesInvoices.update",
  "generatedDocuments.view",
  "generatedDocuments.download",
];

test("sales quote create edit lifecycle PDF archive convert and customer activity path", async ({ page }) => {
  const state = await installQuoteWorkflowMocks(page);

  await page.goto("/sales/quotes");
  await expect(page.getByRole("heading", { name: "Sales quotes" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Create quote" })).toBeVisible();
  await expectQuotePageUsesSafeLabels(page);

  await page.getByRole("link", { name: "Create quote" }).click();
  await expect(page.getByRole("heading", { name: "New sales quote" })).toBeVisible();
  await expect(page.getByLabel("Quote number")).toHaveValue("QUO-BRW-001");

  await page.getByLabel("Customer").selectOption(customer.id);
  await page.getByLabel("Item for quote line 1").selectOption(item.id);
  await page.getByLabel("Search posting account for quote line 1").fill("Sales revenue");
  await expect(page.getByLabel("Description for quote line 1")).toHaveValue("Browser advisory service");
  await expect(page.getByLabel("Posting account for quote line 1", { exact: true })).toHaveValue(revenueAccount.id);
  await expect(page.getByLabel("Posting account for quote line 1", { exact: true })).toContainText("4010 Sales revenue");
  await expect(page.locator("form")).toContainText(/SAR\s*115\.00/);

  await page.getByLabel("Tax mode").selectOption("TAX_INCLUSIVE");
  await expect(page.locator("form")).toContainText(/SAR\s*13\.04/);
  await expect(page.locator("form")).toContainText(/SAR\s*100\.00/);

  await page.getByLabel("Tax mode").selectOption("NO_TAX");
  await expect(page.getByLabel("Tax rate for quote line 1")).toBeDisabled();
  await expect(page.locator("form")).toContainText(/SAR\s*0\.00/);

  await page.getByLabel("Tax mode").selectOption("TAX_EXCLUSIVE");
  await page.getByLabel("Tax rate for quote line 1").selectOption(taxRate.id);
  await expect(page.locator("form")).toContainText(/SAR\s*115\.00/);

  await page.getByRole("button", { name: "Create draft quote" }).click();
  await expect(page).toHaveURL(/\/sales\/quotes\/quote-browser$/);
  expect(state.createdPayload).toEqual(
    expect.objectContaining({
      customerId: customer.id,
      taxMode: "TAX_EXCLUSIVE",
      lines: [expect.objectContaining({ accountId: revenueAccount.id, taxRateId: taxRate.id })],
    }),
  );

  await expect(page.getByRole("heading", { name: "QUO-BRW-001" })).toBeVisible();
  await expect(page.getByText("This quote is non-posting.")).toBeVisible();
  await expect(page.getByText("4010 Sales revenue")).toBeVisible();
  await expectQuotePageUsesSafeLabels(page);

  await page.getByRole("link", { name: "Edit" }).click();
  await expect(page.getByRole("heading", { name: "Edit sales quote" })).toBeVisible();
  await expect(page.getByLabel("Posting account for quote line 1", { exact: true })).toHaveValue(revenueAccount.id);
  await page.getByLabel("Reference").fill("RFQ-BROWSER-UPDATED");
  await page.getByRole("button", { name: "Save draft quote" }).click();
  await expect(page).toHaveURL(/\/sales\/quotes\/quote-browser$/);
  expect(state.updatedPayload).toEqual(expect.objectContaining({ reference: "RFQ-BROWSER-UPDATED" }));

  await page.getByRole("button", { name: "Mark sent" }).click();
  await expect(page.getByText(/is now sent/i)).toBeVisible();
  await page.getByRole("button", { name: "Accept" }).click();
  await expect(page.getByText(/is now accepted/i)).toBeVisible();
  await expect(page.getByRole("button", { name: "Convert to invoice" })).toBeVisible();

  const pdfResponsePromise = page.waitForResponse((response) => response.url().endsWith(`/sales-quotes/${quoteId}/pdf`));
  await page.getByRole("button", { name: "Download sales quote PDF" }).click();
  const pdfResponse = await pdfResponsePromise;
  expect(pdfResponse.status()).toBe(200);
  expect(pdfResponse.headers()["content-type"]).toContain("application/pdf");
  expect(Number(pdfResponse.headers()["content-length"] ?? "0")).toBeGreaterThan(0);
  await expect(page.getByText("sales-quote-QUO-BRW-001.pdf")).toBeVisible();
  expect(state.archiveDocuments).toHaveLength(1);

  const archiveDownloadPromise = page.waitForResponse((response) => response.url().endsWith("/generated-documents/generated-quote-doc-1/download"));
  await page.getByRole("button", { name: "Download archived PDF" }).click();
  const archiveResponse = await archiveDownloadPromise;
  expect(archiveResponse.status()).toBe(200);
  expect(archiveResponse.headers()["content-type"]).toContain("application/pdf");
  expect(state.archiveDocuments).toHaveLength(1);

  await page.getByRole("button", { name: "Convert to invoice" }).click();
  await expect(page.getByText(/Converted to draft invoice INV-BRW-001/i)).toBeVisible();
  await expect(page.getByRole("link", { name: "Open invoice INV-BRW-001" })).toBeVisible();
  expect(state.convertRequests).toBe(1);
  expect(state.invoice?.status).toBe("DRAFT");

  await page.getByRole("link", { name: "Open invoice INV-BRW-001" }).click();
  await expect(page).toHaveURL(/\/sales\/invoices\/invoice-from-quote$/);
  await expect(page.getByRole("heading", { name: "INV-BRW-001" })).toBeVisible();
  await expect(page.getByText("Draft").first()).toBeVisible();

  await page.goto(`/customers/${customer.id}`);
  await expect(page.getByRole("heading", { level: 1, name: "Quote Browser Customer" })).toBeVisible();
  await expect(page.getByText("Sales quotes")).toBeVisible();
  await expect(page.getByRole("cell", { name: "Sales quote (non-posting)" })).toBeVisible();
  await expect(page.getByText("QUO-BRW-001")).toBeVisible();
  await expect(page.getByRole("row", { name: /Sales quote \(non-posting\).*QUO-BRW-001.*SAR\s*0\.00/i })).toBeVisible();
  expect(state.consoleErrors).toEqual([]);
});

test("restricted quote viewer cannot create edit convert or download quote PDFs", async ({ page }) => {
  const state = await installQuoteWorkflowMocks(page, {
    permissions: ["contacts.view", "salesInvoices.view", "generatedDocuments.view"],
    quote: makeQuote("ACCEPTED"),
    archiveDocuments: [makeSalesQuoteArchive()],
  });

  await page.goto("/sales/quotes");
  await expect(page.getByRole("heading", { name: "Sales quotes" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Create quote" })).toHaveCount(0);

  await page.goto(`/sales/quotes/${quoteId}`);
  await expect(page.getByRole("heading", { name: "QUO-BRW-001" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Edit" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Convert to invoice" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Download sales quote PDF" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Download archived PDF" })).toHaveCount(0);
  await expect(page.getByText(/They are not tax invoices/i)).toBeVisible();
  await expectQuotePageUsesSafeLabels(page);
  expect(state.pdfRequests).toBe(0);
  expect(state.convertRequests).toBe(0);
  expect(state.consoleErrors).toEqual([]);
});

test("quote detail hides conversion and edit actions for ineligible statuses", async ({ page }) => {
  const state = await installQuoteWorkflowMocks(page);
  const ineligibleStatuses: QuoteStatus[] = ["DRAFT", "SENT", "REJECTED", "EXPIRED", "CANCELLED", "CONVERTED"];

  for (const status of ineligibleStatuses) {
    state.quote = makeQuote(status, status === "CONVERTED" ? { convertedSalesInvoiceId: "invoice-from-quote", convertedSalesInvoice: makeConvertedInvoiceLink() } : {});
    await page.goto(`/sales/quotes/${quoteId}`);
    await expect(page.getByRole("heading", { name: "QUO-BRW-001" })).toBeVisible();
    await expect(page.getByText(statusLabel(status)).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Convert to invoice" })).toHaveCount(0);

    if (status === "REJECTED" || status === "EXPIRED" || status === "CANCELLED" || status === "CONVERTED") {
      await expect(page.getByRole("link", { name: "Edit" })).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Mark sent" })).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Accept" })).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Cancel" })).toHaveCount(0);
    }

    await expectQuotePageUsesSafeLabels(page);
  }
  expect(state.consoleErrors).toEqual([]);
});

async function installQuoteWorkflowMocks(page: Page, options: Partial<QuoteWorkflowState> = {}) {
  const state: QuoteWorkflowState = {
    permissions: options.permissions ?? fullQuotePermissions,
    quote: options.quote ?? makeQuote("DRAFT"),
    invoice: options.invoice ?? null,
    archiveDocuments: options.archiveDocuments ?? [],
    createdPayload: null,
    updatedPayload: null,
    pdfRequests: 0,
    archiveDownloadRequests: 0,
    convertRequests: 0,
    consoleErrors: [],
  };

  await page.route(`${visualApiUrl}/**`, (route) => fulfillQuoteApiRoute(route, state));
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
      window.localStorage.setItem("ledgerbyte.accessToken", "quote-browser-token");
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

async function fulfillQuoteApiRoute(route: Route, state: QuoteWorkflowState) {
  const request = route.request();
  const url = new URL(request.url());
  const pathname = url.pathname;
  const method = request.method();

  if (pathname === "/auth/me") {
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: "quote-user",
        email: "quote.browser@example.test",
        name: "Quote Browser Tester",
        memberships: [
          {
            id: "quote-membership",
            status: "ACTIVE",
            organization: { id: "org-visual", name: "Quote Browser Co", baseCurrency: "SAR" },
            role: { id: "quote-role", name: "Quote Browser Role", permissions: state.permissions },
          },
        ],
      }),
    });
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
  if (pathname === "/sales-quotes/next-number" && method === "GET") {
    return json(route, {
      quoteNumber: "QUO-BRW-001",
      editable: false,
      overrideAllowed: false,
      helperText: "Preview only. The quote number is assigned from the sales quote sequence when the draft is saved.",
    });
  }
  if (pathname === "/sales-quotes" && method === "GET") {
    return json(route, [state.quote]);
  }
  if (pathname === "/sales-quotes" && method === "POST") {
    state.createdPayload = request.postDataJSON();
    state.quote = makeQuote("DRAFT", quotePayloadOverrides(state.createdPayload));
    return json(route, state.quote, 201);
  }
  if (pathname === `/sales-quotes/${quoteId}` && method === "GET") {
    return json(route, state.quote);
  }
  if (pathname === `/sales-quotes/${quoteId}` && method === "PATCH") {
    state.updatedPayload = request.postDataJSON();
    state.quote = makeQuote("DRAFT", { ...quotePayloadOverrides(state.updatedPayload), reference: state.updatedPayload.reference ?? state.quote.reference });
    return json(route, state.quote);
  }
  if (pathname === `/sales-quotes/${quoteId}/mark-sent` && method === "POST") {
    state.quote = makeQuote("SENT", { reference: state.quote.reference, sentAt: fixedVisualDate });
    return json(route, state.quote);
  }
  if (pathname === `/sales-quotes/${quoteId}/accept` && method === "POST") {
    state.quote = makeQuote("ACCEPTED", { reference: state.quote.reference, sentAt: state.quote.sentAt, acceptedAt: fixedVisualDate });
    return json(route, state.quote);
  }
  if (pathname === `/sales-quotes/${quoteId}/reject` && method === "POST") {
    state.quote = makeQuote("REJECTED", { rejectedAt: fixedVisualDate });
    return json(route, state.quote);
  }
  if (pathname === `/sales-quotes/${quoteId}/expire` && method === "POST") {
    state.quote = makeQuote("EXPIRED", { expiredAt: fixedVisualDate });
    return json(route, state.quote);
  }
  if (pathname === `/sales-quotes/${quoteId}/cancel` && method === "POST") {
    state.quote = makeQuote("CANCELLED", { cancelledAt: fixedVisualDate });
    return json(route, state.quote);
  }
  if (pathname === `/sales-quotes/${quoteId}/convert-to-invoice` && method === "POST") {
    state.convertRequests += 1;
    if (state.quote.status !== "ACCEPTED") {
      return json(route, { message: "Only accepted quotes can be converted." }, 400);
    }
    state.invoice = makeDraftInvoiceFromQuote();
    state.quote = makeQuote("CONVERTED", {
      reference: state.quote.reference,
      acceptedAt: state.quote.acceptedAt,
      convertedAt: fixedVisualDate,
      convertedSalesInvoiceId: state.invoice.id,
      convertedSalesInvoice: makeConvertedInvoiceLink(),
    });
    return json(route, { quote: state.quote, invoice: state.invoice });
  }
  if (pathname === `/sales-quotes/${quoteId}/pdf` && method === "GET") {
    state.pdfRequests += 1;
    if (!state.permissions.includes("generatedDocuments.download")) {
      return json(route, { message: "You do not have permission to generate or download PDF outputs." }, 403);
    }
    if (state.archiveDocuments.length === 0) {
      state.archiveDocuments.push(makeSalesQuoteArchive());
    }
    return pdf(route, "sales-quote-QUO-BRW-001.pdf");
  }
  if (pathname === "/generated-documents" && method === "GET") {
    return json(route, state.archiveDocuments);
  }
  if (pathname === "/generated-documents/generated-quote-doc-1/download" && method === "GET") {
    state.archiveDownloadRequests += 1;
    return pdf(route, "sales-quote-QUO-BRW-001.pdf");
  }
  if (pathname === `/sales-invoices/invoice-from-quote` && method === "GET") {
    return json(route, state.invoice ?? makeDraftInvoiceFromQuote());
  }
  if (pathname === `/sales-invoices/invoice-from-quote/stock-issue-status` && method === "GET") {
    return json(route, { sourceId: "invoice-from-quote", sourceNumber: "INV-BRW-001", sourceStatus: "DRAFT", issueStatus: "NOT_REQUIRED", issuedQuantity: "0.0000", remainingQuantity: "0.0000", lines: [] });
  }
  if (pathname.startsWith("/sales-invoices/invoice-from-quote/zatca") && method === "GET") {
    return json(route, { productionCompliance: false, localOnly: true, noMutation: true, warnings: ["Quote workflow test keeps ZATCA disabled."] });
  }
  if (pathname === `/contacts/customers/${customer.id}` && method === "GET") {
    return json(route, customerPartyDetail(state.quote));
  }

  return json(route, { message: `No quote workflow fixture for ${method} ${pathname}` }, 404);
}

function makeQuote(status: QuoteStatus, overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: quoteId,
    organizationId: "org-visual",
    quoteNumber: "QUO-BRW-001",
    customerId: customer.id,
    branchId: null,
    status,
    issueDate: "2026-06-04T00:00:00.000Z",
    expiryDate: "2026-06-30T00:00:00.000Z",
    reference: "RFQ-BROWSER",
    currency: "SAR",
    taxMode: "TAX_EXCLUSIVE" as TaxMode,
    subtotal: "100.0000",
    discountTotal: "0.0000",
    taxableTotal: "100.0000",
    taxTotal: "15.0000",
    total: "115.0000",
    notes: "Browser quote note.",
    terms: "Valid until expiry.",
    convertedSalesInvoiceId: null,
    convertedAt: null,
    sentAt: null,
    acceptedAt: null,
    rejectedAt: null,
    expiredAt: null,
    cancelledAt: null,
    customer,
    branch: null,
    convertedSalesInvoice: null,
    lines: [
      {
        id: "quote-line-1",
        organizationId: "org-visual",
        quoteId,
        itemId: item.id,
        description: "Browser advisory service",
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
    ...overrides,
  };
}

function quotePayloadOverrides(payload: Record<string, unknown> | null) {
  const line = Array.isArray(payload?.lines) ? (payload.lines[0] as Record<string, unknown>) : null;
  const taxMode = (payload?.taxMode as TaxMode | undefined) ?? "TAX_EXCLUSIVE";
  const taxTotal = taxMode === "NO_TAX" ? "0.0000" : taxMode === "TAX_INCLUSIVE" ? "13.0435" : "15.0000";
  const taxableTotal = taxMode === "NO_TAX" ? "100.0000" : taxMode === "TAX_INCLUSIVE" ? "86.9565" : "100.0000";
  const total = taxMode === "TAX_EXCLUSIVE" ? "115.0000" : "100.0000";

  return {
    reference: (payload?.reference as string | undefined) ?? "RFQ-BROWSER",
    taxMode,
    subtotal: "100.0000",
    taxableTotal,
    taxTotal,
    total,
    lines: [
      {
        ...makeQuote("DRAFT").lines[0],
        description: String(line?.description ?? "Browser advisory service"),
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

function makeDraftInvoiceFromQuote() {
  return {
    id: "invoice-from-quote",
    organizationId: "org-visual",
    invoiceNumber: "INV-BRW-001",
    customerId: customer.id,
    branchId: null,
    issueDate: "2026-06-04T00:00:00.000Z",
    dueDate: null,
    currency: "SAR",
    status: "DRAFT",
    taxMode: "TAX_EXCLUSIVE",
    subtotal: "100.0000",
    discountTotal: "0.0000",
    taxableTotal: "100.0000",
    taxTotal: "15.0000",
    total: "115.0000",
    balanceDue: "115.0000",
    notes: "Browser quote note.",
    terms: "Valid until expiry.",
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
        id: "invoice-line-from-quote",
        invoiceId: "invoice-from-quote",
        itemId: item.id,
        description: "Browser advisory service",
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

function makeConvertedInvoiceLink() {
  return { id: "invoice-from-quote", invoiceNumber: "INV-BRW-001", status: "DRAFT", issueDate: "2026-06-04T00:00:00.000Z", total: "115.0000" };
}

function makeSalesQuoteArchive() {
  return {
    id: "generated-quote-doc-1",
    organizationId: "org-visual",
    documentType: "SALES_QUOTE",
    sourceType: "SalesQuote",
    sourceId: quoteId,
    documentNumber: "QUO-BRW-001",
    filename: "sales-quote-QUO-BRW-001.pdf",
    mimeType: "application/pdf",
    storageProvider: "DATABASE",
    storageKey: null,
    contentHash: "quote-pdf-hash",
    sizeBytes: 42,
    status: "GENERATED",
    generatedById: "quote-user",
    generatedAt: fixedVisualDate,
    createdAt: fixedVisualDate,
  };
}

function customerPartyDetail(quote: ReturnType<typeof makeQuote>) {
  return {
    contact: customer,
    openReceivableBalance: "0.0000",
    overdueReceivableBalance: "0.0000",
    lastTransactionDate: quote.issueDate,
    notes: "Fake quote browser customer.",
    transactions: [
      {
        id: `SalesQuote:${quote.id}`,
        sourceType: "SalesQuote",
        sourceId: quote.id,
        date: quote.issueDate,
        dueDate: quote.expiryDate,
        type: "Sales quote (non-posting)",
        transactionNumber: quote.quoteNumber,
        currency: quote.currency,
        subtotal: quote.subtotal,
        taxAmount: quote.taxTotal,
        total: quote.total,
        balanceDue: "0.0000",
        status: quote.status,
      },
    ],
  };
}

function statusLabel(status: QuoteStatus) {
  return status
    .split("_")
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(" ");
}

async function expectQuotePageUsesSafeLabels(page: Page) {
  const text = (await page.locator("body").innerText()).replace(/not tax invoices/gi, "").replace(/not a tax invoice/gi, "");
  expect(text).not.toMatch(/Tax Invoice/i);
  expect(text).not.toMatch(/posted invoice/i);
  expect(text).not.toMatch(/finalized invoice/i);
  expect(text).not.toMatch(/ZATCA compliant/i);
  expect(text).not.toMatch(/PDF\/A-3/i);
  expect(text).not.toMatch(/email sent/i);
  expect(text).not.toMatch(/customer paid/i);
}

function json(route: Route, payload: unknown, status = 200) {
  return route.fulfill({ status, contentType: "application/json", body: JSON.stringify(payload) });
}

function pdf(route: Route, filename: string) {
  const body = "%PDF-1.4\n% LedgerByte fake sales quote PDF\n%%EOF";
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

interface QuoteWorkflowState {
  permissions: string[];
  quote: ReturnType<typeof makeQuote>;
  invoice: ReturnType<typeof makeDraftInvoiceFromQuote> | null;
  archiveDocuments: ReturnType<typeof makeSalesQuoteArchive>[];
  createdPayload: Record<string, unknown> | null;
  updatedPayload: Record<string, unknown> | null;
  pdfRequests: number;
  archiveDownloadRequests: number;
  convertRequests: number;
  consoleErrors: string[];
}
