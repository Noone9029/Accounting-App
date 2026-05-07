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

export async function renderInvoicePdf(data: InvoicePdfData): Promise<Buffer> {
  return renderPdf((doc) => {
    writeHeader(doc, data.organization, isTaxInvoice(data) ? "Tax Invoice" : "Sales Invoice", data.generatedAt);
    writeTwoColumnBlocks(doc, "Bill To", contactLines(data.customer), "Invoice", [
      ["Invoice number", data.invoice.invoiceNumber],
      ["Status", data.invoice.status],
      ["Issue date", formatDate(data.invoice.issueDate)],
      ["Due date", data.invoice.dueDate ? formatDate(data.invoice.dueDate) : "No due date"],
      ["Currency", data.invoice.currency],
    ]);

    writeSectionTitle(doc, "Line Items");
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
    );

    writeTotals(doc, data.invoice.currency, [
      ["Subtotal", data.invoice.subtotal],
      ["Discount", data.invoice.discountTotal],
      ["Taxable total", data.invoice.taxableTotal],
      ["VAT / Tax", data.invoice.taxTotal],
      ["Total", data.invoice.total],
      ["Balance due", data.invoice.balanceDue],
    ]);

    writeSectionTitle(doc, "Payments");
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
      );
    }

    writeOptionalTextBlock(doc, "Notes", data.invoice.notes);
    writeOptionalTextBlock(doc, "Terms", data.invoice.terms);
  });
}

export async function renderPaymentReceiptPdf(data: PaymentReceiptPdfData): Promise<Buffer> {
  return renderPdf((doc) => {
    writeHeader(doc, data.organization, "Payment Receipt", data.generatedAt);
    writeTwoColumnBlocks(doc, "Received From", contactLines(data.customer), "Receipt", [
      ["Receipt number", data.payment.paymentNumber],
      ["Status", data.payment.status],
      ["Payment date", formatDate(data.payment.paymentDate)],
      ["Amount received", money(data.payment.amountReceived, data.payment.currency)],
      ["Unapplied", money(data.payment.unappliedAmount, data.payment.currency)],
      ["Paid through", `${data.paidThroughAccount.code} ${data.paidThroughAccount.name}`],
      ["Journal entry", data.journalEntry ? `${data.journalEntry.entryNumber} (${data.journalEntry.status})` : "-"],
    ]);

    writeOptionalTextBlock(doc, "Description", data.payment.description);
    writeSectionTitle(doc, "Invoice Allocations");
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
      );
    }
  });
}

export async function renderCustomerStatementPdf(data: CustomerStatementPdfData): Promise<Buffer> {
  return renderPdf((doc) => {
    writeHeader(doc, data.organization, "Customer Statement", data.generatedAt);
    writeTwoColumnBlocks(doc, "Customer", contactLines(data.contact), "Statement", [
      ["Period from", data.periodFrom ?? "-"],
      ["Period to", data.periodTo ?? "-"],
      ["Opening balance", money(data.openingBalance, data.currency ?? "SAR")],
      ["Closing balance", money(data.closingBalance, data.currency ?? "SAR")],
    ]);

    writeSectionTitle(doc, "Ledger Activity");
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
      );
    }
  });
}

function renderPdf(build: (doc: PdfDocument) => void): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: pageMargin, bufferPages: true });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer | Uint8Array) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    build(doc);
    addFooters(doc);
    doc.end();
  });
}

function writeHeader(doc: PdfDocument, organization: PdfOrganization, title: string, generatedAt: string | Date): void {
  doc.font("Helvetica-Bold").fontSize(20).fillColor(textColor).text(organization.legalName ?? organization.name, pageMargin, pageMargin);
  doc.font("Helvetica").fontSize(9).fillColor(mutedColor);
  for (const line of organizationLines(organization)) {
    doc.text(line);
  }

  doc.font("Helvetica-Bold").fontSize(18).fillColor(textColor).text(title, pageMargin, pageMargin, {
    align: "right",
    width: pageWidth(doc),
  });
  doc.font("Helvetica").fontSize(8).fillColor(mutedColor).text(`Generated ${formatDateTime(generatedAt)}`, pageMargin, pageMargin + 24, {
    align: "right",
    width: pageWidth(doc),
  });
  doc.moveDown(2.4);
  drawRule(doc);
}

function writeTwoColumnBlocks(
  doc: PdfDocument,
  leftTitle: string,
  leftLines: string[],
  rightTitle: string,
  rightRows: Array<[string, string]>,
): void {
  ensureSpace(doc, 120);
  const top = doc.y;
  const gap = 24;
  const columnWidth = (pageWidth(doc) - gap) / 2;

  writeBlock(doc, pageMargin, top, columnWidth, leftTitle, leftLines);
  writeBlock(
    doc,
    pageMargin + columnWidth + gap,
    top,
    columnWidth,
    rightTitle,
    rightRows.map(([label, value]) => `${label}: ${value}`),
  );

  doc.y = Math.max(doc.y, top + 116);
}

function writeBlock(doc: PdfDocument, x: number, y: number, width: number, title: string, lines: string[]): void {
  doc.roundedRect(x, y, width, 104, 4).strokeColor(lineColor).lineWidth(0.75).stroke();
  doc.font("Helvetica-Bold").fontSize(10).fillColor(textColor).text(title, x + 10, y + 10, { width: width - 20 });
  doc.font("Helvetica").fontSize(9).fillColor(mutedColor);
  let currentY = y + 29;
  for (const line of lines.length > 0 ? lines : ["-"]) {
    doc.text(line, x + 10, currentY, { width: width - 20 });
    currentY += 13;
  }
}

function writeSectionTitle(doc: PdfDocument, title: string): void {
  ensureSpace(doc, 36);
  doc.moveDown(0.4);
  doc.font("Helvetica-Bold").fontSize(12).fillColor(textColor).text(title);
  doc.moveDown(0.5);
}

function writeOptionalTextBlock(doc: PdfDocument, title: string, value?: string | null): void {
  if (!value?.trim()) {
    return;
  }
  writeSectionTitle(doc, title);
  doc.font("Helvetica").fontSize(9).fillColor(textColor).text(value.trim(), { width: pageWidth(doc) });
}

function writeMuted(doc: PdfDocument, value: string): void {
  ensureSpace(doc, 24);
  doc.font("Helvetica").fontSize(9).fillColor(mutedColor).text(value, { width: pageWidth(doc) });
}

function drawTable(doc: PdfDocument, columns: TableColumn[], rows: string[][]): void {
  const drawHeader = () => {
    ensureSpace(doc, 28);
    const y = doc.y;
    doc.rect(pageMargin, y, tableWidth(columns), 22).fillColor(fillColor).fill();
    doc.font("Helvetica-Bold").fontSize(8).fillColor(textColor);
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

function writeTotals(doc: PdfDocument, currency: string, rows: Array<[string, string]>): void {
  ensureSpace(doc, 140);
  const width = 220;
  const x = pageMargin + pageWidth(doc) - width;
  let y = doc.y;

  for (const [label, value] of rows) {
    const isTotal = label === "Total" || label === "Balance due";
    doc.font(isTotal ? "Helvetica-Bold" : "Helvetica").fontSize(9).fillColor(textColor);
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

function addFooters(doc: PdfDocument): void {
  const range = doc.bufferedPageRange();
  for (let pageIndex = range.start; pageIndex < range.start + range.count; pageIndex += 1) {
    doc.switchToPage(pageIndex);
    doc.font("Helvetica").fontSize(8).fillColor(mutedColor).text(`Generated by LedgerByte - Page ${pageIndex + 1}`, pageMargin, doc.page.height - 34, {
      align: "center",
      width: pageWidth(doc),
    });
  }
}

function drawRule(doc: PdfDocument): void {
  doc.moveTo(pageMargin, doc.y).lineTo(pageMargin + pageWidth(doc), doc.y).strokeColor(lineColor).lineWidth(0.75).stroke();
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

function organizationLines(organization: PdfOrganization): string[] {
  return compact([
    organization.name !== organization.legalName ? organization.name : null,
    organization.taxNumber ? `VAT: ${organization.taxNumber}` : null,
    ...addressLines(organization),
  ]);
}

function contactLines(contact: PdfContact): string[] {
  return compact([
    contact.displayName ?? contact.name,
    contact.taxNumber ? `VAT: ${contact.taxNumber}` : null,
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
