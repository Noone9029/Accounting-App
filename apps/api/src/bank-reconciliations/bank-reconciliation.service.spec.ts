import {
  BankAccountStatus,
  BankAccountType,
  BankReconciliationStatus,
  BankStatementTransactionStatus,
  BankStatementTransactionType,
  NumberSequenceScope,
  Prisma,
} from "@prisma/client";
import { BankReconciliationService } from "./bank-reconciliation.service";

describe("BankReconciliationService", () => {
  const periodStart = new Date("2026-05-01T00:00:00.000Z");
  const periodEnd = new Date("2026-05-31T23:59:59.999Z");
  const profile = {
    id: "profile-1",
    organizationId: "org-1",
    accountId: "bank-account",
    type: BankAccountType.BANK,
    status: BankAccountStatus.ACTIVE,
    displayName: "Operating Bank",
    currency: "SAR",
    account: { id: "bank-account", code: "112", name: "Bank Account" },
  };
  const draft = {
    id: "rec-1",
    organizationId: "org-1",
    bankAccountProfileId: "profile-1",
    reconciliationNumber: "REC-000001",
    periodStart,
    periodEnd,
    statementOpeningBalance: new Prisma.Decimal("0.0000"),
    statementClosingBalance: new Prisma.Decimal("100.0000"),
    ledgerClosingBalance: new Prisma.Decimal("100.0000"),
    difference: new Prisma.Decimal("0.0000"),
    status: BankReconciliationStatus.DRAFT,
    notes: null,
    createdById: "user-1",
    closedById: null,
    voidedById: null,
    closedAt: null,
    voidedAt: null,
    createdAt: new Date("2026-05-13T00:00:00.000Z"),
    updatedAt: new Date("2026-05-13T00:00:00.000Z"),
    bankAccountProfile: profile,
    createdBy: { id: "user-1", name: "Owner", email: "owner@example.com" },
    closedBy: null,
    voidedBy: null,
    _count: { items: 0 },
  };

  function makeService(
    overrides: Record<string, unknown> = {},
    collaborators: { documentSettings?: unknown; generatedDocuments?: unknown } = {},
  ) {
    const prisma = {
      organization: {
        findFirst: jest.fn().mockResolvedValue({
          id: "org-1",
          name: "LedgerByte Demo",
          legalName: null,
          taxNumber: null,
          countryCode: "SA",
          baseCurrency: "SAR",
        }),
      },
      bankAccountProfile: { findFirst: jest.fn().mockResolvedValue(profile) },
      bankReconciliation: {
        findMany: jest.fn(),
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue(draft),
        update: jest.fn().mockResolvedValue({ ...draft, status: BankReconciliationStatus.CLOSED, closedAt: new Date("2026-05-13T00:00:00.000Z") }),
      },
      bankReconciliationItem: {
        findMany: jest.fn().mockResolvedValue([]),
        createMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      bankStatementTransaction: {
        count: jest.fn().mockResolvedValue(0),
        findMany: jest.fn().mockResolvedValue([]),
      },
      journalLine: { findMany: jest.fn().mockResolvedValue([]) },
      $transaction: jest.fn(),
      ...overrides,
    } as any;
    if (overrides.$transaction === undefined) {
      prisma.$transaction = jest.fn((callback: (client: Record<string, unknown>) => Promise<unknown>) => callback(prisma));
    }
    const audit = { log: jest.fn() };
    const numbers = { next: jest.fn().mockResolvedValue("REC-000001") };
    return {
      service: new BankReconciliationService(
        prisma as never,
        audit as never,
        numbers as never,
        collaborators.documentSettings as never,
        collaborators.generatedDocuments as never,
      ),
      prisma,
      audit,
      numbers,
    };
  }

  it("creates a draft reconciliation with calculated ledger closing balance and difference", async () => {
    const { service, prisma, numbers, audit } = makeService();
    prisma.journalLine.findMany.mockResolvedValue([{ debit: new Prisma.Decimal("80.0000"), credit: new Prisma.Decimal("5.0000") }]);
    prisma.bankReconciliation.create.mockImplementation((args: { data: Record<string, unknown> }) =>
      Promise.resolve({ ...draft, ...args.data, bankAccountProfile: profile, _count: { items: 0 } }),
    );

    await expect(
      service.create("org-1", "user-1", "profile-1", {
        periodStart: "2026-05-01",
        periodEnd: "2026-05-31",
        statementClosingBalance: "100.0000",
      }),
    ).resolves.toMatchObject({
      reconciliationNumber: "REC-000001",
      ledgerClosingBalance: "75.0000",
      difference: "25.0000",
      status: BankReconciliationStatus.DRAFT,
      unmatchedTransactionCount: 0,
    });
    expect(numbers.next).toHaveBeenCalledWith("org-1", NumberSequenceScope.BANK_RECONCILIATION, prisma);
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: "CREATE", entityType: "BankReconciliation" }));
  });

  it("rejects a draft that overlaps an existing closed reconciliation", async () => {
    const { service, prisma } = makeService();
    prisma.bankReconciliation.findFirst.mockResolvedValue({ id: "closed-rec", reconciliationNumber: "REC-000000" });

    await expect(
      service.create("org-1", "user-1", "profile-1", {
        periodStart: "2026-05-01",
        periodEnd: "2026-05-31",
        statementClosingBalance: "100.0000",
      }),
    ).rejects.toThrow("Reconciliation period overlaps a closed reconciliation for this bank account.");
    expect(prisma.bankReconciliation.create).not.toHaveBeenCalled();
  });

  it("rejects close while difference is not zero and refreshes draft totals", async () => {
    const { service, prisma } = makeService();
    prisma.bankReconciliation.findFirst
      .mockResolvedValueOnce(draft)
      .mockResolvedValueOnce(draft)
      .mockResolvedValueOnce(null);
    prisma.journalLine.findMany.mockResolvedValue([{ debit: new Prisma.Decimal("90.0000"), credit: new Prisma.Decimal("0.0000") }]);

    await expect(service.close("org-1", "user-1", "rec-1")).rejects.toThrow(
      "Cannot close reconciliation while difference is not zero.",
    );
    expect(prisma.bankReconciliation.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { ledgerClosingBalance: "90.0000", difference: "10.0000" } }),
    );
    expect(prisma.bankReconciliationItem.createMany).not.toHaveBeenCalled();
  });

  it("rejects close when unmatched statement transactions remain", async () => {
    const { service, prisma } = makeService();
    prisma.bankReconciliation.findFirst
      .mockResolvedValueOnce(draft)
      .mockResolvedValueOnce(draft)
      .mockResolvedValueOnce(null);
    prisma.journalLine.findMany.mockResolvedValue([{ debit: new Prisma.Decimal("100.0000"), credit: new Prisma.Decimal("0.0000") }]);
    prisma.bankStatementTransaction.count.mockResolvedValue(1);

    await expect(service.close("org-1", "user-1", "rec-1")).rejects.toThrow(
      "Cannot close reconciliation with unmatched statement transactions.",
    );
    expect(prisma.bankReconciliationItem.createMany).not.toHaveBeenCalled();
  });

  it("closes a zero-difference draft and snapshots reconciled statement transactions", async () => {
    const closed = { ...draft, status: BankReconciliationStatus.CLOSED, closedById: "user-1", closedAt: new Date("2026-05-13T00:00:00.000Z") };
    const { service, prisma, audit } = makeService();
    prisma.bankReconciliation.findFirst
      .mockResolvedValueOnce(draft)
      .mockResolvedValueOnce(draft)
      .mockResolvedValueOnce(null);
    prisma.journalLine.findMany.mockResolvedValue([{ debit: new Prisma.Decimal("100.0000"), credit: new Prisma.Decimal("0.0000") }]);
    prisma.bankStatementTransaction.findMany.mockResolvedValue([
      { id: "statement-1", status: BankStatementTransactionStatus.MATCHED, amount: new Prisma.Decimal("60.0000"), type: BankStatementTransactionType.CREDIT },
      { id: "statement-2", status: BankStatementTransactionStatus.IGNORED, amount: new Prisma.Decimal("40.0000"), type: BankStatementTransactionType.CREDIT },
    ]);
    prisma.bankReconciliation.update.mockResolvedValue(closed);

    await expect(service.close("org-1", "user-1", "rec-1")).resolves.toMatchObject({
      status: BankReconciliationStatus.CLOSED,
      unmatchedTransactionCount: 0,
    });
    expect(prisma.bankReconciliationItem.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: [
          expect.objectContaining({ statementTransactionId: "statement-1", statusAtClose: BankStatementTransactionStatus.MATCHED }),
          expect.objectContaining({ statementTransactionId: "statement-2", statusAtClose: BankStatementTransactionStatus.IGNORED }),
        ],
        skipDuplicates: true,
      }),
    );
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: "CLOSE", entityType: "BankReconciliation" }));
  });

  it("voids draft or closed reconciliations without mutating journals", async () => {
    const closed = { ...draft, status: BankReconciliationStatus.CLOSED };
    const voided = { ...closed, status: BankReconciliationStatus.VOIDED, voidedById: "user-1", voidedAt: new Date("2026-05-13T00:00:00.000Z") };
    const { service, prisma, audit } = makeService();
    prisma.bankReconciliation.findFirst.mockResolvedValue(closed);
    prisma.bankReconciliation.update.mockResolvedValue(voided);

    await expect(service.void("org-1", "user-1", "rec-1")).resolves.toMatchObject({ status: BankReconciliationStatus.VOIDED });
    expect(prisma.journalLine.findMany).not.toHaveBeenCalled();
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: "VOID", entityType: "BankReconciliation" }));
  });

  it("keeps tenant isolation on reconciliation detail lookup", async () => {
    const { service, prisma } = makeService();
    prisma.bankReconciliation.findFirst.mockResolvedValue(null);

    await expect(service.get("org-2", "rec-1")).rejects.toThrow("Bank reconciliation not found.");
    expect(prisma.bankReconciliation.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "rec-1", organizationId: "org-2" } }),
    );
  });

  it("returns reconciliation report data with snapshotted items", async () => {
    const { service, prisma } = makeService();
    prisma.bankReconciliation.findFirst.mockResolvedValue({
      ...draft,
      status: BankReconciliationStatus.CLOSED,
      closedAt: new Date("2026-05-13T00:00:00.000Z"),
      closedBy: { id: "user-1", name: "Owner", email: "owner@example.com" },
      voidedBy: null,
      bankAccountProfile: profile,
      items: [
        {
          id: "item-1",
          statementTransactionId: "statement-1",
          statusAtClose: BankStatementTransactionStatus.MATCHED,
          amount: new Prisma.Decimal("100.0000"),
          type: BankStatementTransactionType.CREDIT,
          statementTransaction: {
            id: "statement-1",
            transactionDate: new Date("2026-05-10T00:00:00.000Z"),
            description: "Customer deposit",
            reference: "REF-1",
          },
        },
      ],
    });

    const result = await service.reportData("org-1", "rec-1");

    expect(result.reconciliation.reconciliationNumber).toBe("REC-000001");
    expect(result.items).toEqual([
      expect.objectContaining({
        statementTransactionId: "statement-1",
        description: "Customer deposit",
        amount: "100.0000",
        statusAtClose: BankStatementTransactionStatus.MATCHED,
      }),
    ]);
    expect(result.summary).toMatchObject({ itemCount: 1, creditTotal: "100.0000", matchedCount: 1 });
    expect(prisma.bankReconciliation.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "rec-1", organizationId: "org-1" } }),
    );
  });

  it("archives bank reconciliation report PDFs", async () => {
    const generatedDocuments = { archivePdf: jest.fn().mockResolvedValue({ id: "doc-1" }) };
    const documentSettings = { statementRenderSettings: jest.fn().mockResolvedValue({}) };
    const { service, prisma } = makeService({}, { generatedDocuments, documentSettings });
    prisma.bankReconciliation.findFirst.mockResolvedValue({
      ...draft,
      status: BankReconciliationStatus.CLOSED,
      closedAt: new Date("2026-05-13T00:00:00.000Z"),
      closedBy: { id: "user-1", name: "Owner", email: "owner@example.com" },
      voidedBy: null,
      bankAccountProfile: profile,
      items: [],
    });

    const result = await service.reportPdf("org-1", "user-1", "rec-1");

    expect(result.filename).toBe("reconciliation-REC-000001.pdf");
    expect(result.buffer.subarray(0, 4).toString()).toBe("%PDF");
    expect(generatedDocuments.archivePdf).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-1",
        documentType: "BANK_RECONCILIATION_REPORT",
        sourceType: "BankReconciliation",
        sourceId: "rec-1",
        generatedById: "user-1",
      }),
    );
  });
});
