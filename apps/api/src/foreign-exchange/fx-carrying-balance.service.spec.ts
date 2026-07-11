import { BadRequestException, ConflictException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { FxCarryingBalanceService } from "./fx-carrying-balance.service";

describe("FxCarryingBalanceService", () => {
  const source = {
    id: "invoice-1",
    transactionBalanceDue: new Prisma.Decimal("100"),
    balanceDue: new Prisma.Decimal("365"),
    exchangeRate: new Prisma.Decimal("3.65"),
    rateSnapshotId: "source-rate",
  };

  function executor(balance: unknown = null) {
    return {
      $queryRaw: jest.fn().mockResolvedValue([]),
      fxMonetaryBalance: {
        findFirst: jest.fn().mockResolvedValue(balance),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    } as any;
  }

  it("returns original source basis when the document has not been revalued", async () => {
    const tx = executor();
    await expect(new FxCarryingBalanceService().resolveCustomerBasis("org-1", source, tx)).resolves.toEqual({
      monetaryBalanceId: null,
      carryingBaseOpenAmount: "365.0000",
      sourceBaseOpenAmount: "365.0000",
      carryingRate: "3.65000000",
      carryingRateSnapshotId: "source-rate",
      carryingRevaluationLineId: null,
      useProportionalCarryingBasis: false,
    });
  });

  it("returns adjusted carrying basis only when all source residuals still match", async () => {
    const tx = executor({
      id: "balance-1",
      openTransactionAmount: new Prisma.Decimal("100"),
      sourceBaseOpenAmount: new Prisma.Decimal("365"),
      carryingBaseAmount: new Prisma.Decimal("375"),
      carryingRate: new Prisma.Decimal("3.75"),
      rateSnapshotId: "closing-rate",
      lastRevaluationLineId: "line-1",
    });
    await expect(new FxCarryingBalanceService().resolveCustomerBasis("org-1", source, tx)).resolves.toMatchObject({
      monetaryBalanceId: "balance-1",
      carryingBaseOpenAmount: "375.0000",
      sourceBaseOpenAmount: "365.0000",
      carryingRate: "3.75000000",
      carryingRateSnapshotId: "closing-rate",
      carryingRevaluationLineId: "line-1",
      useProportionalCarryingBasis: true,
    });
  });

  it("fails closed when carrying evidence drifted from the source document", async () => {
    const tx = executor({
      id: "balance-1",
      openTransactionAmount: new Prisma.Decimal("60"),
      sourceBaseOpenAmount: new Prisma.Decimal("219"),
      carryingBaseAmount: new Prisma.Decimal("225"),
      carryingRate: new Prisma.Decimal("3.75"),
      rateSnapshotId: "closing-rate",
      lastRevaluationLineId: "line-1",
    });
    await expect(new FxCarryingBalanceService().resolveCustomerBasis("org-1", source, tx))
      .rejects.toEqual(new BadRequestException("Stored FX carrying evidence does not match the source open balance."));
  });

  it("decrements and restores the exact carrying layer under its frozen revaluation line", async () => {
    const service = new FxCarryingBalanceService();
    const tx = executor();
    const basis = {
      monetaryBalanceId: "balance-1",
      carryingBaseOpenAmount: "375.0000",
      sourceBaseOpenAmount: "365.0000",
      carryingRate: "3.75000000",
      carryingRateSnapshotId: "closing-rate",
      carryingRevaluationLineId: "line-1",
      useProportionalCarryingBasis: true,
    };
    await service.applySettlement("org-1", basis, {
      transactionAmount: "40", carryingBaseAmount: "150", sourceBaseAmount: "146",
    }, tx);
    expect(tx.fxMonetaryBalance.updateMany).toHaveBeenNthCalledWith(1, {
      where: {
        id: "balance-1", organizationId: "org-1", lastRevaluationLineId: "line-1",
        openTransactionAmount: { gte: "40.0000" }, carryingBaseAmount: { gte: "150.0000" }, sourceBaseOpenAmount: { gte: "146.0000" },
      },
      data: {
        openTransactionAmount: { decrement: "40.0000" }, carryingBaseAmount: { decrement: "150.0000" }, sourceBaseOpenAmount: { decrement: "146.0000" },
      },
    });
    await service.restoreSettlement("org-1", basis, {
      transactionAmount: "40", carryingBaseAmount: "150", sourceBaseAmount: "146",
    }, tx);
    expect(tx.fxMonetaryBalance.updateMany).toHaveBeenNthCalledWith(2, {
      where: { id: "balance-1", organizationId: "org-1", lastRevaluationLineId: "line-1" },
      data: {
        openTransactionAmount: { increment: "40.0000" }, carryingBaseAmount: { increment: "150.0000" }, sourceBaseOpenAmount: { increment: "146.0000" },
      },
    });
  });

  it("rejects a carrying mutation after a concurrent/later state change", async () => {
    const tx = executor();
    tx.fxMonetaryBalance.updateMany.mockResolvedValue({ count: 0 });
    await expect(new FxCarryingBalanceService().applySettlement("org-1", {
      monetaryBalanceId: "balance-1", carryingBaseOpenAmount: "375", sourceBaseOpenAmount: "365",
      carryingRate: "3.75", carryingRateSnapshotId: "rate", carryingRevaluationLineId: "line-1", useProportionalCarryingBasis: true,
    }, { transactionAmount: "40", carryingBaseAmount: "150", sourceBaseAmount: "146" }, tx))
      .rejects.toBeInstanceOf(ConflictException);
  });

  it("blocks unsupported non-payment source mutations while a revalued carrying layer is active", async () => {
    const tx = executor({ id: "balance-1" });
    await expect(new FxCarryingBalanceService().assertCustomerMutationAllowed("org-1", "invoice-1", tx))
      .rejects.toEqual(new BadRequestException("Reverse the active FX revaluation before voiding or applying non-payment corrections to this foreign balance."));
  });

  it("locks the source row before checking carrying state", async () => {
    const tx = executor();
    await new FxCarryingBalanceService().assertSupplierMutationAllowed("org-1", "bill-1", tx);

    expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
    expect(tx.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(tx.fxMonetaryBalance.findFirst.mock.invocationCallOrder[0]);
  });
});
