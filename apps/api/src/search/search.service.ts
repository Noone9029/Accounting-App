import { Injectable } from "@nestjs/common";
import { toMoney } from "@ledgerbyte/accounting-core";
import { hasPermission, PERMISSIONS, type Permission } from "@ledgerbyte/shared";
import { ContactType } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

export type GlobalSearchResultCategory = "Contacts" | "Transactions" | "Products / Services";

export interface GlobalSearchResult {
  id: string;
  category: GlobalSearchResultCategory;
  label: string;
  href: string;
  resultType: string;
  detail: string;
  amount: string | null;
  date: string | null;
  status: string | null;
  keywords: string[];
}

export interface GlobalSearchResponse {
  query: string;
  results: GlobalSearchResult[];
}

interface PartySummary {
  id: string;
  name: string;
  displayName: string | null;
}

interface SearchTransactionRow {
  id: string;
  currency: string;
  status: unknown;
  total: unknown;
  balanceDue: unknown;
}

interface SalesInvoiceSearchRow extends SearchTransactionRow {
  invoiceNumber: string;
  issueDate: Date | string;
  customer: PartySummary | null;
}

interface PurchaseBillSearchRow extends SearchTransactionRow {
  billNumber: string;
  billDate: Date | string;
  supplier: PartySummary | null;
}

interface CashExpenseSearchRow {
  id: string;
  expenseNumber: string;
  expenseDate: Date | string;
  currency: string;
  status: unknown;
  total: unknown;
  contact: PartySummary | null;
}

interface CustomerPaymentSearchRow {
  id: string;
  paymentNumber: string;
  paymentDate: Date | string;
  currency: string;
  status: unknown;
  amountReceived: unknown;
  unappliedAmount: unknown;
  customer: PartySummary | null;
}

interface SupplierPaymentSearchRow {
  id: string;
  paymentNumber: string;
  paymentDate: Date | string;
  currency: string;
  status: unknown;
  amountPaid: unknown;
  unappliedAmount: unknown;
  supplier: PartySummary | null;
}

interface CreditNoteSearchRow {
  id: string;
  creditNoteNumber: string;
  issueDate: Date | string;
  currency: string;
  status: unknown;
  total: unknown;
  unappliedAmount: unknown;
  customer: PartySummary | null;
}

interface PurchaseOrderSearchRow {
  id: string;
  purchaseOrderNumber: string;
  orderDate: Date | string;
  currency: string;
  status: unknown;
  total: unknown;
  supplier: PartySummary | null;
}

interface DeliveryNoteSearchRow {
  id: string;
  deliveryNoteNumber: string;
  issueDate: Date | string;
  deliveryDate: Date | string | null;
  status: unknown;
  customer: PartySummary | null;
}

interface CollectionCaseSearchRow {
  id: string;
  caseNumber: string;
  status: unknown;
  priority: unknown;
  nextActionAt: Date | string | null;
  followUpDate: Date | string | null;
  customer: PartySummary | null;
  salesInvoice: {
    id: string;
    invoiceNumber: string;
    balanceDue: unknown;
  } | null;
}

interface SalesQuoteSearchRow {
  id: string;
  quoteNumber: string;
  issueDate: Date | string;
  expiryDate: Date | string | null;
  status: unknown;
  total: unknown;
  customer: PartySummary | null;
}

interface ItemSearchRow {
  id: string;
  name: string;
  description: string | null;
  sku: string | null;
  type: unknown;
  status: unknown;
  sellingPrice: unknown;
  inventoryTracking: boolean;
}

const RESULT_LIMIT_PER_SOURCE = 5;
const MAX_RESULTS = 25;

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search(organizationId: string, query: string | undefined, permissions: unknown): Promise<GlobalSearchResponse> {
    const normalizedQuery = query?.trim() ?? "";
    if (!normalizedQuery) {
      return { query: "", results: [] };
    }

    const amountNeedle = parseAmountNeedle(normalizedQuery);
    const results = (
      await Promise.all([
        this.contactResults(organizationId, normalizedQuery, permissions),
        this.salesInvoiceResults(organizationId, normalizedQuery, permissions, amountNeedle),
        this.purchaseBillResults(organizationId, normalizedQuery, permissions, amountNeedle),
        this.cashExpenseResults(organizationId, normalizedQuery, permissions, amountNeedle),
        this.customerPaymentResults(organizationId, normalizedQuery, permissions, amountNeedle),
        this.supplierPaymentResults(organizationId, normalizedQuery, permissions, amountNeedle),
        this.creditNoteResults(organizationId, normalizedQuery, permissions, amountNeedle),
        this.purchaseOrderResults(organizationId, normalizedQuery, permissions, amountNeedle),
        this.deliveryNoteResults(organizationId, normalizedQuery, permissions),
        this.collectionCaseResults(organizationId, normalizedQuery, permissions, amountNeedle),
        this.salesQuoteResults(organizationId, normalizedQuery, permissions, amountNeedle),
        this.itemResults(organizationId, normalizedQuery, permissions, amountNeedle),
        this.journalEntryResults(organizationId, normalizedQuery, permissions, amountNeedle),
      ])
    ).flat();

    return {
      query: normalizedQuery,
      results: rankResults(results, normalizedQuery).slice(0, MAX_RESULTS),
    };
  }

  private async contactResults(organizationId: string, query: string, permissions: unknown): Promise<GlobalSearchResult[]> {
    if (!can(permissions, PERMISSIONS.contacts.view)) {
      return [];
    }

    const contacts = await this.prisma.contact.findMany({
      where: {
        organizationId,
        OR: [
          { name: contains(query) },
          { displayName: contains(query) },
          { email: contains(query) },
          { phone: contains(query) },
          { taxNumber: contains(query) },
        ],
      },
      orderBy: { name: "asc" },
      take: RESULT_LIMIT_PER_SOURCE,
    });
    const [receivableRows, payableRows] = await Promise.all([
      this.prisma.salesInvoice.groupBy({
        by: ["customerId"],
        where: {
          organizationId,
          customerId: { in: contacts.filter((contact) => contact.type === ContactType.CUSTOMER || contact.type === ContactType.BOTH).map((contact) => contact.id) },
          status: "FINALIZED",
          balanceDue: { gt: 0 },
        },
        _sum: { balanceDue: true },
      }),
      this.prisma.purchaseBill.groupBy({
        by: ["supplierId"],
        where: {
          organizationId,
          supplierId: { in: contacts.filter((contact) => contact.type === ContactType.SUPPLIER || contact.type === ContactType.BOTH).map((contact) => contact.id) },
          status: "FINALIZED",
          balanceDue: { gt: 0 },
        },
        _sum: { balanceDue: true },
      }),
    ]);
    const receivables = moneyById(receivableRows, "customerId");
    const payables = moneyById(payableRows, "supplierId");

    return contacts.flatMap((contact) => {
      const rows: GlobalSearchResult[] = [];
      const name = contact.displayName ?? contact.name;
      const reach = [contact.email, contact.phone].filter(Boolean).join(" / ");

      if (contact.type === ContactType.CUSTOMER || contact.type === ContactType.BOTH) {
        rows.push({
          id: `contact-customer-${contact.id}`,
          category: "Contacts",
          label: name,
          href: `/customers/${contact.id}`,
          resultType: "Customer",
          detail: reach || "Customer contact",
          amount: receivables.get(contact.id) ?? "0.0000",
          date: null,
          status: contact.isActive ? "Active" : "Inactive",
          keywords: compact([name, contact.email, contact.phone, "customer"]),
        });
      }

      if (contact.type === ContactType.SUPPLIER || contact.type === ContactType.BOTH) {
        rows.push({
          id: `contact-supplier-${contact.id}`,
          category: "Contacts",
          label: name,
          href: `/suppliers/${contact.id}`,
          resultType: "Supplier",
          detail: reach || "Supplier contact",
          amount: payables.get(contact.id) ?? "0.0000",
          date: null,
          status: contact.isActive ? "Active" : "Inactive",
          keywords: compact([name, contact.email, contact.phone, "supplier"]),
        });
      }

      return rows;
    });
  }

  private async salesInvoiceResults(organizationId: string, query: string, permissions: unknown, amountNeedle: string | null) {
    if (!can(permissions, PERMISSIONS.salesInvoices.view)) {
      return [];
    }
    const rows = (await this.prisma.salesInvoice.findMany({
      where: {
        organizationId,
        OR: [
          { invoiceNumber: contains(query) },
          { customer: { is: partySearch(query) } },
          ...(amountNeedle ? [{ total: amountNeedle }, { balanceDue: amountNeedle }] : []),
        ],
      },
      select: transactionSelect("invoiceNumber", "issueDate", "customer"),
      orderBy: { issueDate: "desc" },
      take: RESULT_LIMIT_PER_SOURCE,
    })) as unknown as SalesInvoiceSearchRow[];
    return rows.map((row) =>
      transactionResult({
        row,
        source: "sales-invoice",
        type: "Invoice",
        number: row.invoiceNumber,
        party: row.customer,
        date: row.issueDate,
        href: `/sales/invoices/${row.id}`,
      }),
    );
  }

  private async purchaseBillResults(organizationId: string, query: string, permissions: unknown, amountNeedle: string | null) {
    if (!can(permissions, PERMISSIONS.purchaseBills.view)) {
      return [];
    }
    const rows = (await this.prisma.purchaseBill.findMany({
      where: {
        organizationId,
        OR: [
          { billNumber: contains(query) },
          { supplier: { is: partySearch(query) } },
          ...(amountNeedle ? [{ total: amountNeedle }, { balanceDue: amountNeedle }] : []),
        ],
      },
      select: transactionSelect("billNumber", "billDate", "supplier"),
      orderBy: { billDate: "desc" },
      take: RESULT_LIMIT_PER_SOURCE,
    })) as unknown as PurchaseBillSearchRow[];
    return rows.map((row) =>
      transactionResult({
        row,
        source: "purchase-bill",
        type: "Bill",
        number: row.billNumber,
        party: row.supplier,
        date: row.billDate,
        href: `/purchases/bills/${row.id}`,
      }),
    );
  }

  private async cashExpenseResults(organizationId: string, query: string, permissions: unknown, amountNeedle: string | null) {
    if (!can(permissions, PERMISSIONS.cashExpenses.view)) {
      return [];
    }
    const rows = (await this.prisma.cashExpense.findMany({
      where: {
        organizationId,
        OR: [
          { expenseNumber: contains(query) },
          { description: contains(query) },
          { contact: { is: partySearch(query) } },
          ...(amountNeedle ? [{ total: amountNeedle }] : []),
        ],
      },
      select: {
        id: true,
        expenseNumber: true,
        expenseDate: true,
        currency: true,
        status: true,
        total: true,
        contact: { select: { id: true, name: true, displayName: true } },
      },
      orderBy: { expenseDate: "desc" },
      take: RESULT_LIMIT_PER_SOURCE,
    })) as unknown as CashExpenseSearchRow[];
    return rows.map((row) =>
      transactionResult({
        row: { ...row, balanceDue: "0.0000" },
        source: "cash-expense",
        type: "Expense",
        number: row.expenseNumber,
        party: row.contact,
        date: row.expenseDate,
        href: `/purchases/cash-expenses/${row.id}`,
      }),
    );
  }

  private async customerPaymentResults(organizationId: string, query: string, permissions: unknown, amountNeedle: string | null) {
    if (!can(permissions, PERMISSIONS.customerPayments.view)) {
      return [];
    }
    const rows = (await this.prisma.customerPayment.findMany({
      where: {
        organizationId,
        OR: [
          { paymentNumber: contains(query) },
          { description: contains(query) },
          { customer: { is: partySearch(query) } },
          ...(amountNeedle ? [{ amountReceived: amountNeedle }, { unappliedAmount: amountNeedle }] : []),
        ],
      },
      select: paymentSelect("amountReceived", "paymentDate", "customer"),
      orderBy: { paymentDate: "desc" },
      take: RESULT_LIMIT_PER_SOURCE,
    })) as unknown as CustomerPaymentSearchRow[];
    return rows.map((row) =>
      transactionResult({
        row: { ...row, total: row.amountReceived, balanceDue: row.unappliedAmount },
        source: "customer-payment",
        type: "Payment",
        number: row.paymentNumber,
        party: row.customer,
        date: row.paymentDate,
        href: `/sales/customer-payments/${row.id}`,
      }),
    );
  }

  private async supplierPaymentResults(organizationId: string, query: string, permissions: unknown, amountNeedle: string | null) {
    if (!can(permissions, PERMISSIONS.supplierPayments.view)) {
      return [];
    }
    const rows = (await this.prisma.supplierPayment.findMany({
      where: {
        organizationId,
        OR: [
          { paymentNumber: contains(query) },
          { description: contains(query) },
          { supplier: { is: partySearch(query) } },
          ...(amountNeedle ? [{ amountPaid: amountNeedle }, { unappliedAmount: amountNeedle }] : []),
        ],
      },
      select: paymentSelect("amountPaid", "paymentDate", "supplier"),
      orderBy: { paymentDate: "desc" },
      take: RESULT_LIMIT_PER_SOURCE,
    })) as unknown as SupplierPaymentSearchRow[];
    return rows.map((row) =>
      transactionResult({
        row: { ...row, total: row.amountPaid, balanceDue: row.unappliedAmount },
        source: "supplier-payment",
        type: "Payment",
        number: row.paymentNumber,
        party: row.supplier,
        date: row.paymentDate,
        href: `/purchases/supplier-payments/${row.id}`,
      }),
    );
  }

  private async creditNoteResults(organizationId: string, query: string, permissions: unknown, amountNeedle: string | null) {
    if (!can(permissions, PERMISSIONS.creditNotes.view)) {
      return [];
    }
    const rows = (await this.prisma.creditNote.findMany({
      where: {
        organizationId,
        OR: [
          { creditNoteNumber: contains(query) },
          { customer: { is: partySearch(query) } },
          ...(amountNeedle ? [{ total: amountNeedle }, { unappliedAmount: amountNeedle }] : []),
        ],
      },
      select: creditSelect("creditNoteNumber", "customer"),
      orderBy: { issueDate: "desc" },
      take: RESULT_LIMIT_PER_SOURCE,
    })) as unknown as CreditNoteSearchRow[];
    return rows.map((row) =>
      transactionResult({
        row: { ...row, balanceDue: row.unappliedAmount },
        source: "credit-note",
        type: "Credit note",
        number: row.creditNoteNumber,
        party: row.customer,
        date: row.issueDate,
        href: `/sales/credit-notes/${row.id}`,
      }),
    );
  }

  private async purchaseOrderResults(organizationId: string, query: string, permissions: unknown, amountNeedle: string | null) {
    if (!can(permissions, PERMISSIONS.purchaseOrders.view)) {
      return [];
    }
    const rows = (await this.prisma.purchaseOrder.findMany({
      where: {
        organizationId,
        OR: [
          { purchaseOrderNumber: contains(query) },
          { supplier: { is: partySearch(query) } },
          ...(amountNeedle ? [{ total: amountNeedle }] : []),
        ],
      },
      select: {
        id: true,
        purchaseOrderNumber: true,
        orderDate: true,
        currency: true,
        status: true,
        total: true,
        supplier: { select: { id: true, name: true, displayName: true } },
      },
      orderBy: { orderDate: "desc" },
      take: RESULT_LIMIT_PER_SOURCE,
    })) as unknown as PurchaseOrderSearchRow[];
    return rows.map((row) =>
      transactionResult({
        row: { ...row, balanceDue: "0.0000" },
        source: "purchase-order",
        type: "Purchase order",
        number: row.purchaseOrderNumber,
        party: row.supplier,
        date: row.orderDate,
        href: `/purchases/purchase-orders/${row.id}`,
      }),
    );
  }

  private async deliveryNoteResults(organizationId: string, query: string, permissions: unknown) {
    if (!can(permissions, PERMISSIONS.salesInvoices.view)) {
      return [];
    }
    const rows = (await this.prisma.deliveryNote.findMany({
      where: {
        organizationId,
        OR: [
          { deliveryNoteNumber: contains(query) },
          { reference: contains(query) },
          { deliveryAddress: contains(query) },
          { customer: { is: partySearch(query) } },
        ],
      },
      select: {
        id: true,
        deliveryNoteNumber: true,
        issueDate: true,
        deliveryDate: true,
        status: true,
        customer: { select: { id: true, name: true, displayName: true } },
      },
      orderBy: { issueDate: "desc" },
      take: RESULT_LIMIT_PER_SOURCE,
    })) as unknown as DeliveryNoteSearchRow[];
    return rows.map((row) => ({
      id: `delivery-note-${row.id}`,
      category: "Transactions" as const,
      label: row.deliveryNoteNumber,
      href: `/sales/delivery-notes/${row.id}`,
      resultType: "Delivery note",
      detail: row.customer ? row.customer.displayName ?? row.customer.name : "No customer",
      amount: "0.0000",
      date: toIsoString(row.issueDate),
      status: String(row.status),
      keywords: compact([row.deliveryNoteNumber, "delivery note", "fulfillment", row.customer?.displayName ?? row.customer?.name]),
    }));
  }

  private async collectionCaseResults(organizationId: string, query: string, permissions: unknown, amountNeedle: string | null) {
    if (!can(permissions, PERMISSIONS.salesInvoices.view)) {
      return [];
    }
    const rows = (await this.prisma.collectionCase.findMany({
      where: {
        organizationId,
        OR: [
          { caseNumber: contains(query) },
          { summary: contains(query) },
          { customer: { is: partySearch(query) } },
          { salesInvoice: { is: { invoiceNumber: contains(query) } } },
          ...(amountNeedle ? [{ promisedAmount: amountNeedle }, { salesInvoice: { is: { balanceDue: amountNeedle } } }] : []),
        ],
      },
      select: {
        id: true,
        caseNumber: true,
        status: true,
        priority: true,
        nextActionAt: true,
        followUpDate: true,
        customer: { select: { id: true, name: true, displayName: true } },
        salesInvoice: { select: { id: true, invoiceNumber: true, balanceDue: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: RESULT_LIMIT_PER_SOURCE,
    })) as unknown as CollectionCaseSearchRow[];
    return rows.map((row) => {
      const customerName = row.customer ? row.customer.displayName ?? row.customer.name : "No customer";
      return {
        id: `collection-case-${row.id}`,
        category: "Transactions" as const,
        label: row.caseNumber,
        href: `/sales/collections/${row.id}`,
        resultType: "Collection case",
        detail: row.salesInvoice ? `${customerName} / ${row.salesInvoice.invoiceNumber}` : customerName,
        amount: row.salesInvoice ? moneyString(row.salesInvoice.balanceDue) : "0.0000",
        date: row.nextActionAt ? toIsoString(row.nextActionAt) : row.followUpDate ? toIsoString(row.followUpDate) : null,
        status: String(row.status),
        keywords: compact([
          row.caseNumber,
          "collection case",
          "collections",
          "follow-up",
          "promise to pay",
          String(row.status),
          String(row.priority),
          customerName,
          row.salesInvoice?.invoiceNumber,
        ]),
      };
    });
  }

  private async salesQuoteResults(organizationId: string, query: string, permissions: unknown, amountNeedle: string | null) {
    if (!can(permissions, PERMISSIONS.salesInvoices.view)) {
      return [];
    }
    const rows = (await this.prisma.salesQuote.findMany({
      where: {
        organizationId,
        OR: [
          { quoteNumber: contains(query) },
          { reference: contains(query) },
          { customer: { is: partySearch(query) } },
          ...(amountNeedle ? [{ total: amountNeedle }] : []),
        ],
      },
      select: {
        id: true,
        quoteNumber: true,
        issueDate: true,
        expiryDate: true,
        status: true,
        total: true,
        customer: { select: { id: true, name: true, displayName: true } },
      },
      orderBy: { issueDate: "desc" },
      take: RESULT_LIMIT_PER_SOURCE,
    })) as unknown as SalesQuoteSearchRow[];
    return rows.map((row) => {
      const customerName = row.customer ? row.customer.displayName ?? row.customer.name : "No customer";
      return {
        id: `sales-quote-${row.id}`,
        category: "Transactions" as const,
        label: row.quoteNumber,
        href: `/sales/quotes/${row.id}`,
        resultType: "Sales quote",
        detail: customerName,
        amount: moneyString(row.total),
        date: toIsoString(row.issueDate),
        status: String(row.status),
        keywords: compact([row.quoteNumber, "sales quote", "quote", "quotation", "proforma", customerName]),
      };
    });
  }

  private async itemResults(organizationId: string, query: string, permissions: unknown, amountNeedle: string | null) {
    if (!can(permissions, PERMISSIONS.items.view)) {
      return [];
    }
    const rows = (await this.prisma.item.findMany({
      where: {
        organizationId,
        OR: [
          { name: contains(query) },
          { sku: contains(query) },
          { description: contains(query) },
          ...(amountNeedle ? [{ sellingPrice: amountNeedle }, { purchaseCost: amountNeedle }] : []),
        ],
      },
      select: {
        id: true,
        name: true,
        description: true,
        sku: true,
        type: true,
        status: true,
        sellingPrice: true,
        inventoryTracking: true,
      },
      orderBy: { name: "asc" },
      take: RESULT_LIMIT_PER_SOURCE,
    })) as unknown as ItemSearchRow[];
    return rows.map((row) => ({
      id: `item-${row.id}`,
      category: "Products / Services" as const,
      label: row.name,
      href: "/items",
      resultType: "Product/service",
      detail: compact([row.sku, String(row.type)]).join(" / ") || "Catalog item",
      amount: moneyString(row.sellingPrice),
      date: null,
      status: String(row.status),
      keywords: compact([row.name, row.sku, row.description, String(row.type), row.inventoryTracking ? "inventory" : "service"]),
    }));
  }

  private async journalEntryResults(organizationId: string, query: string, permissions: unknown, amountNeedle: string | null) {
    if (!can(permissions, PERMISSIONS.journals.view)) {
      return [];
    }
    const rows = await this.prisma.journalEntry.findMany({
      where: {
        organizationId,
        OR: [
          { entryNumber: contains(query) },
          { description: contains(query) },
          { reference: contains(query) },
          ...(amountNeedle ? [{ totalDebit: amountNeedle }, { totalCredit: amountNeedle }] : []),
        ],
      },
      select: {
        id: true,
        entryNumber: true,
        entryDate: true,
        currency: true,
        status: true,
        totalDebit: true,
        reference: true,
      },
      orderBy: { entryDate: "desc" },
      take: RESULT_LIMIT_PER_SOURCE,
    });
    return rows.map((row) => ({
      id: `journal-entry-${row.id}`,
      category: "Transactions" as const,
      label: row.entryNumber,
      href: `/journal-entries/${row.id}`,
      resultType: "Journal entry",
      detail: row.reference ? `Reference ${row.reference}` : "Manual journal",
      amount: moneyString(row.totalDebit),
      date: toIsoString(row.entryDate),
      status: String(row.status),
      keywords: compact([row.entryNumber, row.reference, "journal entry"]),
    }));
  }
}

function can(permissions: unknown, permission: Permission): boolean {
  return hasPermission(permissions, permission);
}

function contains(query: string) {
  return { contains: query, mode: "insensitive" as const };
}

function partySearch(query: string) {
  return {
    OR: [
      { name: contains(query) },
      { displayName: contains(query) },
      { email: contains(query) },
      { phone: contains(query) },
    ],
  };
}

function transactionSelect(numberField: string, dateField: string, partyField: "customer" | "supplier") {
  return {
    id: true,
    [numberField]: true,
    [dateField]: true,
    currency: true,
    status: true,
    total: true,
    balanceDue: true,
    [partyField]: { select: { id: true, name: true, displayName: true } },
  };
}

function paymentSelect(amountField: "amountReceived" | "amountPaid", dateField: string, partyField: "customer" | "supplier") {
  return {
    id: true,
    paymentNumber: true,
    [dateField]: true,
    currency: true,
    status: true,
    [amountField]: true,
    unappliedAmount: true,
    [partyField]: { select: { id: true, name: true, displayName: true } },
  };
}

function creditSelect(numberField: string, partyField: "customer") {
  return {
    id: true,
    [numberField]: true,
    issueDate: true,
    currency: true,
    status: true,
    total: true,
    unappliedAmount: true,
    [partyField]: { select: { id: true, name: true, displayName: true } },
  };
}

function transactionResult(input: {
  row: SearchTransactionRow;
  source: string;
  type: string;
  number: string;
  party?: { name: string; displayName: string | null } | null;
  date: Date | string;
  href: string;
}): GlobalSearchResult {
  const partyName = input.party ? input.party.displayName ?? input.party.name : "No party";
  return {
    id: `${input.source}-${input.row.id}`,
    category: "Transactions",
    label: input.number,
    href: input.href,
    resultType: input.type,
    detail: partyName,
    amount: moneyString(input.row.total),
    date: toIsoString(input.date),
    status: String(input.row.status),
    keywords: compact([input.number, input.type, partyName, moneyString(input.row.total), moneyString(input.row.balanceDue)]),
  };
}

function moneyById(rows: unknown[], idField: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const row of rows) {
    if (!isRecord(row) || typeof row[idField] !== "string" || !isRecord(row._sum)) {
      continue;
    }
    map.set(row[idField], moneyString(row._sum.balanceDue));
  }
  return map;
}

function rankResults(results: GlobalSearchResult[], query: string): GlobalSearchResult[] {
  const normalized = query.toLowerCase();
  return [...results].sort((a, b) => score(b, normalized) - score(a, normalized) || a.label.localeCompare(b.label));
}

function score(result: GlobalSearchResult, query: string): number {
  const fields = [result.label, result.resultType, result.detail, result.status ?? "", ...result.keywords].map((value) => value.toLowerCase());
  if (fields.some((field) => field === query)) {
    return 100;
  }
  if (fields.some((field) => field.startsWith(query))) {
    return 75;
  }
  if (fields.some((field) => field.includes(query))) {
    return 50;
  }
  return 0;
}

function parseAmountNeedle(query: string): string | null {
  const normalized = query.replace(/[, ]/g, "");
  if (!/^[0-9]+(\.[0-9]{1,4})?$/.test(normalized)) {
    return null;
  }
  return toMoney(normalized).toFixed(4);
}

function moneyString(value: unknown): string {
  return toMoney(value === null || value === undefined ? 0 : String(value)).toFixed(4);
}

function toIsoString(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function compact(values: Array<string | null | undefined>): string[] {
  return values.filter((value): value is string => Boolean(value?.trim()));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
