import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { toMoney } from "@ledgerbyte/accounting-core";
import { ContactType, PurchaseBillStatus, SalesInvoiceStatus } from "@prisma/client";
import { AuditLogService } from "../audit-log/audit-log.service";
import { PrismaService } from "../prisma/prisma.service";
import { contactIdentificationTypes, CreateContactDto } from "./dto/create-contact.dto";
import { UpdateContactDto } from "./dto/update-contact.dto";

const contactIdentificationRules: Record<(typeof contactIdentificationTypes)[number], { label: string; pattern: RegExp; hint: string }> = {
  CRN: { label: "Commercial Register (CR) Number", pattern: /^[0-9]{10}$/, hint: "10 digits" },
  MOM: { label: "MOMRA License", pattern: /^[A-Za-z0-9]{4,20}$/, hint: "4 to 20 letters or digits" },
  MLS: { label: "MLSD License", pattern: /^[A-Za-z0-9]{4,20}$/, hint: "4 to 20 letters or digits" },
  SAG: { label: "SAGIA License", pattern: /^[A-Za-z0-9]{4,20}$/, hint: "4 to 20 letters or digits" },
  NAT: { label: "National ID", pattern: /^1[0-9]{9}$/, hint: "10 digits starting with 1" },
  IQA: { label: "Iqama Number", pattern: /^2[0-9]{9}$/, hint: "10 digits starting with 2" },
  PAS: { label: "Passport ID", pattern: /^[A-Za-z0-9]{5,20}$/, hint: "5 to 20 letters or digits" },
  GCC: { label: "GCC ID", pattern: /^[A-Za-z0-9]{5,20}$/, hint: "5 to 20 letters or digits" },
  "700": { label: "700 Number", pattern: /^700[0-9]{7}$/, hint: "10 digits starting with 700" },
  OTH: { label: "Others", pattern: /^[A-Za-z0-9]{1,30}$/, hint: "1 to 30 letters or digits" },
};

export interface PartyContact {
  id: string;
  organizationId: string;
  type: ContactType;
  name: string;
  displayName: string | null;
  email: string | null;
  phone: string | null;
  taxNumber: string | null;
  identificationType: string | null;
  identificationNumber: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  buildingNumber: string | null;
  district: string | null;
  city: string | null;
  countryCode: string;
  postalCode: string | null;
  isActive: boolean;
}

export type PartyTransactionSourceType =
  | "SalesInvoice"
  | "CreditNote"
  | "CustomerPayment"
  | "CustomerRefund"
  | "PurchaseBill"
  | "PurchaseDebitNote"
  | "SupplierPayment"
  | "SupplierRefund"
  | "CashExpense";

export interface PartyTransaction {
  id: string;
  sourceType: PartyTransactionSourceType;
  sourceId: string;
  date: string;
  dueDate: string | null;
  type: string;
  transactionNumber: string;
  currency: string;
  subtotal: string;
  taxAmount: string;
  total: string;
  balanceDue: string;
  status: string;
}

export interface CustomerPartySummary {
  contact: PartyContact;
  openReceivableBalance: string;
  overdueReceivableBalance: string;
  lastTransactionDate: string | null;
}

export interface SupplierPartySummary {
  contact: PartyContact;
  openPayableBalance: string;
  overduePayableBalance: string;
  lastTransactionDate: string | null;
}

export interface CustomerPartyDetail extends CustomerPartySummary {
  notes: string | null;
  transactions: PartyTransaction[];
}

export interface SupplierPartyDetail extends SupplierPartySummary {
  paymentNotes: string | null;
  transactions: PartyTransaction[];
}

@Injectable()
export class ContactService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  list(organizationId: string) {
    return this.prisma.contact.findMany({
      where: { organizationId },
      orderBy: { name: "asc" },
    });
  }

  async listCustomers(organizationId: string, asOf = new Date()): Promise<CustomerPartySummary[]> {
    const contacts = await this.prisma.contact.findMany({
      where: { organizationId, type: { in: [ContactType.CUSTOMER, ContactType.BOTH] } },
      orderBy: { name: "asc" },
    });
    const maps = await this.customerSummaryMaps(organizationId, contacts.map((contact) => contact.id), asOf);

    return contacts.map((contact) => ({
      contact,
      openReceivableBalance: maps.open.get(contact.id) ?? "0.0000",
      overdueReceivableBalance: maps.overdue.get(contact.id) ?? "0.0000",
      lastTransactionDate: maps.lastTransactionDate.get(contact.id) ?? null,
    }));
  }

  async listSuppliers(organizationId: string, asOf = new Date()): Promise<SupplierPartySummary[]> {
    const contacts = await this.prisma.contact.findMany({
      where: { organizationId, type: { in: [ContactType.SUPPLIER, ContactType.BOTH] } },
      orderBy: { name: "asc" },
    });
    const maps = await this.supplierSummaryMaps(organizationId, contacts.map((contact) => contact.id), asOf);

    return contacts.map((contact) => ({
      contact,
      openPayableBalance: maps.open.get(contact.id) ?? "0.0000",
      overduePayableBalance: maps.overdue.get(contact.id) ?? "0.0000",
      lastTransactionDate: maps.lastTransactionDate.get(contact.id) ?? null,
    }));
  }

  async getCustomer(organizationId: string, id: string, asOf = new Date()): Promise<CustomerPartyDetail> {
    const contact = await this.findPartyContact(organizationId, id, [ContactType.CUSTOMER, ContactType.BOTH], "Customer");
    const maps = await this.customerSummaryMaps(organizationId, [id], asOf);

    return {
      contact,
      openReceivableBalance: maps.open.get(id) ?? "0.0000",
      overdueReceivableBalance: maps.overdue.get(id) ?? "0.0000",
      lastTransactionDate: maps.lastTransactionDate.get(id) ?? null,
      notes: null,
      transactions: await this.customerTransactions(organizationId, id),
    };
  }

  async getSupplier(organizationId: string, id: string, asOf = new Date()): Promise<SupplierPartyDetail> {
    const contact = await this.findPartyContact(organizationId, id, [ContactType.SUPPLIER, ContactType.BOTH], "Supplier");
    const maps = await this.supplierSummaryMaps(organizationId, [id], asOf);

    return {
      contact,
      openPayableBalance: maps.open.get(id) ?? "0.0000",
      overduePayableBalance: maps.overdue.get(id) ?? "0.0000",
      lastTransactionDate: maps.lastTransactionDate.get(id) ?? null,
      paymentNotes: null,
      transactions: await this.supplierTransactions(organizationId, id),
    };
  }

  async get(organizationId: string, id: string) {
    return this.findExisting(organizationId, id);
  }

  async create(organizationId: string, actorUserId: string, dto: CreateContactDto) {
    const data = this.normalizeContactData(dto);
    const contact = await this.prisma.contact.create({
      data: {
        organizationId,
        countryCode: "SA",
        ...data,
      },
    });
    await this.auditLogService.log({ organizationId, actorUserId, action: "CREATE", entityType: "Contact", entityId: contact.id, after: contact });
    return contact;
  }

  async update(organizationId: string, actorUserId: string, id: string, dto: UpdateContactDto) {
    const existing = await this.findExisting(organizationId, id);
    const data = this.normalizeContactData(dto, existing);
    const contact = await this.prisma.contact.update({ where: { id }, data });
    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action: "UPDATE",
      entityType: "Contact",
      entityId: id,
      before: existing,
      after: contact,
    });
    return contact;
  }

  private async findExisting(organizationId: string, id: string) {
    const contact = await this.prisma.contact.findFirst({ where: { id, organizationId } });
    if (!contact) {
      throw new NotFoundException("Contact not found.");
    }
    return contact;
  }

  private async findPartyContact(
    organizationId: string,
    id: string,
    allowedTypes: ContactType[],
    partyLabel: "Customer" | "Supplier",
  ): Promise<PartyContact> {
    const contact = await this.prisma.contact.findFirst({
      where: { id, organizationId, type: { in: allowedTypes } },
    });
    if (!contact) {
      throw new NotFoundException(`${partyLabel} not found.`);
    }
    return contact;
  }

  private async customerSummaryMaps(organizationId: string, contactIds: string[], asOf: Date) {
    if (contactIds.length === 0) {
      return emptySummaryMaps();
    }

    const [openRows, overdueRows, invoiceDates, creditNoteDates, paymentDates, refundDates] = await Promise.all([
      this.prisma.salesInvoice.groupBy({
        by: ["customerId"],
        where: {
          organizationId,
          customerId: { in: contactIds },
          status: SalesInvoiceStatus.FINALIZED,
          balanceDue: { gt: 0 },
        },
        _sum: { balanceDue: true },
      }),
      this.prisma.salesInvoice.groupBy({
        by: ["customerId"],
        where: {
          organizationId,
          customerId: { in: contactIds },
          status: SalesInvoiceStatus.FINALIZED,
          balanceDue: { gt: 0 },
          dueDate: { lt: asOf },
        },
        _sum: { balanceDue: true },
      }),
      this.prisma.salesInvoice.groupBy({
        by: ["customerId"],
        where: { organizationId, customerId: { in: contactIds } },
        _max: { issueDate: true },
      }),
      this.prisma.creditNote.groupBy({
        by: ["customerId"],
        where: { organizationId, customerId: { in: contactIds } },
        _max: { issueDate: true },
      }),
      this.prisma.customerPayment.groupBy({
        by: ["customerId"],
        where: { organizationId, customerId: { in: contactIds } },
        _max: { paymentDate: true },
      }),
      this.prisma.customerRefund.groupBy({
        by: ["customerId"],
        where: { organizationId, customerId: { in: contactIds } },
        _max: { refundDate: true },
      }),
    ]);

    return {
      open: moneyMap(openRows, "customerId"),
      overdue: moneyMap(overdueRows, "customerId"),
      lastTransactionDate: latestDateMap([
        { rows: invoiceDates, idField: "customerId", dateField: "issueDate" },
        { rows: creditNoteDates, idField: "customerId", dateField: "issueDate" },
        { rows: paymentDates, idField: "customerId", dateField: "paymentDate" },
        { rows: refundDates, idField: "customerId", dateField: "refundDate" },
      ]),
    };
  }

  private async supplierSummaryMaps(organizationId: string, contactIds: string[], asOf: Date) {
    if (contactIds.length === 0) {
      return emptySummaryMaps();
    }

    const [openRows, overdueRows, billDates, debitNoteDates, paymentDates, refundDates, expenseDates] = await Promise.all([
      this.prisma.purchaseBill.groupBy({
        by: ["supplierId"],
        where: {
          organizationId,
          supplierId: { in: contactIds },
          status: PurchaseBillStatus.FINALIZED,
          balanceDue: { gt: 0 },
        },
        _sum: { balanceDue: true },
      }),
      this.prisma.purchaseBill.groupBy({
        by: ["supplierId"],
        where: {
          organizationId,
          supplierId: { in: contactIds },
          status: PurchaseBillStatus.FINALIZED,
          balanceDue: { gt: 0 },
          dueDate: { lt: asOf },
        },
        _sum: { balanceDue: true },
      }),
      this.prisma.purchaseBill.groupBy({
        by: ["supplierId"],
        where: { organizationId, supplierId: { in: contactIds } },
        _max: { billDate: true },
      }),
      this.prisma.purchaseDebitNote.groupBy({
        by: ["supplierId"],
        where: { organizationId, supplierId: { in: contactIds } },
        _max: { issueDate: true },
      }),
      this.prisma.supplierPayment.groupBy({
        by: ["supplierId"],
        where: { organizationId, supplierId: { in: contactIds } },
        _max: { paymentDate: true },
      }),
      this.prisma.supplierRefund.groupBy({
        by: ["supplierId"],
        where: { organizationId, supplierId: { in: contactIds } },
        _max: { refundDate: true },
      }),
      this.prisma.cashExpense.groupBy({
        by: ["contactId"],
        where: { organizationId, contactId: { in: contactIds } },
        _max: { expenseDate: true },
      }),
    ]);

    return {
      open: moneyMap(openRows, "supplierId"),
      overdue: moneyMap(overdueRows, "supplierId"),
      lastTransactionDate: latestDateMap([
        { rows: billDates, idField: "supplierId", dateField: "billDate" },
        { rows: debitNoteDates, idField: "supplierId", dateField: "issueDate" },
        { rows: paymentDates, idField: "supplierId", dateField: "paymentDate" },
        { rows: refundDates, idField: "supplierId", dateField: "refundDate" },
        { rows: expenseDates, idField: "contactId", dateField: "expenseDate" },
      ]),
    };
  }

  private async customerTransactions(organizationId: string, contactId: string): Promise<PartyTransaction[]> {
    const [invoices, creditNotes, payments, refunds] = await Promise.all([
      this.prisma.salesInvoice.findMany({
        where: { organizationId, customerId: contactId },
        select: {
          id: true,
          invoiceNumber: true,
          issueDate: true,
          dueDate: true,
          currency: true,
          status: true,
          subtotal: true,
          taxTotal: true,
          total: true,
          balanceDue: true,
        },
      }),
      this.prisma.creditNote.findMany({
        where: { organizationId, customerId: contactId },
        select: {
          id: true,
          creditNoteNumber: true,
          issueDate: true,
          currency: true,
          status: true,
          subtotal: true,
          taxTotal: true,
          total: true,
          unappliedAmount: true,
        },
      }),
      this.prisma.customerPayment.findMany({
        where: { organizationId, customerId: contactId },
        select: {
          id: true,
          paymentNumber: true,
          paymentDate: true,
          currency: true,
          status: true,
          amountReceived: true,
          unappliedAmount: true,
        },
      }),
      this.prisma.customerRefund.findMany({
        where: { organizationId, customerId: contactId },
        select: {
          id: true,
          refundNumber: true,
          refundDate: true,
          currency: true,
          status: true,
          amountRefunded: true,
        },
      }),
    ]);

    return sortPartyTransactions([
      ...invoices.map((invoice) => ({
        id: `SalesInvoice:${invoice.id}`,
        sourceType: "SalesInvoice" as const,
        sourceId: invoice.id,
        date: toIsoString(invoice.issueDate),
        dueDate: nullableIsoString(invoice.dueDate),
        type: "Invoice",
        transactionNumber: invoice.invoiceNumber,
        currency: invoice.currency,
        subtotal: moneyString(invoice.subtotal),
        taxAmount: moneyString(invoice.taxTotal),
        total: moneyString(invoice.total),
        balanceDue: moneyString(invoice.balanceDue),
        status: invoice.status,
      })),
      ...creditNotes.map((creditNote) => ({
        id: `CreditNote:${creditNote.id}`,
        sourceType: "CreditNote" as const,
        sourceId: creditNote.id,
        date: toIsoString(creditNote.issueDate),
        dueDate: null,
        type: "Credit note",
        transactionNumber: creditNote.creditNoteNumber,
        currency: creditNote.currency,
        subtotal: moneyString(creditNote.subtotal),
        taxAmount: moneyString(creditNote.taxTotal),
        total: moneyString(creditNote.total),
        balanceDue: moneyString(creditNote.unappliedAmount),
        status: creditNote.status,
      })),
      ...payments.map((payment) => ({
        id: `CustomerPayment:${payment.id}`,
        sourceType: "CustomerPayment" as const,
        sourceId: payment.id,
        date: toIsoString(payment.paymentDate),
        dueDate: null,
        type: "Receive payment",
        transactionNumber: payment.paymentNumber,
        currency: payment.currency,
        subtotal: moneyString(payment.amountReceived),
        taxAmount: "0.0000",
        total: moneyString(payment.amountReceived),
        balanceDue: moneyString(payment.unappliedAmount),
        status: payment.status,
      })),
      ...refunds.map((refund) => ({
        id: `CustomerRefund:${refund.id}`,
        sourceType: "CustomerRefund" as const,
        sourceId: refund.id,
        date: toIsoString(refund.refundDate),
        dueDate: null,
        type: "Refund receipt",
        transactionNumber: refund.refundNumber,
        currency: refund.currency,
        subtotal: moneyString(refund.amountRefunded),
        taxAmount: "0.0000",
        total: moneyString(refund.amountRefunded),
        balanceDue: "0.0000",
        status: refund.status,
      })),
    ]);
  }

  private async supplierTransactions(organizationId: string, contactId: string): Promise<PartyTransaction[]> {
    const [bills, debitNotes, payments, refunds, expenses] = await Promise.all([
      this.prisma.purchaseBill.findMany({
        where: { organizationId, supplierId: contactId },
        select: {
          id: true,
          billNumber: true,
          billDate: true,
          dueDate: true,
          currency: true,
          status: true,
          subtotal: true,
          taxTotal: true,
          total: true,
          balanceDue: true,
        },
      }),
      this.prisma.purchaseDebitNote.findMany({
        where: { organizationId, supplierId: contactId },
        select: {
          id: true,
          debitNoteNumber: true,
          issueDate: true,
          currency: true,
          status: true,
          subtotal: true,
          taxTotal: true,
          total: true,
          unappliedAmount: true,
        },
      }),
      this.prisma.supplierPayment.findMany({
        where: { organizationId, supplierId: contactId },
        select: {
          id: true,
          paymentNumber: true,
          paymentDate: true,
          currency: true,
          status: true,
          amountPaid: true,
          unappliedAmount: true,
        },
      }),
      this.prisma.supplierRefund.findMany({
        where: { organizationId, supplierId: contactId },
        select: {
          id: true,
          refundNumber: true,
          refundDate: true,
          currency: true,
          status: true,
          amountRefunded: true,
        },
      }),
      this.prisma.cashExpense.findMany({
        where: { organizationId, contactId },
        select: {
          id: true,
          expenseNumber: true,
          expenseDate: true,
          currency: true,
          status: true,
          subtotal: true,
          taxTotal: true,
          total: true,
        },
      }),
    ]);

    return sortPartyTransactions([
      ...bills.map((bill) => ({
        id: `PurchaseBill:${bill.id}`,
        sourceType: "PurchaseBill" as const,
        sourceId: bill.id,
        date: toIsoString(bill.billDate),
        dueDate: nullableIsoString(bill.dueDate),
        type: "Bill",
        transactionNumber: bill.billNumber,
        currency: bill.currency,
        subtotal: moneyString(bill.subtotal),
        taxAmount: moneyString(bill.taxTotal),
        total: moneyString(bill.total),
        balanceDue: moneyString(bill.balanceDue),
        status: bill.status,
      })),
      ...debitNotes.map((debitNote) => ({
        id: `PurchaseDebitNote:${debitNote.id}`,
        sourceType: "PurchaseDebitNote" as const,
        sourceId: debitNote.id,
        date: toIsoString(debitNote.issueDate),
        dueDate: null,
        type: "Supplier credit",
        transactionNumber: debitNote.debitNoteNumber,
        currency: debitNote.currency,
        subtotal: moneyString(debitNote.subtotal),
        taxAmount: moneyString(debitNote.taxTotal),
        total: moneyString(debitNote.total),
        balanceDue: moneyString(debitNote.unappliedAmount),
        status: debitNote.status,
      })),
      ...payments.map((payment) => ({
        id: `SupplierPayment:${payment.id}`,
        sourceType: "SupplierPayment" as const,
        sourceId: payment.id,
        date: toIsoString(payment.paymentDate),
        dueDate: null,
        type: "Pay bills",
        transactionNumber: payment.paymentNumber,
        currency: payment.currency,
        subtotal: moneyString(payment.amountPaid),
        taxAmount: "0.0000",
        total: moneyString(payment.amountPaid),
        balanceDue: moneyString(payment.unappliedAmount),
        status: payment.status,
      })),
      ...refunds.map((refund) => ({
        id: `SupplierRefund:${refund.id}`,
        sourceType: "SupplierRefund" as const,
        sourceId: refund.id,
        date: toIsoString(refund.refundDate),
        dueDate: null,
        type: "Supplier refund",
        transactionNumber: refund.refundNumber,
        currency: refund.currency,
        subtotal: moneyString(refund.amountRefunded),
        taxAmount: "0.0000",
        total: moneyString(refund.amountRefunded),
        balanceDue: "0.0000",
        status: refund.status,
      })),
      ...expenses.map((expense) => ({
        id: `CashExpense:${expense.id}`,
        sourceType: "CashExpense" as const,
        sourceId: expense.id,
        date: toIsoString(expense.expenseDate),
        dueDate: null,
        type: "Expense",
        transactionNumber: expense.expenseNumber,
        currency: expense.currency,
        subtotal: moneyString(expense.subtotal),
        taxAmount: moneyString(expense.taxTotal),
        total: moneyString(expense.total),
        balanceDue: "0.0000",
        status: expense.status,
      })),
    ]);
  }

  private normalizeContactData(
    dto: CreateContactDto,
    existing?: { identificationType?: string | null; identificationNumber?: string | null },
  ): Omit<CreateContactDto, "identificationType" | "identificationNumber"> & {
    identificationType?: string | null;
    identificationNumber?: string | null;
  };

  private normalizeContactData(
    dto: UpdateContactDto,
    existing?: { identificationType?: string | null; identificationNumber?: string | null },
  ): Omit<UpdateContactDto, "identificationType" | "identificationNumber"> & {
    identificationType?: string | null;
    identificationNumber?: string | null;
  };

  private normalizeContactData(
    dto: CreateContactDto | UpdateContactDto,
    existing?: { identificationType?: string | null; identificationNumber?: string | null },
  ): Omit<CreateContactDto | UpdateContactDto, "identificationType" | "identificationNumber"> & {
    identificationType?: string | null;
    identificationNumber?: string | null;
  } {
    const data = { ...dto } as Omit<CreateContactDto | UpdateContactDto, "identificationType" | "identificationNumber"> & {
      identificationType?: string | null;
      identificationNumber?: string | null;
    };
    const hasTypeField = Object.prototype.hasOwnProperty.call(dto, "identificationType");
    const hasNumberField = Object.prototype.hasOwnProperty.call(dto, "identificationNumber");

    if (!hasTypeField && !hasNumberField) {
      return data;
    }

    const identificationType = (hasTypeField ? dto.identificationType : existing?.identificationType)?.trim().toUpperCase() || "";
    const identificationNumber = (hasNumberField ? dto.identificationNumber : existing?.identificationNumber)?.trim().toUpperCase() || "";

    if (!identificationType && !identificationNumber) {
      if (hasTypeField) {
        data.identificationType = null;
      }
      if (hasNumberField) {
        data.identificationNumber = null;
      }
      return data;
    }

    if (!identificationType || !identificationNumber) {
      throw new BadRequestException("Contact ID type and ID number must be provided together.");
    }

    if (!contactIdentificationTypes.includes(identificationType as (typeof contactIdentificationTypes)[number])) {
      throw new BadRequestException("Contact ID type must be one of CRN, MOM, MLS, SAG, NAT, IQA, PAS, GCC, 700, or OTH.");
    }

    const rule = contactIdentificationRules[identificationType as (typeof contactIdentificationTypes)[number]];
    if (!rule.pattern.test(identificationNumber)) {
      throw new BadRequestException(`${rule.label} must be ${rule.hint}.`);
    }

    if (hasTypeField) {
      data.identificationType = identificationType;
    }
    if (hasNumberField) {
      data.identificationNumber = identificationNumber;
    }

    return data;
  }
}

function emptySummaryMaps() {
  return {
    open: new Map<string, string>(),
    overdue: new Map<string, string>(),
    lastTransactionDate: new Map<string, string>(),
  };
}

function moneyMap(rows: unknown[], idField: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const row of rows) {
    if (!isRecord(row) || typeof row[idField] !== "string" || !isRecord(row._sum)) {
      continue;
    }
    map.set(row[idField], moneyString(row._sum.balanceDue));
  }
  return map;
}

function latestDateMap(
  groups: Array<{
    rows: unknown[];
    idField: string;
    dateField: string;
  }>,
): Map<string, string> {
  const map = new Map<string, string>();
  for (const group of groups) {
    for (const row of group.rows) {
      if (!isRecord(row) || typeof row[group.idField] !== "string" || !isRecord(row._max)) {
        continue;
      }
      const id = String(row[group.idField]);
      const nextDate = nullableIsoString(row._max[group.dateField]);
      if (!nextDate) {
        continue;
      }
      const currentDate = map.get(id);
      if (!currentDate || new Date(nextDate).getTime() > new Date(currentDate).getTime()) {
        map.set(id, nextDate);
      }
    }
  }
  return map;
}

function sortPartyTransactions(rows: PartyTransaction[]): PartyTransaction[] {
  return [...rows].sort((a, b) => {
    const dateDelta = new Date(b.date).getTime() - new Date(a.date).getTime();
    if (dateDelta !== 0) {
      return dateDelta;
    }
    return a.transactionNumber.localeCompare(b.transactionNumber);
  });
}

function moneyString(value: unknown): string {
  return toMoney(value === null || value === undefined ? 0 : String(value)).toFixed(4);
}

function nullableIsoString(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  return toIsoString(value);
}

function toIsoString(value: unknown): string {
  return value instanceof Date ? value.toISOString() : new Date(String(value)).toISOString();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
