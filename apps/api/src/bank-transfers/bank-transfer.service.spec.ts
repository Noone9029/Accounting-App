import { AccountType, BankAccountStatus, BankAccountType, BankTransferStatus, JournalEntryStatus, Prisma } from "@prisma/client";
import { BankTransferService } from "./bank-transfer.service";

describe("BankTransferService", () => {
  const account = (id: string, code: string) => ({
    id,
    code,
    name: code === "111" ? "Cash" : "Bank Account",
    type: AccountType.ASSET,
    allowPosting: true,
    isActive: true,
  });
  const fromProfile = {
    id: "from-profile",
    accountId: "bank-account",
    displayName: "Bank",
    type: BankAccountType.BANK,
    status: BankAccountStatus.ACTIVE,
    currency: "SAR",
    account: account("bank-account", "112"),
  };
  const toProfile = {
    id: "to-profile",
    accountId: "cash-account",
    displayName: "Cash",
    type: BankAccountType.CASH,
    status: BankAccountStatus.ACTIVE,
    currency: "SAR",
    account: account("cash-account", "111"),
  };

  function makeService(tx: Record<string, unknown>) {
    const prisma = { $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)) };
    const audit = { log: jest.fn() };
    const numbers = { next: jest.fn().mockResolvedValueOnce("TRF-000001").mockResolvedValueOnce("JE-000001") };
    const fiscal = { assertPostingDateAllowed: jest.fn() };
    return {
      service: new BankTransferService(prisma as never, audit as never, numbers as never, fiscal as never),
      prisma,
      audit,
      numbers,
      fiscal,
    };
  }

  function makeCreateTx(overrides: Record<string, unknown> = {}) {
    return {
      bankAccountProfile: { findFirst: jest.fn().mockResolvedValueOnce(fromProfile).mockResolvedValueOnce(toProfile) },
      journalEntry: { create: jest.fn().mockResolvedValue({ id: "journal-1" }) },
      bankTransfer: {
        create: jest.fn().mockResolvedValue({ id: "transfer-1" }),
        findUniqueOrThrow: jest.fn().mockResolvedValue({
          id: "transfer-1",
          transferNumber: "TRF-000001",
          status: BankTransferStatus.POSTED,
          journalEntryId: "journal-1",
        }),
      },
      ...overrides,
    };
  }

  it("creates a posted transfer with a balanced Dr destination / Cr source journal", async () => {
    const tx = makeCreateTx();
    const { service, audit, numbers, fiscal } = makeService(tx);

    await expect(
      service.create("org-1", "user-1", {
        fromBankAccountProfileId: "from-profile",
        toBankAccountProfileId: "to-profile",
        transferDate: "2026-05-13T00:00:00.000Z",
        amount: "100.0000",
      }),
    ).resolves.toMatchObject({ id: "transfer-1", status: BankTransferStatus.POSTED });

    expect(fiscal.assertPostingDateAllowed).toHaveBeenCalled();
    expect(numbers.next).toHaveBeenNthCalledWith(1, "org-1", "BANK_TRANSFER", tx);
    expect(tx.journalEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: JournalEntryStatus.POSTED,
          totalDebit: "100.0000",
          totalCredit: "100.0000",
          lines: {
            create: [
              expect.objectContaining({ account: { connect: { id: "cash-account" } }, debit: "100.0000", credit: "0.0000" }),
              expect.objectContaining({ account: { connect: { id: "bank-account" } }, debit: "0.0000", credit: "100.0000" }),
            ],
          },
        }),
      }),
    );
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: "CREATE", entityType: "BankTransfer" }));
  });

  it("rejects same source and destination profile before posting", async () => {
    const tx = makeCreateTx();
    const { service, prisma } = makeService(tx);

    await expect(
      service.create("org-1", "user-1", {
        fromBankAccountProfileId: "same",
        toBankAccountProfileId: "same",
        transferDate: "2026-05-13T00:00:00.000Z",
        amount: "10.0000",
      }),
    ).rejects.toThrow("Transfer source and destination must be different bank accounts.");
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("rejects archived profiles and currency mismatches", async () => {
    const archivedTx = makeCreateTx({
      bankAccountProfile: { findFirst: jest.fn().mockResolvedValueOnce({ ...fromProfile, status: BankAccountStatus.ARCHIVED }).mockResolvedValueOnce(toProfile) },
    });
    await expect(
      makeService(archivedTx).service.create("org-1", "user-1", {
        fromBankAccountProfileId: "from-profile",
        toBankAccountProfileId: "to-profile",
        transferDate: "2026-05-13T00:00:00.000Z",
        amount: "10.0000",
      }),
    ).rejects.toThrow("Transfer source bank account must be active.");

    const mismatchTx = makeCreateTx({
      bankAccountProfile: { findFirst: jest.fn().mockResolvedValueOnce(fromProfile).mockResolvedValueOnce({ ...toProfile, currency: "USD" }) },
    });
    await expect(
      makeService(mismatchTx).service.create("org-1", "user-1", {
        fromBankAccountProfileId: "from-profile",
        toBankAccountProfileId: "to-profile",
        transferDate: "2026-05-13T00:00:00.000Z",
        amount: "10.0000",
      }),
    ).rejects.toThrow("Transfer currency must match both bank account profile currencies.");
  });

  it("rejects non-positive amounts and fiscal-period blocked dates", async () => {
    await expect(
      makeService(makeCreateTx()).service.create("org-1", "user-1", {
        fromBankAccountProfileId: "from-profile",
        toBankAccountProfileId: "to-profile",
        transferDate: "2026-05-13T00:00:00.000Z",
        amount: "0.0000",
      }),
    ).rejects.toThrow("Transfer amount must be greater than zero.");

    const tx = makeCreateTx();
    const { service, fiscal } = makeService(tx);
    fiscal.assertPostingDateAllowed.mockRejectedValue(new Error("Posting date falls in a closed fiscal period."));
    await expect(
      service.create("org-1", "user-1", {
        fromBankAccountProfileId: "from-profile",
        toBankAccountProfileId: "to-profile",
        transferDate: "2026-05-13T00:00:00.000Z",
        amount: "10.0000",
      }),
    ).rejects.toThrow("Posting date falls in a closed fiscal period.");
  });

  it("voids a posted transfer with one reversal journal and returns voided transfers idempotently", async () => {
    const tx = {
      bankTransfer: {
        findFirst: jest.fn().mockResolvedValue({ id: "transfer-1", status: BankTransferStatus.POSTED, journalEntryId: "journal-1" }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        update: jest.fn().mockResolvedValue({ id: "transfer-1", status: BankTransferStatus.VOIDED, voidReversalJournalEntryId: "reversal-1" }),
        findUniqueOrThrow: jest.fn(),
      },
      journalEntry: {
        findFirst: jest.fn().mockResolvedValue({
          id: "journal-1",
          entryNumber: "JE-000001",
          reference: "TRF-000001",
          currency: "SAR",
          lines: [
            { accountId: "cash-account", debit: new Prisma.Decimal("100"), credit: new Prisma.Decimal("0"), description: "Dr cash", currency: "SAR", exchangeRate: new Prisma.Decimal("1"), taxRateId: null },
            { accountId: "bank-account", debit: new Prisma.Decimal("0"), credit: new Prisma.Decimal("100"), description: "Cr bank", currency: "SAR", exchangeRate: new Prisma.Decimal("1"), taxRateId: null },
          ],
          reversedBy: null,
        }),
        create: jest.fn().mockResolvedValue({ id: "reversal-1" }),
        update: jest.fn().mockResolvedValue({}),
      },
    };
    const { service } = makeService(tx);
    jest.spyOn(service, "get").mockResolvedValueOnce({ id: "transfer-1", status: BankTransferStatus.POSTED } as never);

    await expect(service.void("org-1", "user-1", "transfer-1")).resolves.toMatchObject({
      status: BankTransferStatus.VOIDED,
      voidReversalJournalEntryId: "reversal-1",
    });
    expect(tx.journalEntry.create).toHaveBeenCalledTimes(1);

    jest.spyOn(service, "get").mockResolvedValueOnce({ id: "transfer-1", status: BankTransferStatus.VOIDED } as never);
    await expect(service.void("org-1", "user-1", "transfer-1")).resolves.toMatchObject({ status: BankTransferStatus.VOIDED });
  });
});
