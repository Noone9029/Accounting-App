import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { AccountType, ItemStatus, TaxRateScope } from "@prisma/client";
import { Decimal } from "decimal.js";
import { AuditLogService } from "../audit-log/audit-log.service";
import { PrismaService } from "../prisma/prisma.service";
import { CreateItemDto } from "./dto/create-item.dto";
import { UpdateItemDto } from "./dto/update-item.dto";

const itemInclude = {
  revenueAccount: { select: { id: true, code: true, name: true, type: true } },
  salesTaxRate: { select: { id: true, name: true, rate: true, scope: true } },
  expenseAccount: { select: { id: true, code: true, name: true, type: true } },
  purchaseTaxRate: { select: { id: true, name: true, rate: true, scope: true } },
};

@Injectable()
export class ItemService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  list(organizationId: string) {
    return this.prisma.item.findMany({
      where: { organizationId },
      orderBy: { name: "asc" },
      include: itemInclude,
    });
  }

  async get(organizationId: string, id: string) {
    return this.findExisting(organizationId, id);
  }

  async create(organizationId: string, actorUserId: string, dto: CreateItemDto) {
    this.assertNonNegativeMoney(dto.sellingPrice, "Selling price");
    this.assertOptionalNonNegativeMoney(dto.purchaseCost, "Purchase cost");
    this.assertOptionalNonNegativeMoney(dto.reorderPoint, "Reorder point");
    this.assertOptionalNonNegativeMoney(dto.reorderQuantity, "Reorder quantity");
    await this.validateReferences(organizationId, dto);

    const item = await this.prisma.item.create({
      data: {
        organizationId,
        name: dto.name.trim(),
        description: this.cleanOptional(dto.description),
        sku: this.cleanOptional(dto.sku),
        type: dto.type,
        status: dto.status ?? ItemStatus.ACTIVE,
        sellingPrice: dto.sellingPrice,
        revenueAccountId: dto.revenueAccountId,
        salesTaxRateId: this.cleanOptional(dto.salesTaxRateId ?? undefined),
        purchaseCost: dto.purchaseCost,
        expenseAccountId: this.cleanOptional(dto.expenseAccountId ?? undefined),
        purchaseTaxRateId: this.cleanOptional(dto.purchaseTaxRateId ?? undefined),
        inventoryTracking: dto.inventoryTracking ?? false,
        reorderPoint: this.cleanOptionalDecimal(dto.reorderPoint),
        reorderQuantity: this.cleanOptionalDecimal(dto.reorderQuantity),
      },
      include: itemInclude,
    });

    await this.auditLogService.log({ organizationId, actorUserId, action: "CREATE", entityType: "Item", entityId: item.id, after: item });
    return item;
  }

  async update(organizationId: string, actorUserId: string, id: string, dto: UpdateItemDto) {
    const existing = await this.findExisting(organizationId, id);
    this.assertOptionalNonNegativeMoney(dto.sellingPrice, "Selling price");
    this.assertOptionalNonNegativeMoney(dto.purchaseCost, "Purchase cost");
    this.assertOptionalNonNegativeMoney(dto.reorderPoint, "Reorder point");
    this.assertOptionalNonNegativeMoney(dto.reorderQuantity, "Reorder quantity");
    await this.validateReferences(organizationId, dto);

    const item = await this.prisma.item.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        description: dto.description === undefined ? undefined : this.cleanOptional(dto.description),
        sku: dto.sku === undefined ? undefined : this.cleanOptional(dto.sku),
        type: dto.type,
        status: dto.status,
        sellingPrice: dto.sellingPrice,
        revenueAccountId: dto.revenueAccountId,
        salesTaxRateId: dto.salesTaxRateId === undefined ? undefined : this.cleanOptional(dto.salesTaxRateId ?? undefined) ?? null,
        purchaseCost: dto.purchaseCost,
        expenseAccountId: dto.expenseAccountId === undefined ? undefined : this.cleanOptional(dto.expenseAccountId ?? undefined) ?? null,
        purchaseTaxRateId: dto.purchaseTaxRateId === undefined ? undefined : this.cleanOptional(dto.purchaseTaxRateId ?? undefined) ?? null,
        inventoryTracking: dto.inventoryTracking,
        reorderPoint: dto.reorderPoint === undefined ? undefined : this.cleanOptionalDecimal(dto.reorderPoint) ?? null,
        reorderQuantity: dto.reorderQuantity === undefined ? undefined : this.cleanOptionalDecimal(dto.reorderQuantity) ?? null,
      },
      include: itemInclude,
    });

    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action: "UPDATE",
      entityType: "Item",
      entityId: id,
      before: existing,
      after: item,
    });
    return item;
  }

  async remove(organizationId: string, actorUserId: string, id: string) {
    const existing = await this.findExisting(organizationId, id);
    const lineCount = await this.prisma.salesInvoiceLine.count({ where: { organizationId, itemId: id } });

    if (lineCount > 0) {
      throw new BadRequestException("Item can only be deleted when it is unused.");
    }

    await this.prisma.item.delete({ where: { id } });
    await this.auditLogService.log({ organizationId, actorUserId, action: "DELETE", entityType: "Item", entityId: id, before: existing });
    return { deleted: true };
  }

  private async findExisting(organizationId: string, id: string) {
    const item = await this.prisma.item.findFirst({
      where: { id, organizationId },
      include: itemInclude,
    });
    if (!item) {
      throw new NotFoundException("Item not found.");
    }
    return item;
  }

  private async validateReferences(organizationId: string, dto: Partial<CreateItemDto>): Promise<void> {
    if (dto.revenueAccountId) {
      const account = await this.prisma.account.findFirst({
        where: { id: dto.revenueAccountId, organizationId, isActive: true, allowPosting: true, type: AccountType.REVENUE },
        select: { id: true },
      });
      if (!account) {
        throw new BadRequestException("Revenue account must be an active posting revenue account in this organization.");
      }
    }

    if (dto.expenseAccountId) {
      const account = await this.prisma.account.findFirst({
        where: { id: dto.expenseAccountId, organizationId, isActive: true, allowPosting: true },
        select: { id: true },
      });
      if (!account) {
        throw new BadRequestException("Expense account must be an active posting account in this organization.");
      }
    }

    if (dto.salesTaxRateId) {
      await this.assertTaxRate(organizationId, dto.salesTaxRateId, "Sales tax rate", [TaxRateScope.SALES, TaxRateScope.BOTH]);
    }

    if (dto.purchaseTaxRateId) {
      await this.assertTaxRate(organizationId, dto.purchaseTaxRateId, "Purchase tax rate", [TaxRateScope.PURCHASES, TaxRateScope.BOTH]);
    }
  }

  private async assertTaxRate(organizationId: string, id: string, label: string, allowedScopes: TaxRateScope[]): Promise<void> {
    const taxRate = await this.prisma.taxRate.findFirst({
      where: { id, organizationId, isActive: true, scope: { in: allowedScopes } },
      select: { id: true },
    });
    if (!taxRate) {
      throw new BadRequestException(`${label} must be active and valid for this organization.`);
    }
  }

  private assertNonNegativeMoney(value: string, label: string): void {
    if (new Decimal(value).lt(0)) {
      throw new BadRequestException(`${label} cannot be negative.`);
    }
  }

  private assertOptionalNonNegativeMoney(value: string | null | undefined, label: string): void {
    if (value !== undefined && value !== null && value !== "") {
      this.assertNonNegativeMoney(value, label);
    }
  }

  private cleanOptional(value: string | undefined): string | undefined {
    const trimmed = value?.trim();
    return trimmed || undefined;
  }

  private cleanOptionalDecimal(value: string | null | undefined): string | null | undefined {
    if (value === null) {
      return null;
    }
    const trimmed = value?.trim();
    return trimmed || undefined;
  }
}
