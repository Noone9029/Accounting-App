import { BadRequestException, Injectable } from "@nestjs/common";
import { AccountType, InventoryPurchasePostingMode, InventoryValuationMethod, Prisma, PurchaseBillInventoryPostingMode } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { STOCK_MOVEMENT_IN_TYPES } from "../stock-movements/stock-movement-rules";
import { UpdateInventoryAccountingSettingsDto } from "./dto/update-inventory-accounting-settings.dto";

export const INVENTORY_ACCOUNTING_NO_GL_WARNING = "Enabling this only allows manual COGS posting. It does not auto-post inventory journals.";
export const PURCHASE_RECEIPT_NO_GL_WARNING = "Purchase receipt GL posting is not enabled yet.";
export const COGS_PREVIEW_ONLY_WARNING = "COGS posting requires an explicit manual post action after review.";
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
  inventoryClearingAccount: { select: accountSelect },
  inventoryAdjustmentGainAccount: { select: accountSelect },
  inventoryAdjustmentLossAccount: { select: accountSelect },
} satisfies Prisma.InventorySettingsInclude;

export type InventoryAccountingSettingsRecord = Prisma.InventorySettingsGetPayload<{
  include: typeof accountingSettingsInclude;
}>;

export type InventoryAccountingAccount = Prisma.AccountGetPayload<{ select: typeof accountSelect }>;

type MappingKey = "inventoryAsset" | "cogs" | "inventoryClearing" | "adjustmentGain" | "adjustmentLoss";
type PrismaExecutor = PrismaService | Prisma.TransactionClient;

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
      purchaseReceiptPostingMode: dto.purchaseReceiptPostingMode ?? existing.purchaseReceiptPostingMode,
      inventoryAssetAccountId: this.valueOrExisting(dto, "inventoryAssetAccountId", existing.inventoryAssetAccountId),
      cogsAccountId: this.valueOrExisting(dto, "cogsAccountId", existing.cogsAccountId),
      inventoryClearingAccountId: this.valueOrExisting(dto, "inventoryClearingAccountId", existing.inventoryClearingAccountId),
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
    await this.validateInventoryClearingAccount(organizationId, proposed.inventoryClearingAccountId, proposed.inventoryAssetAccountId);
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
    if (dto.purchaseReceiptPostingMode !== undefined) data.purchaseReceiptPostingMode = dto.purchaseReceiptPostingMode;
    if (this.hasOwn(dto, "inventoryAssetAccountId")) data.inventoryAssetAccountId = dto.inventoryAssetAccountId;
    if (this.hasOwn(dto, "cogsAccountId")) data.cogsAccountId = dto.cogsAccountId;
    if (this.hasOwn(dto, "inventoryClearingAccountId")) data.inventoryClearingAccountId = dto.inventoryClearingAccountId;
    if (this.hasOwn(dto, "inventoryAdjustmentGainAccountId")) data.inventoryAdjustmentGainAccountId = dto.inventoryAdjustmentGainAccountId;
    if (this.hasOwn(dto, "inventoryAdjustmentLossAccountId")) data.inventoryAdjustmentLossAccountId = dto.inventoryAdjustmentLossAccountId;

    const updated = await this.prisma.inventorySettings.update({
      where: { organizationId },
      data,
      include: accountingSettingsInclude,
    });
    return this.withAccountingMetadata(updated);
  }

  async previewReadiness(organizationId: string, requiredMappings: MappingKey[], executor: PrismaExecutor = this.prisma) {
    const settings = await this.ensureSettings(organizationId, executor);
    return {
      settings,
      blockingReasons: this.previewBlockingReasons(settings, requiredMappings),
      warnings: this.previewWarnings(settings),
    };
  }

  async purchaseReceiptPostingReadiness(organizationId: string) {
    const settings =
      (await this.prisma.inventorySettings.findUnique({
        where: { organizationId },
        include: accountingSettingsInclude,
      })) ?? this.defaultAccountingSettingsForReadiness(organizationId);
    const [existingBillsInDirectModeCount, billsUsingInventoryClearingCount] = await Promise.all([
      this.prisma.purchaseBill.count({
        where: {
          organizationId,
          inventoryPostingMode: PurchaseBillInventoryPostingMode.DIRECT_EXPENSE_OR_ASSET,
        },
      }),
      this.prisma.purchaseBill.count({
        where: {
          organizationId,
          inventoryPostingMode: PurchaseBillInventoryPostingMode.INVENTORY_CLEARING,
        },
      }),
    ]);
    const accountBlockingReasons = this.purchaseReceiptPostingBlockingReasons(settings);
    const blockingReasons = [
      ...accountBlockingReasons,
      "Purchase receipt GL posting implementation is not available yet.",
      "Purchase receipt GL posting requires a future explicit receipt posting workflow before it can be enabled.",
    ];
    const compatibleBillPostingModeExists = true;

    return {
      ready: false,
      canEnablePosting: false,
      blockingReasons: [...new Set(blockingReasons)],
      warnings: [
        PURCHASE_RECEIPT_NO_GL_WARNING,
        "This readiness check is advisory only and does not create journals.",
        "Inventory clearing bill finalization is available.",
        "Purchase receipt GL posting remains disabled.",
        "Purchase receipt GL posting requires purchase bills to use inventory clearing mode.",
        "Purchase bills in DIRECT_EXPENSE_OR_ASSET mode continue posting line accounts directly; receipt posting would double-count unless bill clearing is selected.",
        ACCOUNTANT_REVIEW_WARNING,
      ],
      requiredAccounts: {
        inventoryAssetAccount: settings.inventoryAssetAccount,
        inventoryClearingAccount: settings.inventoryClearingAccount,
      },
      compatibleBillPostingModeExists,
      existingBillsInDirectModeCount,
      billsUsingInventoryClearingCount,
      recommendedNextStep:
        accountBlockingReasons.length === 0
          ? "Review clearing-mode bill journals with an accountant, then add explicit purchase receipt GL posting fields and guarded posting endpoints in a future task."
          : "Complete inventory accounting, moving-average valuation, preview-only receipt mode, and separate inventory asset/clearing account mappings first.",
    };
  }

  async movingAverageUnitCost(
    organizationId: string,
    itemId: string,
    warehouseId: string,
    asOfDate: Date,
    executor: PrismaExecutor = this.prisma,
  ) {
    const movements = await executor.stockMovement.findMany({
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

  private async ensureSettings(organizationId: string, executor: PrismaExecutor = this.prisma) {
    const existing = await executor.inventorySettings.findUnique({
      where: { organizationId },
      include: accountingSettingsInclude,
    });
    if (existing) {
      return existing;
    }
    return executor.inventorySettings.create({
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
        inventoryClearing: settings.inventoryClearingAccount,
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

  private defaultAccountingSettingsForReadiness(organizationId: string): InventoryAccountingSettingsRecord {
    return {
      id: "read-only-default",
      organizationId,
      valuationMethod: InventoryValuationMethod.MOVING_AVERAGE,
      allowNegativeStock: false,
      trackInventoryValue: true,
      enableInventoryAccounting: false,
      inventoryAssetAccountId: null,
      cogsAccountId: null,
      inventoryClearingAccountId: null,
      inventoryAdjustmentGainAccountId: null,
      inventoryAdjustmentLossAccountId: null,
      purchaseReceiptPostingMode: InventoryPurchasePostingMode.DISABLED,
      createdAt: new Date(0),
      updatedAt: new Date(0),
      inventoryAssetAccount: null,
      cogsAccount: null,
      inventoryClearingAccount: null,
      inventoryAdjustmentGainAccount: null,
      inventoryAdjustmentLossAccount: null,
    };
  }

  private previewWarnings(
    settings: Pick<InventoryAccountingSettingsRecord, "enableInventoryAccounting" | "valuationMethod" | "purchaseReceiptPostingMode">,
  ): string[] {
    const warnings = [INVENTORY_ACCOUNTING_NO_GL_WARNING, PURCHASE_RECEIPT_NO_GL_WARNING, COGS_PREVIEW_ONLY_WARNING, ACCOUNTANT_REVIEW_WARNING];
    if (!settings.enableInventoryAccounting) {
      warnings.push("Inventory accounting is disabled by default.");
    }
    if (settings.purchaseReceiptPostingMode !== InventoryPurchasePostingMode.PREVIEW_ONLY) {
      warnings.push("Purchase receipt posting mode is disabled; receipt accounting remains preview-only.");
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
    if (requiredMappings.includes("inventoryClearing")) {
      this.addAccountReadinessReason(reasons, settings.inventoryClearingAccount, "Inventory clearing", [AccountType.LIABILITY, AccountType.ASSET]);
      if (settings.inventoryClearingAccount && settings.inventoryAssetAccount && settings.inventoryClearingAccount.id === settings.inventoryAssetAccount.id) {
        reasons.push("Inventory clearing account must be separate from inventory asset account.");
      }
      if (settings.inventoryClearingAccount?.code === "210") {
        reasons.push("Inventory clearing account must be separate from Accounts Payable account code 210.");
      }
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

  private purchaseReceiptPostingBlockingReasons(settings: InventoryAccountingSettingsRecord): string[] {
    const reasons = this.previewBlockingReasons(settings, ["inventoryAsset", "inventoryClearing"]);
    if (!settings.enableInventoryAccounting) {
      reasons.push("Inventory accounting must be enabled before purchase receipt posting can be considered.");
    }
    if (settings.purchaseReceiptPostingMode !== InventoryPurchasePostingMode.PREVIEW_ONLY) {
      reasons.push("Purchase receipt posting mode must be PREVIEW_ONLY for readiness review.");
    }
    return [...new Set(reasons)];
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

  private async validateInventoryClearingAccount(
    organizationId: string,
    accountId: string | null,
    inventoryAssetAccountId: string | null,
  ): Promise<void> {
    if (!accountId) {
      return;
    }
    const account = await this.prisma.account.findFirst({ where: { id: accountId, organizationId }, select: accountSelect });
    if (!account) {
      throw new BadRequestException("Inventory clearing account must belong to this organization.");
    }
    const reasons: string[] = [];
    this.addAccountReadinessReason(reasons, account, "Inventory clearing", [AccountType.LIABILITY, AccountType.ASSET]);
    if (inventoryAssetAccountId && account.id === inventoryAssetAccountId) {
      reasons.push("Inventory clearing account must be separate from inventory asset account.");
    }
    if (account.code === "210") {
      reasons.push("Inventory clearing account must be separate from Accounts Payable account code 210.");
    }
    if (reasons.length > 0) {
      throw new BadRequestException(reasons);
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
