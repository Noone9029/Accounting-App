import PDFDocument from "pdfkit";

export interface PdfAddress {
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  postalCode?: string | null;
  countryCode?: string | null;
}

export interface PdfOrganization extends PdfAddress {
  id?: string;
  name: string;
  legalName?: string | null;
  taxNumber?: string | null;
  countryCode?: string | null;
}

export interface PdfContact extends PdfAddress {
  id?: string;
  name: string;
  displayName?: string | null;
  taxNumber?: string | null;
  email?: string | null;
  phone?: string | null;
}

export interface InvoicePdfData {
  organization: PdfOrganization;
  customer: PdfContact;
  invoice: {
    id: string;
    invoiceNumber: string;
    status: string;
    issueDate: string | Date;
    dueDate?: string | Date | null;
    currency: string;
    notes?: string | null;
    terms?: string | null;
    subtotal: string;
    discountTotal: string;
    taxableTotal: string;
    taxTotal: string;
    total: string;
    balanceDue: string;
  };
  lines: Array<{
    description: string;
    quantity: string;
    unitPrice: string;
    discountRate: string;
    lineGrossAmount: string;
    discountAmount: string;
    taxableAmount: string;
    taxAmount: string;
    lineTotal: string;
    taxRateName?: string | null;
  }>;
  payments: Array<{
    paymentNumber: string;
    paymentDate: string | Date;
    amountApplied: string;
    status: string;
  }>;
  zatca?: {
    status: string;
    invoiceUuid?: string | null;
    icv?: number | null;
    invoiceHash?: string | null;
    qrCodeBase64?: string | null;
  } | null;
  generatedAt: string | Date;
}

export interface CreditNotePdfData {
  organization: PdfOrganization;
  customer: PdfContact;
  originalInvoice?: {
    id: string;
    invoiceNumber: string;
    issueDate: string | Date;
    total: string;
  } | null;
  creditNote: {
    id: string;
    creditNoteNumber: string;
    status: string;
    issueDate: string | Date;
    currency: string;
    notes?: string | null;
    reason?: string | null;
    subtotal: string;
    discountTotal: string;
    taxableTotal: string;
    taxTotal: string;
    total: string;
    unappliedAmount: string;
  };
  lines: Array<{
    description: string;
    quantity: string;
    unitPrice: string;
    discountRate: string;
    lineGrossAmount: string;
    discountAmount: string;
    taxableAmount: string;
    taxAmount: string;
    lineTotal: string;
    taxRateName?: string | null;
  }>;
  journalEntry?: {
    id: string;
    entryNumber: string;
    status: string;
  } | null;
  generatedAt: string | Date;
}

export interface PaymentReceiptPdfData {
  organization: PdfOrganization;
  customer: PdfContact;
  payment: {
    id: string;
    paymentNumber: string;
    paymentDate: string | Date;
    status: string;
    currency: string;
    amountReceived: string;
    unappliedAmount: string;
    description?: string | null;
  };
  paidThroughAccount: {
    id: string;
    code: string;
    name: string;
  };
  allocations: Array<{
    invoiceId: string;
    invoiceNumber: string;
    invoiceDate: string | Date;
    invoiceTotal: string;
    amountApplied: string;
    invoiceBalanceDue: string;
  }>;
  journalEntry?: {
    id: string;
    entryNumber: string;
    status: string;
  } | null;
  generatedAt: string | Date;
}

export interface CustomerStatementPdfData {
  organization: PdfOrganization;
  contact: PdfContact;
  currency?: string;
  periodFrom?: string | null;
  periodTo?: string | null;
  openingBalance: string;
  closingBalance: string;
  rows: Array<{
    date: string | Date;
    type: string;
    number: string;
    description: string;
    debit: string;
    credit: string;
    balance: string;
    status: string;
  }>;
  generatedAt: string | Date;
}

export interface DocumentRenderSettings {
  title?: string;
  footerText?: string;
  primaryColor?: string | null;
  accentColor?: string | null;
  showTaxNumber?: boolean;
  showPaymentSummary?: boolean;
  showNotes?: boolean;
  showTerms?: boolean;
  template?: "standard" | "compact" | "detailed" | string;
}

interface TableColumn {
  label: string;
  width: number;
  align?: "left" | "right" | "center";
}

type PdfDocument = PDFKit.PDFDocument;

const pageMargin = 48;
const textColor = "#1f2937";
const mutedColor = "#6b7280";
const lineColor = "#d1d5db";
const fillColor = "#f3f4f6";

interface ResolvedDocumentRenderSettings {
  title: string;
  footerText: string;
  primaryColor: string;
  accentColor: string;
  accentTextColor: string;
  showTaxNumber: boolean;
  showPaymentSummary: boolean;
  showNotes: boolean;
  showTerms: boolean;
  template: "standard" | "compact" | "detailed";
}

export async function renderInvoicePdf(data: InvoicePdfData, settings?: DocumentRenderSettings): Promise<Buffer> {
  const renderSettings = resolveSettings(settings, isTaxInvoice(data) ? "Tax Invoice" : "Sales Invoice");
  return renderPdf((doc) => {
    writeHeader(doc, data.organization, renderSettings, data.generatedAt);
    writeTwoColumnBlocks(doc, "Bill To", contactLines(data.customer, renderSettings), "Invoice", [
      ["Invoice number", data.invoice.invoiceNumber],
      ["Status", data.invoice.status],
      ["Issue date", formatDate(data.invoice.issueDate)],
      ["Due date", data.invoice.dueDate ? formatDate(data.invoice.dueDate) : "No due date"],
      ["Currency", data.invoice.currency],
    ], renderSettings);

    writeSectionTitle(doc, "Line Items", renderSettings);
    drawTable(
      doc,
      [
        { label: "Description", width: 116 },
        { label: "Qty", width: 38, align: "right" },
        { label: "Unit", width: 54, align: "right" },
        { label: "Gross", width: 54, align: "right" },
        { label: "Discount", width: 54, align: "right" },
        { label: "Taxable", width: 54, align: "right" },
        { label: "Tax", width: 48, align: "right" },
        { label: "Total", width: 54, align: "right" },
      ],
      data.lines.map((line) => [
        withOptionalSuffix(line.description, line.taxRateName ? `Tax: ${line.taxRateName}` : null),
        line.quantity,
        money(line.unitPrice, data.invoice.currency),
        money(line.lineGrossAmount, data.invoice.currency),
        money(line.discountAmount, data.invoice.currency),
        money(line.taxableAmount, data.invoice.currency),
        money(line.taxAmount, data.invoice.currency),
        money(line.lineTotal, data.invoice.currency),
      ]),
      renderSettings,
    );

    writeTotals(doc, data.invoice.currency, [
      ["Subtotal", data.invoice.subtotal],
      ["Discount", data.invoice.discountTotal],
      ["Taxable total", data.invoice.taxableTotal],
      ["VAT / Tax", data.invoice.taxTotal],
      ["Total", data.invoice.total],
      ["Balance due", data.invoice.balanceDue],
    ], renderSettings);

    if (renderSettings.showPaymentSummary) {
      writeSectionTitle(doc, "Payments", renderSettings);
      if (data.payments.length === 0) {
        writeMuted(doc, "No payments have been applied to this invoice.");
      } else {
        drawTable(
          doc,
          [
            { label: "Payment", width: 145 },
            { label: "Date", width: 110 },
            { label: "Status", width: 100 },
            { label: "Amount applied", width: 135, align: "right" },
          ],
          data.payments.map((payment) => [
            payment.paymentNumber,
            formatDate(payment.paymentDate),
            payment.status,
            money(payment.amountApplied, data.invoice.currency),
          ]),
          renderSettings,
        );
      }
    }

    if (data.zatca?.qrCodeBase64) {
      writeSectionTitle(doc, "ZATCA", renderSettings);
      writeMuted(doc, `Local ZATCA QR generated. Status: ${data.zatca.status}.`);
    }

    if (renderSettings.showNotes) {
      writeOptionalTextBlock(doc, "Notes", data.invoice.notes, renderSettings);
    }
    if (renderSettings.showTerms) {
      writeOptionalTextBlock(doc, "Terms", data.invoice.terms, renderSettings);
    }
  }, renderSettings);
}

export async function renderCreditNotePdf(data: CreditNotePdfData, settings?: DocumentRenderSettings): Promise<Buffer> {
  const renderSettings = resolveSettings(settings, "Credit Note");
  return renderPdf((doc) => {
    writeHeader(doc, data.organization, renderSettings, data.generatedAt);
    writeTwoColumnBlocks(doc, "Credit To", contactLines(data.customer, renderSettings), "Credit Note", [
      ["Credit note number", data.creditNote.creditNoteNumber],
      ["Status", data.creditNote.status],
      ["Issue date", formatDate(data.creditNote.issueDate)],
      ["Currency", data.creditNote.currency],
      ["Original invoice", data.originalInvoice ? data.originalInvoice.invoiceNumber : "-"],
      ["Journal entry", data.journalEntry ? `${data.journalEntry.entryNumber} (${data.journalEntry.status})` : "-"],
    ], renderSettings);

    if (data.originalInvoice) {
      writeMuted(
        doc,
        `Original invoice ${data.originalInvoice.invoiceNumber}, issued ${formatDate(data.originalInvoice.issueDate)}, total ${money(data.originalInvoice.total, data.creditNote.currency)}.`,
      );
    }

    writeOptionalTextBlock(doc, "Reason", data.creditNote.reason, renderSettings);
    writeSectionTitle(doc, "Line Items", renderSettings);
    drawTable(
      doc,
      [
        { label: "Description", width: 116 },
        { label: "Qty", width: 38, align: "right" },
        { label: "Unit", width: 54, align: "right" },
        { label: "Gross", width: 54, align: "right" },
        { label: "Discount", width: 54, align: "right" },
        { label: "Taxable", width: 54, align: "right" },
        { label: "Tax", width: 48, align: "right" },
        { label: "Total", width: 54, align: "right" },
      ],
      data.lines.map((line) => [
        withOptionalSuffix(line.description, line.taxRateName ? `Tax: ${line.taxRateName}` : null),
        line.quantity,
        money(line.unitPrice, data.creditNote.currency),
        money(line.lineGrossAmount, data.creditNote.currency),
        money(line.discountAmount, data.creditNote.currency),
        money(line.taxableAmount, data.creditNote.currency),
        money(line.taxAmount, data.creditNote.currency),
        money(line.lineTotal, data.creditNote.currency),
      ]),
      renderSettings,
    );

    writeTotals(doc, data.creditNote.currency, [
      ["Subtotal", data.creditNote.subtotal],
      ["Discount", data.creditNote.discountTotal],
      ["Taxable total", data.creditNote.taxableTotal],
      ["VAT / Tax", data.creditNote.taxTotal],
      ["Total credit", data.creditNote.total],
      ["Unapplied amount", data.creditNote.unappliedAmount],
    ], renderSettings);

    if (renderSettings.showNotes) {
      writeOptionalTextBlock(doc, "Notes", data.creditNote.notes, renderSettings);
    }
  }, renderSettings);
}

export async function renderPaymentReceiptPdf(data: PaymentReceiptPdfData, settings?: DocumentRenderSettings): Promise<Buffer> {
  const renderSettings = resolveSettings(settings, "Payment Receipt");
  return renderPdf((doc) => {
    writeHeader(doc, data.organization, renderSettings, data.generatedAt);
    writeTwoColumnBlocks(doc, "Received From", contactLines(data.customer, renderSettings), "Receipt", [
      ["Receipt number", data.payment.paymentNumber],
      ["Status", data.payment.status],
      ["Payment date", formatDate(data.payment.paymentDate)],
      ["Amount received", money(data.payment.amountReceived, data.payment.currency)],
      ["Unapplied", money(data.payment.unappliedAmount, data.payment.currency)],
      ["Paid through", `${data.paidThroughAccount.code} ${data.paidThroughAccount.name}`],
      ["Journal entry", data.journalEntry ? `${data.journalEntry.entryNumber} (${data.journalEntry.status})` : "-"],
    ], renderSettings);

    writeOptionalTextBlock(doc, "Description", data.payment.description, renderSettings);
    writeSectionTitle(doc, "Invoice Allocations", renderSettings);
    if (data.allocations.length === 0) {
      writeMuted(doc, "No invoice allocations are linked to this payment.");
    } else {
      drawTable(
        doc,
        [
          { label: "Invoice", width: 110 },
          { label: "Date", width: 75 },
          { label: "Invoice total", width: 105, align: "right" },
          { label: "Applied", width: 95, align: "right" },
          { label: "Balance due", width: 95, align: "right" },
        ],
        data.allocations.map((allocation) => [
          allocation.invoiceNumber,
          formatDate(allocation.invoiceDate),
          money(allocation.invoiceTotal, data.payment.currency),
          money(allocation.amountApplied, data.payment.currency),
          money(allocation.invoiceBalanceDue, data.payment.currency),
        ]),
        renderSettings,
      );
    }
  }, renderSettings);
}

export async function renderCustomerStatementPdf(data: CustomerStatementPdfData, settings?: DocumentRenderSettings): Promise<Buffer> {
  const renderSettings = resolveSettings(settings, "Customer Statement");
  return renderPdf((doc) => {
    writeHeader(doc, data.organization, renderSettings, data.generatedAt);
    writeTwoColumnBlocks(doc, "Customer", contactLines(data.contact, renderSettings), "Statement", [
      ["Period from", data.periodFrom ?? "-"],
      ["Period to", data.periodTo ?? "-"],
      ["Opening balance", money(data.openingBalance, data.currency ?? "SAR")],
      ["Closing balance", money(data.closingBalance, data.currency ?? "SAR")],
    ], renderSettings);

    writeSectionTitle(doc, "Ledger Activity", renderSettings);
    if (data.rows.length === 0) {
      writeMuted(doc, "No statement rows found for this period.");
    } else {
      drawTable(
        doc,
        [
          { label: "Date", width: 52 },
          { label: "Type", width: 66 },
          { label: "Number", width: 70 },
          { label: "Description", width: 110 },
          { label: "Debit", width: 64, align: "right" },
          { label: "Credit", width: 64, align: "right" },
          { label: "Balance", width: 70, align: "right" },
        ],
        data.rows.map((row) => [
          formatDate(row.date),
          row.type.replaceAll("_", " "),
          row.number,
          row.description,
          money(row.debit, data.currency ?? "SAR"),
          money(row.credit, data.currency ?? "SAR"),
          money(row.balance, data.currency ?? "SAR"),
        ]),
        renderSettings,
      );
    }
  }, renderSettings);
}

function renderPdf(build: (doc: PdfDocument) => void, settings: ResolvedDocumentRenderSettings): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: pageMargin, bufferPages: true });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer | Uint8Array) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    build(doc);
    addFooters(doc, settings);
    doc.end();
  });
}

function writeHeader(
  doc: PdfDocument,
  organization: PdfOrganization,
  settings: ResolvedDocumentRenderSettings,
  generatedAt: string | Date,
): void {
  doc.font("Helvetica-Bold").fontSize(20).fillColor(settings.primaryColor).text(organization.legalName ?? organization.name, pageMargin, pageMargin);
  doc.font("Helvetica").fontSize(9).fillColor(mutedColor);
  for (const line of organizationLines(organization, settings)) {
    doc.text(line);
  }

  doc.font("Helvetica-Bold").fontSize(18).fillColor(settings.primaryColor).text(settings.title, pageMargin, pageMargin, {
    align: "right",
    width: pageWidth(doc),
  });
  doc.font("Helvetica").fontSize(8).fillColor(mutedColor).text(`Generated ${formatDateTime(generatedAt)}`, pageMargin, pageMargin + 24, {
    align: "right",
    width: pageWidth(doc),
  });
  doc.moveDown(2.4);
  drawRule(doc, settings);
}

function writeTwoColumnBlocks(
  doc: PdfDocument,
  leftTitle: string,
  leftLines: string[],
  rightTitle: string,
  rightRows: Array<[string, string]>,
  settings: ResolvedDocumentRenderSettings,
): void {
  ensureSpace(doc, 120);
  const top = doc.y;
  const gap = 24;
  const columnWidth = (pageWidth(doc) - gap) / 2;

  writeBlock(doc, pageMargin, top, columnWidth, leftTitle, leftLines, settings);
  writeBlock(
    doc,
    pageMargin + columnWidth + gap,
    top,
    columnWidth,
    rightTitle,
    rightRows.map(([label, value]) => `${label}: ${value}`),
    settings,
  );

  doc.y = Math.max(doc.y, top + 116);
}

function writeBlock(
  doc: PdfDocument,
  x: number,
  y: number,
  width: number,
  title: string,
  lines: string[],
  settings: ResolvedDocumentRenderSettings,
): void {
  doc.roundedRect(x, y, width, 104, 4).strokeColor(lineColor).lineWidth(0.75).stroke();
  doc.font("Helvetica-Bold").fontSize(10).fillColor(settings.primaryColor).text(title, x + 10, y + 10, { width: width - 20 });
  doc.font("Helvetica").fontSize(9).fillColor(mutedColor);
  let currentY = y + 29;
  for (const line of lines.length > 0 ? lines : ["-"]) {
    doc.text(line, x + 10, currentY, { width: width - 20 });
    currentY += 13;
  }
}

function writeSectionTitle(doc: PdfDocument, title: string, settings: ResolvedDocumentRenderSettings): void {
  ensureSpace(doc, 36);
  doc.moveDown(0.4);
  doc.font("Helvetica-Bold").fontSize(12).fillColor(settings.primaryColor).text(title);
  doc.moveDown(0.5);
}

function writeOptionalTextBlock(
  doc: PdfDocument,
  title: string,
  value: string | null | undefined,
  settings: ResolvedDocumentRenderSettings,
): void {
  if (!value?.trim()) {
    return;
  }
  writeSectionTitle(doc, title, settings);
  doc.font("Helvetica").fontSize(9).fillColor(textColor).text(value.trim(), { width: pageWidth(doc) });
}

function writeMuted(doc: PdfDocument, value: string): void {
  ensureSpace(doc, 24);
  doc.font("Helvetica").fontSize(9).fillColor(mutedColor).text(value, { width: pageWidth(doc) });
}

function drawTable(doc: PdfDocument, columns: TableColumn[], rows: string[][], settings: ResolvedDocumentRenderSettings): void {
  const drawHeader = () => {
    ensureSpace(doc, 28);
    const y = doc.y;
    doc.rect(pageMargin, y, tableWidth(columns), 22).fillColor(settings.accentColor).fill();
    doc.font("Helvetica-Bold").fontSize(8).fillColor(settings.accentTextColor);
    let x = pageMargin;
    for (const column of columns) {
      doc.text(column.label, x + 4, y + 7, { width: column.width - 8, align: column.align ?? "left" });
      x += column.width;
    }
    doc.y = y + 22;
  };

  drawHeader();
  for (const row of rows) {
    const rowHeight = tableRowHeight(doc, columns, row);
    if (doc.y + rowHeight > bottomLimit(doc)) {
      doc.addPage();
      drawHeader();
    }

    const y = doc.y;
    doc.rect(pageMargin, y, tableWidth(columns), rowHeight).strokeColor(lineColor).lineWidth(0.5).stroke();
    doc.font("Helvetica").fontSize(8).fillColor(textColor);
    let x = pageMargin;
    columns.forEach((column, index) => {
      doc.text(row[index] ?? "", x + 4, y + 6, {
        width: column.width - 8,
        align: column.align ?? "left",
      });
      x += column.width;
    });
    doc.y = y + rowHeight;
  }
  doc.moveDown(1);
}

function writeTotals(doc: PdfDocument, currency: string, rows: Array<[string, string]>, settings: ResolvedDocumentRenderSettings): void {
  ensureSpace(doc, 140);
  const width = 220;
  const x = pageMargin + pageWidth(doc) - width;
  let y = doc.y;

  for (const [label, value] of rows) {
    const isTotal = label === "Total" || label === "Balance due";
    doc.font(isTotal ? "Helvetica-Bold" : "Helvetica").fontSize(9).fillColor(isTotal ? settings.primaryColor : textColor);
    doc.text(label, x, y, { width: 95 });
    doc.text(money(value, currency), x + 95, y, { width: 125, align: "right" });
    y += 18;
    if (label === "VAT / Tax") {
      doc.moveTo(x, y - 5).lineTo(x + width, y - 5).strokeColor(lineColor).stroke();
    }
  }
  doc.y = y + 4;
}

function tableRowHeight(doc: PdfDocument, columns: TableColumn[], row: string[]): number {
  doc.font("Helvetica").fontSize(8);
  const heights = columns.map((column, index) =>
    doc.heightOfString(row[index] ?? "", { width: column.width - 8, align: column.align ?? "left" }),
  );
  return Math.max(24, Math.ceil(Math.max(...heights, 12)) + 12);
}

function addFooters(doc: PdfDocument, settings: ResolvedDocumentRenderSettings): void {
  const range = doc.bufferedPageRange();
  for (let pageIndex = range.start; pageIndex < range.start + range.count; pageIndex += 1) {
    doc.switchToPage(pageIndex);
    doc.font("Helvetica").fontSize(8).fillColor(mutedColor).text(`${settings.footerText} - Page ${pageIndex + 1}`, pageMargin, doc.page.height - 34, {
      align: "center",
      width: pageWidth(doc),
    });
  }
}

function drawRule(doc: PdfDocument, settings: ResolvedDocumentRenderSettings): void {
  doc.moveTo(pageMargin, doc.y).lineTo(pageMargin + pageWidth(doc), doc.y).strokeColor(settings.accentColor).lineWidth(0.75).stroke();
  doc.moveDown(1);
}

function ensureSpace(doc: PdfDocument, height: number): void {
  if (doc.y + height > bottomLimit(doc)) {
    doc.addPage();
  }
}

function bottomLimit(doc: PdfDocument): number {
  return doc.page.height - pageMargin - 24;
}

function pageWidth(doc: PdfDocument): number {
  return doc.page.width - pageMargin * 2;
}

function tableWidth(columns: TableColumn[]): number {
  return columns.reduce((sum, column) => sum + column.width, 0);
}

function organizationLines(organization: PdfOrganization, settings: ResolvedDocumentRenderSettings): string[] {
  return compact([
    organization.name !== organization.legalName ? organization.name : null,
    settings.showTaxNumber && organization.taxNumber ? `VAT: ${organization.taxNumber}` : null,
    ...addressLines(organization),
  ]);
}

function contactLines(contact: PdfContact, settings: ResolvedDocumentRenderSettings): string[] {
  return compact([
    contact.displayName ?? contact.name,
    settings.showTaxNumber && contact.taxNumber ? `VAT: ${contact.taxNumber}` : null,
    contact.email ?? null,
    contact.phone ?? null,
    ...addressLines(contact),
  ]);
}

function addressLines(address: PdfAddress): string[] {
  return compact([
    address.addressLine1 ?? null,
    address.addressLine2 ?? null,
    [address.city, address.postalCode].filter(Boolean).join(" "),
    address.countryCode ?? null,
  ]);
}

function compact(values: Array<string | null | undefined>): string[] {
  return values.map((value) => value?.trim()).filter((value): value is string => Boolean(value));
}

function isTaxInvoice(data: InvoicePdfData): boolean {
  return data.invoice.taxTotal !== "0.0000" && data.invoice.taxTotal !== "0";
}

function resolveSettings(settings: DocumentRenderSettings | undefined, fallbackTitle: string): ResolvedDocumentRenderSettings {
  const accentColor = safeColor(settings?.accentColor, fillColor);
  return {
    title: settings?.title?.trim() || fallbackTitle,
    footerText: settings?.footerText?.trim() || "Generated by LedgerByte",
    primaryColor: safeColor(settings?.primaryColor, textColor),
    accentColor,
    accentTextColor: readableTextColor(accentColor),
    showTaxNumber: settings?.showTaxNumber ?? true,
    showPaymentSummary: settings?.showPaymentSummary ?? true,
    showNotes: settings?.showNotes ?? true,
    showTerms: settings?.showTerms ?? true,
    template: isKnownTemplate(settings?.template) ? settings.template : "standard",
  };
}

function isKnownTemplate(value: unknown): value is "standard" | "compact" | "detailed" {
  return value === "standard" || value === "compact" || value === "detailed";
}

function safeColor(value: string | null | undefined, fallback: string): string {
  return value && /^#[0-9a-fA-F]{6}$/.test(value) ? value : fallback;
}

function readableTextColor(hexColor: string): string {
  const red = Number.parseInt(hexColor.slice(1, 3), 16);
  const green = Number.parseInt(hexColor.slice(3, 5), 16);
  const blue = Number.parseInt(hexColor.slice(5, 7), 16);
  const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255;
  return luminance > 0.62 ? textColor : "#ffffff";
}

function withOptionalSuffix(value: string, suffix: string | null): string {
  return suffix ? `${value}\n${suffix}` : value;
}

function formatDate(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }
  return date.toISOString().slice(0, 10);
}

function formatDateTime(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }
  return date.toISOString().replace("T", " ").slice(0, 16);
}

function money(value: string, currency: string): string {
  return `${currency} ${normalizeDecimal(value)}`;
}

function normalizeDecimal(value: string): string {
  const trimmed = String(value ?? "0").trim() || "0";
  const negative = trimmed.startsWith("-");
  const unsigned = negative ? trimmed.slice(1) : trimmed;
  const [integer = "0", fraction = ""] = unsigned.split(".");
  const decimals = `${fraction}00`.slice(0, 2);
  return `${negative ? "-" : ""}${integer || "0"}.${decimals}`;
}
