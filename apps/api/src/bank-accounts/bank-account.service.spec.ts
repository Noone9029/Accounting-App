import { AccountType, BankAccountStatus, BankAccountType, JournalEntryStatus, Prisma } from "@prisma/client";
import { BankAccountService } from "./bank-account.service";

describe("BankAccountService", () => {
  function makeService(overrides: Record<string, unknown> = {}) {
    const prisma = {
      account: { findFirst: jest.fn() },
      bankAccountProfile: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      journalLine: { findMany: jest.fn() },
      ...overrides,
    };
    const audit = { log: jest.fn() };
    return { service: new BankAccountService(prisma as never, audit as never), prisma, audit };
  }

  const account = {
    id: "account-1",
    code: "112",
    name: "Bank Account",
    type: AccountType.ASSET,
    allowPosting: true,
    isActive: true,
  };

  const profile = {
    id: "profile-1",
    organizationId: "org-1",
    accountId: "account-1",
    type: BankAccountType.BANK,
    status: BankAccountStatus.ACTIVE,
    displayName: "Operating Bank",
    account,
  };

  it("creates a profile for a valid active posting asset account", async () => {
    const { service, prisma, audit } = makeService();
    prisma.account.findFirst.mockResolvedValue(account);
    prisma.bankAccountProfile.findUnique.mockResolvedValue(null);
    prisma.bankAccountProfile.create.mockResolvedValue(profile);
    prisma.journalLine.findMany.mockResolvedValue([]);

    await expect(
      service.create("org-1", "user-1", {
        accountId: "account-1",
        type: BankAccountType.BANK,
        displayName: "Operating Bank",
        currency: "sar",
      }),
    ).resolves.toMatchObject({
      id: "profile-1",
      ledgerBalance: "0.0000",
      transactionCount: 0,
    });
    expect(prisma.bankAccountProfile.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: "org-1",
          accountId: "account-1",
          currency: "SAR",
        }),
      }),
    );
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: "CREATE", entityType: "BankAccountProfile" }));
  });

  it("rejects non-asset accounts", async () => {
    const { service, prisma } = makeService();
    prisma.account.findFirst.mockResolvedValue({ ...account, type: AccountType.EXPENSE });

    await expect(
      service.create("org-1", "user-1", {
        accountId: "expense",
        type: BankAccountType.BANK,
        displayName: "Wrong",
      }),
    ).rejects.toThrow("Bank account profiles can only be linked to asset accounts.");
  });

  it("rejects inactive or non-posting accounts", async () => {
    const { service, prisma } = makeService();
    prisma.account.findFirst.mockResolvedValue({ ...account, allowPosting: false });

    await expect(
      service.create("org-1", "user-1", {
        accountId: "summary",
        type: BankAccountType.CASH,
        displayName: "Summary",
      }),
    ).rejects.toThrow("Bank account profiles require an active posting account.");
  });

  it("rejects duplicate profiles for the same account", async () => {
    const { service, prisma } = makeService();
    prisma.account.findFirst.mockResolvedValue(account);
    prisma.bankAccountProfile.findUnique.mockResolvedValue({ id: "existing-profile" });

    await expect(
      service.create("org-1", "user-1", {
        accountId: "account-1",
        type: BankAccountType.BANK,
        displayName: "Duplicate",
      }),
    ).rejects.toThrow("This account already has a bank account profile.");
  });

  it("lists profiles with posted-ledger balances", async () => {
    const { service, prisma } = makeService();
    prisma.bankAccountProfile.findMany.mockResolvedValue([profile]);
    prisma.journalLine.findMany.mockResolvedValue([
      { debit: new Prisma.Decimal("100.0000"), credit: new Prisma.Decimal("0.0000"), journalEntry: { entryDate: new Date("2026-05-01") } },
      { debit: new Prisma.Decimal("0.0000"), credit: new Prisma.Decimal("25.0000"), journalEntry: { entryDate: new Date("2026-05-02") } },
    ]);

    await expect(service.list("org-1")).resolves.toEqual([
      expect.objectContaining({
        id: "profile-1",
        ledgerBalance: "75.0000",
        transactionCount: 2,
        latestTransactionDate: new Date("2026-05-02"),
      }),
    ]);
    expect(prisma.journalLine.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: "org-1",
          accountId: "account-1",
          journalEntry: { status: JournalEntryStatus.POSTED },
        }),
      }),
    );
  });

  it("returns posted transaction running balances and source metadata", async () => {
    const { service, prisma } = makeService();
    prisma.bankAccountProfile.findFirst.mockResolvedValue(profile);
    prisma.journalLine.findMany.mockResolvedValue([
      {
        id: "line-1",
        debit: new Prisma.Decimal("50.0000"),
        credit: new Prisma.Decimal("0.0000"),
        description: "Payment receipt",
        journalEntry: {
          id: "journal-1",
          entryNumber: "JE-000001",
          entryDate: new Date("2026-05-03"),
          description: "Customer payment PAY-000001",
          reference: "PAY-000001",
          customerPayment: { id: "payment-1" },
        },
      },
      {
        id: "line-2",
        debit: new Prisma.Decimal("0.0000"),
        credit: new Prisma.Decimal("10.0000"),
        description: null,
        journalEntry: {
          id: "journal-2",
          entryNumber: "JE-000002",
          entryDate: new Date("2026-05-04"),
          description: "Cash expense EXP-000001",
          reference: "EXP-000001",
          cashExpense: { id: "expense-1" },
        },
      },
    ]);

    await expect(service.transactions("org-1", "profile-1", {})).resolves.toMatchObject({
      openingBalance: "0.0000",
      closingBalance: "40.0000",
      transactions: [
        expect.objectContaining({ sourceType: "CustomerPayment", sourceId: "payment-1", runningBalance: "50.0000" }),
        expect.objectContaining({ sourceType: "CashExpense", sourceId: "expense-1", runningBalance: "40.0000" }),
      ],
    });
    expect(prisma.journalLine.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          journalEntry: expect.objectContaining({ status: JournalEntryStatus.POSTED }),
        }),
      }),
    );
  });

  it("archives and reactivates without changing the linked account", async () => {
    const { service, prisma } = makeService();
    prisma.bankAccountProfile.findFirst.mockResolvedValue(profile);
    prisma.bankAccountProfile.update.mockResolvedValueOnce({ ...profile, status: BankAccountStatus.ARCHIVED });
    prisma.journalLine.findMany.mockResolvedValue([]);

    await expect(service.archive("org-1", "user-1", "profile-1")).resolves.toMatchObject({ status: BankAccountStatus.ARCHIVED });
    expect(prisma.bankAccountProfile.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: BankAccountStatus.ARCHIVED } }),
    );

    prisma.bankAccountProfile.findFirst.mockResolvedValue({ ...profile, status: BankAccountStatus.ARCHIVED });
    prisma.account.findFirst.mockResolvedValue(account);
    prisma.bankAccountProfile.update.mockResolvedValueOnce(profile);

    await expect(service.reactivate("org-1", "user-1", "profile-1")).resolves.toMatchObject({ status: BankAccountStatus.ACTIVE });
    expect(prisma.bankAccountProfile.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: BankAccountStatus.ACTIVE } }),
    );
  });

  it("keeps tenant isolation on detail lookup", async () => {
    const { service, prisma } = makeService();
    prisma.bankAccountProfile.findFirst.mockResolvedValue(null);

    await expect(service.get("org-2", "profile-1")).rejects.toThrow("Bank account profile not found.");
    expect(prisma.bankAccountProfile.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "profile-1", organizationId: "org-2" } }),
    );
  });
});
