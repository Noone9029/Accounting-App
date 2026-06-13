import {
  AccountType,
  BankAccountStatus,
  BankDepositBatchLineSourceType,
  BankDepositBatchStatus,
  BankStatementMatchType,
  BankStatementTransactionStatus,
  BankStatementTransactionType,
  ChequeInstrumentStatus,
  ChequeInstrumentType,
  Prisma,
} from "@prisma/client";
import { ChequeService } from "./cheque.service";

function mockPrisma(): any {
  return {
    chequeInstrument: { findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
    bankAccountProfile: { findFirst: jest.fn() },
    bankDepositBatch: { findFirst: jest.fn(), update: jest.fn() },
    bankDepositBatchLine: { findFirst: jest.fn(), create: jest.fn(), findMany: jest.fn() },
    bankStatementTransaction: { findMany: jest.fn(), findFirst: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
    bankReconciliation: { findFirst: jest.fn() },
    $transaction: jest.fn(async (callback) => callback(mockPrismaInstance)),
  };
}

let mockPrismaInstance: any;

const auditLog = { log: jest.fn() };

const profile = {
  id: "bank-1",
  organizationId: "org-1",
  displayName: "Operating bank",
  currency: "SAR",
  status: BankAccountStatus.ACTIVE,
  account: { type: AccountType.ASSET, allowPosting: true, isActive: true },
};

const baseCheque = {
  id: "cheque-1",
  organizationId: "org-1",
  chequeType: ChequeInstrumentType.RECEIVED,
  status: ChequeInstrumentStatus.DRAFT,
  bankAccountProfileId: "bank-1",
  depositBatchId: null,
  statementTransactionId: null,
  counterpartyType: "CUSTOMER",
  counterpartyId: null,
  counterpartyName: "Customer A",
  chequeNumber: "CHQ-100",
  drawerBankName: "Drawer Bank",
  payeeName: null,
  issueDate: new Date("2026-06-01T00:00:00.000Z"),
  receivedDate: new Date("2026-06-02T00:00:00.000Z"),
  dueDate: new Date("2026-06-05T00:00:00.000Z"),
  depositDate: null,
  clearedDate: null,
  bouncedDate: null,
  voidedDate: null,
  amount: new Prisma.Decimal("150.0000"),
  currency: "SAR",
  reference: "REF-1",
  memo: null,
  bounceReason: null,
  voidReason: null,
  createdById: "user-1",
  updatedById: "user-1",
  createdAt: new Date("2026-06-01T00:00:00.000Z"),
  updatedAt: new Date("2026-06-01T00:00:00.000Z"),
  bankAccountProfile: profile,
  depositBatch: null,
  statementTransaction: null,
  createdBy: null,
  updatedBy: null,
};

function cheque(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return { ...baseCheque, ...overrides };
}

describe("ChequeService", () => {
  let service: ChequeService;
  let prisma: any;

  beforeEach(() => {
    mockPrismaInstance = mockPrisma();
    prisma = mockPrismaInstance;
    service = new ChequeService(prisma as never, auditLog as never);
    auditLog.log.mockClear();
    prisma.bankAccountProfile.findFirst.mockResolvedValue(profile);
    prisma.bankReconciliation.findFirst.mockResolvedValue(null);
  });

  it("creates a draft received cheque without posting journals or payments", async () => {
    prisma.chequeInstrument.create.mockResolvedValue(cheque());

    await expect(
      service.create("org-1", "user-1", {
        chequeType: ChequeInstrumentType.RECEIVED,
        bankAccountProfileId: "bank-1",
        counterpartyName: "Customer A",
        chequeNumber: "CHQ-100",
        receivedDate: "2026-06-02",
        amount: "150",
        currency: "SAR",
      }),
    ).resolves.toMatchObject({ status: ChequeInstrumentStatus.DRAFT });

    expect(prisma.chequeInstrument.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: ChequeInstrumentStatus.DRAFT, amount: "150.0000" }) }),
    );
    expect((prisma as Record<string, unknown>).journalEntry).toBeUndefined();
    expect((prisma as Record<string, unknown>).customerPayment).toBeUndefined();
  });

  it("creates a draft issued cheque", async () => {
    prisma.chequeInstrument.create.mockResolvedValue(cheque({ chequeType: ChequeInstrumentType.ISSUED }));

    await expect(
      service.create("org-1", "user-1", {
        chequeType: ChequeInstrumentType.ISSUED,
        bankAccountProfileId: "bank-1",
        counterpartyName: "Supplier A",
        chequeNumber: "OUT-100",
        issueDate: "2026-06-02",
        amount: "75",
        currency: "SAR",
      }),
    ).resolves.toMatchObject({ chequeType: ChequeInstrumentType.ISSUED });
  });

  it("blocks non-positive amounts and missing cheque numbers", async () => {
    await expect(
      service.create("org-1", "user-1", {
        chequeType: ChequeInstrumentType.RECEIVED,
        counterpartyName: "Customer A",
        chequeNumber: "CHQ-100",
        amount: "0",
        currency: "SAR",
      }),
    ).rejects.toThrow("Cheque amount must be greater than zero.");

    await expect(
      service.create("org-1", "user-1", {
        chequeType: ChequeInstrumentType.RECEIVED,
        counterpartyName: "Customer A",
        chequeNumber: " ",
        amount: "10",
        currency: "SAR",
      }),
    ).rejects.toThrow("Cheque number is required.");
  });

  it("marks draft received and issued cheques open only through valid transitions", async () => {
    prisma.chequeInstrument.findFirst.mockResolvedValueOnce(cheque());
    prisma.chequeInstrument.update.mockResolvedValueOnce(cheque({ status: ChequeInstrumentStatus.RECEIVED }));
    await expect(service.markReceived("org-1", "user-1", "cheque-1")).resolves.toMatchObject({ status: ChequeInstrumentStatus.RECEIVED });

    prisma.chequeInstrument.findFirst.mockResolvedValueOnce(cheque({ chequeType: ChequeInstrumentType.ISSUED, receivedDate: null }));
    prisma.chequeInstrument.update.mockResolvedValueOnce(cheque({ chequeType: ChequeInstrumentType.ISSUED, status: ChequeInstrumentStatus.ISSUED }));
    await expect(service.markIssued("org-1", "user-1", "cheque-1")).resolves.toMatchObject({ status: ChequeInstrumentStatus.ISSUED });

    prisma.chequeInstrument.findFirst.mockResolvedValueOnce(cheque({ status: ChequeInstrumentStatus.RECEIVED }));
    await expect(service.markReceived("org-1", "user-1", "cheque-1")).rejects.toThrow("Only draft received cheques");
  });

  it("deposits a received cheque into a draft deposit batch and blocks reuse", async () => {
    const depositBatch = {
      id: "dep-1",
      organizationId: "org-1",
      bankAccountProfileId: "bank-1",
      depositDate: new Date("2026-06-03T00:00:00.000Z"),
      currency: "SAR",
      status: BankDepositBatchStatus.DRAFT,
      bankAccountProfile: profile,
    };
    prisma.chequeInstrument.findFirst.mockResolvedValueOnce(cheque({ status: ChequeInstrumentStatus.RECEIVED }));
    prisma.bankDepositBatch.findFirst.mockResolvedValue(depositBatch);
    prisma.bankDepositBatchLine.findFirst.mockResolvedValue(null);
    prisma.bankDepositBatchLine.findMany.mockResolvedValue([{ amount: new Prisma.Decimal("150.0000") }]);
    prisma.chequeInstrument.update.mockResolvedValue(cheque({ status: ChequeInstrumentStatus.DEPOSITED, depositBatchId: "dep-1" }));

    await expect(service.deposit("org-1", "user-1", "cheque-1", { depositBatchId: "dep-1" })).resolves.toMatchObject({
      status: ChequeInstrumentStatus.DEPOSITED,
      depositBatchId: "dep-1",
    });
    expect(prisma.bankDepositBatchLine.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          sourceType: BankDepositBatchLineSourceType.CHEQUE_PLACEHOLDER,
          sourceId: "cheque-1",
          amount: "150.0000",
        }),
      }),
    );

    prisma.chequeInstrument.findFirst.mockResolvedValueOnce(cheque({ status: ChequeInstrumentStatus.RECEIVED }));
    prisma.bankDepositBatchLine.findFirst.mockResolvedValueOnce({ id: "line-1" });
    await expect(service.deposit("org-1", "user-1", "cheque-1", { depositBatchId: "dep-1" })).rejects.toThrow("already linked");
  });

  it("blocks issued cheque deposit", async () => {
    prisma.chequeInstrument.findFirst.mockResolvedValue(cheque({ chequeType: ChequeInstrumentType.ISSUED, status: ChequeInstrumentStatus.ISSUED }));
    await expect(service.deposit("org-1", "user-1", "cheque-1", { depositBatchId: "dep-1" })).rejects.toThrow("Only received cheques");
  });

  it("finds and matches received cheque credit rows explicitly", async () => {
    const openCheque = cheque({ status: ChequeInstrumentStatus.DEPOSITED });
    const transaction = {
      id: "stmt-1",
      organizationId: "org-1",
      bankAccountProfileId: "bank-1",
      transactionDate: new Date("2026-06-04T00:00:00.000Z"),
      type: BankStatementTransactionType.CREDIT,
      status: BankStatementTransactionStatus.UNMATCHED,
      amount: new Prisma.Decimal("150.0000"),
      bankAccountProfile: { id: "bank-1", currency: "SAR" },
    };
    prisma.chequeInstrument.findFirst.mockResolvedValueOnce(openCheque);
    prisma.bankStatementTransaction.findMany.mockResolvedValueOnce([transaction]);
    await expect(service.matchCandidates("org-1", "cheque-1")).resolves.toHaveLength(1);

    prisma.chequeInstrument.findFirst.mockResolvedValueOnce(openCheque);
    prisma.bankStatementTransaction.findFirst.mockResolvedValueOnce(transaction);
    prisma.bankStatementTransaction.updateMany.mockResolvedValueOnce({ count: 1 });
    prisma.chequeInstrument.update.mockResolvedValueOnce(cheque({ status: ChequeInstrumentStatus.CLEARED, statementTransactionId: "stmt-1" }));
    await expect(service.matchStatementTransaction("org-1", "user-1", "cheque-1", { statementTransactionId: "stmt-1" })).resolves.toMatchObject({
      status: ChequeInstrumentStatus.CLEARED,
      statementTransactionId: "stmt-1",
    });
    expect(prisma.bankStatementTransaction.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: BankStatementTransactionStatus.MATCHED, matchType: BankStatementMatchType.OTHER },
      }),
    );
  });

  it("blocks wrong direction, wrong amount, wrong account, and closed reconciliation matches", async () => {
    const openCheque = cheque({ status: ChequeInstrumentStatus.RECEIVED });
    prisma.chequeInstrument.findFirst.mockResolvedValue(openCheque);
    prisma.bankStatementTransaction.findFirst.mockResolvedValue({
      id: "stmt-1",
      bankAccountProfileId: "bank-1",
      transactionDate: new Date("2026-06-04T00:00:00.000Z"),
      type: BankStatementTransactionType.DEBIT,
      status: BankStatementTransactionStatus.UNMATCHED,
      amount: new Prisma.Decimal("150.0000"),
      bankAccountProfile: { currency: "SAR" },
    });
    await expect(service.matchStatementTransaction("org-1", "user-1", "cheque-1", { statementTransactionId: "stmt-1" })).rejects.toThrow(
      "direction",
    );

    prisma.bankStatementTransaction.findFirst.mockResolvedValueOnce({
      id: "stmt-2",
      bankAccountProfileId: "bank-2",
      transactionDate: new Date("2026-06-04T00:00:00.000Z"),
      type: BankStatementTransactionType.CREDIT,
      status: BankStatementTransactionStatus.UNMATCHED,
      amount: new Prisma.Decimal("150.0000"),
      bankAccountProfile: { currency: "SAR" },
    });
    await expect(service.matchStatementTransaction("org-1", "user-1", "cheque-1", { statementTransactionId: "stmt-2" })).rejects.toThrow(
      "selected bank account",
    );

    prisma.bankStatementTransaction.findFirst.mockResolvedValueOnce({
      id: "stmt-3",
      bankAccountProfileId: "bank-1",
      transactionDate: new Date("2026-06-04T00:00:00.000Z"),
      type: BankStatementTransactionType.CREDIT,
      status: BankStatementTransactionStatus.UNMATCHED,
      amount: new Prisma.Decimal("10.0000"),
      bankAccountProfile: { currency: "SAR" },
    });
    await expect(service.matchStatementTransaction("org-1", "user-1", "cheque-1", { statementTransactionId: "stmt-3" })).rejects.toThrow(
      "amount",
    );

    prisma.bankReconciliation.findFirst.mockResolvedValueOnce({ id: "rec-1", reconciliationNumber: "REC-1" });
    prisma.bankStatementTransaction.findFirst.mockResolvedValueOnce({
      id: "stmt-4",
      bankAccountProfileId: "bank-1",
      transactionDate: new Date("2026-06-04T00:00:00.000Z"),
      type: BankStatementTransactionType.CREDIT,
      status: BankStatementTransactionStatus.UNMATCHED,
      amount: new Prisma.Decimal("150.0000"),
      bankAccountProfile: { currency: "SAR" },
    });
    await expect(service.matchStatementTransaction("org-1", "user-1", "cheque-1", { statementTransactionId: "stmt-4" })).rejects.toThrow(
      "closed reconciliation",
    );
  });

  it("requires reasons for bounce and void, and unmatches safely", async () => {
    prisma.chequeInstrument.findFirst.mockResolvedValueOnce(cheque({ status: ChequeInstrumentStatus.RECEIVED }));
    await expect(service.bounce("org-1", "user-1", "cheque-1", { bounceReason: "" })).rejects.toThrow("Bounce reason is required.");

    prisma.chequeInstrument.findFirst.mockResolvedValueOnce(cheque({ status: ChequeInstrumentStatus.RECEIVED }));
    await expect(service.void("org-1", "user-1", "cheque-1", { voidReason: "" })).rejects.toThrow("Void reason is required.");

    prisma.chequeInstrument.findFirst.mockResolvedValueOnce(
      cheque({
        status: ChequeInstrumentStatus.CLEARED,
        statementTransactionId: "stmt-1",
        statementTransaction: { id: "stmt-1", bankAccountProfileId: "bank-1", transactionDate: new Date("2026-06-04T00:00:00.000Z") },
      }),
    );
    prisma.chequeInstrument.update.mockResolvedValueOnce(cheque({ status: ChequeInstrumentStatus.RECEIVED, statementTransactionId: null }));
    await expect(service.unmatchStatementTransaction("org-1", "user-1", "cheque-1")).resolves.toMatchObject({
      status: ChequeInstrumentStatus.RECEIVED,
      statementTransactionId: null,
    });
  });
});
