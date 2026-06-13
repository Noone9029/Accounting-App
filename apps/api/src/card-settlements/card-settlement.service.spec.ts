import {
  AccountType,
  BankAccountStatus,
  BankAccountType,
  BankStatementMatchType,
  BankStatementTransactionStatus,
  BankStatementTransactionType,
  CardSettlementStatus,
  CardSettlementType,
  Prisma,
} from "@prisma/client";
import { CardSettlementService } from "./card-settlement.service";

describe("CardSettlementService", () => {
  const fundingProfile = profile({ id: "bank-1", displayName: "Main bank", type: BankAccountType.BANK });
  const cardProfile = profile({ id: "card-1", displayName: "Corporate card", type: BankAccountType.CARD });
  const prepaidProfile = profile({ id: "wallet-1", displayName: "Prepaid card", type: BankAccountType.WALLET });

  function profile(overrides: Record<string, unknown> = {}) {
    return {
      id: "profile-1",
      organizationId: "org-1",
      accountId: `${overrides.id ?? "profile-1"}-account`,
      displayName: "Profile",
      type: BankAccountType.BANK,
      status: BankAccountStatus.ACTIVE,
      currency: "SAR",
      account: { id: `${overrides.id ?? "profile-1"}-account`, code: "1010", name: "Profile account", type: AccountType.ASSET, allowPosting: true, isActive: true },
      ...overrides,
    } as any;
  }

  function settlement(overrides: Record<string, unknown> = {}) {
    return {
      id: "set-1",
      organizationId: "org-1",
      settlementType: CardSettlementType.CREDIT_CARD_PAYDOWN,
      fundingBankAccountProfileId: "bank-1",
      cardAccountProfileId: "card-1",
      settlementDate: new Date("2026-06-10T00:00:00.000Z"),
      currency: "SAR",
      amount: new Prisma.Decimal("300.0000"),
      status: CardSettlementStatus.DRAFT,
      memo: null,
      reference: "CARD-PAY",
      statementTransactionId: null,
      createdById: "user-1",
      updatedById: "user-1",
      postedAt: null,
      matchedAt: null,
      voidedAt: null,
      createdAt: new Date("2026-06-10T00:00:00.000Z"),
      updatedAt: new Date("2026-06-10T00:00:00.000Z"),
      fundingBankAccountProfile: fundingProfile,
      cardAccountProfile: cardProfile,
      statementTransaction: null,
      createdBy: null,
      updatedBy: null,
      ...overrides,
    } as any;
  }

  function statement(overrides: Record<string, unknown> = {}) {
    return {
      id: "stmt-1",
      organizationId: "org-1",
      bankAccountProfileId: "bank-1",
      transactionDate: new Date("2026-06-10T00:00:00.000Z"),
      description: "Card settlement",
      reference: "CARD-PAY",
      type: BankStatementTransactionType.DEBIT,
      amount: new Prisma.Decimal("300.0000"),
      status: BankStatementTransactionStatus.UNMATCHED,
      bankAccountProfile: { id: "bank-1", currency: "SAR" },
      ...overrides,
    } as any;
  }

  function makeService() {
    const prisma = {
      bankAccountProfile: {
        findFirst: jest.fn(async ({ where }: { where: { id: string } }) => {
          if (where.id === "bank-1") return fundingProfile;
          if (where.id === "card-1") return cardProfile;
          if (where.id === "wallet-1") return prepaidProfile;
          return null;
        }),
      },
      cardSettlement: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue(settlement()),
        create: jest.fn().mockResolvedValue(settlement()),
        update: jest.fn().mockResolvedValue(settlement()),
      },
      bankStatementTransaction: {
        findMany: jest.fn().mockResolvedValue([statement()]),
        findFirst: jest.fn().mockResolvedValue(statement()),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        update: jest.fn(),
      },
      bankReconciliation: { findFirst: jest.fn().mockResolvedValue(null) },
      $transaction: jest.fn((callback: (tx: any) => unknown) => callback(prisma)),
    } as any;
    const auditLogService = { log: jest.fn() } as any;
    return { service: new CardSettlementService(prisma, auditLogService), prisma, auditLogService };
  }

  it("creates draft credit card paydown settlements without creating journals or payments", async () => {
    const { service, prisma } = makeService();

    await expect(
      service.create("org-1", "user-1", {
        settlementType: CardSettlementType.CREDIT_CARD_PAYDOWN,
        fundingBankAccountProfileId: "bank-1",
        cardAccountProfileId: "card-1",
        settlementDate: "2026-06-10",
        amount: "300.0000",
        currency: "SAR",
        reference: "CARD-PAY",
      }),
    ).resolves.toMatchObject({ id: "set-1", status: CardSettlementStatus.DRAFT });

    expect(prisma.cardSettlement.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          settlementType: CardSettlementType.CREDIT_CARD_PAYDOWN,
          fundingBankAccountProfileId: "bank-1",
          cardAccountProfileId: "card-1",
          status: CardSettlementStatus.DRAFT,
          amount: "300.0000",
        }),
      }),
    );
    expect((prisma as any).journalEntry).toBeUndefined();
    expect((prisma as any).bankTransfer).toBeUndefined();
  });

  it("creates prepaid top-up and credit card credit drafts", async () => {
    const { service, prisma } = makeService();

    await expect(
      service.create("org-1", "user-1", {
        settlementType: CardSettlementType.PREPAID_CARD_TOP_UP,
        fundingBankAccountProfileId: "bank-1",
        cardAccountProfileId: "wallet-1",
        settlementDate: "2026-06-10",
        amount: "200.0000",
        currency: "SAR",
      }),
    ).resolves.toBeTruthy();

    await expect(
      service.create("org-1", "user-1", {
        settlementType: CardSettlementType.CREDIT_CARD_CREDIT,
        cardAccountProfileId: "card-1",
        settlementDate: "2026-06-10",
        amount: "75.0000",
        currency: "SAR",
      }),
    ).resolves.toBeTruthy();

    expect(prisma.cardSettlement.create).toHaveBeenCalledTimes(2);
  });

  it("validates positive amount, same account, missing funding, and currency mismatch", async () => {
    const { service } = makeService();
    await expect(
      service.create("org-1", "user-1", {
        settlementType: CardSettlementType.CREDIT_CARD_PAYDOWN,
        fundingBankAccountProfileId: "bank-1",
        cardAccountProfileId: "card-1",
        settlementDate: "2026-06-10",
        amount: "0",
        currency: "SAR",
      }),
    ).rejects.toThrow("Settlement amount must be greater than zero.");

    await expect(
      service.create("org-1", "user-1", {
        settlementType: CardSettlementType.PREPAID_CARD_TOP_UP,
        cardAccountProfileId: "wallet-1",
        settlementDate: "2026-06-10",
        amount: "100.0000",
        currency: "SAR",
      }),
    ).rejects.toThrow("Funding bank account is required for paydowns and prepaid top-ups.");

    await expect(
      service.create("org-1", "user-1", {
        settlementType: CardSettlementType.CREDIT_CARD_PAYDOWN,
        fundingBankAccountProfileId: "card-1",
        cardAccountProfileId: "card-1",
        settlementDate: "2026-06-10",
        amount: "100.0000",
        currency: "SAR",
      }),
    ).rejects.toThrow("Funding account and card account must be different.");

    await expect(
      service.create("org-1", "user-1", {
        settlementType: CardSettlementType.CREDIT_CARD_PAYDOWN,
        fundingBankAccountProfileId: "bank-1",
        cardAccountProfileId: "card-1",
        settlementDate: "2026-06-10",
        amount: "100.0000",
        currency: "USD",
      }),
    ).rejects.toThrow("Settlement currency must match the funding bank account currency.");
  });

  it("posts and voids operational settlements without journals", async () => {
    const { service, prisma } = makeService();
    prisma.cardSettlement.update
      .mockResolvedValueOnce(settlement({ status: CardSettlementStatus.POSTED }))
      .mockResolvedValueOnce(settlement({ status: CardSettlementStatus.VOIDED }));

    await expect(service.post("org-1", "user-1", "set-1")).resolves.toMatchObject({ status: CardSettlementStatus.POSTED });
    expect(prisma.cardSettlement.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: CardSettlementStatus.POSTED }) }),
    );

    prisma.cardSettlement.findFirst.mockResolvedValueOnce(settlement({ status: CardSettlementStatus.POSTED }));
    await expect(service.void("org-1", "user-1", "set-1")).resolves.toMatchObject({ status: CardSettlementStatus.VOIDED });
    expect((prisma as any).journalEntry).toBeUndefined();
  });

  it("finds statement candidates by settlement type direction and expected account", async () => {
    const { service, prisma } = makeService();
    prisma.cardSettlement.findFirst.mockResolvedValueOnce(settlement({ status: CardSettlementStatus.POSTED }));

    await expect(service.matchCandidates("org-1", "set-1")).resolves.toHaveLength(1);
    expect(prisma.bankStatementTransaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          bankAccountProfileId: "bank-1",
          status: BankStatementTransactionStatus.UNMATCHED,
          type: BankStatementTransactionType.DEBIT,
          amount: "300.0000",
        }),
      }),
    );

    prisma.cardSettlement.findFirst.mockResolvedValueOnce(
      settlement({
        status: CardSettlementStatus.POSTED,
        settlementType: CardSettlementType.CREDIT_CARD_CREDIT,
        fundingBankAccountProfileId: null,
        fundingBankAccountProfile: null,
      }),
    );
    await service.matchCandidates("org-1", "set-1");
    expect(prisma.bankStatementTransaction.findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          bankAccountProfileId: "card-1",
          type: BankStatementTransactionType.CREDIT,
        }),
      }),
    );
  });

  it("blocks wrong-account, wrong-direction, amount mismatch, currency mismatch, and closed-period matches", async () => {
    const { service, prisma } = makeService();
    prisma.cardSettlement.findFirst.mockResolvedValue(settlement({ status: CardSettlementStatus.POSTED }));

    prisma.bankStatementTransaction.findFirst.mockResolvedValueOnce(statement({ bankAccountProfileId: "card-1" }));
    await expect(service.matchStatementTransaction("org-1", "user-1", "set-1", { statementTransactionId: "stmt-1" })).rejects.toThrow(
      "Card settlement can only match statement rows from the expected funding or card account.",
    );

    prisma.bankStatementTransaction.findFirst.mockResolvedValueOnce(statement({ type: BankStatementTransactionType.CREDIT }));
    await expect(service.matchStatementTransaction("org-1", "user-1", "set-1", { statementTransactionId: "stmt-1" })).rejects.toThrow(
      "Statement row direction does not match the card settlement type.",
    );

    prisma.bankStatementTransaction.findFirst.mockResolvedValueOnce(statement({ amount: new Prisma.Decimal("299.0000") }));
    await expect(service.matchStatementTransaction("org-1", "user-1", "set-1", { statementTransactionId: "stmt-1" })).rejects.toThrow(
      "Card settlement amount must match the statement row amount.",
    );

    prisma.bankStatementTransaction.findFirst.mockResolvedValueOnce(statement({ bankAccountProfile: { id: "bank-1", currency: "USD" } }));
    await expect(service.matchStatementTransaction("org-1", "user-1", "set-1", { statementTransactionId: "stmt-1" })).rejects.toThrow(
      "Card settlement currency must match the statement row currency.",
    );

    prisma.bankReconciliation.findFirst.mockResolvedValueOnce({ id: "rec-1", reconciliationNumber: "REC-1" });
    prisma.bankStatementTransaction.findFirst.mockResolvedValueOnce(statement());
    await expect(service.matchStatementTransaction("org-1", "user-1", "set-1", { statementTransactionId: "stmt-1" })).rejects.toThrow(
      "Statement transaction belongs to closed reconciliation REC-1.",
    );
  });

  it("explicitly matches and unmatches a posted card settlement", async () => {
    const { service, prisma } = makeService();
    prisma.cardSettlement.findFirst
      .mockResolvedValueOnce(settlement({ status: CardSettlementStatus.POSTED }))
      .mockResolvedValueOnce(
        settlement({
          status: CardSettlementStatus.MATCHED,
          statementTransactionId: "stmt-1",
          statementTransaction: statement({ status: BankStatementTransactionStatus.MATCHED, matchType: BankStatementMatchType.OTHER }),
        }),
      );
    prisma.cardSettlement.update
      .mockResolvedValueOnce(settlement({ status: CardSettlementStatus.MATCHED, statementTransactionId: "stmt-1" }))
      .mockResolvedValueOnce(settlement({ status: CardSettlementStatus.POSTED, statementTransactionId: null }));

    await expect(service.matchStatementTransaction("org-1", "user-1", "set-1", { statementTransactionId: "stmt-1" })).resolves.toMatchObject({
      status: CardSettlementStatus.MATCHED,
    });
    expect(prisma.bankStatementTransaction.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: BankStatementTransactionStatus.MATCHED, matchType: BankStatementMatchType.OTHER }),
      }),
    );

    await expect(service.unmatchStatementTransaction("org-1", "user-1", "set-1")).resolves.toMatchObject({
      status: CardSettlementStatus.POSTED,
    });
    expect(prisma.bankStatementTransaction.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: BankStatementTransactionStatus.UNMATCHED, matchType: null }),
      }),
    );
  });

  it("enforces organization scoping by lookup predicates", async () => {
    const { service, prisma } = makeService();
    prisma.cardSettlement.findFirst.mockResolvedValueOnce(null);

    await expect(service.get("other-org", "set-1")).rejects.toThrow("Card settlement not found.");
    expect(prisma.cardSettlement.findFirst).toHaveBeenCalledWith({
      where: { id: "set-1", organizationId: "other-org" },
      include: expect.any(Object),
    });
  });
});
