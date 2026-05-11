import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { toMoney } from "@ledgerbyte/accounting-core";
import { CustomerStatementPdfData, renderCustomerStatementPdf } from "@ledgerbyte/pdf-core";
import { ContactType, CreditNoteStatus, CustomerPaymentStatus, CustomerRefundSourceType, CustomerRefundStatus, DocumentType, SalesInvoiceStatus } from "@prisma/client";
import { GeneratedDocumentService, sanitizeFilename } from "../generated-documents/generated-document.service";
import { OrganizationDocumentSettingsService } from "../document-settings/organization-document-settings.service";
import { PrismaService } from "../prisma/prisma.service";

export type CustomerLedgerRowType =
  | "INVOICE"
  | "CREDIT_NOTE"
  | "VOID_CREDIT_NOTE"
  | "CREDIT_NOTE_ALLOCATION"
  | "CREDIT_NOTE_ALLOCATION_REVERSAL"
  | "PAYMENT"
  | "PAYMENT_ALLOCATION"
  | "VOID_PAYMENT"
  | "CUSTOMER_REFUND"
  | "VOID_CUSTOMER_REFUND"
  | "VOID_INVOICE";

export interface CustomerLedgerContact {
  id: string;
  name: string;
  displayName: string | null;
  type: ContactType;
  email: string | null;
  phone: string | null;
  taxNumber: string | null;
}

export interface CustomerLedgerRow {
  id: string;
  type: CustomerLedgerRowType;
  date: string;
  number: string;
  description: string;
  debit: string;
  credit: string;
  balance: string;
  sourceType: "SalesInvoice" | "CreditNote" | "CreditNoteAllocation" | "CustomerPayment" | "CustomerPaymentAllocation" | "CustomerRefund";
  sourceId: string;
  status: string;
  metadata: Record<string, unknown>;
}

export interface CustomerLedgerResponse {
  contact: CustomerLedgerContact;
  openingBalance: string;
  closingBalance: string;
  rows: CustomerLedgerRow[];
}

export interface CustomerStatementResponse extends CustomerLedgerResponse {
  periodFrom: string | null;
  periodTo: string | null;
}

export interface LedgerInvoiceInput {
  id: string;
  invoiceNumber: string;
  issueDate: Date | string;
  total: unknown;
  status: string;
  journalEntryId: string | null;
  reversalJournalEntryId?: string | null;
  finalizedAt?: Date | string | null;
  updatedAt: Date | string;
  createdAt: Date | string;
}

export interface LedgerCreditNoteInput {
  id: string;
  creditNoteNumber: string;
  issueDate: Date | string;
  total: unknown;
  unappliedAmount: unknown;
  status: string;
  journalEntryId: string | null;
  reversalJournalEntryId?: string | null;
  originalInvoiceId?: string | null;
  finalizedAt?: Date | string | null;
  updatedAt: Date | string;
  createdAt: Date | string;
}

export interface LedgerPaymentAllocationInput {
  id: string;
  invoiceId: string;
  amountApplied: unknown;
  createdAt: Date | string;
  invoice?: {
    id: string;
    invoiceNumber: string;
    issueDate: Date | string;
    total: unknown;
    balanceDue: unknown;
    status: string;
  } | null;
}

export interface LedgerCreditNoteAllocationInput {
  id: string;
  creditNoteId: string;
  invoiceId: string;
  amountApplied: unknown;
  createdAt: Date | string;
  reversedAt?: Date | string | null;
  reversalReason?: string | null;
  invoice?: {
    id: string;
    invoiceNumber: string;
    issueDate: Date | string;
    total: unknown;
    balanceDue: unknown;
    status: string;
  } | null;
  creditNote?: {
    id: string;
    creditNoteNumber: string;
    issueDate: Date | string;
    total: unknown;
    unappliedAmount: unknown;
    status: string;
  } | null;
}

export interface LedgerPaymentInput {
  id: string;
  paymentNumber: string;
  paymentDate: Date | string;
  status: string;
  amountReceived: unknown;
  unappliedAmount: unknown;
  description?: string | null;
  postedAt?: Date | string | null;
  voidedAt?: Date | string | null;
  updatedAt: Date | string;
  createdAt: Date | string;
  allocations?: LedgerPaymentAllocationInput[];
}

export interface LedgerCustomerRefundInput {
  id: string;
  refundNumber: string;
  refundDate: Date | string;
  sourceType: CustomerRefundSourceType | string;
  sourcePaymentId?: string | null;
  sourceCreditNoteId?: string | null;
  status: string;
  amountRefunded: unknown;
  description?: string | null;
  postedAt?: Date | string | null;
  voidedAt?: Date | string | null;
  updatedAt: Date | string;
  createdAt: Date | string;
  sourcePayment?: {
    id: string;
    paymentNumber: string;
  } | null;
  sourceCreditNote?: {
    id: string;
    creditNoteNumber: string;
  } | null;
}

interface PendingLedgerRow extends Omit<CustomerLedgerRow, "balance"> {
  createdAt: string;
}

@Injectable()
export class ContactLedgerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly documentSettingsService?: OrganizationDocumentSettingsService,
    private readonly generatedDocumentService?: GeneratedDocumentService,
  ) {}

  async ledger(organizationId: string, contactId: string): Promise<CustomerLedgerResponse> {
    const contact = await this.findCustomerContact(organizationId, contactId);
    const [invoices, creditNotes, creditNoteAllocations, payments, refunds] = await Promise.all([
      this.prisma.salesInvoice.findMany({
        where: {
          organizationId,
          customerId: contactId,
          status: { in: [SalesInvoiceStatus.FINALIZED, SalesInvoiceStatus.VOIDED] },
          journalEntryId: { not: null },
        },
        select: {
          id: true,
          invoiceNumber: true,
          issueDate: true,
          total: true,
          status: true,
          journalEntryId: true,
          reversalJournalEntryId: true,
          finalizedAt: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.creditNote.findMany({
        where: {
          organizationId,
          customerId: contactId,
          status: { in: [CreditNoteStatus.FINALIZED, CreditNoteStatus.VOIDED] },
          journalEntryId: { not: null },
        },
        select: {
          id: true,
          creditNoteNumber: true,
          issueDate: true,
          total: true,
          unappliedAmount: true,
          status: true,
          journalEntryId: true,
          reversalJournalEntryId: true,
          originalInvoiceId: true,
          finalizedAt: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.creditNoteAllocation.findMany({
        where: {
          organizationId,
          creditNote: {
            customerId: contactId,
            status: { in: [CreditNoteStatus.FINALIZED, CreditNoteStatus.VOIDED] },
          },
        },
        select: {
          id: true,
          creditNoteId: true,
          invoiceId: true,
          amountApplied: true,
          createdAt: true,
          reversedAt: true,
          reversalReason: true,
          invoice: {
            select: {
              id: true,
              invoiceNumber: true,
              issueDate: true,
              total: true,
              balanceDue: true,
              status: true,
            },
          },
          creditNote: {
            select: {
              id: true,
              creditNoteNumber: true,
              issueDate: true,
              total: true,
              unappliedAmount: true,
              status: true,
            },
          },
        },
      }),
      this.prisma.customerPayment.findMany({
        where: {
          organizationId,
          customerId: contactId,
          status: { in: [CustomerPaymentStatus.POSTED, CustomerPaymentStatus.VOIDED] },
        },
        select: {
          id: true,
          paymentNumber: true,
          paymentDate: true,
          status: true,
          amountReceived: true,
          unappliedAmount: true,
          description: true,
          postedAt: true,
          voidedAt: true,
          createdAt: true,
          updatedAt: true,
          allocations: {
            select: {
              id: true,
              invoiceId: true,
              amountApplied: true,
              createdAt: true,
              invoice: {
                select: {
                  id: true,
                  invoiceNumber: true,
                  issueDate: true,
                  total: true,
                  balanceDue: true,
                  status: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.customerRefund.findMany({
        where: {
          organizationId,
          customerId: contactId,
          status: { in: [CustomerRefundStatus.POSTED, CustomerRefundStatus.VOIDED] },
        },
        select: {
          id: true,
          refundNumber: true,
          refundDate: true,
          sourceType: true,
          sourcePaymentId: true,
          sourceCreditNoteId: true,
          status: true,
          amountRefunded: true,
          description: true,
          postedAt: true,
          voidedAt: true,
          createdAt: true,
          updatedAt: true,
          sourcePayment: { select: { id: true, paymentNumber: true } },
          sourceCreditNote: { select: { id: true, creditNoteNumber: true } },
        },
      }),
    ]);

    const rows = buildCustomerLedgerRows({ invoices, creditNotes, creditNoteAllocations, payments, refunds });
    return {
      contact,
      openingBalance: "0.0000",
      closingBalance: rows.at(-1)?.balance ?? "0.0000",
      rows,
    };
  }

  async statement(organizationId: string, contactId: string, from?: string, to?: string): Promise<CustomerStatementResponse> {
    const ledger = await this.ledger(organizationId, contactId);
    const fromDate = parseBoundaryDate(from, false);
    const toDate = parseBoundaryDate(to, true);
    const openingBalance = calculateStatementOpeningBalance(ledger.rows, fromDate);
    const rowsInPeriod = filterStatementRows(ledger.rows, fromDate, toDate);
    const rows = calculateRunningBalance(rowsInPeriod, openingBalance);

    return {
      contact: ledger.contact,
      periodFrom: from ?? null,
      periodTo: to ?? null,
      openingBalance,
      closingBalance: rows.at(-1)?.balance ?? openingBalance,
      rows,
    };
  }

  async statementPdfData(organizationId: string, contactId: string, from?: string, to?: string): Promise<CustomerStatementPdfData> {
    const [organization, statement] = await Promise.all([
      this.prisma.organization.findFirst({
        where: { id: organizationId },
        select: {
          id: true,
          name: true,
          legalName: true,
          taxNumber: true,
          countryCode: true,
          baseCurrency: true,
        },
      }),
      this.statement(organizationId, contactId, from, to),
    ]);

    if (!organization) {
      throw new NotFoundException("Organization not found.");
    }

    return {
      organization,
      contact: statement.contact,
      currency: organization.baseCurrency,
      periodFrom: statement.periodFrom,
      periodTo: statement.periodTo,
      openingBalance: statement.openingBalance,
      closingBalance: statement.closingBalance,
      rows: statement.rows.map((row) => ({
        date: row.date,
        type: row.type,
        number: row.number,
        description: row.description,
        debit: row.debit,
        credit: row.credit,
        balance: row.balance,
        status: row.status,
      })),
      generatedAt: new Date(),
    };
  }

  async statementPdf(
    organizationId: string,
    actorUserId: string,
    contactId: string,
    from?: string,
    to?: string,
  ): Promise<{ data: CustomerStatementPdfData; buffer: Buffer; filename: string; document: unknown | null }> {
    const data = await this.statementPdfData(organizationId, contactId, from, to);
    const settings = await this.documentSettingsService?.statementRenderSettings(organizationId);
    const buffer = await renderCustomerStatementPdf(data, settings);
    const filename = statementFilename(data, from, to);
    const document = await this.generatedDocumentService?.archivePdf({
      organizationId,
      documentType: DocumentType.CUSTOMER_STATEMENT,
      sourceType: "CustomerStatement",
      sourceId: contactId,
      documentNumber: statementDocumentNumber(data, from, to),
      filename,
      buffer,
      generatedById: actorUserId,
    });
    return { data, buffer, filename, document: document ?? null };
  }

  async generateStatementPdf(organizationId: string, actorUserId: string, contactId: string, from?: string, to?: string) {
    const { document } = await this.statementPdf(organizationId, actorUserId, contactId, from, to);
    return document;
  }

  private async findCustomerContact(organizationId: string, contactId: string): Promise<CustomerLedgerContact> {
    const contact = await this.prisma.contact.findFirst({
      where: {
        id: contactId,
        organizationId,
        type: { in: [ContactType.CUSTOMER, ContactType.BOTH] },
      },
      select: {
        id: true,
        name: true,
        displayName: true,
        type: true,
        email: true,
        phone: true,
        taxNumber: true,
      },
    });

    if (!contact) {
      throw new NotFoundException("Customer contact not found.");
    }

    return contact;
  }
}

export function buildCustomerLedgerRows(input: {
  invoices: LedgerInvoiceInput[];
  creditNotes?: LedgerCreditNoteInput[];
  creditNoteAllocations?: LedgerCreditNoteAllocationInput[];
  payments: LedgerPaymentInput[];
  refunds?: LedgerCustomerRefundInput[];
}): CustomerLedgerRow[] {
  const pendingRows: PendingLedgerRow[] = [];

  for (const invoice of input.invoices) {
    pendingRows.push({
      id: `${invoice.id}:invoice`,
      type: "INVOICE",
      date: toIsoString(invoice.issueDate),
      createdAt: toIsoString(invoice.createdAt),
      number: invoice.invoiceNumber,
      description: `Invoice ${invoice.invoiceNumber}`,
      debit: moneyString(invoice.total),
      credit: "0.0000",
      sourceType: "SalesInvoice",
      sourceId: invoice.id,
      status: invoice.status,
      metadata: {
        invoiceId: invoice.id,
        journalEntryId: invoice.journalEntryId,
        finalizedAt: invoice.finalizedAt ? toIsoString(invoice.finalizedAt) : null,
      },
    });

    if (invoice.status === SalesInvoiceStatus.VOIDED) {
      pendingRows.push({
        id: `${invoice.id}:void`,
        type: "VOID_INVOICE",
        date: toIsoString(invoice.updatedAt),
        createdAt: toIsoString(invoice.updatedAt),
        number: invoice.invoiceNumber,
        description: `Void invoice ${invoice.invoiceNumber}`,
        debit: "0.0000",
        credit: moneyString(invoice.total),
        sourceType: "SalesInvoice",
        sourceId: invoice.id,
        status: invoice.status,
        metadata: {
          invoiceId: invoice.id,
          reversalJournalEntryId: invoice.reversalJournalEntryId ?? null,
        },
      });
    }
  }

  for (const creditNote of input.creditNotes ?? []) {
    pendingRows.push({
      id: `${creditNote.id}:credit-note`,
      type: "CREDIT_NOTE",
      date: toIsoString(creditNote.issueDate),
      createdAt: toIsoString(creditNote.createdAt),
      number: creditNote.creditNoteNumber,
      description: `Credit note ${creditNote.creditNoteNumber}`,
      debit: "0.0000",
      credit: moneyString(creditNote.total),
      sourceType: "CreditNote",
      sourceId: creditNote.id,
      status: creditNote.status,
      metadata: {
        creditNoteId: creditNote.id,
        journalEntryId: creditNote.journalEntryId,
        originalInvoiceId: creditNote.originalInvoiceId ?? null,
        unappliedAmount: moneyString(creditNote.unappliedAmount),
        finalizedAt: creditNote.finalizedAt ? toIsoString(creditNote.finalizedAt) : null,
      },
    });

    if (creditNote.status === CreditNoteStatus.VOIDED) {
      pendingRows.push({
        id: `${creditNote.id}:void`,
        type: "VOID_CREDIT_NOTE",
        date: toIsoString(creditNote.updatedAt),
        createdAt: toIsoString(creditNote.updatedAt),
        number: creditNote.creditNoteNumber,
        description: `Void credit note ${creditNote.creditNoteNumber}`,
        debit: moneyString(creditNote.total),
        credit: "0.0000",
        sourceType: "CreditNote",
        sourceId: creditNote.id,
        status: creditNote.status,
        metadata: {
          creditNoteId: creditNote.id,
          reversalJournalEntryId: creditNote.reversalJournalEntryId ?? null,
          originalInvoiceId: creditNote.originalInvoiceId ?? null,
        },
      });
    }
  }

  for (const allocation of input.creditNoteAllocations ?? []) {
    const creditNoteNumber = allocation.creditNote?.creditNoteNumber ?? allocation.creditNoteId;
    const invoiceNumber = allocation.invoice?.invoiceNumber ?? allocation.invoiceId;
    pendingRows.push({
      id: `${allocation.id}:credit-note-allocation`,
      type: "CREDIT_NOTE_ALLOCATION",
      date: toIsoString(allocation.createdAt),
      createdAt: toIsoString(allocation.createdAt),
      number: `${creditNoteNumber} -> ${invoiceNumber}`,
      description: `Credit note ${creditNoteNumber} applied to ${invoiceNumber}`,
      debit: "0.0000",
      credit: "0.0000",
      sourceType: "CreditNoteAllocation",
      sourceId: allocation.id,
      status: allocation.reversedAt ? "REVERSED" : "ACTIVE",
      metadata: {
        creditNoteId: allocation.creditNoteId,
        creditNoteNumber: allocation.creditNote?.creditNoteNumber ?? null,
        invoiceId: allocation.invoiceId,
        invoiceNumber: allocation.invoice?.invoiceNumber ?? null,
        amountApplied: moneyString(allocation.amountApplied),
        reversedAt: allocation.reversedAt ? toIsoString(allocation.reversedAt) : null,
        reversalReason: allocation.reversalReason ?? null,
      },
    });

    if (allocation.reversedAt) {
      pendingRows.push({
        id: `${allocation.id}:credit-note-allocation-reversal`,
        type: "CREDIT_NOTE_ALLOCATION_REVERSAL",
        date: toIsoString(allocation.reversedAt),
        createdAt: toIsoString(allocation.reversedAt),
        number: `${creditNoteNumber} -> ${invoiceNumber}`,
        description: `Reversed credit note ${creditNoteNumber} allocation from ${invoiceNumber}`,
        debit: "0.0000",
        credit: "0.0000",
        sourceType: "CreditNoteAllocation",
        sourceId: allocation.id,
        status: "REVERSED",
        metadata: {
          creditNoteId: allocation.creditNoteId,
          creditNoteNumber: allocation.creditNote?.creditNoteNumber ?? null,
          invoiceId: allocation.invoiceId,
          invoiceNumber: allocation.invoice?.invoiceNumber ?? null,
          amountApplied: moneyString(allocation.amountApplied),
          reversedAt: toIsoString(allocation.reversedAt),
          reversalReason: allocation.reversalReason ?? null,
        },
      });
    }
  }

  for (const payment of input.payments) {
    pendingRows.push({
      id: `${payment.id}:payment`,
      type: "PAYMENT",
      date: toIsoString(payment.paymentDate),
      createdAt: toIsoString(payment.createdAt),
      number: payment.paymentNumber,
      description: payment.description?.trim() || `Customer payment ${payment.paymentNumber}`,
      debit: "0.0000",
      credit: moneyString(payment.amountReceived),
      sourceType: "CustomerPayment",
      sourceId: payment.id,
      status: payment.status,
      metadata: {
        paymentId: payment.id,
        unappliedAmount: moneyString(payment.unappliedAmount),
        allocations:
          payment.allocations?.map((allocation) => ({
            id: allocation.id,
            invoiceId: allocation.invoiceId,
            invoiceNumber: allocation.invoice?.invoiceNumber ?? null,
            amountApplied: moneyString(allocation.amountApplied),
          })) ?? [],
      },
    });

    for (const allocation of payment.allocations ?? []) {
      pendingRows.push({
        id: `${allocation.id}:allocation`,
        type: "PAYMENT_ALLOCATION",
        date: toIsoString(payment.paymentDate),
        createdAt: toIsoString(allocation.createdAt),
        number: `${payment.paymentNumber} -> ${allocation.invoice?.invoiceNumber ?? allocation.invoiceId}`,
        description: `Payment allocation to invoice ${allocation.invoice?.invoiceNumber ?? allocation.invoiceId}`,
        debit: "0.0000",
        credit: "0.0000",
        sourceType: "CustomerPaymentAllocation",
        sourceId: allocation.id,
        status: payment.status,
        metadata: {
          paymentId: payment.id,
          paymentNumber: payment.paymentNumber,
          invoiceId: allocation.invoiceId,
          invoiceNumber: allocation.invoice?.invoiceNumber ?? null,
          amountApplied: moneyString(allocation.amountApplied),
        },
      });
    }

    if (payment.status === CustomerPaymentStatus.VOIDED) {
      pendingRows.push({
        id: `${payment.id}:void`,
        type: "VOID_PAYMENT",
        date: toIsoString(payment.voidedAt ?? payment.updatedAt),
        createdAt: toIsoString(payment.updatedAt),
        number: payment.paymentNumber,
        description: `Void payment ${payment.paymentNumber}`,
        debit: moneyString(payment.amountReceived),
        credit: "0.0000",
        sourceType: "CustomerPayment",
        sourceId: payment.id,
        status: payment.status,
        metadata: {
          paymentId: payment.id,
          unappliedAmount: moneyString(payment.unappliedAmount),
        },
      });
    }
  }

  for (const refund of input.refunds ?? []) {
    const sourceNumber =
      refund.sourceType === CustomerRefundSourceType.CUSTOMER_PAYMENT
        ? refund.sourcePayment?.paymentNumber ?? refund.sourcePaymentId ?? "-"
        : refund.sourceCreditNote?.creditNoteNumber ?? refund.sourceCreditNoteId ?? "-";
    pendingRows.push({
      id: `${refund.id}:customer-refund`,
      type: "CUSTOMER_REFUND",
      date: toIsoString(refund.refundDate),
      createdAt: toIsoString(refund.createdAt),
      number: refund.refundNumber,
      description: refund.description?.trim() || `Customer refund ${refund.refundNumber}`,
      debit: moneyString(refund.amountRefunded),
      credit: "0.0000",
      sourceType: "CustomerRefund",
      sourceId: refund.id,
      status: refund.status,
      metadata: {
        refundId: refund.id,
        sourceType: refund.sourceType,
        sourcePaymentId: refund.sourcePaymentId ?? null,
        sourceCreditNoteId: refund.sourceCreditNoteId ?? null,
        sourceNumber,
        amountRefunded: moneyString(refund.amountRefunded),
        postedAt: refund.postedAt ? toIsoString(refund.postedAt) : null,
      },
    });

    if (refund.status === CustomerRefundStatus.VOIDED) {
      pendingRows.push({
        id: `${refund.id}:void`,
        type: "VOID_CUSTOMER_REFUND",
        date: toIsoString(refund.voidedAt ?? refund.updatedAt),
        createdAt: toIsoString(refund.updatedAt),
        number: refund.refundNumber,
        description: `Void customer refund ${refund.refundNumber}`,
        debit: "0.0000",
        credit: moneyString(refund.amountRefunded),
        sourceType: "CustomerRefund",
        sourceId: refund.id,
        status: refund.status,
        metadata: {
          refundId: refund.id,
          sourceType: refund.sourceType,
          sourcePaymentId: refund.sourcePaymentId ?? null,
          sourceCreditNoteId: refund.sourceCreditNoteId ?? null,
          sourceNumber,
          amountRefunded: moneyString(refund.amountRefunded),
        },
      });
    }
  }

  return calculateRunningBalance(sortLedgerRows(pendingRows), "0.0000");
}

export function calculateRunningBalance(rows: Array<Omit<CustomerLedgerRow, "balance">>, openingBalance = "0.0000"): CustomerLedgerRow[] {
  let balance = toMoney(openingBalance);
  return rows.map((row) => {
    balance = balance.plus(row.debit).minus(row.credit);
    return {
      ...row,
      balance: balance.toFixed(4),
    };
  });
}

export function calculateStatementOpeningBalance(rows: CustomerLedgerRow[], fromDate?: Date): string {
  if (!fromDate) {
    return "0.0000";
  }

  return rows
    .filter((row) => new Date(row.date).getTime() < fromDate.getTime())
    .reduce((balance, row) => balance.plus(row.debit).minus(row.credit), toMoney(0))
    .toFixed(4);
}

export function filterStatementRows(rows: CustomerLedgerRow[], fromDate?: Date, toDate?: Date): Array<Omit<CustomerLedgerRow, "balance">> {
  return rows
    .filter((row) => {
      const rowTime = new Date(row.date).getTime();
      return (!fromDate || rowTime >= fromDate.getTime()) && (!toDate || rowTime <= toDate.getTime());
    })
    .map(({ balance, ...row }) => row);
}

function sortLedgerRows(rows: PendingLedgerRow[]): PendingLedgerRow[] {
  return [...rows].sort((a, b) => {
    const dateDelta = new Date(a.date).getTime() - new Date(b.date).getTime();
    if (dateDelta !== 0) {
      return dateDelta;
    }

    const createdDelta = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    if (createdDelta !== 0) {
      return createdDelta;
    }

    return rowPriority(a.type) - rowPriority(b.type);
  });
}

function rowPriority(type: CustomerLedgerRowType): number {
  switch (type) {
    case "INVOICE":
    case "CREDIT_NOTE":
    case "PAYMENT":
    case "CUSTOMER_REFUND":
      return 0;
    case "PAYMENT_ALLOCATION":
    case "CREDIT_NOTE_ALLOCATION":
    case "CREDIT_NOTE_ALLOCATION_REVERSAL":
      return 1;
    case "VOID_PAYMENT":
    case "VOID_CUSTOMER_REFUND":
    case "VOID_INVOICE":
    case "VOID_CREDIT_NOTE":
      return 2;
  }
}

function moneyString(value: unknown): string {
  return toMoney(value === null || value === undefined ? 0 : String(value)).toFixed(4);
}

function toIsoString(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function statementFilename(data: CustomerStatementPdfData, from?: string, to?: string): string {
  const name = data.contact.displayName ?? data.contact.name;
  const range = from && to ? `${from}-to-${to}` : "all";
  return sanitizeFilename(`statement-${name}-${range}.pdf`);
}

function statementDocumentNumber(data: CustomerStatementPdfData, from?: string, to?: string): string {
  const name = data.contact.displayName ?? data.contact.name;
  const range = from || to ? `${from ?? "start"} to ${to ?? "end"}` : "all dates";
  return `Statement ${name} (${range})`;
}

function parseBoundaryDate(value: string | undefined, endOfDay: boolean): Date | undefined {
  if (!value) {
    return undefined;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new BadRequestException("Statement dates must use YYYY-MM-DD.");
  }

  const parts = value.split("-").map(Number);
  const [year, month, day] = parts as [number, number, number];
  const date = new Date(
    Date.UTC(year, month - 1, day, endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0),
  );

  if (
    Number.isNaN(date.getTime()) ||
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new BadRequestException("Statement dates must be valid dates.");
  }

  return date;
}
