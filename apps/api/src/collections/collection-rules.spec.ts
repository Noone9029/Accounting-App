import { BadRequestException, NotFoundException } from "@nestjs/common";
import { CollectionActivityType, CollectionCaseStatus, CollectionPriority, ContactType, NumberSequenceScope, SalesInvoiceStatus } from "@prisma/client";
import { CollectionService } from "./collection.service";

describe("collection workflow rules", () => {
  it("creates a non-posting collection case with a collection sequence number", async () => {
    const tx = makeTransactionClient();
    const prisma = makeCreatePrisma(tx);
    const { service, numbers, audit } = makeService(prisma);

    const collectionCase = await service.create("org-1", "user-1", makeCreateDto());

    expect(collectionCase).toMatchObject({ id: "case-1", caseNumber: "COL-000001", status: CollectionCaseStatus.OPEN });
    expect(numbers.next).toHaveBeenCalledWith("org-1", NumberSequenceScope.COLLECTION_CASE, tx);
    expect(tx.collectionCase.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: "org-1",
          caseNumber: "COL-000001",
          customerId: "customer-1",
          salesInvoiceId: "invoice-1",
          promisedAmount: "50.0000",
        }),
      }),
    );
    expect(tx.journalEntry.create).not.toHaveBeenCalled();
    expect(tx.customerPayment.create).not.toHaveBeenCalled();
    expect(tx.creditNote.create).not.toHaveBeenCalled();
    expect(tx.emailOutbox.create).not.toHaveBeenCalled();
    expect(tx.zatcaInvoiceMetadata.upsert).not.toHaveBeenCalled();
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: "CREATE", entityType: "CollectionCase", entityId: "case-1" }));
    expect(JSON.stringify(audit.log.mock.calls)).not.toContain("Customer promised on phone");
  });

  it("prevents duplicate open collection cases for the same invoice", async () => {
    const tx = makeTransactionClient();
    const prisma = makeCreatePrisma(tx, {
      collectionCase: { findFirst: jest.fn().mockResolvedValue({ id: "case-existing", caseNumber: "COL-000009" }) },
    });
    const { service } = makeService(prisma);

    await expect(service.create("org-1", "user-1", makeCreateDto())).rejects.toThrow("already has an open collection case");
    expect(tx.collectionCase.create).not.toHaveBeenCalled();
  });

  it("tenant-scopes collection case detail lookup", async () => {
    const prisma = { collectionCase: { findFirst: jest.fn().mockResolvedValue(null) } };
    const { service } = makeService(prisma);

    await expect(service.get("org-2", "case-1")).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.collectionCase.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "case-1", organizationId: "org-2" } }));
  });

  it("rejects cross-customer, draft, and paid invoice links", async () => {
    const tx = makeTransactionClient();
    const prisma = makeCreatePrisma(tx, {
      salesInvoice: { findFirst: jest.fn().mockResolvedValue({ id: "invoice-1", customerId: "other-customer", status: SalesInvoiceStatus.FINALIZED, balanceDue: "10.0000" }) },
    });
    const { service } = makeService(prisma);
    await expect(service.create("org-1", "user-1", makeCreateDto())).rejects.toThrow("must belong to the selected customer");

    prisma.salesInvoice.findFirst.mockResolvedValueOnce({ id: "invoice-1", customerId: "customer-1", status: SalesInvoiceStatus.DRAFT, balanceDue: "10.0000" });
    await expect(service.create("org-1", "user-1", makeCreateDto())).rejects.toThrow("finalized invoices with an outstanding balance");

    prisma.salesInvoice.findFirst.mockResolvedValueOnce({ id: "invoice-1", customerId: "customer-1", status: SalesInvoiceStatus.FINALIZED, balanceDue: "0.0000" });
    await expect(service.create("org-1", "user-1", makeCreateDto())).rejects.toThrow("finalized invoices with an outstanding balance");
  });

  it("validates promise amounts and blocks terminal cases from normal updates", async () => {
    const prisma = makeCreatePrisma(makeTransactionClient());
    const { service } = makeService(prisma);

    await expect(service.create("org-1", "user-1", { ...makeCreateDto(), promisedAmount: "-1" })).rejects.toThrow("Promised amount cannot be negative");

    jest.spyOn(service, "get").mockResolvedValueOnce(makeCollectionCase({ status: CollectionCaseStatus.CLOSED }) as never);
    await expect(service.update("org-1", "user-1", "case-1", { priority: CollectionPriority.HIGH })).rejects.toThrow("cannot be edited");
  });

  it("runs lifecycle transitions and records planned activities without payment, email, journal, VAT, or ZATCA side effects", async () => {
    const prisma = {
      collectionCase: { update: jest.fn().mockResolvedValue(makeCollectionCase({ status: CollectionCaseStatus.PROMISED_TO_PAY })) },
      collectionActivity: { create: jest.fn().mockResolvedValue(makeActivity()) },
      journalEntry: { create: jest.fn() },
      customerPayment: { create: jest.fn() },
      creditNote: { create: jest.fn() },
      emailOutbox: { create: jest.fn() },
      zatcaInvoiceMetadata: { upsert: jest.fn() },
    };
    const { service, audit } = makeService(prisma);
    jest
      .spyOn(service, "get")
      .mockResolvedValueOnce(makeCollectionCase() as never)
      .mockResolvedValueOnce(makeCollectionCase() as never);

    await expect(service.markPromised("org-1", "user-1", "case-1", { promisedAmount: "75", promisedPaymentDate: "2026-06-10" })).resolves.toMatchObject({
      status: CollectionCaseStatus.PROMISED_TO_PAY,
    });
    await expect(
      service.addActivity("org-1", "user-1", "case-1", {
        activityType: CollectionActivityType.REMINDER_PLANNED,
        note: "Plan a reminder call only.",
        nextFollowUpDate: "2026-06-11",
      }),
    ).resolves.toMatchObject({ status: CollectionCaseStatus.PROMISED_TO_PAY });

    expect(prisma.customerPayment.create).not.toHaveBeenCalled();
    expect(prisma.creditNote.create).not.toHaveBeenCalled();
    expect(prisma.journalEntry.create).not.toHaveBeenCalled();
    expect(prisma.emailOutbox.create).not.toHaveBeenCalled();
    expect(prisma.zatcaInvoiceMetadata.upsert).not.toHaveBeenCalled();
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: "MARK_PROMISED", entityType: "CollectionCase" }));
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: "CREATE", entityType: "CollectionActivity" }));
    expect(JSON.stringify(audit.log.mock.calls)).not.toContain("Plan a reminder call only");
  });

  it("summarizes overdue invoices and collection follow-up without mutating report math sources", async () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const prisma = {
      salesInvoice: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: "invoice-1",
            issueDate: yesterday,
            dueDate: yesterday,
            currency: "SAR",
            balanceDue: "100.0000",
            customer: { id: "customer-1", name: "Beta Customer", displayName: null },
          },
        ]),
      },
      collectionCase: {
        findMany: jest.fn().mockResolvedValue([
          makeCollectionCase({
            status: CollectionCaseStatus.PROMISED_TO_PAY,
            nextActionAt: today,
            promisedAmount: "60.0000",
            salesInvoice: { id: "invoice-1", invoiceNumber: "INV-001", balanceDue: "100.0000" },
          }),
          makeCollectionCase({ id: "case-2", status: CollectionCaseStatus.DISPUTED, nextActionAt: tomorrow, salesInvoice: { id: "invoice-2", invoiceNumber: "INV-002", balanceDue: "25.0000" } }),
        ]),
      },
      journalEntry: { create: jest.fn() },
      customerPayment: { create: jest.fn() },
    };
    const { service } = makeService(prisma);

    await expect(service.summary("org-1")).resolves.toMatchObject({
      totalOverdueAmount: "100.0000",
      overdueInvoiceCount: 1,
      openCollectionCaseCount: 2,
      promisedToPayTotal: "60.0000",
      disputedTotal: "25.0000",
    });
    expect(prisma.journalEntry.create).not.toHaveBeenCalled();
    expect(prisma.customerPayment.create).not.toHaveBeenCalled();
  });
});

function makeService(prisma: any) {
  const audit = { log: jest.fn().mockResolvedValue(undefined) };
  const numbers = {
    preview: jest.fn().mockResolvedValue({ exampleNextNumber: "COL-000001", scope: NumberSequenceScope.COLLECTION_CASE, prefix: "COL-", nextNumber: 1, padding: 6 }),
    next: jest.fn().mockResolvedValue("COL-000001"),
  };
  return { service: new CollectionService(prisma as never, audit as never, numbers as never), audit, numbers };
}

function makeCreatePrisma(tx: ReturnType<typeof makeTransactionClient>, overrides: Record<string, any> = {}) {
  return {
    contact: { findFirst: jest.fn().mockResolvedValue({ id: "customer-1" }) },
    salesInvoice: { findFirst: jest.fn().mockResolvedValue({ id: "invoice-1", customerId: "customer-1", status: SalesInvoiceStatus.FINALIZED, balanceDue: "125.0000" }) },
    collectionCase: { findFirst: jest.fn().mockResolvedValue(null) },
    organizationMember: { findFirst: jest.fn().mockResolvedValue({ id: "member-1" }) },
    $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
    ...overrides,
  };
}

function makeTransactionClient(overrides: Record<string, any> = {}) {
  return {
    collectionCase: {
      create: jest.fn().mockResolvedValue(makeCollectionCase()),
      update: jest.fn().mockResolvedValue(makeCollectionCase()),
    },
    journalEntry: { create: jest.fn() },
    customerPayment: { create: jest.fn() },
    creditNote: { create: jest.fn() },
    emailOutbox: { create: jest.fn() },
    zatcaInvoiceMetadata: { upsert: jest.fn() },
    ...overrides,
  };
}

function makeCreateDto(overrides: Record<string, unknown> = {}) {
  return {
    customerId: "customer-1",
    salesInvoiceId: "invoice-1",
    priority: CollectionPriority.NORMAL,
    followUpDate: "2026-06-08",
    promisedPaymentDate: "2026-06-10",
    promisedAmount: "50",
    summary: "Customer promised on phone",
    notes: "Internal follow-up note",
    ...overrides,
  };
}

function makeCollectionCase(overrides: Record<string, any> = {}) {
  return {
    id: "case-1",
    organizationId: "org-1",
    caseNumber: "COL-000001",
    customerId: "customer-1",
    salesInvoiceId: "invoice-1",
    status: CollectionCaseStatus.OPEN,
    priority: CollectionPriority.NORMAL,
    followUpDate: new Date("2026-06-08T00:00:00.000Z"),
    promisedPaymentDate: new Date("2026-06-10T00:00:00.000Z"),
    promisedAmount: "50.0000",
    assignedToUserId: null,
    lastActivityAt: null,
    nextActionAt: new Date("2026-06-08T00:00:00.000Z"),
    summary: "Customer promised on phone",
    notes: "Internal follow-up note",
    createdById: "user-1",
    updatedById: "user-1",
    createdAt: new Date("2026-06-04T00:00:00.000Z"),
    updatedAt: new Date("2026-06-04T00:00:00.000Z"),
    customer: { id: "customer-1", name: "Beta Customer", displayName: null, email: null, phone: null, type: ContactType.CUSTOMER },
    salesInvoice: { id: "invoice-1", invoiceNumber: "INV-001", customerId: "customer-1", issueDate: new Date("2026-05-01T00:00:00.000Z"), dueDate: new Date("2026-05-31T00:00:00.000Z"), currency: "SAR", status: SalesInvoiceStatus.FINALIZED, total: "125.0000", balanceDue: "125.0000" },
    assignedTo: null,
    createdBy: null,
    updatedBy: null,
    activities: [],
    ...overrides,
  };
}

function makeActivity(overrides: Record<string, any> = {}) {
  return {
    id: "activity-1",
    organizationId: "org-1",
    collectionCaseId: "case-1",
    customerId: "customer-1",
    salesInvoiceId: "invoice-1",
    activityType: CollectionActivityType.REMINDER_PLANNED,
    activityDate: new Date("2026-06-04T00:00:00.000Z"),
    note: "Plan a reminder call only.",
    nextFollowUpDate: new Date("2026-06-11T00:00:00.000Z"),
    promisedPaymentDate: null,
    promisedAmount: null,
    createdById: "user-1",
    createdAt: new Date("2026-06-04T00:00:00.000Z"),
    createdBy: null,
    ...overrides,
  };
}
