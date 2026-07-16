import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { toMoney } from "@ledgerbyte/accounting-core";
import { CustomerStatementPdfData, renderCustomerStatementPdf } from "@ledgerbyte/pdf-core";
import {
  CashExpenseStatus,
  ContactType,
  CreditNoteStatus,
  CustomerPaymentStatus,
  CustomerRefundSourceType,
  CustomerRefundStatus,
  DocumentType,
  PurchaseBillStatus,
  PurchaseDebitNoteStatus,
  PurchaseReturnStatus,
  SalesInvoiceStatus,
  SupplierPaymentStatus,
  SupplierRefundSourceType,
  SupplierRefundStatus,
  Prisma,
} from "@prisma/client";
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
  | "CUSTOMER_PAYMENT_UNAPPLIED_ALLOCATION"
  | "CUSTOMER_PAYMENT_UNAPPLIED_ALLOCATION_REVERSAL"
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
  sourceType:
    | "SalesInvoice"
    | "CreditNote"
    | "CreditNoteAllocation"
    | "CustomerPayment"
    | "CustomerPaymentAllocation"
    | "CustomerPaymentUnappliedAllocation"
    | "CustomerRefund";
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
  baseCurrency?: string;
}

export type SupplierLedgerRowType =
  | "PURCHASE_BILL"
  | "PURCHASE_DEBIT_NOTE"
  | "VOID_PURCHASE_DEBIT_NOTE"
  | "PURCHASE_DEBIT_NOTE_ALLOCATION"
  | "PURCHASE_DEBIT_NOTE_ALLOCATION_REVERSAL"
  | "PURCHASE_RETURN"
  | "SUPPLIER_PAYMENT"
  | "SUPPLIER_PAYMENT_UNAPPLIED_ALLOCATION"
  | "SUPPLIER_PAYMENT_UNAPPLIED_ALLOCATION_REVERSAL"
  | "SUPPLIER_REFUND"
  | "VOID_SUPPLIER_REFUND"
  | "CASH_EXPENSE"
  | "VOID_SUPPLIER_PAYMENT"
  | "VOID_PURCHASE_BILL";

export interface SupplierLedgerRow {
  id: string;
  type: SupplierLedgerRowType;
  date: string;
  number: string;
  description: string;
  debit: string;
  credit: string;
  balance: string;
  sourceType:
    | "PurchaseBill"
    | "PurchaseDebitNote"
    | "PurchaseDebitNoteAllocation"
    | "PurchaseReturn"
    | "SupplierPayment"
    | "SupplierPaymentUnappliedAllocation"
    | "SupplierRefund"
    | "CashExpense";
  sourceId: string;
  status: string;
  metadata: Record<string, unknown>;
}

export interface SupplierLedgerResponse {
  contact: CustomerLedgerContact;
  openingBalance: string;
  closingBalance: string;
  rows: SupplierLedgerRow[];
}

export interface SupplierStatementResponse extends SupplierLedgerResponse {
  periodFrom: string | null;
  periodTo: string | null;
  baseCurrency?: string;
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
  currency?: string;
  baseCurrency?: string;
  exchangeRate?: unknown | null;
  transactionTotal?: unknown;
  balanceDue?: unknown;
  transactionBalanceDue?: unknown;
  rateSnapshotId?: string | null;
  fxMonetaryBalance?: {
    carryingBaseAmount: unknown;
    carryingRate: unknown;
    rateSnapshotId: string;
    lastRevaluationLineId: string;
  } | null;
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

export interface LedgerPaymentUnappliedAllocationInput {
  id: string;
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
  unappliedAllocations?: LedgerPaymentUnappliedAllocationInput[];
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

export interface LedgerPurchaseBillInput {
  id: string;
  billNumber: string;
  billDate: Date | string;
  dueDate?: Date | string | null;
  total: unknown;
  balanceDue: unknown;
  status: string;
  journalEntryId: string | null;
  reversalJournalEntryId?: string | null;
  finalizedAt?: Date | string | null;
  updatedAt: Date | string;
  createdAt: Date | string;
  currency?: string;
  baseCurrency?: string;
  exchangeRate?: unknown | null;
  transactionTotal?: unknown;
  transactionBalanceDue?: unknown;
  rateSnapshotId?: string | null;
  fxMonetaryBalance?: {
    carryingBaseAmount: unknown;
    carryingRate: unknown;
    rateSnapshotId: string;
    lastRevaluationLineId: string;
  } | null;
}

export interface LedgerSupplierPaymentInput {
  id: string;
  paymentNumber: string;
  paymentDate: Date | string;
  status: string;
  amountPaid: unknown;
  unappliedAmount: unknown;
  description?: string | null;
  postedAt?: Date | string | null;
  voidedAt?: Date | string | null;
  updatedAt: Date | string;
  createdAt: Date | string;
  allocations?: Array<{
    id: string;
    billId: string;
    amountApplied: unknown;
    bill?: {
      id: string;
      billNumber: string;
      billDate: Date | string;
      total: unknown;
      balanceDue: unknown;
      status: string;
    } | null;
  }>;
  unappliedAllocations?: Array<{
    id: string;
    billId: string;
    amountApplied: unknown;
    createdAt: Date | string;
    reversedAt?: Date | string | null;
    reversalReason?: string | null;
    bill?: {
      id: string;
      billNumber: string;
      billDate: Date | string;
      total: unknown;
      balanceDue: unknown;
      status: string;
    } | null;
  }>;
}

export interface LedgerPurchaseDebitNoteInput {
  id: string;
  debitNoteNumber: string;
  issueDate: Date | string;
  total: unknown;
  unappliedAmount: unknown;
  status: string;
  journalEntryId: string | null;
  reversalJournalEntryId?: string | null;
  originalBillId?: string | null;
  finalizedAt?: Date | string | null;
  updatedAt: Date | string;
  createdAt: Date | string;
}

export interface LedgerPurchaseDebitNoteAllocationInput {
  id: string;
  debitNoteId: string;
  billId: string;
  amountApplied: unknown;
  createdAt: Date | string;
  reversedAt?: Date | string | null;
  reversalReason?: string | null;
  bill?: {
    id: string;
    billNumber: string;
    billDate: Date | string;
    total: unknown;
    balanceDue: unknown;
    status: string;
  } | null;
  debitNote?: {
    id: string;
    debitNoteNumber: string;
    issueDate: Date | string;
    total: unknown;
    unappliedAmount: unknown;
    status: string;
  } | null;
}

export interface LedgerSupplierRefundInput {
  id: string;
  refundNumber: string;
  refundDate: Date | string;
  sourceType: SupplierRefundSourceType | string;
  sourcePaymentId?: string | null;
  sourceDebitNoteId?: string | null;
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
  sourceDebitNote?: {
    id: string;
    debitNoteNumber: string;
  } | null;
}

export interface LedgerCashExpenseInput {
  id: string;
  expenseNumber: string;
  expenseDate: Date | string;
  status: string;
  total: unknown;
  description?: string | null;
  paidThroughAccountId: string;
  journalEntryId: string | null;
  postedAt?: Date | string | null;
  voidedAt?: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  paidThroughAccount?: {
    id: string;
    code: string;
    name: string;
  } | null;
}

export interface LedgerPurchaseReturnInput {
  id: string;
  purchaseReturnNumber: string;
  returnDate: Date | string;
  status: PurchaseReturnStatus | string;
  reason?: string | null;
  reference?: string | null;
  sourcePurchaseBillId?: string | null;
  sourcePurchaseOrderId?: string | null;
  sourcePurchaseReceiptId?: string | null;
  sourceMatchingReviewId?: string | null;
  relatedPurchaseDebitNoteId?: string | null;
  relatedSupplierRefundId?: string | null;
  completedAt?: Date | string | null;
  voidedAt?: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  lines?: Array<{ id: string }>;
}

interface PendingSupplierLedgerRow extends Omit<SupplierLedgerRow, "balance"> {
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
          balanceDue: true,
          currency: true,
          baseCurrency: true,
          exchangeRate: true,
          transactionTotal: true,
          transactionBalanceDue: true,
          rateSnapshotId: true,
          fxMonetaryBalance: {
            select: { carryingBaseAmount: true, carryingRate: true, rateSnapshotId: true, lastRevaluationLineId: true },
          },
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
          unappliedAllocations: {
            select: {
              id: true,
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
    const organization = await this.prisma.organization.findFirst({ where: { id: organizationId }, select: { baseCurrency: true } });

    return {
      contact: ledger.contact,
      periodFrom: from ?? null,
      periodTo: to ?? null,
      baseCurrency: organization?.baseCurrency,
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
        fxEvidence: statementPdfFxEvidence(row.metadata),
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
    precomputedData?: CustomerStatementPdfData,
  ): Promise<{ data: CustomerStatementPdfData; buffer: Buffer; filename: string; document: unknown | null }> {
    const data = precomputedData ?? await this.statementPdfData(organizationId, contactId, from, to);
    const settings = await this.documentSettingsService?.statementRenderSettings(organizationId);
    const buffer = await renderCustomerStatementPdf(data, settings);
    const filename = statementFilename(data, from, to);
    const accountingContext = statementArchiveAccountingContext("CUSTOMER_STATEMENT", data);
    const document = await this.generatedDocumentService?.archivePdf({
      organizationId,
      documentType: DocumentType.CUSTOMER_STATEMENT,
      sourceType: "CustomerStatement",
      sourceId: customerStatementSourceId(contactId, data),
      documentNumber: statementDocumentNumber(data, from, to),
      filename,
      buffer,
      generatedById: actorUserId,
      accountingContext: accountingContext as unknown as Prisma.InputJsonObject,
    });
    return { data, buffer, filename, document: document ?? null };
  }

  async generateStatementPdf(organizationId: string, actorUserId: string, contactId: string, from?: string, to?: string) {
    const { document } = await this.statementPdf(organizationId, actorUserId, contactId, from, to);
    return document;
  }

  async supplierLedger(organizationId: string, contactId: string): Promise<SupplierLedgerResponse> {
    const contact = await this.findSupplierContact(organizationId, contactId);
    const [bills, debitNotes, debitNoteAllocations, purchaseReturns, payments, refunds, cashExpenses] = await Promise.all([
      this.prisma.purchaseBill.findMany({
        where: {
          organizationId,
          supplierId: contactId,
          status: { in: [PurchaseBillStatus.FINALIZED, PurchaseBillStatus.VOIDED] },
          journalEntryId: { not: null },
        },
        select: {
          id: true,
          billNumber: true,
          billDate: true,
          dueDate: true,
          total: true,
          balanceDue: true,
          currency: true,
          baseCurrency: true,
          exchangeRate: true,
          transactionTotal: true,
          transactionBalanceDue: true,
          rateSnapshotId: true,
          fxMonetaryBalance: {
            select: { carryingBaseAmount: true, carryingRate: true, rateSnapshotId: true, lastRevaluationLineId: true },
          },
          status: true,
          journalEntryId: true,
          reversalJournalEntryId: true,
          finalizedAt: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.purchaseDebitNote.findMany({
        where: {
          organizationId,
          supplierId: contactId,
          status: { in: [PurchaseDebitNoteStatus.FINALIZED, PurchaseDebitNoteStatus.VOIDED] },
          journalEntryId: { not: null },
        },
        select: {
          id: true,
          debitNoteNumber: true,
          issueDate: true,
          total: true,
          unappliedAmount: true,
          status: true,
          journalEntryId: true,
          reversalJournalEntryId: true,
          originalBillId: true,
          finalizedAt: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.purchaseDebitNoteAllocation.findMany({
        where: {
          organizationId,
          debitNote: {
            supplierId: contactId,
            status: { in: [PurchaseDebitNoteStatus.FINALIZED, PurchaseDebitNoteStatus.VOIDED] },
          },
        },
        select: {
          id: true,
          debitNoteId: true,
          billId: true,
          amountApplied: true,
          createdAt: true,
          reversedAt: true,
          reversalReason: true,
          bill: {
            select: {
              id: true,
              billNumber: true,
              billDate: true,
              total: true,
              balanceDue: true,
              status: true,
            },
          },
          debitNote: {
            select: {
              id: true,
              debitNoteNumber: true,
              issueDate: true,
              total: true,
              unappliedAmount: true,
              status: true,
            },
          },
        },
      }),
      this.prisma.purchaseReturn.findMany({
        where: {
          organizationId,
          supplierId: contactId,
        },
        select: {
          id: true,
          purchaseReturnNumber: true,
          returnDate: true,
          status: true,
          reason: true,
          reference: true,
          sourcePurchaseBillId: true,
          sourcePurchaseOrderId: true,
          sourcePurchaseReceiptId: true,
          sourceMatchingReviewId: true,
          relatedPurchaseDebitNoteId: true,
          relatedSupplierRefundId: true,
          completedAt: true,
          voidedAt: true,
          createdAt: true,
          updatedAt: true,
          lines: { select: { id: true } },
        },
      }),
      this.prisma.supplierPayment.findMany({
        where: {
          organizationId,
          supplierId: contactId,
          status: { in: [SupplierPaymentStatus.POSTED, SupplierPaymentStatus.VOIDED] },
        },
        select: {
          id: true,
          paymentNumber: true,
          paymentDate: true,
          status: true,
          amountPaid: true,
          unappliedAmount: true,
          description: true,
          postedAt: true,
          voidedAt: true,
          createdAt: true,
          updatedAt: true,
          allocations: {
            select: {
              id: true,
              billId: true,
              amountApplied: true,
              bill: {
                select: {
                  id: true,
                  billNumber: true,
                  billDate: true,
                  total: true,
                  balanceDue: true,
                  status: true,
                },
              },
            },
          },
          unappliedAllocations: {
            select: {
              id: true,
              billId: true,
              amountApplied: true,
              createdAt: true,
              reversedAt: true,
              reversalReason: true,
              bill: {
                select: {
                  id: true,
                  billNumber: true,
                  billDate: true,
                  total: true,
                  balanceDue: true,
                  status: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.supplierRefund.findMany({
        where: {
          organizationId,
          supplierId: contactId,
          status: { in: [SupplierRefundStatus.POSTED, SupplierRefundStatus.VOIDED] },
        },
        select: {
          id: true,
          refundNumber: true,
          refundDate: true,
          sourceType: true,
          sourcePaymentId: true,
          sourceDebitNoteId: true,
          status: true,
          amountRefunded: true,
          description: true,
          postedAt: true,
          voidedAt: true,
          createdAt: true,
          updatedAt: true,
          sourcePayment: { select: { id: true, paymentNumber: true } },
          sourceDebitNote: { select: { id: true, debitNoteNumber: true } },
        },
      }),
      this.prisma.cashExpense.findMany({
        where: {
          organizationId,
          contactId,
          status: { in: [CashExpenseStatus.POSTED, CashExpenseStatus.VOIDED] },
          journalEntryId: { not: null },
        },
        select: {
          id: true,
          expenseNumber: true,
          expenseDate: true,
          status: true,
          total: true,
          description: true,
          paidThroughAccountId: true,
          journalEntryId: true,
          postedAt: true,
          voidedAt: true,
          createdAt: true,
          updatedAt: true,
          paidThroughAccount: { select: { id: true, code: true, name: true } },
        },
      }),
    ]);

    const rows = buildSupplierLedgerRows({ bills, debitNotes, debitNoteAllocations, purchaseReturns, payments, refunds, cashExpenses });
    return {
      contact,
      openingBalance: "0.0000",
      closingBalance: rows.at(-1)?.balance ?? "0.0000",
      rows,
    };
  }

  async supplierStatement(organizationId: string, contactId: string, from?: string, to?: string): Promise<SupplierStatementResponse> {
    const ledger = await this.supplierLedger(organizationId, contactId);
    const fromDate = parseBoundaryDate(from, false);
    const toDate = parseBoundaryDate(to, true);
    const openingBalance = calculateSupplierStatementOpeningBalance(ledger.rows, fromDate);
    const rowsInPeriod = filterSupplierStatementRows(ledger.rows, fromDate, toDate);
    const rows = calculateSupplierRunningBalance(rowsInPeriod, openingBalance);
    const organization = await this.prisma.organization.findFirst({ where: { id: organizationId }, select: { baseCurrency: true } });

    return {
      contact: ledger.contact,
      periodFrom: from ?? null,
      periodTo: to ?? null,
      baseCurrency: organization?.baseCurrency,
      openingBalance,
      closingBalance: rows.at(-1)?.balance ?? openingBalance,
      rows,
    };
  }

  async supplierStatementPdfData(organizationId: string, contactId: string, from?: string, to?: string): Promise<CustomerStatementPdfData> {
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
      this.supplierStatement(organizationId, contactId, from, to),
    ]);

    if (!organization) {
      throw new NotFoundException("Organization not found.");
    }

    return {
      organization,
      contact: statement.contact,
      contactLabel: "Supplier",
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
        fxEvidence: statementPdfFxEvidence(row.metadata),
      })),
      generatedAt: new Date(),
    };
  }

  async supplierStatementPdf(
    organizationId: string,
    actorUserId: string,
    contactId: string,
    from?: string,
    to?: string,
  ): Promise<{ data: CustomerStatementPdfData; buffer: Buffer; filename: string; document: unknown | null }> {
    const data = await this.supplierStatementPdfData(organizationId, contactId, from, to);
    const settings = await this.documentSettingsService?.statementRenderSettings(organizationId);
    const renderSettings = settings ? { ...settings, title: supplierStatementTitle(settings.title ?? "Supplier Statement") } : { title: "Supplier Statement" };
    const buffer = await renderCustomerStatementPdf(data, renderSettings);
    const filename = supplierStatementFilename(data, from, to);
    const accountingContext = statementArchiveAccountingContext("SUPPLIER_STATEMENT", data);
    const document = await this.generatedDocumentService?.archivePdf({
      organizationId,
      documentType: DocumentType.SUPPLIER_STATEMENT,
      sourceType: "SupplierStatement",
      sourceId: statementSourceId("supplier-statement", contactId, data),
      documentNumber: supplierStatementDocumentNumber(data, from, to),
      filename,
      buffer,
      generatedById: actorUserId,
      accountingContext: accountingContext as unknown as Prisma.InputJsonObject,
    });
    return { data, buffer, filename, document: document ?? null };
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

  private async findSupplierContact(organizationId: string, contactId: string): Promise<CustomerLedgerContact> {
    const contact = await this.prisma.contact.findFirst({
      where: {
        id: contactId,
        organizationId,
        type: { in: [ContactType.SUPPLIER, ContactType.BOTH] },
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
      throw new NotFoundException("Supplier contact not found.");
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
        ...documentFxLedgerMetadata(invoice),
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

    for (const allocation of payment.unappliedAllocations ?? []) {
      const invoiceNumber = allocation.invoice?.invoiceNumber ?? allocation.invoiceId;
      pendingRows.push({
        id: `${allocation.id}:payment-unapplied-allocation`,
        type: "CUSTOMER_PAYMENT_UNAPPLIED_ALLOCATION",
        date: toIsoString(allocation.createdAt),
        createdAt: toIsoString(allocation.createdAt),
        number: `${payment.paymentNumber} -> ${invoiceNumber}`,
        description: `Unapplied payment ${payment.paymentNumber} applied to ${invoiceNumber}`,
        debit: "0.0000",
        credit: "0.0000",
        sourceType: "CustomerPaymentUnappliedAllocation",
        sourceId: allocation.id,
        status: allocation.reversedAt ? "REVERSED" : "ACTIVE",
        metadata: {
          paymentId: payment.id,
          paymentNumber: payment.paymentNumber,
          invoiceId: allocation.invoiceId,
          invoiceNumber: allocation.invoice?.invoiceNumber ?? null,
          amountApplied: moneyString(allocation.amountApplied),
          reversedAt: allocation.reversedAt ? toIsoString(allocation.reversedAt) : null,
          reversalReason: allocation.reversalReason ?? null,
        },
      });

      if (allocation.reversedAt) {
        pendingRows.push({
          id: `${allocation.id}:payment-unapplied-allocation-reversal`,
          type: "CUSTOMER_PAYMENT_UNAPPLIED_ALLOCATION_REVERSAL",
          date: toIsoString(allocation.reversedAt),
          createdAt: toIsoString(allocation.reversedAt),
          number: `${payment.paymentNumber} -> ${invoiceNumber}`,
          description: `Reversed unapplied payment ${payment.paymentNumber} allocation from ${invoiceNumber}`,
          debit: "0.0000",
          credit: "0.0000",
          sourceType: "CustomerPaymentUnappliedAllocation",
          sourceId: allocation.id,
          status: "REVERSED",
          metadata: {
            paymentId: payment.id,
            paymentNumber: payment.paymentNumber,
            invoiceId: allocation.invoiceId,
            invoiceNumber: allocation.invoice?.invoiceNumber ?? null,
            amountApplied: moneyString(allocation.amountApplied),
            reversedAt: toIsoString(allocation.reversedAt),
            reversalReason: allocation.reversalReason ?? null,
          },
        });
      }
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

export function buildSupplierLedgerRows(input: {
  bills: LedgerPurchaseBillInput[];
  debitNotes?: LedgerPurchaseDebitNoteInput[];
  debitNoteAllocations?: LedgerPurchaseDebitNoteAllocationInput[];
  purchaseReturns?: LedgerPurchaseReturnInput[];
  payments: LedgerSupplierPaymentInput[];
  refunds?: LedgerSupplierRefundInput[];
  cashExpenses?: LedgerCashExpenseInput[];
}): SupplierLedgerRow[] {
  const pendingRows: PendingSupplierLedgerRow[] = [];

  for (const bill of input.bills) {
    pendingRows.push({
      id: `${bill.id}:purchase-bill`,
      type: "PURCHASE_BILL",
      date: toIsoString(bill.billDate),
      createdAt: toIsoString(bill.createdAt),
      number: bill.billNumber,
      description: `Purchase bill ${bill.billNumber}`,
      debit: "0.0000",
      credit: moneyString(bill.total),
      sourceType: "PurchaseBill",
      sourceId: bill.id,
      status: bill.status,
      metadata: {
        billId: bill.id,
        dueDate: bill.dueDate ? toIsoString(bill.dueDate) : null,
        balanceDue: moneyString(bill.balanceDue),
        journalEntryId: bill.journalEntryId,
        finalizedAt: bill.finalizedAt ? toIsoString(bill.finalizedAt) : null,
        ...documentFxLedgerMetadata(bill),
      },
    });

    if (bill.status === PurchaseBillStatus.VOIDED) {
      pendingRows.push({
        id: `${bill.id}:void`,
        type: "VOID_PURCHASE_BILL",
        date: toIsoString(bill.updatedAt),
        createdAt: toIsoString(bill.updatedAt),
        number: bill.billNumber,
        description: `Void purchase bill ${bill.billNumber}`,
        debit: moneyString(bill.total),
        credit: "0.0000",
        sourceType: "PurchaseBill",
        sourceId: bill.id,
        status: bill.status,
        metadata: {
          billId: bill.id,
          reversalJournalEntryId: bill.reversalJournalEntryId ?? null,
        },
      });
    }
  }

  for (const debitNote of input.debitNotes ?? []) {
    pendingRows.push({
      id: `${debitNote.id}:purchase-debit-note`,
      type: "PURCHASE_DEBIT_NOTE",
      date: toIsoString(debitNote.issueDate),
      createdAt: toIsoString(debitNote.createdAt),
      number: debitNote.debitNoteNumber,
      description: `Purchase debit note ${debitNote.debitNoteNumber}`,
      debit: moneyString(debitNote.total),
      credit: "0.0000",
      sourceType: "PurchaseDebitNote",
      sourceId: debitNote.id,
      status: debitNote.status,
      metadata: {
        debitNoteId: debitNote.id,
        journalEntryId: debitNote.journalEntryId,
        originalBillId: debitNote.originalBillId ?? null,
        unappliedAmount: moneyString(debitNote.unappliedAmount),
        finalizedAt: debitNote.finalizedAt ? toIsoString(debitNote.finalizedAt) : null,
      },
    });

    if (debitNote.status === PurchaseDebitNoteStatus.VOIDED) {
      pendingRows.push({
        id: `${debitNote.id}:void`,
        type: "VOID_PURCHASE_DEBIT_NOTE",
        date: toIsoString(debitNote.updatedAt),
        createdAt: toIsoString(debitNote.updatedAt),
        number: debitNote.debitNoteNumber,
        description: `Void purchase debit note ${debitNote.debitNoteNumber}`,
        debit: "0.0000",
        credit: moneyString(debitNote.total),
        sourceType: "PurchaseDebitNote",
        sourceId: debitNote.id,
        status: debitNote.status,
        metadata: {
          debitNoteId: debitNote.id,
          reversalJournalEntryId: debitNote.reversalJournalEntryId ?? null,
          originalBillId: debitNote.originalBillId ?? null,
        },
      });
    }
  }

  for (const allocation of input.debitNoteAllocations ?? []) {
    const debitNoteNumber = allocation.debitNote?.debitNoteNumber ?? allocation.debitNoteId;
    const billNumber = allocation.bill?.billNumber ?? allocation.billId;
    pendingRows.push({
      id: `${allocation.id}:purchase-debit-note-allocation`,
      type: "PURCHASE_DEBIT_NOTE_ALLOCATION",
      date: toIsoString(allocation.createdAt),
      createdAt: toIsoString(allocation.createdAt),
      number: `${debitNoteNumber} -> ${billNumber}`,
      description: `Purchase debit note ${debitNoteNumber} applied to ${billNumber}`,
      debit: "0.0000",
      credit: "0.0000",
      sourceType: "PurchaseDebitNoteAllocation",
      sourceId: allocation.id,
      status: allocation.reversedAt ? "REVERSED" : "ACTIVE",
      metadata: {
        debitNoteId: allocation.debitNoteId,
        debitNoteNumber: allocation.debitNote?.debitNoteNumber ?? null,
        billId: allocation.billId,
        billNumber: allocation.bill?.billNumber ?? null,
        amountApplied: moneyString(allocation.amountApplied),
        reversedAt: allocation.reversedAt ? toIsoString(allocation.reversedAt) : null,
        reversalReason: allocation.reversalReason ?? null,
      },
    });

    if (allocation.reversedAt) {
      pendingRows.push({
        id: `${allocation.id}:purchase-debit-note-allocation-reversal`,
        type: "PURCHASE_DEBIT_NOTE_ALLOCATION_REVERSAL",
        date: toIsoString(allocation.reversedAt),
        createdAt: toIsoString(allocation.reversedAt),
        number: `${debitNoteNumber} -> ${billNumber}`,
        description: `Reversed purchase debit note ${debitNoteNumber} allocation from ${billNumber}`,
        debit: "0.0000",
        credit: "0.0000",
        sourceType: "PurchaseDebitNoteAllocation",
        sourceId: allocation.id,
        status: "REVERSED",
        metadata: {
          debitNoteId: allocation.debitNoteId,
          debitNoteNumber: allocation.debitNote?.debitNoteNumber ?? null,
          billId: allocation.billId,
          billNumber: allocation.bill?.billNumber ?? null,
          amountApplied: moneyString(allocation.amountApplied),
          reversedAt: toIsoString(allocation.reversedAt),
          reversalReason: allocation.reversalReason ?? null,
        },
      });
    }
  }

  for (const purchaseReturn of input.purchaseReturns ?? []) {
    pendingRows.push({
      id: `${purchaseReturn.id}:purchase-return`,
      type: "PURCHASE_RETURN",
      date: toIsoString(purchaseReturn.returnDate),
      createdAt: toIsoString(purchaseReturn.createdAt),
      number: purchaseReturn.purchaseReturnNumber,
      description: purchaseReturn.reason?.trim() || `Purchase return ${purchaseReturn.purchaseReturnNumber}`,
      debit: "0.0000",
      credit: "0.0000",
      sourceType: "PurchaseReturn",
      sourceId: purchaseReturn.id,
      status: purchaseReturn.status,
      metadata: {
        purchaseReturnId: purchaseReturn.id,
        reference: purchaseReturn.reference ?? null,
        sourcePurchaseBillId: purchaseReturn.sourcePurchaseBillId ?? null,
        sourcePurchaseOrderId: purchaseReturn.sourcePurchaseOrderId ?? null,
        sourcePurchaseReceiptId: purchaseReturn.sourcePurchaseReceiptId ?? null,
        sourceMatchingReviewId: purchaseReturn.sourceMatchingReviewId ?? null,
        relatedPurchaseDebitNoteId: purchaseReturn.relatedPurchaseDebitNoteId ?? null,
        relatedSupplierRefundId: purchaseReturn.relatedSupplierRefundId ?? null,
        completedAt: purchaseReturn.completedAt ? toIsoString(purchaseReturn.completedAt) : null,
        voidedAt: purchaseReturn.voidedAt ? toIsoString(purchaseReturn.voidedAt) : null,
        lineCount: purchaseReturn.lines?.length ?? 0,
        nonPosting: true,
      },
    });
  }

  for (const payment of input.payments) {
    pendingRows.push({
      id: `${payment.id}:supplier-payment`,
      type: "SUPPLIER_PAYMENT",
      date: toIsoString(payment.paymentDate),
      createdAt: toIsoString(payment.createdAt),
      number: payment.paymentNumber,
      description: payment.description?.trim() || `Supplier payment ${payment.paymentNumber}`,
      debit: moneyString(payment.amountPaid),
      credit: "0.0000",
      sourceType: "SupplierPayment",
      sourceId: payment.id,
      status: payment.status,
      metadata: {
        paymentId: payment.id,
        unappliedAmount: moneyString(payment.unappliedAmount),
        allocations:
          payment.allocations?.map((allocation) => ({
            id: allocation.id,
            billId: allocation.billId,
            billNumber: allocation.bill?.billNumber ?? null,
            amountApplied: moneyString(allocation.amountApplied),
          })) ?? [],
      },
    });

    for (const allocation of payment.unappliedAllocations ?? []) {
      const billNumber = allocation.bill?.billNumber ?? allocation.billId;
      pendingRows.push({
        id: `${allocation.id}:supplier-payment-unapplied-allocation`,
        type: "SUPPLIER_PAYMENT_UNAPPLIED_ALLOCATION",
        date: toIsoString(allocation.createdAt),
        createdAt: toIsoString(allocation.createdAt),
        number: `${payment.paymentNumber} -> ${billNumber}`,
        description: `Unapplied supplier payment ${payment.paymentNumber} applied to ${billNumber}`,
        debit: "0.0000",
        credit: "0.0000",
        sourceType: "SupplierPaymentUnappliedAllocation",
        sourceId: allocation.id,
        status: allocation.reversedAt ? "REVERSED" : "ACTIVE",
        metadata: {
          paymentId: payment.id,
          paymentNumber: payment.paymentNumber,
          billId: allocation.billId,
          billNumber: allocation.bill?.billNumber ?? null,
          amountApplied: moneyString(allocation.amountApplied),
          reversedAt: allocation.reversedAt ? toIsoString(allocation.reversedAt) : null,
          reversalReason: allocation.reversalReason ?? null,
        },
      });

      if (allocation.reversedAt) {
        pendingRows.push({
          id: `${allocation.id}:supplier-payment-unapplied-allocation-reversal`,
          type: "SUPPLIER_PAYMENT_UNAPPLIED_ALLOCATION_REVERSAL",
          date: toIsoString(allocation.reversedAt),
          createdAt: toIsoString(allocation.reversedAt),
          number: `${payment.paymentNumber} -> ${billNumber}`,
          description: `Reversed unapplied supplier payment ${payment.paymentNumber} allocation from ${billNumber}`,
          debit: "0.0000",
          credit: "0.0000",
          sourceType: "SupplierPaymentUnappliedAllocation",
          sourceId: allocation.id,
          status: "REVERSED",
          metadata: {
            paymentId: payment.id,
            paymentNumber: payment.paymentNumber,
            billId: allocation.billId,
            billNumber: allocation.bill?.billNumber ?? null,
            amountApplied: moneyString(allocation.amountApplied),
            reversedAt: toIsoString(allocation.reversedAt),
            reversalReason: allocation.reversalReason ?? null,
          },
        });
      }
    }

    if (payment.status === SupplierPaymentStatus.VOIDED) {
      pendingRows.push({
        id: `${payment.id}:void`,
        type: "VOID_SUPPLIER_PAYMENT",
        date: toIsoString(payment.voidedAt ?? payment.updatedAt),
        createdAt: toIsoString(payment.updatedAt),
        number: payment.paymentNumber,
        description: `Void supplier payment ${payment.paymentNumber}`,
        debit: "0.0000",
        credit: moneyString(payment.amountPaid),
        sourceType: "SupplierPayment",
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
      refund.sourceType === SupplierRefundSourceType.SUPPLIER_PAYMENT
        ? refund.sourcePayment?.paymentNumber ?? refund.sourcePaymentId ?? "-"
        : refund.sourceDebitNote?.debitNoteNumber ?? refund.sourceDebitNoteId ?? "-";
    pendingRows.push({
      id: `${refund.id}:supplier-refund`,
      type: "SUPPLIER_REFUND",
      date: toIsoString(refund.refundDate),
      createdAt: toIsoString(refund.createdAt),
      number: refund.refundNumber,
      description: refund.description?.trim() || `Supplier refund ${refund.refundNumber}`,
      debit: "0.0000",
      credit: moneyString(refund.amountRefunded),
      sourceType: "SupplierRefund",
      sourceId: refund.id,
      status: refund.status,
      metadata: {
        refundId: refund.id,
        sourceType: refund.sourceType,
        sourcePaymentId: refund.sourcePaymentId ?? null,
        sourceDebitNoteId: refund.sourceDebitNoteId ?? null,
        sourceNumber,
        amountRefunded: moneyString(refund.amountRefunded),
        postedAt: refund.postedAt ? toIsoString(refund.postedAt) : null,
      },
    });

    if (refund.status === SupplierRefundStatus.VOIDED) {
      pendingRows.push({
        id: `${refund.id}:void`,
        type: "VOID_SUPPLIER_REFUND",
        date: toIsoString(refund.voidedAt ?? refund.updatedAt),
        createdAt: toIsoString(refund.updatedAt),
        number: refund.refundNumber,
        description: `Void supplier refund ${refund.refundNumber}`,
        debit: moneyString(refund.amountRefunded),
        credit: "0.0000",
        sourceType: "SupplierRefund",
        sourceId: refund.id,
        status: refund.status,
        metadata: {
          refundId: refund.id,
          sourceType: refund.sourceType,
          sourcePaymentId: refund.sourcePaymentId ?? null,
          sourceDebitNoteId: refund.sourceDebitNoteId ?? null,
          sourceNumber,
          amountRefunded: moneyString(refund.amountRefunded),
        },
      });
    }
  }

  for (const expense of input.cashExpenses ?? []) {
    pendingRows.push({
      id: `${expense.id}:cash-expense`,
      type: "CASH_EXPENSE",
      date: toIsoString(expense.expenseDate),
      createdAt: toIsoString(expense.createdAt),
      number: expense.expenseNumber,
      description: expense.description?.trim() || `Cash expense ${expense.expenseNumber} paid immediately`,
      debit: "0.0000",
      credit: "0.0000",
      sourceType: "CashExpense",
      sourceId: expense.id,
      status: expense.status,
      metadata: {
        cashExpenseId: expense.id,
        total: moneyString(expense.total),
        paidThroughAccountId: expense.paidThroughAccountId,
        paidThroughAccountCode: expense.paidThroughAccount?.code ?? null,
        paidThroughAccountName: expense.paidThroughAccount?.name ?? null,
        journalEntryId: expense.journalEntryId,
        postedAt: expense.postedAt ? toIsoString(expense.postedAt) : null,
        voidedAt: expense.voidedAt ? toIsoString(expense.voidedAt) : null,
      },
    });
  }

  return calculateSupplierRunningBalance(sortSupplierLedgerRows(pendingRows), "0.0000");
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

export function calculateSupplierRunningBalance(rows: Array<Omit<SupplierLedgerRow, "balance">>, openingBalance = "0.0000"): SupplierLedgerRow[] {
  let balance = toMoney(openingBalance);
  return rows.map((row) => {
    balance = balance.plus(row.credit).minus(row.debit);
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

export function calculateSupplierStatementOpeningBalance(rows: SupplierLedgerRow[], fromDate?: Date): string {
  if (!fromDate) {
    return "0.0000";
  }

  return rows
    .filter((row) => new Date(row.date).getTime() < fromDate.getTime())
    .reduce((balance, row) => balance.plus(row.credit).minus(row.debit), toMoney(0))
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

export function filterSupplierStatementRows(rows: SupplierLedgerRow[], fromDate?: Date, toDate?: Date): Array<Omit<SupplierLedgerRow, "balance">> {
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

function sortSupplierLedgerRows(rows: PendingSupplierLedgerRow[]): PendingSupplierLedgerRow[] {
  return [...rows].sort((a, b) => {
    const dateDelta = new Date(a.date).getTime() - new Date(b.date).getTime();
    if (dateDelta !== 0) {
      return dateDelta;
    }

    const createdDelta = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    if (createdDelta !== 0) {
      return createdDelta;
    }

    return supplierRowPriority(a.type) - supplierRowPriority(b.type);
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
    case "CUSTOMER_PAYMENT_UNAPPLIED_ALLOCATION":
    case "CUSTOMER_PAYMENT_UNAPPLIED_ALLOCATION_REVERSAL":
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

function supplierRowPriority(type: SupplierLedgerRowType): number {
  switch (type) {
    case "PURCHASE_BILL":
    case "PURCHASE_DEBIT_NOTE":
    case "PURCHASE_RETURN":
    case "SUPPLIER_PAYMENT":
    case "SUPPLIER_REFUND":
    case "CASH_EXPENSE":
      return 0;
    case "PURCHASE_DEBIT_NOTE_ALLOCATION":
    case "PURCHASE_DEBIT_NOTE_ALLOCATION_REVERSAL":
    case "SUPPLIER_PAYMENT_UNAPPLIED_ALLOCATION":
    case "SUPPLIER_PAYMENT_UNAPPLIED_ALLOCATION_REVERSAL":
      return 1;
    case "VOID_SUPPLIER_PAYMENT":
    case "VOID_SUPPLIER_REFUND":
    case "VOID_PURCHASE_BILL":
    case "VOID_PURCHASE_DEBIT_NOTE":
      return 2;
  }
}

function documentFxLedgerMetadata(document: LedgerInvoiceInput | LedgerPurchaseBillInput): Record<string, unknown> {
  if (!document.currency || !document.baseCurrency) {
    return {};
  }
  const monetaryBalance = document.fxMonetaryBalance;
  return {
    currency: document.currency,
    baseCurrency: document.baseCurrency,
    exchangeRate: document.exchangeRate == null ? null : String(document.exchangeRate),
    transactionTotal: moneyString(document.transactionTotal ?? document.total),
    transactionBalanceDue: moneyString(document.transactionBalanceDue ?? document.balanceDue ?? document.total),
    sourceBaseBalanceDue: moneyString(document.balanceDue ?? document.total),
    carryingBaseAmount: moneyString(monetaryBalance?.carryingBaseAmount ?? document.balanceDue ?? document.total),
    carryingRate: String(monetaryBalance?.carryingRate ?? document.exchangeRate ?? "1"),
    rateSnapshotId: monetaryBalance?.rateSnapshotId ?? document.rateSnapshotId ?? null,
    lastRevaluationLineId: monetaryBalance?.lastRevaluationLineId ?? null,
  };
}

function moneyString(value: unknown): string {
  return toMoney(value === null || value === undefined ? 0 : String(value)).toFixed(4);
}

function toIsoString(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function statementPdfFxEvidence(metadata: Record<string, unknown>): CustomerStatementPdfData["rows"][number]["fxEvidence"] {
  const transactionCurrency = metadata.currency;
  const baseCurrency = metadata.baseCurrency;
  if (typeof transactionCurrency !== "string" || typeof baseCurrency !== "string" || transactionCurrency === baseCurrency) return null;
  const stringValue = (key: string, fallback: string) => typeof metadata[key] === "string" ? String(metadata[key]) : fallback;
  return {
    transactionCurrency,
    baseCurrency,
    transactionBalanceDue: stringValue("transactionBalanceDue", "0.0000"),
    sourceBaseBalanceDue: stringValue("sourceBaseBalanceDue", "0.0000"),
    carryingBaseAmount: stringValue("carryingBaseAmount", stringValue("sourceBaseBalanceDue", "0.0000")),
    carryingRate: stringValue("carryingRate", stringValue("exchangeRate", "1")),
    rateSnapshotId: typeof metadata.rateSnapshotId === "string" ? metadata.rateSnapshotId : null,
    lastRevaluationLineId: typeof metadata.lastRevaluationLineId === "string" ? metadata.lastRevaluationLineId : null,
  };
}

function statementArchiveAccountingContext(kind: "CUSTOMER_STATEMENT" | "SUPPLIER_STATEMENT", data: CustomerStatementPdfData) {
  const evidence = data.rows.flatMap((row) => row.fxEvidence ? [row.fxEvidence] : []);
  return {
    identityVersion: 1,
    statementKind: kind,
    baseCurrency: data.currency ?? null,
    amountBasis: "BASE_CURRENCY",
    dates: { from: data.periodFrom ?? null, to: data.periodTo ?? null },
    transactionCurrencies: [...new Set(evidence.map((row) => row.transactionCurrency))].sort(),
    rateSnapshotIds: [...new Set(evidence.flatMap((row) => row.rateSnapshotId ? [row.rateSnapshotId] : []))].sort(),
    revaluationLineIds: [...new Set(evidence.flatMap((row) => row.lastRevaluationLineId ? [row.lastRevaluationLineId] : []))].sort(),
  };
}

export function customerStatementSourceId(contactId: string, data: CustomerStatementPdfData) {
  return statementSourceId("customer-statement", contactId, data);
}

function statementSourceId(kind: "customer-statement" | "supplier-statement", contactId: string, data: CustomerStatementPdfData) {
  const context = statementArchiveAccountingContext(kind === "customer-statement" ? "CUSTOMER_STATEMENT" : "SUPPLIER_STATEMENT", data);
  const params = new URLSearchParams();
  if (context.baseCurrency) params.set("baseCurrency", context.baseCurrency);
  if (context.dates.from) params.set("from", context.dates.from);
  if (context.dates.to) params.set("to", context.dates.to);
  if (context.transactionCurrencies.length) params.set("transactionCurrencies", context.transactionCurrencies.join(","));
  if (context.rateSnapshotIds.length) params.set("rateSnapshotIds", context.rateSnapshotIds.join(","));
  if (context.revaluationLineIds.length) params.set("revaluationLineIds", context.revaluationLineIds.join(","));
  const suffix = params.toString();
  return suffix ? `${kind}:${contactId}?${suffix}` : `${kind}:${contactId}`;
}

function statementFilename(data: CustomerStatementPdfData, from?: string, to?: string): string {
  const name = data.contact.displayName ?? data.contact.name;
  const range = from && to ? `${from}-to-${to}` : "all";
  return sanitizeFilename(`statement-${name}-${range}.pdf`);
}

function supplierStatementFilename(data: CustomerStatementPdfData, from?: string, to?: string): string {
  const name = data.contact.displayName ?? data.contact.name;
  const range = from && to ? `${from}-to-${to}` : "all";
  return sanitizeFilename(`supplier-statement-${name}-${range}.pdf`);
}

function statementDocumentNumber(data: CustomerStatementPdfData, from?: string, to?: string): string {
  const name = data.contact.displayName ?? data.contact.name;
  const range = from || to ? `${from ?? "start"} to ${to ?? "end"}` : "all dates";
  return `Statement ${name} (${range})`;
}

function supplierStatementDocumentNumber(data: CustomerStatementPdfData, from?: string, to?: string): string {
  const name = data.contact.displayName ?? data.contact.name;
  const range = from || to ? `${from ?? "start"} to ${to ?? "end"}` : "all dates";
  return `Supplier Statement ${name} (${range})`;
}

function supplierStatementTitle(title: string): string {
  return /customer/i.test(title) ? title.replace(/customer/gi, "Supplier") : title;
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
