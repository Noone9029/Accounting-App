import { BadRequestException, ConflictException, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";

type PrismaExecutor = Prisma.TransactionClient;

export interface FxCarryingSettlementBasis {
  monetaryBalanceId: string | null;
  carryingBaseOpenAmount: string;
  sourceBaseOpenAmount: string;
  carryingRate: string;
  carryingRateSnapshotId: string | null;
  carryingRevaluationLineId: string | null;
  useProportionalCarryingBasis: boolean;
}

export interface FxCarryingSettlementMutation {
  transactionAmount: string;
  carryingBaseAmount: string;
  sourceBaseAmount: string;
}

interface ForeignDocumentOpenBalance {
  id: string;
  transactionBalanceDue: Prisma.Decimal | string;
  balanceDue: Prisma.Decimal | string;
  exchangeRate: Prisma.Decimal | string | null;
  rateSnapshotId: string | null;
}

@Injectable()
export class FxCarryingBalanceService {
  async assertCustomerMutationAllowed(organizationId: string, salesInvoiceId: string, executor: PrismaExecutor) {
    await this.lockSource(organizationId, "salesInvoiceId", salesInvoiceId, executor);
    return this.assertMutationAllowed(organizationId, "salesInvoiceId", salesInvoiceId, executor);
  }

  async assertSupplierMutationAllowed(organizationId: string, purchaseBillId: string, executor: PrismaExecutor) {
    await this.lockSource(organizationId, "purchaseBillId", purchaseBillId, executor);
    return this.assertMutationAllowed(organizationId, "purchaseBillId", purchaseBillId, executor);
  }

  async resolveCustomerBasis(organizationId: string, source: ForeignDocumentOpenBalance, executor: PrismaExecutor) {
    await this.lockSource(organizationId, "salesInvoiceId", source.id, executor);
    return this.resolve(organizationId, "salesInvoiceId", source, executor);
  }

  async resolveSupplierBasis(organizationId: string, source: ForeignDocumentOpenBalance, executor: PrismaExecutor) {
    await this.lockSource(organizationId, "purchaseBillId", source.id, executor);
    return this.resolve(organizationId, "purchaseBillId", source, executor);
  }

  async applySettlement(
    organizationId: string,
    basis: FxCarryingSettlementBasis,
    mutation: FxCarryingSettlementMutation,
    executor: PrismaExecutor,
  ) {
    if (!basis.monetaryBalanceId) return;
    const transactionAmount = this.money(mutation.transactionAmount);
    const carryingBaseAmount = this.money(mutation.carryingBaseAmount);
    const sourceBaseAmount = this.money(mutation.sourceBaseAmount);
    const updated = await executor.fxMonetaryBalance.updateMany({
      where: {
        id: basis.monetaryBalanceId,
        organizationId,
        lastRevaluationLineId: basis.carryingRevaluationLineId!,
        openTransactionAmount: { gte: transactionAmount },
        carryingBaseAmount: { gte: carryingBaseAmount },
        sourceBaseOpenAmount: { gte: sourceBaseAmount },
      },
      data: {
        openTransactionAmount: { decrement: transactionAmount },
        carryingBaseAmount: { decrement: carryingBaseAmount },
        sourceBaseOpenAmount: { decrement: sourceBaseAmount },
      },
    });
    if (updated.count !== 1) {
      throw new ConflictException("FX carrying basis changed while settling. Reload and retry.");
    }
  }

  async restoreSettlement(
    organizationId: string,
    basis: FxCarryingSettlementBasis,
    mutation: FxCarryingSettlementMutation,
    executor: PrismaExecutor,
  ) {
    if (!basis.monetaryBalanceId) return;
    const updated = await executor.fxMonetaryBalance.updateMany({
      where: {
        id: basis.monetaryBalanceId,
        organizationId,
        lastRevaluationLineId: basis.carryingRevaluationLineId!,
      },
      data: {
        openTransactionAmount: { increment: this.money(mutation.transactionAmount) },
        carryingBaseAmount: { increment: this.money(mutation.carryingBaseAmount) },
        sourceBaseOpenAmount: { increment: this.money(mutation.sourceBaseAmount) },
      },
    });
    if (updated.count !== 1) {
      throw new ConflictException("FX carrying basis changed after this allocation. Reverse the later revaluation first.");
    }
  }

  private async resolve(
    organizationId: string,
    sourceField: "salesInvoiceId" | "purchaseBillId",
    source: ForeignDocumentOpenBalance,
    executor: PrismaExecutor,
  ): Promise<FxCarryingSettlementBasis> {
    const balance = await executor.fxMonetaryBalance.findFirst({
      where: { organizationId, [sourceField]: source.id },
    });
    const sourceBaseOpenAmount = this.money(source.balanceDue);
    const transactionOpenAmount = this.money(source.transactionBalanceDue);
    if (!balance) {
      return {
        monetaryBalanceId: null,
        carryingBaseOpenAmount: sourceBaseOpenAmount,
        sourceBaseOpenAmount,
        carryingRate: this.rate(source.exchangeRate ?? "1"),
        carryingRateSnapshotId: source.rateSnapshotId,
        carryingRevaluationLineId: null,
        useProportionalCarryingBasis: false,
      };
    }
    if (
      this.money(balance.openTransactionAmount) !== transactionOpenAmount ||
      this.money(balance.sourceBaseOpenAmount) !== sourceBaseOpenAmount
    ) {
      throw new BadRequestException("Stored FX carrying evidence does not match the source open balance.");
    }
    return {
      monetaryBalanceId: balance.id,
      carryingBaseOpenAmount: this.money(balance.carryingBaseAmount),
      sourceBaseOpenAmount,
      carryingRate: this.rate(balance.carryingRate),
      carryingRateSnapshotId: balance.rateSnapshotId,
      carryingRevaluationLineId: balance.lastRevaluationLineId,
      useProportionalCarryingBasis: true,
    };
  }

  private async assertMutationAllowed(
    organizationId: string,
    sourceField: "salesInvoiceId" | "purchaseBillId",
    sourceId: string,
    executor: PrismaExecutor,
  ) {
    const active = await executor.fxMonetaryBalance.findFirst({
      where: { organizationId, [sourceField]: sourceId },
      select: { id: true },
    });
    if (active) {
      throw new BadRequestException("Reverse the active FX revaluation before voiding or applying non-payment corrections to this foreign balance.");
    }
  }

  private async lockSource(
    organizationId: string,
    sourceField: "salesInvoiceId" | "purchaseBillId",
    sourceId: string,
    executor: PrismaExecutor,
  ) {
    if (sourceField === "salesInvoiceId") {
      await executor.$queryRaw(Prisma.sql`
        SELECT "id" FROM "SalesInvoice"
        WHERE "organizationId" = ${organizationId}::uuid AND "id" = ${sourceId}::uuid
        FOR UPDATE
      `);
      return;
    }
    await executor.$queryRaw(Prisma.sql`
      SELECT "id" FROM "PurchaseBill"
      WHERE "organizationId" = ${organizationId}::uuid AND "id" = ${sourceId}::uuid
      FOR UPDATE
    `);
  }

  private money(value: Prisma.Decimal | string) {
    return new Prisma.Decimal(String(value)).toFixed(4);
  }

  private rate(value: Prisma.Decimal | string) {
    return new Prisma.Decimal(String(value)).toFixed(8);
  }
}
