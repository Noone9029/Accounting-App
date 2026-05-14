import { BadRequestException, Injectable } from "@nestjs/common";
import { AccountType, InventoryValuationMethod, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { STOCK_MOVEMENT_IN_TYPES } from "../stock-movements/stock-movement-rules";
import { UpdateInventoryAccountingSettingsDto } from "./dto/update-inventory-accounting-settings.dto";

export const INVENTORY_ACCOUNTING_NO_GL_WARNING = "Not posting to GL yet.";
export const COGS_PREVIEW_ONLY_WARNING = "COGS is preview-only.";
export const ACCOUNTANT_REVIEW_WARNING = "Accountant review required before enabling financial inventory postings.";
export const NO_FINANCIAL_POSTING_WARNING = "No automatic financial inventory accounting has been posted.";
export const MOVING_AVERAGE_REVIEW_WARNING = "Average cost is operational estimate and requires accountant review.";
export const COGS_NOT_ENABLED_WARNING = "COGS posting is not enabled yet.";
export const PURCHASE_RECEIPT_DESIGN_WARNING =
  "Purchase receipt accounting preview is not enabled because bill/receipt matching and inventory clearing are not finalized.";

const accountSelect = {
  id: true,
  code: true,
  name: true,
  type: true,
  allowPosting: true,
  isActive: true,
} satisfies Prisma.AccountSelect;

const accountingSettingsInclude = {
  inventoryAssetAccount: { select: accountSelect },
  cogsAccount: { select: accountSelect },
  inventoryAdjustmentGainAccount: { select: accountSelect },
  inventoryAdjustmentLossAccount: { select: accountSelect },
} satisfies Prisma.InventorySettingsInclude;

export type InventoryAccountingSettingsRecord = Prisma.InventorySettingsGetPayload<{
  include: typeof accountingSettingsInclude;
}>;

export type InventoryAccountingAccount = Prisma.AccountGetPayload<{ select: typeof accountSelect }>;

type MappingKey = "inventoryAsset" | "cogs" | "adjustmentGain" | "adjustmentLoss";

@Injectable()
export class InventoryAccountingService {
  constructor(private readonly prisma: PrismaService) {}

  async settings(organizationId: string) {
    return this.withAccountingMetadata(await this.ensureSettings(organizationId));
  }

  async updateSettings(organizationId: string, dto: UpdateInventoryAccountingSettingsDto) {
    const existing = await this.ensureSettings(organizationId);
    const proposed = {
      valuationMethod: dto.valuationMethod ?? existing.valuationMethod,
      enableInventoryAccounting: dto.enableInventoryAccounting ?? existing.enableInventoryAccounting,
      inventoryAssetAccountId: this.valueOrExisting(dto, "inventoryAssetAccountId", existing.inventoryAssetAccountId),
      cogsAccountId: this.valueOrExisting(dto, "cogsAccountId", existing.cogsAccountId),
      inventoryAdjustmentGainAccountId: this.valueOrExisting(
        dto,
        "inventoryAdjustmentGainAccountId",
        existing.inventoryAdjustmentGainAccountId,
      ),
      inventoryAdjustmentLossAccountId: this.valueOrExisting(
        dto,
        "inventoryAdjustmentLossAccountId",
        existing.inventoryAdjustmentLossAccountId,
      ),
    };

    await this.validateMappedAccount(organizationId, proposed.inventoryAssetAccountId, "Inventory asset", [AccountType.ASSET]);
    await this.validateMappedAccount(organizationId, proposed.cogsAccountId, "COGS", [AccountType.COST_OF_SALES, AccountType.EXPENSE]);
    await this.validateMappedAccount(organizationId, proposed.inventoryAdjustmentGainAccountId, "Inventory adjustment gain", [AccountType.REVENUE]);
    await this.validateMappedAccount(organizationId, proposed.inventoryAdjustmentLossAccountId, "Inventory adjustment loss", [
      AccountType.EXPENSE,
      AccountType.COST_OF_SALES,
    ]);

    const enableBlockingReasons = this.enableBlockingReasons(proposed);
    if (proposed.enableInventoryAccounting && enableBlockingReasons.length > 0) {
      throw new BadRequestException(enableBlockingReasons);
    }

    const data: Prisma.InventorySettingsUncheckedUpdateInput = {};
    if (dto.valuationMethod !== undefined) data.valuationMethod = dto.valuationMethod;
    if (dto.enableInventoryAccounting !== undefined) data.enableInventoryAccounting = dto.enableInventoryAccounting;
    if (this.hasOwn(dto, "inventoryAssetAccountId")) data.inventoryAssetAccountId = dto.inventoryAssetAccountId;
    if (this.hasOwn(dto, "cogsAccountId")) data.cogsAccountId = dto.cogsAccountId;
    if (this.hasOwn(dto, "inventoryAdjustmentGainAccountId")) data.inventoryAdjustmentGainAccountId = dto.inventoryAdjustmentGainAccountId;
    if (this.hasOwn(dto, "inventoryAdjustmentLossAccountId")) data.inventoryAdjustmentLossAccountId = dto.inventoryAdjustmentLossAccountId;

    const updated = await this.prisma.inventorySettings.update({
      where: { organizationId },
      data,
      include: accountingSettingsInclude,
    });
    return this.withAccountingMetadata(updated);
  }

  async previewReadiness(organizationId: string, requiredMappings: MappingKey[]) {
    const settings = await this.ensureSettings(organizationId);
    return {
      settings,
      blockingReasons: this.previewBlockingReasons(settings, requiredMappings),
      warnings: this.previewWarnings(settings),
    };
  }

  async movingAverageUnitCost(organizationId: string, itemId: string, warehouseId: string, asOfDate: Date) {
    const movements = await this.prisma.stockMovement.findMany({
      where: {
        organizationId,
        itemId,
        warehouseId,
        movementDate: { lte: asOfDate },
      },
      select: { type: true, quantity: true, unitCost: true, totalCost: true },
      orderBy: [{ movementDate: "asc" }, { createdAt: "asc" }],
    });

    let costedInQuantity = new Prisma.Decimal(0);
    let costedInValue = new Prisma.Decimal(0);
    let missingCostData = false;

    for (const movement of movements) {
      if (!STOCK_MOVEMENT_IN_TYPES.has(movement.type)) {
        continue;
      }
      const quantity = new Prisma.Decimal(movement.quantity);
      const totalCost = this.movementTotalCost(quantity, movement.unitCost, movement.totalCost);
      if (quantity.gt(0) && totalCost?.gt(0)) {
        costedInQuantity = costedInQuantity.plus(quantity);
        costedInValue = costedInValue.plus(totalCost);
      } else if (quantity.gt(0)) {
        missingCostData = true;
      }
    }

    return {
      averageUnitCost: costedInQuantity.gt(0) ? costedInValue.div(costedInQuantity) : null,
      missingCostData,
    };
  }

  decimalString(value: Prisma.Decimal): string {
    return value.toFixed(4);
  }

  private async ensureSettings(organizationId: string) {
    const existing = await this.prisma.inventorySettings.findUnique({
      where: { organizationId },
      include: accountingSettingsInclude,
    });
    if (existing) {
      return existing;
    }
    return this.prisma.inventorySettings.create({
      data: { organizationId },
      include: accountingSettingsInclude,
    });
  }

  private withAccountingMetadata(settings: InventoryAccountingSettingsRecord) {
    const blockingReasons = this.previewBlockingReasons(settings, ["inventoryAsset", "cogs"]);
    const canEnableInventoryAccounting = this.enableBlockingReasons(settings).length === 0;
    return {
      ...settings,
      accounts: {
        inventoryAsset: settings.inventoryAssetAccount,
        cogs: settings.cogsAccount,
        adjustmentGain: settings.inventoryAdjustmentGainAccount,
        adjustmentLoss: settings.inventoryAdjustmentLossAccount,
      },
      canEnableInventoryAccounting,
      previewOnly: true,
      noAutomaticPosting: true,
      blockingReasons,
      warnings: this.previewWarnings(settings),
    };
  }

  private previewWarnings(settings: Pick<InventoryAccountingSettingsRecord, "enableInventoryAccounting" | "valuationMethod">): string[] {
    const warnings = [INVENTORY_ACCOUNTING_NO_GL_WARNING, COGS_PREVIEW_ONLY_WARNING, ACCOUNTANT_REVIEW_WARNING];
    if (!settings.enableInventoryAccounting) {
      warnings.push("Inventory accounting is disabled by default.");
    }
    if (settings.valuationMethod === InventoryValuationMethod.FIFO_PLACEHOLDER) {
      warnings.push("FIFO remains a placeholder; MOVING_AVERAGE is the only previewable valuation method.");
    }
    warnings.push(NO_FINANCIAL_POSTING_WARNING);
    return warnings;
  }

  private previewBlockingReasons(settings: InventoryAccountingSettingsRecord, requiredMappings: MappingKey[]): string[] {
    const reasons: string[] = [];
    if (settings.valuationMethod !== InventoryValuationMethod.MOVING_AVERAGE) {
      reasons.push("MOVING_AVERAGE is the only previewable valuation method.");
    }
    if (requiredMappings.includes("inventoryAsset")) {
      this.addAccountReadinessReason(reasons, settings.inventoryAssetAccount, "Inventory asset", [AccountType.ASSET]);
    }
    if (requiredMappings.includes("cogs")) {
      this.addAccountReadinessReason(reasons, settings.cogsAccount, "COGS", [AccountType.COST_OF_SALES, AccountType.EXPENSE]);
    }
    if (requiredMappings.includes("adjustmentGain")) {
      this.addAccountReadinessReason(reasons, settings.inventoryAdjustmentGainAccount, "Inventory adjustment gain", [AccountType.REVENUE]);
    }
    if (requiredMappings.includes("adjustmentLoss")) {
      this.addAccountReadinessReason(reasons, settings.inventoryAdjustmentLossAccount, "Inventory adjustment loss", [
        AccountType.EXPENSE,
        AccountType.COST_OF_SALES,
      ]);
    }
    return reasons;
  }

  private enableBlockingReasons(settings: {
    valuationMethod: InventoryValuationMethod;
    inventoryAssetAccountId: string | null;
    cogsAccountId: string | null;
  }): string[] {
    const reasons: string[] = [];
    if (settings.valuationMethod !== InventoryValuationMethod.MOVING_AVERAGE) {
      reasons.push("Inventory accounting can only be enabled with MOVING_AVERAGE until FIFO is implemented.");
    }
    if (!settings.inventoryAssetAccountId) {
      reasons.push("Inventory asset account is required before inventory accounting can be enabled.");
    }
    if (!settings.cogsAccountId) {
      reasons.push("COGS account is required before inventory accounting can be enabled.");
    }
    return reasons;
  }

  private addAccountReadinessReason(
    reasons: string[],
    account: InventoryAccountingAccount | null,
    label: string,
    allowedTypes: AccountType[],
  ): void {
    if (!account) {
      reasons.push(`${label} account mapping is required.`);
      return;
    }
    if (!allowedTypes.includes(account.type)) {
      reasons.push(`${label} account must be one of: ${allowedTypes.join(", ")}.`);
    }
    if (!account.isActive) {
      reasons.push(`${label} account must be active.`);
    }
    if (!account.allowPosting) {
      reasons.push(`${label} account must allow posting.`);
    }
  }

  private async validateMappedAccount(
    organizationId: string,
    accountId: string | null,
    label: string,
    allowedTypes: AccountType[],
  ): Promise<void> {
    if (!accountId) {
      return;
    }
    const account = await this.prisma.account.findFirst({ where: { id: accountId, organizationId }, select: accountSelect });
    if (!account) {
      throw new BadRequestException(`${label} account must belong to this organization.`);
    }
    const reasons: string[] = [];
    this.addAccountReadinessReason(reasons, account, label, allowedTypes);
    if (reasons.length > 0) {
      throw new BadRequestException(reasons);
    }
  }

  private movementTotalCost(
    quantity: Prisma.Decimal,
    unitCost: Prisma.Decimal.Value | null,
    totalCost: Prisma.Decimal.Value | null,
  ): Prisma.Decimal | null {
    if (totalCost !== null) {
      return new Prisma.Decimal(totalCost);
    }
    if (unitCost !== null) {
      return quantity.mul(unitCost);
    }
    return null;
  }

  private valueOrExisting<T extends keyof UpdateInventoryAccountingSettingsDto>(
    dto: UpdateInventoryAccountingSettingsDto,
    key: T,
    existing: string | null,
  ): string | null {
    return this.hasOwn(dto, key) ? (dto[key] as string | null | undefined) ?? null : existing;
  }

  private hasOwn<T extends object>(value: T, key: keyof T): boolean {
    return Object.prototype.hasOwnProperty.call(value, key);
  }
}
