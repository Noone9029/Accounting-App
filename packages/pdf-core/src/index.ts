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
    metadataId?: string | null;
    status: string;
    invoiceUuid?: string | null;
    icv?: number | null;
    invoiceHash?: string | null;
    xmlHash?: string | null;
    qrCodeBase64?: string | null;
    generatedAt?: string | Date | null;
    hasUnsignedXml?: boolean;
    hasQrPayload?: boolean;
  } | null;
  generatedAt: string | Date;
}

export interface SalesQuotePdfData {
  organization: PdfOrganization;
  customer: PdfContact;
  quote: {
    id: string;
    quoteNumber: string;
    status: string;
    issueDate: string | Date;
    expiryDate?: string | Date | null;
    reference?: string | null;
    currency: string;
    taxMode: string;
    notes?: string | null;
    terms?: string | null;
    subtotal: string;
    discountTotal: string;
    taxableTotal: string;
    taxTotal: string;
    total: string;
    convertedSalesInvoice?: {
      id: string;
      invoiceNumber: string;
      status: string;
    } | null;
  };
  lines: Array<{
    itemName?: string | null;
    itemSku?: string | null;
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
  generatedAt: string | Date;
}

export interface DeliveryNotePdfData {
  organization: PdfOrganization;
  customer: PdfContact;
  deliveryNote: {
    id: string;
    deliveryNoteNumber: string;
    status: string;
    issueDate: string | Date;
    deliveryDate?: string | Date | null;
    reference?: string | null;
    deliveryAddress?: string | null;
    notes?: string | null;
    instructions?: string | null;
    relatedSalesInvoice?: {
      id: string;
      invoiceNumber: string;
      status: string;
    } | null;
    relatedSalesQuote?: {
      id: string;
      quoteNumber: string;
      status: string;
    } | null;
    relatedSalesStockIssue?: {
      id: string;
      issueNumber: string;
      status: string;
    } | null;
  };
  lines: Array<{
    itemName?: string | null;
    itemSku?: string | null;
    description: string;
    quantity: string;
    unitOfMeasure?: string | null;
  }>;
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
  allocations: Array<{
    invoiceId: string;
    invoiceNumber: string;
    invoiceDate: string | Date;
    invoiceTotal: string;
    amountApplied: string;
    invoiceBalanceDue: string;
    status: string;
    reversedAt?: string | Date | null;
    reversalReason?: string | null;
  }>;
  journalEntry?: {
    id: string;
    entryNumber: string;
    status: string;
  } | null;
  generatedAt: string | Date;
}

export interface PurchaseBillPdfData {
  organization: PdfOrganization;
  supplier: PdfContact;
  bill: {
    id: string;
    billNumber: string;
    status: string;
    billDate: string | Date;
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
  allocations: Array<{
    paymentId: string;
    paymentNumber: string;
    paymentDate: string | Date;
    amountPaid: string;
    amountApplied: string;
    status: string;
  }>;
  journalEntry?: {
    id: string;
    entryNumber: string;
    status: string;
  } | null;
  generatedAt: string | Date;
}

export interface PurchaseOrderPdfData {
  organization: PdfOrganization;
  supplier: PdfContact;
  purchaseOrder: {
    id: string;
    purchaseOrderNumber: string;
    status: string;
    orderDate: string | Date;
    expectedDeliveryDate?: string | Date | null;
    currency: string;
    notes?: string | null;
    terms?: string | null;
    subtotal: string;
    discountTotal: string;
    taxableTotal: string;
    taxTotal: string;
    total: string;
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
  convertedBill?: {
    id: string;
    billNumber: string;
    status: string;
  } | null;
  generatedAt: string | Date;
}

export interface CashExpensePdfData {
  organization: PdfOrganization;
  contact?: PdfContact | null;
  expense: {
    id: string;
    expenseNumber: string;
    status: string;
    expenseDate: string | Date;
    currency: string;
    description?: string | null;
    notes?: string | null;
    subtotal: string;
    discountTotal: string;
    taxableTotal: string;
    taxTotal: string;
    total: string;
  };
  paidThroughAccount: {
    id: string;
    code: string;
    name: string;
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
  voidReversalJournalEntry?: {
    id: string;
    entryNumber: string;
    status: string;
  } | null;
  generatedAt: string | Date;
}

export interface PurchaseDebitNotePdfData {
  organization: PdfOrganization;
  supplier: PdfContact;
  originalBill?: {
    id: string;
    billNumber: string;
    billDate: string | Date;
    total: string;
  } | null;
  debitNote: {
    id: string;
    debitNoteNumber: string;
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
  allocations: Array<{
    billId: string;
    billNumber: string;
    billDate: string | Date;
    billDueDate?: string | Date | null;
    billTotal: string;
    amountApplied: string;
    billBalanceDue: string;
    status: string;
    reversedAt?: string | Date | null;
    reversalReason?: string | null;
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
  unappliedAllocations: Array<{
    invoiceId: string;
    invoiceNumber: string;
    invoiceDate: string | Date;
    invoiceTotal: string;
    amountApplied: string;
    invoiceBalanceDue: string;
    status: string;
    reversedAt?: string | Date | null;
    reversalReason?: string | null;
  }>;
  journalEntry?: {
    id: string;
    entryNumber: string;
    status: string;
  } | null;
  generatedAt: string | Date;
}

export interface SupplierPaymentReceiptPdfData {
  organization: PdfOrganization;
  supplier: PdfContact;
  payment: {
    id: string;
    paymentNumber: string;
    paymentDate: string | Date;
    status: string;
    currency: string;
    amountPaid: string;
    unappliedAmount: string;
    description?: string | null;
  };
  paidThroughAccount: {
    id: string;
    code: string;
    name: string;
  };
  allocations: Array<{
    billId: string;
    billNumber: string;
    billDate: string | Date;
    billDueDate?: string | Date | null;
    billTotal: string;
    amountApplied: string;
    billBalanceDue: string;
  }>;
  unappliedAllocations: Array<{
    billId: string;
    billNumber: string;
    billDate: string | Date;
    billDueDate?: string | Date | null;
    billTotal: string;
    amountApplied: string;
    billBalanceDue: string;
    status: string;
    reversedAt?: string | Date | null;
    reversalReason?: string | null;
  }>;
  journalEntry?: {
    id: string;
    entryNumber: string;
    status: string;
  } | null;
  generatedAt: string | Date;
}

export interface CustomerRefundPdfData {
  organization: PdfOrganization;
  customer: PdfContact;
  refund: {
    id: string;
    refundNumber: string;
    refundDate: string | Date;
    status: string;
    currency: string;
    amountRefunded: string;
    description?: string | null;
  };
  source: {
    type: "CUSTOMER_PAYMENT" | "CREDIT_NOTE" | string;
    id: string;
    number: string;
    date: string | Date;
    status: string;
    originalAmount: string;
    remainingUnappliedAmount: string;
  };
  paidFromAccount: {
    id: string;
    code: string;
    name: string;
  };
  journalEntry?: {
    id: string;
    entryNumber: string;
    status: string;
  } | null;
  voidReversalJournalEntry?: {
    id: string;
    entryNumber: string;
    status: string;
  } | null;
  generatedAt: string | Date;
}

export interface SupplierRefundPdfData {
  organization: PdfOrganization;
  supplier: PdfContact;
  refund: {
    id: string;
    refundNumber: string;
    refundDate: string | Date;
    status: string;
    currency: string;
    amountRefunded: string;
    description?: string | null;
  };
  source: {
    type: "SUPPLIER_PAYMENT" | "PURCHASE_DEBIT_NOTE" | string;
    id: string;
    number: string;
    date: string | Date;
    status: string;
    originalAmount: string;
    remainingUnappliedAmount: string;
  };
  receivedIntoAccount: {
    id: string;
    code: string;
    name: string;
  };
  journalEntry?: {
    id: string;
    entryNumber: string;
    status: string;
  } | null;
  voidReversalJournalEntry?: {
    id: string;
    entryNumber: string;
    status: string;
  } | null;
  generatedAt: string | Date;
}

export interface CustomerStatementPdfData {
  organization: PdfOrganization;
  contact: PdfContact;
  contactLabel?: string;
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
    fxEvidence?: {
      transactionCurrency: string;
      baseCurrency: string;
      transactionBalanceDue: string;
      sourceBaseBalanceDue: string;
      carryingBaseAmount: string;
      carryingRate: string;
      rateSnapshotId?: string | null;
      lastRevaluationLineId?: string | null;
    } | null;
  }>;
  generatedAt: string | Date;
}

export interface StatementPresentationLabels {
  title: string;
  counterpartyTitle: string;
  summaryTitle: string;
  periodFromLabel: string;
  periodToLabel: string;
  openingBalanceLabel: string;
  closingBalanceLabel: string;
  activityTitle: string;
  balanceColumnLabel: string;
  explanation: string;
  debitCreditHelp: string;
  emptyMessage: string;
  generatedNote: string;
}

export function statementPresentationLabels(contactLabel?: string): StatementPresentationLabels {
  const isSupplier = contactLabel?.toLowerCase().includes("supplier") ?? false;

  if (isSupplier) {
    return {
      title: "Supplier Statement",
      counterpartyTitle: "Supplier",
      summaryTitle: "Supplier statement period",
      periodFromLabel: "Period start",
      periodToLabel: "Period end",
      openingBalanceLabel: "Opening supplier payable",
      closingBalanceLabel: "Closing supplier payable",
      activityTitle: "Supplier ledger activity",
      balanceColumnLabel: "Payable balance",
      explanation: "Supplier statements summarize purchase bills, supplier payments, debit notes, refunds, and reversals from the supplier ledger. Posted purchase bills increase what you owe; supplier payments and debit notes reduce or adjust the payable balance.",
      debitCreditHelp: "Credit adds to the supplier payable. Debit reduces the supplier payable. The balance column shows the running payable balance after each posted supplier ledger row.",
      emptyMessage: "No supplier statement activity was found for this period.",
      generatedNote: "Generated from LedgerByte supplier ledger records for review. This is not a ZATCA submission or PDF/A-3 clearance document.",
    };
  }

  return {
    title: "Customer Statement",
    counterpartyTitle: "Customer",
    summaryTitle: "Customer statement period",
    periodFromLabel: "Period start",
    periodToLabel: "Period end",
    openingBalanceLabel: "Opening customer balance",
    closingBalanceLabel: "Closing customer balance",
    activityTitle: "Customer ledger activity",
    balanceColumnLabel: "Balance due",
    explanation: "Customer statements summarize invoices, customer payments, credit notes, refunds, and reversals from the customer ledger. Finalized invoices increase the amount owed; payments and credits reduce the customer balance.",
    debitCreditHelp: "Debit adds to the customer balance. Credit reduces the customer balance. The balance column shows the running amount due after each posted customer ledger row.",
    emptyMessage: "No customer statement activity was found for this period.",
    generatedNote: "Generated from LedgerByte customer ledger records for review. This is not a ZATCA submission or PDF/A-3 clearance document.",
  };
}

export interface ReportPdfAccountBalance {
  accountId: string;
  code: string;
  name: string;
  type: string;
  openingDebit: string;
  openingCredit: string;
  periodDebit: string;
  periodCredit: string;
  closingDebit: string;
  closingCredit: string;
}

export interface GeneralLedgerReportPdfData {
  organization: PdfOrganization;
  currency: string;
  filters?: ReportDimensionFiltersPdfData;
  fxFilters?: { transactionCurrency?: string | null };
  from: string | null;
  to: string | null;
  accounts: Array<
    ReportPdfAccountBalance & {
      lines: Array<{
        date: string | Date;
        entryNumber: string;
        description: string;
        reference?: string | null;
        debit: string;
        credit: string;
        runningBalance: string;
        currency?: string | null;
        transactionDebit?: string | null;
        transactionCredit?: string | null;
        exchangeRate?: string | null;
        rateSnapshot?: { id: string; rateDate: string | Date; source: string; sourceReference?: string | null } | null;
      }>;
    }
  >;
  generatedAt: string | Date;
}

export interface TrialBalanceReportPdfData {
  organization: PdfOrganization;
  currency: string;
  filters?: ReportDimensionFiltersPdfData;
  from: string | null;
  to: string | null;
  accounts: ReportPdfAccountBalance[];
  totals: Omit<ReportPdfAccountBalance, "accountId" | "code" | "name" | "type"> & { balanced: boolean };
  generatedAt: string | Date;
}

export interface ProfitAndLossReportPdfData {
  organization: PdfOrganization;
  currency: string;
  filters?: ReportDimensionFiltersPdfData;
  from: string | null;
  to: string | null;
  revenue: string;
  costOfSales: string;
  grossProfit: string;
  expenses: string;
  netProfit: string;
  sections: Array<{
    type: string;
    total: string;
    accounts: Array<{ accountId: string; code: string; name: string; amount: string }>;
  }>;
  generatedAt: string | Date;
}

export interface BalanceSheetReportPdfData {
  organization: PdfOrganization;
  currency: string;
  filters?: ReportDimensionFiltersPdfData;
  asOf: string | null;
  assets: ReportAmountSectionPdfData;
  liabilities: ReportAmountSectionPdfData;
  equity: ReportAmountSectionPdfData;
  retainedEarnings: string;
  totalAssets: string;
  totalLiabilitiesAndEquity: string;
  difference: string;
  balanced: boolean;
  generatedAt: string | Date;
}

export interface ReportAmountSectionPdfData {
  total: string;
  accounts: Array<{ accountId: string; code: string; name: string; amount: string }>;
}

export interface VatSummaryReportPdfData {
  organization: PdfOrganization;
  currency: string;
  filters?: ReportDimensionFiltersPdfData;
  from: string | null;
  to: string | null;
  salesVat: string;
  purchaseVat: string;
  netVatPayable: string;
  sections: Array<{ category: string; accountCode: string; amount: string; taxAmount: string }>;
  notes: string[];
  generatedAt: string | Date;
}

export interface ReportDimensionFiltersPdfData {
  costCenter?: { id: string; code: string; name: string; status: string } | null;
  project?: { id: string; code: string; name: string; status: string } | null;
}

export interface AgingReportPdfData {
  organization: PdfOrganization;
  currency: string;
  title: string;
  asOf: string | null;
  kind: string;
  fxFilters?: { transactionCurrency?: string | null };
  rows: Array<{
    contact: { name: string; displayName?: string | null };
    number: string;
    issueDate: string | Date;
    dueDate?: string | Date | null;
    total: string;
    balanceDue: string;
    currency?: string | null;
    baseCurrency?: string | null;
    openTransactionAmount?: string | null;
    sourceBaseOpenAmount?: string | null;
    carryingBaseAmount?: string | null;
    carryingRate?: string | null;
    revaluation?: { rateSnapshotId?: string | null; revaluationRunId?: string | null; status?: string | null } | null;
    daysOverdue: number;
    bucket: string;
  }>;
  bucketTotals: Record<string, string>;
  grandTotal: string;
  generatedAt: string | Date;
}

export interface BankReconciliationReportPdfData {
  organization: PdfOrganization;
  currency: string;
  reconciliation: {
    id: string;
    reconciliationNumber: string;
    status: string;
    periodStart: string | Date;
    periodEnd: string | Date;
    statementOpeningBalance?: string | null;
    statementClosingBalance: string;
    ledgerClosingBalance: string;
    difference: string;
    closedAt?: string | Date | null;
    closedBy?: { name?: string | null; email?: string | null } | null;
    voidedAt?: string | Date | null;
    voidedBy?: { name?: string | null; email?: string | null } | null;
  };
  bankAccount: {
    displayName: string;
    account?: { code: string; name: string } | null;
  };
  items: Array<{
    transactionDate: string | Date;
    description: string;
    reference?: string | null;
    type: string;
    amount: string;
    statusAtClose: string;
  }>;
  summary: {
    itemCount: number;
    debitTotal: string;
    creditTotal: string;
    matchedCount: number;
    categorizedCount: number;
    ignoredCount: number;
  };
  generatedAt: string | Date;
}

export interface AccountingCloseEvidencePdfData {
  schemaVersion: number; organization: PdfOrganization; baseCurrency: string; generatedAt: string | Date;
  fiscalPeriod: { id: string; name: string; startsOn: string | Date; endsOn: string | Date; status: string };
  cycle: { id: string; status: string; version: number; signoffMode?: string | null; readinessHash?: string | null; preparedAt?: string | Date | null; preparerUserId?: string | null; reviewedAt?: string | Date | null; reviewerUserId?: string | null; closedAt?: string | Date | null; closedByUserId?: string | null; lockedAt?: string | Date | null; lockedByUserId?: string | null };
  tasks: Array<{ id: string; title: string; status: string; severity: string; acknowledgementReason?: string | null }>;
  checks: Array<{ checkKey: string; status: string; severity: string; safeMessage: string }>;
  evidence: Array<{ id: string; evidenceType: string; reportType?: string | null; generatedDocumentId?: string | null; safeLabel: string; addedAt: string | Date }>;
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

export async function renderSalesQuotePdf(data: SalesQuotePdfData, settings?: DocumentRenderSettings): Promise<Buffer> {
  const renderSettings = resolveSettings({ ...settings, title: "Sales Quote" }, "Sales Quote");
  return renderPdf((doc) => {
    writeHeader(doc, data.organization, renderSettings, data.generatedAt);
    writeTwoColumnBlocks(doc, "Quote To", contactLines(data.customer, renderSettings), "Sales Quote", [
      ["Quote number", data.quote.quoteNumber],
      ["Status", data.quote.status],
      ["Issue date", formatDate(data.quote.issueDate)],
      ["Expiry date", data.quote.expiryDate ? formatDate(data.quote.expiryDate) : "-"],
      ["Reference", data.quote.reference ?? "-"],
      ["Currency", data.quote.currency],
      ["Tax mode", salesQuoteTaxModeLabel(data.quote.taxMode)],
      ["Converted invoice", data.quote.convertedSalesInvoice ? `${data.quote.convertedSalesInvoice.invoiceNumber} (${data.quote.convertedSalesInvoice.status})` : "-"],
    ], renderSettings);

    writeMuted(
      doc,
      "This sales quote is non-posting and does not create accounting journals, accounts receivable, VAT filing, or ZATCA submission.",
    );

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
        withOptionalSuffix(line.description, salesQuoteLineSuffix(line)),
        line.quantity,
        money(line.unitPrice, data.quote.currency),
        money(line.lineGrossAmount, data.quote.currency),
        money(line.discountAmount, data.quote.currency),
        money(line.taxableAmount, data.quote.currency),
        money(line.taxAmount, data.quote.currency),
        money(line.lineTotal, data.quote.currency),
      ]),
      renderSettings,
    );

    writeTotals(doc, data.quote.currency, [
      ["Subtotal", data.quote.subtotal],
      ["Discount", data.quote.discountTotal],
      ["Taxable total", data.quote.taxableTotal],
      ["VAT / Tax", data.quote.taxTotal],
      ["Total", data.quote.total],
    ], renderSettings);

    if (renderSettings.showNotes) {
      writeOptionalTextBlock(doc, "Notes", data.quote.notes, renderSettings);
    }
    if (renderSettings.showTerms) {
      writeOptionalTextBlock(doc, "Terms", data.quote.terms, renderSettings);
    }
  }, renderSettings);
}

export async function renderDeliveryNotePdf(data: DeliveryNotePdfData, settings?: DocumentRenderSettings): Promise<Buffer> {
  const renderSettings = resolveSettings({ ...settings, title: "Delivery Note" }, "Delivery Note");
  return renderPdf((doc) => {
    writeHeader(doc, data.organization, renderSettings, data.generatedAt);
    writeTwoColumnBlocks(doc, "Deliver To", contactLines(data.customer, renderSettings), "Delivery Note", [
      ["Delivery note", data.deliveryNote.deliveryNoteNumber],
      ["Status", data.deliveryNote.status],
      ["Issue date", formatDate(data.deliveryNote.issueDate)],
      ["Delivery date", data.deliveryNote.deliveryDate ? formatDate(data.deliveryNote.deliveryDate) : "-"],
      ["Reference", data.deliveryNote.reference ?? "-"],
      ["Related invoice", data.deliveryNote.relatedSalesInvoice ? `${data.deliveryNote.relatedSalesInvoice.invoiceNumber} (${data.deliveryNote.relatedSalesInvoice.status})` : "-"],
      ["Related quote", data.deliveryNote.relatedSalesQuote ? `${data.deliveryNote.relatedSalesQuote.quoteNumber} (${data.deliveryNote.relatedSalesQuote.status})` : "-"],
      ["Related stock issue", data.deliveryNote.relatedSalesStockIssue ? `${data.deliveryNote.relatedSalesStockIssue.issueNumber} (${data.deliveryNote.relatedSalesStockIssue.status})` : "-"],
    ], renderSettings);

    writeMuted(
      doc,
      "This delivery note is an operational fulfillment document. It does not create accounting journals, accounts receivable, VAT filing, ZATCA submission, payment, or inventory movement by itself.",
    );

    writeOptionalTextBlock(doc, "Delivery Address", data.deliveryNote.deliveryAddress, renderSettings);

    writeSectionTitle(doc, "Delivered Items", renderSettings);
    drawTable(
      doc,
      [
        { label: "Description", width: 300 },
        { label: "Qty", width: 90, align: "right" },
        { label: "Unit", width: 100 },
      ],
      data.lines.map((line) => [
        withOptionalSuffix(line.description, deliveryNoteLineSuffix(line)),
        line.quantity,
        line.unitOfMeasure ?? "-",
      ]),
      renderSettings,
    );

    if (renderSettings.showNotes) {
      writeOptionalTextBlock(doc, "Notes", data.deliveryNote.notes, renderSettings);
    }
    if (renderSettings.showTerms) {
      writeOptionalTextBlock(doc, "Instructions", data.deliveryNote.instructions, renderSettings);
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
      ["Applied amount", subtractMoney(data.creditNote.total, data.creditNote.unappliedAmount)],
      ["Unapplied amount", data.creditNote.unappliedAmount],
    ], renderSettings);

    writeSectionTitle(doc, "Credit Allocations", renderSettings);
    if (data.allocations.length === 0) {
      writeMuted(doc, "No invoice allocations are linked to this credit note.");
    } else {
      drawTable(
        doc,
        [
          { label: "Invoice", width: 100 },
          { label: "Date", width: 65 },
          { label: "Status", width: 62 },
          { label: "Applied", width: 80, align: "right" },
          { label: "Balance due", width: 90, align: "right" },
          { label: "Reversed", width: 72 },
        ],
        data.allocations.map((allocation) => [
          allocation.invoiceNumber,
          formatDate(allocation.invoiceDate),
          allocation.status,
          money(allocation.amountApplied, data.creditNote.currency),
          money(allocation.invoiceBalanceDue, data.creditNote.currency),
          allocation.reversedAt ? formatDate(allocation.reversedAt) : "-",
        ]),
        renderSettings,
      );
    }

    if (renderSettings.showNotes) {
      writeOptionalTextBlock(doc, "Notes", data.creditNote.notes, renderSettings);
    }
  }, renderSettings);
}

export async function renderPurchaseBillPdf(data: PurchaseBillPdfData, settings?: DocumentRenderSettings): Promise<Buffer> {
  const renderSettings = resolveSettings(settings, "Purchase Bill");
  return renderPdf((doc) => {
    writeHeader(doc, data.organization, renderSettings, data.generatedAt);
    writeTwoColumnBlocks(doc, "Supplier", contactLines(data.supplier, renderSettings), "Purchase Bill", [
      ["Bill number", data.bill.billNumber],
      ["Status", data.bill.status],
      ["Bill date", formatDate(data.bill.billDate)],
      ["Due date", data.bill.dueDate ? formatDate(data.bill.dueDate) : "No due date"],
      ["Currency", data.bill.currency],
      ["Journal entry", data.journalEntry ? `${data.journalEntry.entryNumber} (${data.journalEntry.status})` : "-"],
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
        money(line.unitPrice, data.bill.currency),
        money(line.lineGrossAmount, data.bill.currency),
        money(line.discountAmount, data.bill.currency),
        money(line.taxableAmount, data.bill.currency),
        money(line.taxAmount, data.bill.currency),
        money(line.lineTotal, data.bill.currency),
      ]),
      renderSettings,
    );

    writeTotals(doc, data.bill.currency, [
      ["Subtotal", data.bill.subtotal],
      ["Discount", data.bill.discountTotal],
      ["Taxable total", data.bill.taxableTotal],
      ["VAT / Tax", data.bill.taxTotal],
      ["Total", data.bill.total],
      ["Balance due", data.bill.balanceDue],
    ], renderSettings);

    if (renderSettings.showPaymentSummary) {
      writeSectionTitle(doc, "Supplier Payments", renderSettings);
      if (data.allocations.length === 0) {
        writeMuted(doc, "No supplier payments are linked to this bill.");
      } else {
        drawTable(
          doc,
          [
            { label: "Payment", width: 120 },
            { label: "Date", width: 80 },
            { label: "Status", width: 80 },
            { label: "Payment total", width: 105, align: "right" },
            { label: "Applied", width: 105, align: "right" },
          ],
          data.allocations.map((allocation) => [
            allocation.paymentNumber,
            formatDate(allocation.paymentDate),
            allocation.status,
            money(allocation.amountPaid, data.bill.currency),
            money(allocation.amountApplied, data.bill.currency),
          ]),
          renderSettings,
        );
      }
    }

    if (renderSettings.showNotes) {
      writeOptionalTextBlock(doc, "Notes", data.bill.notes, renderSettings);
    }
    if (renderSettings.showTerms) {
      writeOptionalTextBlock(doc, "Terms", data.bill.terms, renderSettings);
    }
  }, renderSettings);
}

export async function renderPurchaseOrderPdf(data: PurchaseOrderPdfData, settings?: DocumentRenderSettings): Promise<Buffer> {
  const renderSettings = resolveSettings(settings, "Purchase Order");
  return renderPdf((doc) => {
    writeHeader(doc, data.organization, renderSettings, data.generatedAt);
    writeTwoColumnBlocks(doc, "Supplier", contactLines(data.supplier, renderSettings), "Purchase Order", [
      ["PO number", data.purchaseOrder.purchaseOrderNumber],
      ["Status", data.purchaseOrder.status],
      ["Order date", formatDate(data.purchaseOrder.orderDate)],
      ["Expected delivery", data.purchaseOrder.expectedDeliveryDate ? formatDate(data.purchaseOrder.expectedDeliveryDate) : "-"],
      ["Currency", data.purchaseOrder.currency],
      ["Converted bill", data.convertedBill ? `${data.convertedBill.billNumber} (${data.convertedBill.status})` : "-"],
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
        money(line.unitPrice, data.purchaseOrder.currency),
        money(line.lineGrossAmount, data.purchaseOrder.currency),
        money(line.discountAmount, data.purchaseOrder.currency),
        money(line.taxableAmount, data.purchaseOrder.currency),
        money(line.taxAmount, data.purchaseOrder.currency),
        money(line.lineTotal, data.purchaseOrder.currency),
      ]),
      renderSettings,
    );

    writeTotals(doc, data.purchaseOrder.currency, [
      ["Subtotal", data.purchaseOrder.subtotal],
      ["Discount", data.purchaseOrder.discountTotal],
      ["Taxable total", data.purchaseOrder.taxableTotal],
      ["VAT / Tax", data.purchaseOrder.taxTotal],
      ["Total", data.purchaseOrder.total],
    ], renderSettings);

    if (renderSettings.showNotes) {
      writeOptionalTextBlock(doc, "Notes", data.purchaseOrder.notes, renderSettings);
    }
    if (renderSettings.showTerms) {
      writeOptionalTextBlock(doc, "Terms", data.purchaseOrder.terms, renderSettings);
    }
  }, renderSettings);
}

export async function renderCashExpensePdf(data: CashExpensePdfData, settings?: DocumentRenderSettings): Promise<Buffer> {
  const renderSettings = resolveSettings(settings, "Cash Expense");
  return renderPdf((doc) => {
    writeHeader(doc, data.organization, renderSettings, data.generatedAt);
    writeTwoColumnBlocks(doc, data.contact ? "Supplier / Contact" : "Contact", data.contact ? contactLines(data.contact, renderSettings) : ["No linked supplier"], "Cash Expense", [
      ["Expense number", data.expense.expenseNumber],
      ["Status", data.expense.status],
      ["Expense date", formatDate(data.expense.expenseDate)],
      ["Currency", data.expense.currency],
      ["Paid through", `${data.paidThroughAccount.code} ${data.paidThroughAccount.name}`],
      ["Journal entry", data.journalEntry ? `${data.journalEntry.entryNumber} (${data.journalEntry.status})` : "-"],
      ["Void reversal", data.voidReversalJournalEntry ? `${data.voidReversalJournalEntry.entryNumber} (${data.voidReversalJournalEntry.status})` : "-"],
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
        money(line.unitPrice, data.expense.currency),
        money(line.lineGrossAmount, data.expense.currency),
        money(line.discountAmount, data.expense.currency),
        money(line.taxableAmount, data.expense.currency),
        money(line.taxAmount, data.expense.currency),
        money(line.lineTotal, data.expense.currency),
      ]),
      renderSettings,
    );

    writeTotals(doc, data.expense.currency, [
      ["Subtotal", data.expense.subtotal],
      ["Discount", data.expense.discountTotal],
      ["Taxable total", data.expense.taxableTotal],
      ["VAT / Tax", data.expense.taxTotal],
      ["Total paid", data.expense.total],
    ], renderSettings);

    if (renderSettings.showNotes) {
      writeOptionalTextBlock(doc, "Description", data.expense.description, renderSettings);
      writeOptionalTextBlock(doc, "Notes", data.expense.notes, renderSettings);
    }
  }, renderSettings);
}

export async function renderPurchaseDebitNotePdf(data: PurchaseDebitNotePdfData, settings?: DocumentRenderSettings): Promise<Buffer> {
  const renderSettings = resolveSettings(settings, "Debit Note");
  return renderPdf((doc) => {
    writeHeader(doc, data.organization, renderSettings, data.generatedAt);
    writeTwoColumnBlocks(doc, "Supplier", contactLines(data.supplier, renderSettings), "Debit Note", [
      ["Debit note number", data.debitNote.debitNoteNumber],
      ["Status", data.debitNote.status],
      ["Issue date", formatDate(data.debitNote.issueDate)],
      ["Currency", data.debitNote.currency],
      ["Original bill", data.originalBill ? data.originalBill.billNumber : "-"],
      ["Journal entry", data.journalEntry ? `${data.journalEntry.entryNumber} (${data.journalEntry.status})` : "-"],
    ], renderSettings);

    if (data.originalBill) {
      writeMuted(
        doc,
        `Original bill ${data.originalBill.billNumber}, issued ${formatDate(data.originalBill.billDate)}, total ${money(data.originalBill.total, data.debitNote.currency)}.`,
      );
    }

    writeOptionalTextBlock(doc, "Reason", data.debitNote.reason, renderSettings);
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
        money(line.unitPrice, data.debitNote.currency),
        money(line.lineGrossAmount, data.debitNote.currency),
        money(line.discountAmount, data.debitNote.currency),
        money(line.taxableAmount, data.debitNote.currency),
        money(line.taxAmount, data.debitNote.currency),
        money(line.lineTotal, data.debitNote.currency),
      ]),
      renderSettings,
    );

    writeTotals(doc, data.debitNote.currency, [
      ["Subtotal", data.debitNote.subtotal],
      ["Discount", data.debitNote.discountTotal],
      ["Taxable total", data.debitNote.taxableTotal],
      ["VAT / Tax", data.debitNote.taxTotal],
      ["Total debit", data.debitNote.total],
      ["Applied amount", subtractMoney(data.debitNote.total, data.debitNote.unappliedAmount)],
      ["Unapplied amount", data.debitNote.unappliedAmount],
    ], renderSettings);

    writeSectionTitle(doc, "Bill Allocations", renderSettings);
    if (data.allocations.length === 0) {
      writeMuted(doc, "No bill allocations are linked to this debit note.");
    } else {
      drawTable(
        doc,
        [
          { label: "Bill", width: 95 },
          { label: "Date", width: 60 },
          { label: "Due", width: 60 },
          { label: "Status", width: 62 },
          { label: "Applied", width: 78, align: "right" },
          { label: "Balance due", width: 88, align: "right" },
          { label: "Reversed", width: 62 },
        ],
        data.allocations.map((allocation) => [
          allocation.billNumber,
          formatDate(allocation.billDate),
          allocation.billDueDate ? formatDate(allocation.billDueDate) : "-",
          allocation.status,
          money(allocation.amountApplied, data.debitNote.currency),
          money(allocation.billBalanceDue, data.debitNote.currency),
          allocation.reversedAt ? formatDate(allocation.reversedAt) : "-",
        ]),
        renderSettings,
      );
    }

    if (renderSettings.showNotes) {
      writeOptionalTextBlock(doc, "Notes", data.debitNote.notes, renderSettings);
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

    writeSectionTitle(doc, "Unapplied Credit Applications", renderSettings);
    if (data.unappliedAllocations.length === 0) {
      writeMuted(doc, "No unapplied payment credit has been matched to later invoices.");
    } else {
      drawTable(
        doc,
        [
          { label: "Invoice", width: 100 },
          { label: "Date", width: 65 },
          { label: "Status", width: 62 },
          { label: "Applied", width: 80, align: "right" },
          { label: "Balance due", width: 90, align: "right" },
          { label: "Reversed", width: 72 },
        ],
        data.unappliedAllocations.map((allocation) => [
          allocation.invoiceNumber,
          formatDate(allocation.invoiceDate),
          allocation.status,
          money(allocation.amountApplied, data.payment.currency),
          money(allocation.invoiceBalanceDue, data.payment.currency),
          allocation.reversedAt ? formatDate(allocation.reversedAt) : "-",
        ]),
        renderSettings,
      );
    }
  }, renderSettings);
}

export async function renderSupplierPaymentReceiptPdf(data: SupplierPaymentReceiptPdfData, settings?: DocumentRenderSettings): Promise<Buffer> {
  const renderSettings = resolveSettings(settings, "Supplier Payment Receipt");
  return renderPdf((doc) => {
    writeHeader(doc, data.organization, renderSettings, data.generatedAt);
    writeTwoColumnBlocks(doc, "Paid To", contactLines(data.supplier, renderSettings), "Supplier Payment", [
      ["Payment number", data.payment.paymentNumber],
      ["Status", data.payment.status],
      ["Payment date", formatDate(data.payment.paymentDate)],
      ["Amount paid", money(data.payment.amountPaid, data.payment.currency)],
      ["Unapplied", money(data.payment.unappliedAmount, data.payment.currency)],
      ["Paid through", `${data.paidThroughAccount.code} ${data.paidThroughAccount.name}`],
      ["Journal entry", data.journalEntry ? `${data.journalEntry.entryNumber} (${data.journalEntry.status})` : "-"],
    ], renderSettings);

    writeOptionalTextBlock(doc, "Description", data.payment.description, renderSettings);
    writeSectionTitle(doc, "Bill Allocations", renderSettings);
    if (data.allocations.length === 0) {
      writeMuted(doc, "No bill allocations are linked to this supplier payment.");
    } else {
      drawTable(
        doc,
        [
          { label: "Bill", width: 110 },
          { label: "Bill date", width: 72 },
          { label: "Due", width: 72 },
          { label: "Bill total", width: 95, align: "right" },
          { label: "Applied", width: 70, align: "right" },
          { label: "Balance due", width: 85, align: "right" },
        ],
        data.allocations.map((allocation) => [
          allocation.billNumber,
          formatDate(allocation.billDate),
          allocation.billDueDate ? formatDate(allocation.billDueDate) : "-",
          money(allocation.billTotal, data.payment.currency),
          money(allocation.amountApplied, data.payment.currency),
          money(allocation.billBalanceDue, data.payment.currency),
        ]),
        renderSettings,
      );
    }

    writeSectionTitle(doc, "Unapplied Payment Applications", renderSettings);
    if (data.unappliedAllocations.length === 0) {
      writeMuted(doc, "No unapplied supplier payment credit has been matched to later bills.");
    } else {
      drawTable(
        doc,
        [
          { label: "Bill", width: 96 },
          { label: "Bill date", width: 64 },
          { label: "Status", width: 62 },
          { label: "Bill total", width: 86, align: "right" },
          { label: "Applied", width: 72, align: "right" },
          { label: "Balance due", width: 82, align: "right" },
          { label: "Reversed", width: 70 },
        ],
        data.unappliedAllocations.map((allocation) => [
          allocation.billNumber,
          formatDate(allocation.billDate),
          allocation.status,
          money(allocation.billTotal, data.payment.currency),
          money(allocation.amountApplied, data.payment.currency),
          money(allocation.billBalanceDue, data.payment.currency),
          allocation.reversedAt ? formatDate(allocation.reversedAt) : "-",
        ]),
        renderSettings,
      );
    }

    writeTotals(doc, data.payment.currency, [
      ["Amount paid", data.payment.amountPaid],
      ["Unapplied amount", data.payment.unappliedAmount],
    ], renderSettings);
  }, renderSettings);
}

export async function renderSupplierRefundPdf(data: SupplierRefundPdfData, settings?: DocumentRenderSettings): Promise<Buffer> {
  const renderSettings = resolveSettings(settings, "Supplier Refund");
  return renderPdf((doc) => {
    writeHeader(doc, data.organization, renderSettings, data.generatedAt);
    writeTwoColumnBlocks(doc, "Refund From", contactLines(data.supplier, renderSettings), "Supplier Refund", [
      ["Refund number", data.refund.refundNumber],
      ["Status", data.refund.status],
      ["Refund date", formatDate(data.refund.refundDate)],
      ["Amount refunded", money(data.refund.amountRefunded, data.refund.currency)],
      ["Received into", `${data.receivedIntoAccount.code} ${data.receivedIntoAccount.name}`],
      ["Journal entry", data.journalEntry ? `${data.journalEntry.entryNumber} (${data.journalEntry.status})` : "-"],
      ["Void reversal", data.voidReversalJournalEntry ? `${data.voidReversalJournalEntry.entryNumber} (${data.voidReversalJournalEntry.status})` : "-"],
    ], renderSettings);

    writeSectionTitle(doc, "Refund Source", renderSettings);
    drawTable(
      doc,
      [
        { label: "Source type", width: 120 },
        { label: "Number", width: 105 },
        { label: "Date", width: 75 },
        { label: "Status", width: 75 },
        { label: "Original amount", width: 95, align: "right" },
        { label: "Remaining unapplied", width: 115, align: "right" },
      ],
      [[
        data.source.type.replaceAll("_", " "),
        data.source.number,
        formatDate(data.source.date),
        data.source.status,
        money(data.source.originalAmount, data.refund.currency),
        money(data.source.remainingUnappliedAmount, data.refund.currency),
      ]],
      renderSettings,
    );

    writeTotals(doc, data.refund.currency, [
      ["Amount refunded", data.refund.amountRefunded],
    ], renderSettings);

    if (renderSettings.showNotes) {
      writeOptionalTextBlock(doc, "Description", data.refund.description, renderSettings);
    }
  }, renderSettings);
}

export async function renderCustomerRefundPdf(data: CustomerRefundPdfData, settings?: DocumentRenderSettings): Promise<Buffer> {
  const renderSettings = resolveSettings(settings, "Customer Refund");
  return renderPdf((doc) => {
    writeHeader(doc, data.organization, renderSettings, data.generatedAt);
    writeTwoColumnBlocks(doc, "Refund To", contactLines(data.customer, renderSettings), "Customer Refund", [
      ["Refund number", data.refund.refundNumber],
      ["Status", data.refund.status],
      ["Refund date", formatDate(data.refund.refundDate)],
      ["Amount refunded", money(data.refund.amountRefunded, data.refund.currency)],
      ["Paid from", `${data.paidFromAccount.code} ${data.paidFromAccount.name}`],
      ["Journal entry", data.journalEntry ? `${data.journalEntry.entryNumber} (${data.journalEntry.status})` : "-"],
      ["Void reversal", data.voidReversalJournalEntry ? `${data.voidReversalJournalEntry.entryNumber} (${data.voidReversalJournalEntry.status})` : "-"],
    ], renderSettings);

    writeSectionTitle(doc, "Refund Source", renderSettings);
    drawTable(
      doc,
      [
        { label: "Source type", width: 100 },
        { label: "Number", width: 105 },
        { label: "Date", width: 75 },
        { label: "Status", width: 75 },
        { label: "Original amount", width: 95, align: "right" },
        { label: "Remaining unapplied", width: 115, align: "right" },
      ],
      [[
        data.source.type.replaceAll("_", " "),
        data.source.number,
        formatDate(data.source.date),
        data.source.status,
        money(data.source.originalAmount, data.refund.currency),
        money(data.source.remainingUnappliedAmount, data.refund.currency),
      ]],
      renderSettings,
    );

    writeTotals(doc, data.refund.currency, [
      ["Amount refunded", data.refund.amountRefunded],
    ], renderSettings);

    if (renderSettings.showNotes) {
      writeOptionalTextBlock(doc, "Description", data.refund.description, renderSettings);
    }
  }, renderSettings);
}

export async function renderCustomerStatementPdf(data: CustomerStatementPdfData, settings?: DocumentRenderSettings): Promise<Buffer> {
  const presentation = statementPresentationLabels(data.contactLabel);
  const renderSettings = resolveSettings(settings, presentation.title);
  return renderPdf((doc) => {
    writeHeader(doc, data.organization, renderSettings, data.generatedAt);
    writeMuted(doc, presentation.explanation);
    doc.moveDown(0.4);
    writeTwoColumnBlocks(doc, presentation.counterpartyTitle, contactLines(data.contact, renderSettings), presentation.summaryTitle, [
      [presentation.periodFromLabel, data.periodFrom ?? "-"],
      [presentation.periodToLabel, data.periodTo ?? "-"],
      [presentation.openingBalanceLabel, money(data.openingBalance, data.currency ?? "SAR")],
      [presentation.closingBalanceLabel, money(data.closingBalance, data.currency ?? "SAR")],
    ], renderSettings);

    writeSectionTitle(doc, presentation.activityTitle, renderSettings);
    writeMuted(doc, presentation.debitCreditHelp);
    doc.moveDown(0.4);
    if (data.rows.length === 0) {
      writeMuted(doc, presentation.emptyMessage);
    } else {
      drawTable(
        doc,
        [
          { label: "Date", width: 52 },
          { label: "Activity", width: 62 },
          { label: "Reference", width: 70 },
          { label: "Description", width: 124 },
          { label: "Debit", width: 58, align: "right" },
          { label: "Credit", width: 58, align: "right" },
          { label: presentation.balanceColumnLabel, width: 72, align: "right" },
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
      const fxRows = data.rows.filter((row) => row.fxEvidence);
      if (fxRows.length) {
        writeSectionTitle(doc, "Foreign-currency document evidence", renderSettings);
        writeMuted(doc, "Statement debits, credits, and running balances remain official base-currency ledger amounts. Foreign values below are supporting document and current carrying evidence.");
        drawTable(
          doc,
          [
            { label: "Reference", width: 70 },
            { label: "Currency", width: 44 },
            { label: "Txn balance", width: 70, align: "right" },
            { label: "Source base", width: 70, align: "right" },
            { label: "Carrying base", width: 74, align: "right" },
            { label: "Rate", width: 58, align: "right" },
            { label: "Evidence", width: 82 },
          ],
          fxRows.map((row) => [
            row.number,
            row.fxEvidence!.transactionCurrency,
            money(row.fxEvidence!.transactionBalanceDue, row.fxEvidence!.transactionCurrency),
            money(row.fxEvidence!.sourceBaseBalanceDue, row.fxEvidence!.baseCurrency),
            money(row.fxEvidence!.carryingBaseAmount, row.fxEvidence!.baseCurrency),
            row.fxEvidence!.carryingRate,
            row.fxEvidence!.lastRevaluationLineId ?? row.fxEvidence!.rateSnapshotId ?? "Source rate",
          ]),
          renderSettings,
        );
      }
    }
    writeMuted(doc, presentation.generatedNote);
  }, renderSettings);
}

export async function renderGeneralLedgerReportPdf(data: GeneralLedgerReportPdfData, settings?: DocumentRenderSettings): Promise<Buffer> {
  const renderSettings = resolveSettings(settings, "General Ledger");
  return renderPdf((doc) => {
    writeHeader(doc, data.organization, renderSettings, data.generatedAt);
    writeReportMeta(doc, data.currency, [["Period from", data.from ?? "-"], ["Period to", data.to ?? "-"], ...reportDimensionRows(data.filters), ...fxSupportingSliceRows(data.fxFilters)], data.generatedAt, renderSettings);

    if (data.fxFilters?.transactionCurrency) {
      writeMuted(doc, "Supporting transaction-currency slice only. Official totals and running balances remain valued in the organization base currency.");
    }

    if (data.accounts.length === 0) {
      writeMuted(doc, "No posted journal activity found for this period.");
      return;
    }

    for (const account of data.accounts) {
      writeSectionTitle(doc, `${account.code} ${account.name}`, renderSettings);
      drawTable(
        doc,
        [
          { label: "Opening Dr", width: 78, align: "right" },
          { label: "Opening Cr", width: 78, align: "right" },
          { label: "Period Dr", width: 78, align: "right" },
          { label: "Period Cr", width: 78, align: "right" },
          { label: "Closing Dr", width: 78, align: "right" },
          { label: "Closing Cr", width: 78, align: "right" },
        ],
        [[
          money(account.openingDebit, data.currency),
          money(account.openingCredit, data.currency),
          money(account.periodDebit, data.currency),
          money(account.periodCredit, data.currency),
          money(account.closingDebit, data.currency),
          money(account.closingCredit, data.currency),
        ]],
        renderSettings,
      );

      if (account.lines.length === 0) {
        writeMuted(doc, "No period lines.");
      } else {
        drawTable(
          doc,
          [
            { label: "Date", width: 52 },
            { label: "Entry", width: 70 },
            { label: "Description", width: 126 },
            { label: "Debit", width: 72, align: "right" },
            { label: "Credit", width: 72, align: "right" },
            { label: "Balance", width: 76, align: "right" },
          ],
          account.lines.map((line) => [
            formatDate(line.date),
            line.entryNumber,
            withOptionalSuffix(line.description, line.reference ? `Ref: ${line.reference}` : null),
            money(line.debit, data.currency),
            money(line.credit, data.currency),
            money(line.runningBalance, data.currency),
          ]),
          renderSettings,
        );
        const fxLines = account.lines.filter((line) => line.currency && (line.transactionDebit != null || line.transactionCredit != null));
        if (fxLines.length) {
          writeSectionTitle(doc, `${account.code} transaction-currency evidence`, renderSettings);
          drawTable(
            doc,
            [
              { label: "Entry", width: 62 },
              { label: "Currency", width: 48 },
              { label: "Txn debit", width: 68, align: "right" },
              { label: "Txn credit", width: 68, align: "right" },
              { label: "Rate", width: 64, align: "right" },
              { label: "Rate evidence", width: 138 },
            ],
            fxLines.map((line) => [
              line.entryNumber,
              line.currency ?? "-",
              line.transactionDebit == null ? "-" : money(line.transactionDebit, line.currency ?? data.currency),
              line.transactionCredit == null ? "-" : money(line.transactionCredit, line.currency ?? data.currency),
              line.exchangeRate ?? "-",
              line.rateSnapshot ? `${line.rateSnapshot.source} ${formatDate(line.rateSnapshot.rateDate)} / ${line.rateSnapshot.id}` : "-",
            ]),
            renderSettings,
          );
        }
      }
    }
  }, renderSettings);
}

export async function renderTrialBalanceReportPdf(data: TrialBalanceReportPdfData, settings?: DocumentRenderSettings): Promise<Buffer> {
  const renderSettings = resolveSettings(settings, "Trial Balance");
  return renderPdf((doc) => {
    writeHeader(doc, data.organization, renderSettings, data.generatedAt);
    writeReportMeta(doc, data.currency, [["Period from", data.from ?? "-"], ["Period to", data.to ?? "-"], ...reportDimensionRows(data.filters), ["Status", data.totals.balanced ? "Balanced" : "Out of balance"]], data.generatedAt, renderSettings);
    drawAccountBalanceTable(doc, data.accounts, data.totals, data.currency, renderSettings);
  }, renderSettings);
}

export async function renderProfitAndLossReportPdf(data: ProfitAndLossReportPdfData, settings?: DocumentRenderSettings): Promise<Buffer> {
  const renderSettings = resolveSettings(settings, "Profit & Loss");
  return renderPdf((doc) => {
    writeHeader(doc, data.organization, renderSettings, data.generatedAt);
    writeReportMeta(doc, data.currency, [["Period from", data.from ?? "-"], ["Period to", data.to ?? "-"], ...reportDimensionRows(data.filters)], data.generatedAt, renderSettings);
    writeTotals(doc, data.currency, [
      ["Revenue", data.revenue],
      ["Cost of sales", data.costOfSales],
      ["Gross profit", data.grossProfit],
      ["Expenses", data.expenses],
      ["Total", data.netProfit],
    ], renderSettings);
    for (const section of data.sections) {
      writeAmountSection(doc, section.type.replaceAll("_", " "), section.accounts, section.total, data.currency, renderSettings);
    }
  }, renderSettings);
}

export async function renderBalanceSheetReportPdf(data: BalanceSheetReportPdfData, settings?: DocumentRenderSettings): Promise<Buffer> {
  const renderSettings = resolveSettings(settings, "Balance Sheet");
  return renderPdf((doc) => {
    writeHeader(doc, data.organization, renderSettings, data.generatedAt);
    writeReportMeta(doc, data.currency, [["As of", data.asOf ?? "-"], ...reportDimensionRows(data.filters), ["Status", data.balanced ? "Balanced" : "Out of balance"]], data.generatedAt, renderSettings);
    writeAmountSection(doc, "Assets", data.assets.accounts, data.assets.total, data.currency, renderSettings);
    writeAmountSection(doc, "Liabilities", data.liabilities.accounts, data.liabilities.total, data.currency, renderSettings);
    writeAmountSection(doc, "Equity", data.equity.accounts, data.equity.total, data.currency, renderSettings);
    writeTotals(doc, data.currency, [
      ["Retained earnings", data.retainedEarnings],
      ["Total assets", data.totalAssets],
      ["Total liabilities and equity", data.totalLiabilitiesAndEquity],
      ["Difference", data.difference],
    ], renderSettings);
  }, renderSettings);
}

export async function renderVatSummaryReportPdf(data: VatSummaryReportPdfData, settings?: DocumentRenderSettings): Promise<Buffer> {
  const renderSettings = resolveSettings(settings, "VAT Summary");
  return renderPdf((doc) => {
    writeHeader(doc, data.organization, renderSettings, data.generatedAt);
    writeReportMeta(doc, data.currency, [["Period from", data.from ?? "-"], ["Period to", data.to ?? "-"], ...reportDimensionRows(data.filters)], data.generatedAt, renderSettings);
    writeMuted(doc, "VAT Summary is not an official VAT return filing.");
    writeTotals(doc, data.currency, [
      ["Sales VAT", data.salesVat],
      ["Purchase VAT", data.purchaseVat],
      ["Net VAT payable", data.netVatPayable],
    ], renderSettings);
    drawTable(
      doc,
      [
        { label: "Category", width: 180 },
        { label: "Account", width: 86 },
        { label: "Amount", width: 100, align: "right" },
        { label: "Tax amount", width: 100, align: "right" },
      ],
      data.sections.map((section) => [
        section.category.replaceAll("_", " "),
        section.accountCode,
        money(section.amount, data.currency),
        money(section.taxAmount, data.currency),
      ]),
      renderSettings,
    );
    data.notes.filter((note) => note !== "VAT Summary is not an official VAT return filing.").forEach((note) => writeMuted(doc, note));
  }, renderSettings);
}

export async function renderAgingReportPdf(data: AgingReportPdfData, settings?: DocumentRenderSettings): Promise<Buffer> {
  const renderSettings = resolveSettings(settings, data.title);
  return renderPdf((doc) => {
    writeHeader(doc, data.organization, renderSettings, data.generatedAt);
    writeReportMeta(doc, data.currency, [["As of", data.asOf ?? "-"], ["Report type", data.kind.replaceAll("_", " ")], ...fxSupportingSliceRows(data.fxFilters)], data.generatedAt, renderSettings);
    if (data.fxFilters?.transactionCurrency) {
      writeMuted(doc, "Supporting transaction-currency slice only. Aging bucket totals use current carrying amounts in the organization base currency.");
    }
    drawTable(
      doc,
      [
        { label: "Contact", width: 100 },
        { label: "Number", width: 72 },
        { label: "Issue", width: 56 },
        { label: "Due", width: 56 },
        { label: "Balance", width: 82, align: "right" },
        { label: "Days", width: 44, align: "right" },
        { label: "Bucket", width: 58 },
      ],
      data.rows.map((row) => [
        row.contact.displayName ?? row.contact.name,
        row.number,
        formatDate(row.issueDate),
        row.dueDate ? formatDate(row.dueDate) : "-",
        money(row.balanceDue, data.currency),
        String(row.daysOverdue),
        row.bucket.replaceAll("_", "-"),
      ]),
      renderSettings,
    );
    writeTotals(doc, data.currency, [
      ...Object.entries(data.bucketTotals).map(([bucket, value]) => [bucket.replaceAll("_", "-"), value] as [string, string]),
      ["Total", data.grandTotal],
    ], renderSettings);
    const fxRows = data.rows.filter((row) => row.currency && row.openTransactionAmount != null);
    if (fxRows.length) {
      writeSectionTitle(doc, "Foreign-currency carrying evidence", renderSettings);
      drawTable(
        doc,
        [
          { label: "Number", width: 66 },
          { label: "Currency", width: 44 },
          { label: "Open txn", width: 68, align: "right" },
          { label: "Source base", width: 70, align: "right" },
          { label: "Carrying base", width: 74, align: "right" },
          { label: "Rate", width: 58, align: "right" },
          { label: "Revaluation", width: 88 },
        ],
        fxRows.map((row) => [
          row.number,
          row.currency ?? "-",
          money(row.openTransactionAmount ?? "0", row.currency ?? data.currency),
          money(row.sourceBaseOpenAmount ?? row.balanceDue, data.currency),
          money(row.carryingBaseAmount ?? row.balanceDue, data.currency),
          row.carryingRate ?? "-",
          row.revaluation ? `${row.revaluation.status ?? "-"} / ${row.revaluation.revaluationRunId ?? row.revaluation.rateSnapshotId ?? "-"}` : "Source rate",
        ]),
        renderSettings,
      );
    }
  }, renderSettings);
}

export async function renderBankReconciliationReportPdf(data: BankReconciliationReportPdfData, settings?: DocumentRenderSettings): Promise<Buffer> {
  const renderSettings = resolveSettings(settings, "Bank Reconciliation Report");
  return renderPdf((doc) => {
    writeHeader(doc, data.organization, renderSettings, data.generatedAt);
    writeReportMeta(
      doc,
      data.currency,
      [
        ["Reconciliation", data.reconciliation.reconciliationNumber],
        ["Bank account", accountLabel(data.bankAccount)],
        ["Period", `${formatDate(data.reconciliation.periodStart)} to ${formatDate(data.reconciliation.periodEnd)}`],
        ["Status", data.reconciliation.status],
        ["Closed", data.reconciliation.closedAt ? `${formatDate(data.reconciliation.closedAt)} by ${actorLabel(data.reconciliation.closedBy)}` : "-"],
        ["Voided", data.reconciliation.voidedAt ? `${formatDate(data.reconciliation.voidedAt)} by ${actorLabel(data.reconciliation.voidedBy)}` : "-"],
      ],
      data.generatedAt,
      renderSettings,
    );

    writeTotals(doc, data.currency, [
      ["Statement opening", data.reconciliation.statementOpeningBalance ?? "0.0000"],
      ["Statement closing", data.reconciliation.statementClosingBalance],
      ["Ledger closing", data.reconciliation.ledgerClosingBalance],
      ["Difference", data.reconciliation.difference],
    ], renderSettings);

    writeSectionTitle(doc, "Summary", renderSettings);
    drawTable(
      doc,
      [
        { label: "Items", width: 70, align: "right" },
        { label: "Debits", width: 98, align: "right" },
        { label: "Credits", width: 98, align: "right" },
        { label: "Matched", width: 70, align: "right" },
        { label: "Categorized", width: 88, align: "right" },
        { label: "Ignored", width: 70, align: "right" },
      ],
      [[
        String(data.summary.itemCount),
        money(data.summary.debitTotal, data.currency),
        money(data.summary.creditTotal, data.currency),
        String(data.summary.matchedCount),
        String(data.summary.categorizedCount),
        String(data.summary.ignoredCount),
      ]],
      renderSettings,
    );

    writeSectionTitle(doc, "Statement Item Snapshot", renderSettings);
    if (data.items.length === 0) {
      writeMuted(doc, "No statement rows have been snapshotted for this reconciliation.");
    } else {
      drawTable(
        doc,
        [
          { label: "Date", width: 54 },
          { label: "Description", width: 138 },
          { label: "Reference", width: 78 },
          { label: "Type", width: 56 },
          { label: "Status", width: 76 },
          { label: "Amount", width: 82, align: "right" },
        ],
        data.items.map((item) => [
          formatDate(item.transactionDate),
          item.description,
          item.reference ?? "-",
          item.type,
          item.statusAtClose,
          money(item.amount, data.currency),
        ]),
        renderSettings,
      );
    }
  }, renderSettings);
}

export async function renderAccountingCloseEvidencePdf(data: AccountingCloseEvidencePdfData, settings?: DocumentRenderSettings): Promise<Buffer> {
  const renderSettings = resolveSettings(settings, "Accounting Close Evidence");
  return renderPdf((doc) => {
    writeHeader(doc, data.organization, renderSettings, data.generatedAt);
    writeTwoColumnBlocks(doc, "Fiscal Period", [data.fiscalPeriod.name, `Organization ID: ${data.organization.id ?? "-"}`, `Period ID: ${data.fiscalPeriod.id}`, `${formatDate(data.fiscalPeriod.startsOn)} to ${formatDate(data.fiscalPeriod.endsOn)}`, `Status: ${data.fiscalPeriod.status}`], "Close Cycle", [["Cycle ID", data.cycle.id], ["Status", data.cycle.status], ["Base currency", data.baseCurrency], ["Schema version", String(data.schemaVersion)], ["Version", String(data.cycle.version)], ["Sign-off", data.cycle.signoffMode ?? "-"], ["Readiness hash", data.cycle.readinessHash ?? "-"]], renderSettings);
    const signoffLines = [
      ["Preparer", data.cycle.preparerUserId ?? "-"],
      ["Prepared", data.cycle.preparedAt ? formatDateTime(data.cycle.preparedAt) : "-"],
      ["Reviewer", data.cycle.reviewerUserId ?? "-"],
      ["Reviewed", data.cycle.reviewedAt ? formatDateTime(data.cycle.reviewedAt) : "-"],
    ].map(([label, value]) => `${label}: ${value}`);
    writeTwoColumnBlocks(doc, "Sign-off", signoffLines, "Lifecycle", [["Closed by", data.cycle.closedByUserId ?? "-"], ["Closed", data.cycle.closedAt ? formatDateTime(data.cycle.closedAt) : "-"], ["Locked by", data.cycle.lockedByUserId ?? "-"], ["Locked", data.cycle.lockedAt ? formatDateTime(data.cycle.lockedAt) : "-"]], renderSettings);
    writeSectionTitle(doc, "Tasks", renderSettings);
    drawTable(doc, [{ label: "Task", width: 170 }, { label: "Status", width: 70 }, { label: "Severity", width: 70 }, { label: "Acknowledgement", width: 170 }], data.tasks.length ? data.tasks.map((task) => [task.title, task.status, task.severity, task.acknowledgementReason ?? "-"]) : [["No tasks recorded.", "-", "-", "-"]], renderSettings);
    writeSectionTitle(doc, "Frozen Readiness Checks", renderSettings);
    drawTable(doc, [{ label: "Check", width: 130 }, { label: "Status", width: 75 }, { label: "Severity", width: 75 }, { label: "Safe message", width: 200 }], data.checks.length ? data.checks.map((check) => [check.checkKey, check.status, check.severity, check.safeMessage]) : [["No readiness snapshot recorded.", "-", "-", "-"]], renderSettings);
    writeSectionTitle(doc, "Evidence", renderSettings);
    drawTable(doc, [{ label: "Evidence ID", width: 80 }, { label: "Report reference", width: 120 }, { label: "Document ref", width: 100 }, { label: "Safe label", width: 180 }], data.evidence.length ? data.evidence.map((item) => [item.id, item.reportType ?? item.evidenceType, item.generatedDocumentId ?? "-", item.safeLabel]) : [["No evidence recorded.", "-", "-", "-"]], renderSettings);
  }, renderSettings);
}

function writeReportMeta(
  doc: PdfDocument,
  currency: string,
  reportRows: Array<[string, string]>,
  generatedAt: string | Date,
  settings: ResolvedDocumentRenderSettings,
): void {
  writeTwoColumnBlocks(
    doc,
    "Report",
    reportRows.map(([label, value]) => `${label}: ${value}`),
    "Output",
    [
      ["Currency", currency],
      ["Generated at", formatDateTime(generatedAt)],
    ],
    settings,
  );
}

function reportDimensionRows(filters: ReportDimensionFiltersPdfData | undefined): Array<[string, string]> {
  const rows: Array<[string, string]> = [];
  if (filters?.costCenter) {
    rows.push(["Cost Center", `${filters.costCenter.code} - ${filters.costCenter.name}`]);
  }
  if (filters?.project) {
    rows.push(["Project", `${filters.project.code} - ${filters.project.name}`]);
  }
  return rows;
}

function fxSupportingSliceRows(filters: { transactionCurrency?: string | null } | undefined): Array<[string, string]> {
  if (!filters?.transactionCurrency) return [["Amount basis", "Official totals in organization base currency"]];
  return [
    ["Amount basis", "Base-valued supporting detail; not a balanced financial statement"],
    ["Transaction currency filter", filters.transactionCurrency],
  ];
}

function drawAccountBalanceTable(
  doc: PdfDocument,
  accounts: ReportPdfAccountBalance[],
  totals: Omit<ReportPdfAccountBalance, "accountId" | "code" | "name" | "type">,
  currency: string,
  settings: ResolvedDocumentRenderSettings,
): void {
  drawTable(
    doc,
    [
      { label: "Account", width: 92 },
      { label: "Type", width: 48 },
      { label: "Opening Dr", width: 58, align: "right" },
      { label: "Opening Cr", width: 58, align: "right" },
      { label: "Period Dr", width: 58, align: "right" },
      { label: "Period Cr", width: 58, align: "right" },
      { label: "Closing Dr", width: 58, align: "right" },
      { label: "Closing Cr", width: 58, align: "right" },
    ],
    [
      ...accounts.map((account) => [
        `${account.code} ${account.name}`,
        account.type,
        money(account.openingDebit, currency),
        money(account.openingCredit, currency),
        money(account.periodDebit, currency),
        money(account.periodCredit, currency),
        money(account.closingDebit, currency),
        money(account.closingCredit, currency),
      ]),
      [
        "Totals",
        "",
        money(totals.openingDebit, currency),
        money(totals.openingCredit, currency),
        money(totals.periodDebit, currency),
        money(totals.periodCredit, currency),
        money(totals.closingDebit, currency),
        money(totals.closingCredit, currency),
      ],
    ],
    settings,
  );
}

function writeAmountSection(
  doc: PdfDocument,
  title: string,
  accounts: Array<{ code: string; name: string; amount: string }>,
  total: string,
  currency: string,
  settings: ResolvedDocumentRenderSettings,
): void {
  writeSectionTitle(doc, title, settings);
  drawTable(
    doc,
    [
      { label: "Account", width: 330 },
      { label: "Amount", width: 140, align: "right" },
    ],
    [
      ...accounts.map((account) => [`${account.code} ${account.name}`, money(account.amount, currency)]),
      [`Total ${title.toLowerCase()}`, money(total, currency)],
    ],
    settings,
  );
}

function accountLabel(value: BankReconciliationReportPdfData["bankAccount"]): string {
  return value.account ? `${value.displayName} (${value.account.code} ${value.account.name})` : value.displayName;
}

function actorLabel(value: { name?: string | null; email?: string | null } | null | undefined): string {
  return value?.name ?? value?.email ?? "-";
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
  const gap = 24;
  const columnWidth = (pageWidth(doc) - gap) / 2;
  const normalizedLeftLines = leftLines.length > 0 ? leftLines : ["-"];
  const normalizedRightLines = rightRows.map(([label, value]) => `${label}: ${value}`);
  const blockHeight = Math.max(
    measureBlockHeight(doc, columnWidth, normalizedLeftLines),
    measureBlockHeight(doc, columnWidth, normalizedRightLines),
  );
  ensureSpace(doc, blockHeight + 16);
  const top = doc.y;

  writeBlock(doc, pageMargin, top, columnWidth, blockHeight, leftTitle, normalizedLeftLines, settings);
  writeBlock(
    doc,
    pageMargin + columnWidth + gap,
    top,
    columnWidth,
    blockHeight,
    rightTitle,
    normalizedRightLines,
    settings,
  );

  doc.y = Math.max(doc.y, top + blockHeight + 12);
}

function writeBlock(
  doc: PdfDocument,
  x: number,
  y: number,
  width: number,
  height: number,
  title: string,
  lines: string[],
  settings: ResolvedDocumentRenderSettings,
): void {
  doc.roundedRect(x, y, width, height, 4).strokeColor(lineColor).lineWidth(0.75).stroke();
  doc.font("Helvetica-Bold").fontSize(10).fillColor(settings.primaryColor).text(title, x + 10, y + 10, { width: width - 20 });
  doc.font("Helvetica").fontSize(9).fillColor(mutedColor);
  let currentY = y + 29;
  for (const line of lines) {
    const lineHeight = Math.max(13, doc.heightOfString(line, { width: width - 20 }));
    doc.text(line, x + 10, currentY, { width: width - 20 });
    currentY += lineHeight;
  }
}

function measureBlockHeight(doc: PdfDocument, width: number, lines: string[]): number {
  doc.font("Helvetica").fontSize(9);
  const contentHeight = lines.reduce((height, line) => height + Math.max(13, doc.heightOfString(line, { width: width - 20 })), 0);
  return Math.max(104, 29 + contentHeight + 10);
}

function writeSectionTitle(doc: PdfDocument, title: string, settings: ResolvedDocumentRenderSettings): void {
  ensureSpace(doc, 36);
  doc.x = pageMargin;
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
  doc.x = pageMargin;
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
    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor(mutedColor)
      .text(`${settings.footerText} - Page ${pageIndex + 1}`, pageMargin, doc.page.height - pageMargin - 10, {
        align: "center",
        lineBreak: false,
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

function salesQuoteTaxModeLabel(taxMode: string): string {
  if (taxMode === "TAX_INCLUSIVE") {
    return "Tax inclusive";
  }
  if (taxMode === "NO_TAX") {
    return "No tax";
  }
  return "Tax exclusive";
}

function salesQuoteLineSuffix(line: SalesQuotePdfData["lines"][number]): string | null {
  const itemLabel = line.itemName ? `Item: ${line.itemSku ? `${line.itemSku} ` : ""}${line.itemName}` : null;
  return [itemLabel, line.taxRateName ? `Tax: ${line.taxRateName}` : null].filter((value): value is string => Boolean(value)).join(" | ") || null;
}

function deliveryNoteLineSuffix(line: DeliveryNotePdfData["lines"][number]): string | null {
  return line.itemName ? `Item: ${line.itemSku ? `${line.itemSku} ` : ""}${line.itemName}` : null;
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

function subtractMoney(left: string, right: string): string {
  const scale = 4;
  const factor = 10 ** scale;
  const units = parseMoneyUnits(left, scale) - parseMoneyUnits(right, scale);
  return formatMoneyUnits(units, factor, scale);
}

function parseMoneyUnits(value: string, scale: number): number {
  const trimmed = String(value ?? "0").trim();
  const negative = trimmed.startsWith("-");
  const unsigned = negative ? trimmed.slice(1) : trimmed;
  const [integer = "0", fraction = ""] = unsigned.split(".");
  const units = Number.parseInt(integer || "0", 10) * 10 ** scale + Number.parseInt(fraction.padEnd(scale, "0").slice(0, scale) || "0", 10);
  return negative ? -units : units;
}

function formatMoneyUnits(units: number, factor: number, scale: number): string {
  const negative = units < 0;
  const absolute = Math.abs(units);
  const integer = Math.floor(absolute / factor);
  const fraction = String(absolute % factor).padStart(scale, "0");
  return `${negative ? "-" : ""}${integer}.${fraction}`;
}

function normalizeDecimal(value: string): string {
  const trimmed = String(value ?? "0").trim() || "0";
  const negative = trimmed.startsWith("-");
  const unsigned = negative ? trimmed.slice(1) : trimmed;
  const [integer = "0", fraction = ""] = unsigned.split(".");
  const decimals = `${fraction}00`.slice(0, 2);
  return `${negative ? "-" : ""}${integer || "0"}.${decimals}`;
}
