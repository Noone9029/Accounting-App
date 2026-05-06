import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { toMoney } from "@ledgerbyte/accounting-core";
import { ContactType, CustomerPaymentStatus, SalesInvoiceStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

export type CustomerLedgerRowType = "INVOICE" | "PAYMENT" | "PAYMENT_ALLOCATION" | "VOID_PAYMENT" | "VOID_INVOICE";

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
  sourceType: "SalesInvoice" | "CustomerPayment" | "CustomerPaymentAllocation";
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

interface PendingLedgerRow extends Omit<CustomerLedgerRow, "balance"> {
  createdAt: string;
}

@Injectable()
export class ContactLedgerService {
  constructor(private readonly prisma: PrismaService) {}

  async ledger(organizationId: string, contactId: string): Promise<CustomerLedgerResponse> {
    const contact = await this.findCustomerContact(organizationId, contactId);
    const [invoices, payments] = await Promise.all([
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
    ]);

    const rows = buildCustomerLedgerRows({ invoices, payments });
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

export function buildCustomerLedgerRows(input: { invoices: LedgerInvoiceInput[]; payments: LedgerPaymentInput[] }): CustomerLedgerRow[] {
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
    case "PAYMENT":
      return 0;
    case "PAYMENT_ALLOCATION":
      return 1;
    case "VOID_PAYMENT":
    case "VOID_INVOICE":
      return 2;
  }
}

function moneyString(value: unknown): string {
  return toMoney(value === null || value === undefined ? 0 : String(value)).toFixed(4);
}

function toIsoString(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function parseBoundaryDate(value: string | undefined, endOfDay: boolean): Date | undefined {
  if (!value) {
    return undefined;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new BadRequestException("Statement dates must use YYYY-MM-DD.");
  }

  const date = new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}Z`);
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException("Statement dates must be valid dates.");
  }

  return date;
}
