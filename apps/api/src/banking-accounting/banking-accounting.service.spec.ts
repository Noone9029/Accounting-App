import {
  AccountType,
  BankDepositBatchLineSourceType,
  BankDepositBatchStatus,
  CardSettlementStatus,
  CardSettlementType,
  ChequeInstrumentStatus,
  ChequeInstrumentType,
  JournalEntryStatus,
  NumberSequenceScope,
  Prisma,
} from "@prisma/client";
import { BankingAccountingService } from "./banking-accounting.service";

const d = (value: string) => new Prisma.Decimal(value);

const account = (id: string, type: AccountType, overrides: Record<string, unknown> = {}) => ({
  id,
  code: id.toUpperCase(),
  name: id.replace(/-/g, " "),
  type,
  allowPosting: true,
  isActive: true,
  ...overrides,
});

const bankAccount = account("bank-account", AccountType.ASSET);
const undepositedFunds = account("undeposited-funds", AccountType.ASSET);
const cardLiability = account("card-liability", AccountType.LIABILITY);
const prepaidAsset = account("prepaid-card-asset", AccountType.ASSET);

function config(overrides: Record<string, unknown> = {}) {
  return {
    id: "cfg-1",
    organizationId: "org-1",
    enabled: true,
    undepositedFundsAccountId: undepositedFunds.id,
    chequeInHandAccountId: null,
    outstandingChequesAccountId: null,
    cardClearingAccountId: null,
    creditCardLiabilityAccountId: cardLiability.id,
    prepaidCardAssetAccountId: prepaidAsset.id,
    createdById: "user-1",
    updatedById: "user-1",
    createdAt: new Date("2026-06-13T00:00:00.000Z"),
    updatedAt: new Date("2026-06-13T00:00:00.000Z"),
    undepositedFundsAccount: undepositedFunds,
    chequeInHandAccount: null,
    outstandingChequesAccount: null,
    cardClearingAccount: null,
    creditCardLiabilityAccount: cardLiability,
    prepaidCardAssetAccount: prepaidAsset,
    updatedBy: null,
    ...overrides,
  };
}

function deposit(overrides: Record<string, unknown> = {}) {
  return {
    id: "dep-1",
    organizationId: "org-1",
    bankAccountProfileId: "bank-1",
    depositDate: new Date("2026-06-10T00:00:00.000Z"),
    currency: "SAR",
    status: BankDepositBatchStatus.POSTED,
    memo: null,
    totalAmount: d("300.0000"),
    postedJournalEntryId: null,
    statementTransactionId: null,
    bankAccountProfile: {
      id: "bank-1",
      displayName: "Operating bank",
      currency: "SAR",
      accountId: bankAccount.id,
      account: bankAccount,
    },
    statementTransaction: null,
    postedJournalEntry: null,
    lines: [
      {
        id: "line-1",
        sourceType: BankDepositBatchLineSourceType.MANUAL_CASH_RECEIPT,
        sourceId: null,
        reference: "CASH-1",
        amount: d("300.0000"),
        currency: "SAR",
        createdAt: new Date("2026-06-10T00:00:00.000Z"),
      },
    ],
    ...overrides,
  } as any;
}

function settlement(overrides: Record<string, unknown> = {}) {
  return {
    id: "set-1",
    organizationId: "org-1",
    settlementType: CardSettlementType.CREDIT_CARD_PAYDOWN,
    settlementDate: new Date("2026-06-11T00:00:00.000Z"),
    currency: "SAR",
    amount: d("200.0000"),
    status: CardSettlementStatus.POSTED,
    reference: "CARD-PAY",
    postedJournalEntryId: null,
    statementTransactionId: null,
    fundingBankAccountProfile: {
      id: "bank-1",
      displayName: "Operating bank",
      currency: "SAR",
      accountId: bankAccount.id,
      account: bankAccount,
    },
    cardAccountProfile: {
      id: "card-1",
      displayName: "Credit card",
      currency: "SAR",
      accountId: "card-profile-account",
      account: account("card-profile-account", AccountType.LIABILITY),
    },
    statementTransaction: null,
    postedJournalEntry: null,
    ...overrides,
  } as any;
}

function cheque(overrides: Record<string, unknown> = {}) {
  return {
    id: "cheque-1",
    organizationId: "org-1",
    chequeType: ChequeInstrumentType.RECEIVED,
    status: ChequeInstrumentStatus.RECEIVED,
    chequeNumber: "CHQ-1",
    amount: d("150.0000"),
    currency: "SAR",
    postedJournalEntryId: null,
    bankAccountProfile: {
      id: "bank-1",
      displayName: "Operating bank",
      currency: "SAR",
      accountId: bankAccount.id,
      account: bankAccount,
    },
    depositBatch: null,
    statementTransaction: null,
    postedJournalEntry: null,
    ...overrides,
  } as any;
}

function makeService(overrides: Record<string, unknown> = {}) {
  const prisma = {
    bankingClearingAccountConfig: {
      findUnique: jest.fn().mockResolvedValue(config()),
      upsert: jest.fn().mockResolvedValue(config()),
    },
    account: {
      findFirst: jest.fn().mockResolvedValue(bankAccount),
      findMany: jest.fn().mockImplementation(async ({ where }: any) => {
        const all = [bankAccount, undepositedFunds, cardLiability, prepaidAsset];
        return all.filter((item) => where.id.in.includes(item.id));
      }),
    },
    bankDepositBatch: {
      findFirst: jest.fn().mockResolvedValue(deposit()),
      findFirstOrThrow: jest.fn().mockResolvedValue(deposit({ postedJournalEntryId: "journal-1" })),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    customerPayment: { findFirst: jest.fn() },
    chequeInstrument: { findFirst: jest.fn().mockResolvedValue(cheque()) },
    cardSettlement: {
      findFirst: jest.fn().mockResolvedValue(settlement()),
      findFirstOrThrow: jest.fn().mockResolvedValue(settlement({ postedJournalEntryId: "journal-1" })),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    bankReconciliation: { findFirst: jest.fn().mockResolvedValue(null) },
    journalEntry: {
      create: jest.fn().mockResolvedValue({
        id: "journal-1",
        entryNumber: "JE-000001",
        status: JournalEntryStatus.POSTED,
        totalDebit: "300.0000",
        totalCredit: "300.0000",
      }),
    },
    $transaction: jest.fn((callback: (tx: any) => Promise<unknown>) => callback(prisma)),
    ...overrides,
  } as any;
  const auditLog = { log: jest.fn() };
  const numbers = { next: jest.fn().mockResolvedValue("JE-000001") };
  const fiscal = { assertPostingDateAllowed: jest.fn() };
  const service = new BankingAccountingService(prisma, auditLog as any, numbers as any, fiscal as any);
  return { service, prisma, auditLog, numbers, fiscal };
}

describe("BankingAccountingService", () => {
  it("validates clearing account org scope and classification", async () => {
    const { service, prisma } = makeService();
    prisma.account.findFirst
      .mockResolvedValueOnce(account("bad-revenue", AccountType.REVENUE))
      .mockResolvedValueOnce(null);

    await expect(
      service.validateConfig("org-1", {
        undepositedFundsAccountId: "bad-revenue",
        creditCardLiabilityAccountId: "missing-liability",
        enabled: true,
      }),
    ).resolves.toMatchObject({
      valid: false,
      reasons: expect.arrayContaining(["Undeposited funds account must be ASSET.", "Credit-card liability account is not configured."]),
    });
  });

  it("blocks deposit journal posting when config is missing", async () => {
    const { service, prisma } = makeService();
    prisma.bankingClearingAccountConfig.findUnique.mockResolvedValue(null);

    await expect(service.depositPreflight("org-1", "dep-1")).resolves.toMatchObject({
      status: "BLOCKED",
      reasons: expect.arrayContaining(["Banking clearing-account config is missing."]),
    });
    await expect(service.postDepositJournal("org-1", "user-1", "dep-1")).rejects.toThrow("Banking clearing-account config is missing.");
    expect(prisma.journalEntry.create).not.toHaveBeenCalled();
  });

  it("posts a balanced deposit journal from bank to undeposited funds only on explicit call", async () => {
    const { service, prisma, auditLog, numbers, fiscal } = makeService();

    await expect(service.postDepositJournal("org-1", "user-1", "dep-1")).resolves.toMatchObject({
      journalEntry: { id: "journal-1", entryNumber: "JE-000001" },
    });

    expect(fiscal.assertPostingDateAllowed).toHaveBeenCalledWith("org-1", new Date("2026-06-10T00:00:00.000Z"), prisma);
    expect(numbers.next).toHaveBeenCalledWith("org-1", NumberSequenceScope.JOURNAL_ENTRY, prisma);
    expect(prisma.journalEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: JournalEntryStatus.POSTED,
          totalDebit: "300.0000",
          totalCredit: "300.0000",
          lines: {
            create: [
              expect.objectContaining({ account: { connect: { id: bankAccount.id } }, debit: "300.0000", credit: "0.0000" }),
              expect.objectContaining({ account: { connect: { id: undepositedFunds.id } }, debit: "0.0000", credit: "300.0000" }),
            ],
          },
        }),
      }),
    );
    expect(prisma.bankDepositBatch.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ postedJournalEntryId: null }) }),
    );
    expect(auditLog.log).toHaveBeenCalledWith(expect.objectContaining({ action: "BANK_DEPOSIT_BATCH_JOURNAL_POSTED" }));
  });

  it("blocks duplicate deposit journal posting", async () => {
    const { service, prisma } = makeService();
    prisma.bankDepositBatch.findFirst.mockResolvedValueOnce(
      deposit({ postedJournalEntryId: "journal-existing", postedJournalEntry: { id: "journal-existing", entryNumber: "JE-OLD", status: JournalEntryStatus.POSTED } }),
    );

    await expect(service.depositPreflight("org-1", "dep-1")).resolves.toMatchObject({
      status: "POSTED",
      journalEntryId: "journal-existing",
    });
    expect(prisma.journalEntry.create).not.toHaveBeenCalled();
  });

  it("posts credit-card paydown and prepaid top-up journals without creating expenses or allocations", async () => {
    const { service, prisma } = makeService();

    await expect(service.postCardSettlementJournal("org-1", "user-1", "set-1")).resolves.toMatchObject({ journalEntry: { id: "journal-1" } });
    expect(prisma.journalEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          lines: {
            create: [
              expect.objectContaining({ account: { connect: { id: cardLiability.id } }, debit: "200.0000", credit: "0.0000" }),
              expect.objectContaining({ account: { connect: { id: bankAccount.id } }, debit: "0.0000", credit: "200.0000" }),
            ],
          },
        }),
      }),
    );

    prisma.journalEntry.create.mockClear();
    prisma.cardSettlement.findFirst.mockResolvedValueOnce(
      settlement({
        settlementType: CardSettlementType.PREPAID_CARD_TOP_UP,
        cardAccountProfile: {
          id: "wallet-1",
          displayName: "Prepaid card",
          currency: "SAR",
          accountId: "wallet-profile-account",
          account: account("wallet-profile-account", AccountType.ASSET),
        },
      }),
    );

    await expect(service.postCardSettlementJournal("org-1", "user-1", "set-1")).resolves.toBeTruthy();
    expect(prisma.journalEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          lines: {
            create: [
              expect.objectContaining({ account: { connect: { id: prepaidAsset.id } }, debit: "200.0000", credit: "0.0000" }),
              expect.objectContaining({ account: { connect: { id: bankAccount.id } }, debit: "0.0000", credit: "200.0000" }),
            ],
          },
        }),
      }),
    );
  });

  it("keeps credit-card credits and direct cheques operational-only", async () => {
    const { service, prisma, auditLog } = makeService();
    prisma.cardSettlement.findFirst.mockResolvedValueOnce(settlement({ settlementType: CardSettlementType.CREDIT_CARD_CREDIT, fundingBankAccountProfile: null }));

    await expect(service.cardSettlementPreflight("org-1", "set-1")).resolves.toMatchObject({
      status: "BLOCKED",
      reasons: expect.arrayContaining(["Credit-card credits/refunds remain operational-only until a safe offset or clearing policy is confirmed."]),
    });
    await expect(service.chequePreflight("org-1", "cheque-1")).resolves.toMatchObject({
      status: "OPERATIONAL_ONLY",
      ready: false,
    });
    await expect(service.postChequeJournal("org-1", "user-1", "cheque-1")).rejects.toThrow("Direct received-cheque journal posting remains deferred");
    expect(prisma.journalEntry.create).not.toHaveBeenCalled();
    expect(auditLog.log).not.toHaveBeenCalled();
  });
});
