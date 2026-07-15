import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { assertBalancedJournal, getJournalTotals, JournalLineInput, toMoney } from "@ledgerbyte/accounting-core";
import {
  AccountType,
  FixedAssetAcquisitionSource,
  FixedAssetCategoryStatus,
  FixedAssetDepreciationMethod,
  FixedAssetDepreciationRunStatus,
  FixedAssetMovementType,
  FixedAssetScheduleLineStatus,
  FixedAssetStatus,
  JournalEntryStatus,
  NumberSequenceScope,
  Prisma,
  PurchaseBillStatus,
} from "@prisma/client";
import { AuditLogService } from "../audit-log/audit-log.service";
import { FiscalPeriodGuardService } from "../fiscal-periods/fiscal-period-guard.service";
import { NumberSequenceService } from "../number-sequences/number-sequence.service";
import { PrismaService } from "../prisma/prisma.service";
import { buildStraightLineSchedule, calculateDisposal, reopenedScheduleLineState, validateFixedAssetInput } from "./fixed-asset-rules";
import {
  BillLineCapitalizationDto,
  CreateFixedAssetCategoryDto,
  CreateFixedAssetDto,
  FixedAssetListQueryDto,
  ManualCapitalizationDto,
  DepreciationRunPreviewDto,
  DisposalDto,
  DisposalReviewDto,
  ExpectedVersionDto,
  ScheduleQueryDto,
  UpdateFixedAssetCategoryDto,
  UpdateFixedAssetDto,
} from "./dto/fixed-asset.dto";

type Executor = PrismaService | Prisma.TransactionClient;

export interface FixedAssetOpeningBalanceInput {
  name: string;
  categoryId: string;
  openingBalanceAccountId: string;
  acquisitionDate: Date;
  inServiceDate: Date;
  baseAcquisitionCost: string;
  baseSalvageValue: string;
  accumulatedDepreciation: string;
  usefulLifeMonths: number;
  reason?: string;
}

const categoryInclude = {
  assetCostAccount: { select: { id: true, code: true, name: true, type: true, isActive: true, allowPosting: true } },
  accumulatedDepreciationAccount: { select: { id: true, code: true, name: true, type: true, isActive: true, allowPosting: true } },
  depreciationExpenseAccount: { select: { id: true, code: true, name: true, type: true, isActive: true, allowPosting: true } },
  disposalGainAccount: { select: { id: true, code: true, name: true, type: true, isActive: true, allowPosting: true } },
  disposalLossAccount: { select: { id: true, code: true, name: true, type: true, isActive: true, allowPosting: true } },
} satisfies Prisma.FixedAssetCategoryInclude;

const assetInclude = {
  category: { include: categoryInclude },
  costCenter: { select: { id: true, code: true, name: true, status: true } },
  project: { select: { id: true, code: true, name: true, status: true } },
  sourceLinks: { orderBy: { createdAt: "asc" }, take: 100 },
  scheduleLines: { orderBy: { depreciationDate: "asc" }, take: 500 },
  movements: { orderBy: { effectiveDate: "asc" }, take: 100 },
} satisfies Prisma.FixedAssetInclude;

@Injectable()
export class FixedAssetService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly numberSequenceService: NumberSequenceService,
    private readonly auditLogService: AuditLogService,
    private readonly fiscalPeriodGuardService: FiscalPeriodGuardService,
  ) {}

  async listCategories(organizationId: string) {
    const categories = await this.prisma.fixedAssetCategory.findMany({
      where: { organizationId, status: FixedAssetCategoryStatus.ACTIVE },
      orderBy: { code: "asc" },
      take: 200,
      include: categoryInclude,
    });
    return categories.map((category) => this.toCategory(category));
  }

  async getCategory(organizationId: string, id: string) {
    const category = await this.prisma.fixedAssetCategory.findFirst({ where: { id, organizationId }, include: categoryInclude });
    if (!category) throw new NotFoundException("Fixed-asset category not found.");
    return this.toCategory(category);
  }

  async createCategory(organizationId: string, actorUserId: string, dto: CreateFixedAssetCategoryDto) {
    const input = this.cleanCategoryInput(dto);
    await this.assertCategoryAccounts(organizationId, input, this.prisma);
    const created = await this.prisma.$transaction(async (tx) => {
      const category = await tx.fixedAssetCategory.create({
        data: { ...input, organizationId, createdByUserId: actorUserId, updatedByUserId: actorUserId },
        include: categoryInclude,
      });
      await this.auditLogService.log({ organizationId, actorUserId, action: "CREATE", entityType: "FixedAssetCategory", entityId: category.id, after: this.toCategory(category) }, tx);
      return category;
    });
    return this.toCategory(created);
  }

  async updateCategory(organizationId: string, actorUserId: string, id: string, dto: UpdateFixedAssetCategoryDto) {
    const before = await this.prisma.fixedAssetCategory.findFirst({ where: { id, organizationId }, include: categoryInclude });
    if (!before) throw new NotFoundException("Fixed-asset category not found.");
    const input = this.cleanCategoryUpdate(dto);
    if (Object.keys(input).some((key) => key.endsWith("AccountId"))) {
      await this.assertCategoryAccounts(organizationId, {
        assetCostAccountId: input.assetCostAccountId ?? before.assetCostAccountId,
        accumulatedDepreciationAccountId: input.accumulatedDepreciationAccountId ?? before.accumulatedDepreciationAccountId,
        depreciationExpenseAccountId: input.depreciationExpenseAccountId ?? before.depreciationExpenseAccountId,
        disposalGainAccountId: input.disposalGainAccountId ?? before.disposalGainAccountId,
        disposalLossAccountId: input.disposalLossAccountId ?? before.disposalLossAccountId,
      }, this.prisma);
    }
    const updated = await this.prisma.fixedAssetCategory.update({ where: { id }, data: { ...input, updatedByUserId: actorUserId }, include: categoryInclude });
    await this.auditLogService.log({ organizationId, actorUserId, action: "UPDATE", entityType: "FixedAssetCategory", entityId: id, before: this.toCategory(before), after: this.toCategory(updated) });
    return this.toCategory(updated);
  }

  async archiveCategory(organizationId: string, actorUserId: string, id: string) {
    const category = await this.prisma.fixedAssetCategory.findFirst({ where: { id, organizationId } });
    if (!category) throw new NotFoundException("Fixed-asset category not found.");
    const activeAssetCount = await this.prisma.fixedAsset.count({ where: { organizationId, categoryId: id, status: { notIn: [FixedAssetStatus.DISPOSED, FixedAssetStatus.WRITTEN_OFF] } } });
    if (activeAssetCount > 0) throw new ConflictException("Category cannot be archived while it is required by active assets.");
    const archived = await this.prisma.fixedAssetCategory.update({ where: { id }, data: { status: FixedAssetCategoryStatus.ARCHIVED, archivedAt: new Date(), updatedByUserId: actorUserId }, include: categoryInclude });
    await this.auditLogService.log({ organizationId, actorUserId, action: "ARCHIVE", entityType: "FixedAssetCategory", entityId: id, before: this.toCategory(category), after: this.toCategory(archived) });
    return this.toCategory(archived);
  }

  async list(organizationId: string, query: FixedAssetListQueryDto = {}) {
    const page = Math.max(1, Number(query.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(query.limit ?? 50)));
    const search = query.search?.trim();
    const where: Prisma.FixedAssetWhereInput = {
      organizationId,
      categoryId: query.categoryId,
      status: query.status && Object.values(FixedAssetStatus).includes(query.status as FixedAssetStatus) ? query.status as FixedAssetStatus : undefined,
      ...(search ? { OR: [{ assetNumber: { contains: search, mode: "insensitive" } }, { name: { contains: search, mode: "insensitive" } }, { tagNumber: { contains: search, mode: "insensitive" } }] } : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.fixedAsset.findMany({ where, orderBy: [{ acquisitionDate: "desc" }, { assetNumber: "asc" }], skip: (page - 1) * limit, take: limit, include: { category: { select: { id: true, code: true, name: true } }, costCenter: { select: { id: true, code: true, name: true } }, project: { select: { id: true, code: true, name: true } } } }),
      this.prisma.fixedAsset.count({ where }),
    ]);
    return { data: data.map((asset) => this.toAsset(asset)), page, limit, total };
  }

  async get(organizationId: string, id: string) {
    const asset = await this.prisma.fixedAsset.findFirst({ where: { id, organizationId }, include: assetInclude });
    if (!asset) throw new NotFoundException("Fixed asset not found.");
    return this.toAsset(asset);
  }

  async create(organizationId: string, actorUserId: string, dto: CreateFixedAssetDto) {
    const cost = toMoney(dto.baseAcquisitionCost);
    const salvage = toMoney(dto.baseSalvageValue);
    validateFixedAssetInput({ baseAcquisitionCost: cost, baseSalvageValue: salvage, usefulLifeMonths: dto.usefulLifeMonths });
    const acquisitionDate = this.parseDate(dto.acquisitionDate, "Acquisition date");
    const inServiceDate = this.parseDate(dto.inServiceDate, "In-service date");
    if (inServiceDate < acquisitionDate) throw new BadRequestException("In-service date cannot be before acquisition date.");
    const organization = await this.prisma.organization.findUnique({ where: { id: organizationId }, select: { baseCurrency: true } });
    if (!organization) throw new NotFoundException("Organization not found.");
    await this.assertCategory(organizationId, dto.categoryId, this.prisma);
    await this.assertDimensions(organizationId, dto.costCenterId, dto.projectId, this.prisma);
    if (dto.transactionCurrencyCode && dto.transactionCurrencyCode.toUpperCase() !== organization.baseCurrency && (!dto.exchangeRate || !dto.rateDate || !dto.rateSource)) {
      throw new BadRequestException("Foreign fixed assets require exchange rate, rate date, and rate source evidence.");
    }
    const created = await this.prisma.$transaction(async (tx) => {
      const assetNumber = dto.assetNumber?.trim() || await this.numberSequenceService.next(organizationId, NumberSequenceScope.FIXED_ASSET, tx);
      const asset = await tx.fixedAsset.create({
        data: {
          organizationId,
          assetNumber,
          categoryId: dto.categoryId,
          name: dto.name.trim(),
          description: dto.description?.trim(),
          serialNumber: dto.serialNumber?.trim(),
          tagNumber: dto.tagNumber?.trim(),
          location: dto.location?.trim(),
          custodianName: dto.custodianName?.trim(),
          status: FixedAssetStatus.DRAFT,
          acquisitionSource: FixedAssetAcquisitionSource.MANUAL,
          acquisitionDate,
          inServiceDate,
          baseCurrencyCode: organization.baseCurrency,
          transactionCurrencyCode: dto.transactionCurrencyCode?.toUpperCase() ?? organization.baseCurrency,
          exchangeRate: dto.exchangeRate,
          rateDate: dto.rateDate ? this.parseDate(dto.rateDate, "Rate date") : undefined,
          rateSource: dto.rateSource,
          rateSnapshotId: dto.rateSnapshotId,
          transactionAcquisitionCost: dto.transactionAcquisitionCost ?? dto.baseAcquisitionCost,
          baseAcquisitionCost: cost,
          baseSalvageValue: salvage,
          usefulLifeMonths: dto.usefulLifeMonths,
          depreciationMethod: FixedAssetDepreciationMethod.STRAIGHT_LINE,
          accumulatedDepreciation: 0,
          carryingAmount: cost,
          costCenterId: dto.costCenterId,
          projectId: dto.projectId,
          createdByUserId: actorUserId,
          updatedByUserId: actorUserId,
        },
        include: { category: { select: { id: true, code: true, name: true } } },
      });
      await this.auditLogService.log({ organizationId, actorUserId, action: "CREATE", entityType: "FixedAsset", entityId: asset.id, after: this.toAsset(asset) }, tx);
      return asset;
    });
    return this.toAsset(created);
  }

  async update(organizationId: string, actorUserId: string, id: string, dto: UpdateFixedAssetDto) {
    const before = await this.prisma.fixedAsset.findFirst({ where: { id, organizationId }, include: { category: { select: { id: true, code: true, name: true } } } });
    if (!before) throw new NotFoundException("Fixed asset not found.");
    if (before.status !== FixedAssetStatus.DRAFT) throw new ConflictException("Posted or reviewed fixed assets are immutable; use reversal or disposal workflows.");
    if (dto.costCenterId !== undefined || dto.projectId !== undefined) await this.assertDimensions(organizationId, dto.costCenterId ?? before.costCenterId ?? undefined, dto.projectId ?? before.projectId ?? undefined, this.prisma);
    const nextCost = dto.baseAcquisitionCost === undefined ? toMoney(String(before.baseAcquisitionCost)) : toMoney(dto.baseAcquisitionCost);
    const nextSalvage = dto.baseSalvageValue === undefined ? toMoney(String(before.baseSalvageValue)) : toMoney(dto.baseSalvageValue);
    const nextLife = dto.usefulLifeMonths ?? before.usefulLifeMonths;
    const nextAcquisitionDate = dto.acquisitionDate ? this.parseDate(dto.acquisitionDate, "Acquisition date") : before.acquisitionDate;
    const nextInServiceDate = dto.inServiceDate ? this.parseDate(dto.inServiceDate, "In-service date") : before.inServiceDate;
    if (nextInServiceDate < nextAcquisitionDate) throw new BadRequestException("In-service date cannot be before acquisition date.");
    validateFixedAssetInput({ baseAcquisitionCost: nextCost, baseSalvageValue: nextSalvage, usefulLifeMonths: nextLife });
    const updated = await this.prisma.fixedAsset.update({
      where: { id },
      data: {
        name: dto.name?.trim(), description: dto.description?.trim(), serialNumber: dto.serialNumber?.trim(), tagNumber: dto.tagNumber?.trim(), location: dto.location?.trim(), custodianName: dto.custodianName?.trim(),
        acquisitionDate: dto.acquisitionDate ? nextAcquisitionDate : undefined,
        inServiceDate: dto.inServiceDate ? nextInServiceDate : undefined,
        baseAcquisitionCost: nextCost, baseSalvageValue: nextSalvage, usefulLifeMonths: nextLife,
        carryingAmount: nextCost, costCenterId: dto.costCenterId, projectId: dto.projectId, updatedByUserId: actorUserId,
      },
      include: { category: { select: { id: true, code: true, name: true } } },
    });
    await this.auditLogService.log({ organizationId, actorUserId, action: "UPDATE", entityType: "FixedAsset", entityId: id, before: this.toAsset(before), after: this.toAsset(updated) });
    return this.toAsset(updated);
  }

  async review(organizationId: string, actorUserId: string, id: string) {
    const before = await this.prisma.fixedAsset.findFirst({ where: { id, organizationId }, include: { category: { select: { id: true, code: true, name: true } } } });
    if (!before) throw new NotFoundException("Fixed asset not found.");
    if (before.status !== FixedAssetStatus.DRAFT) throw new ConflictException("Only draft fixed assets can be reviewed.");
    const updated = await this.prisma.fixedAsset.update({ where: { id }, data: { status: FixedAssetStatus.READY_FOR_REVIEW, updatedByUserId: actorUserId }, include: { category: { select: { id: true, code: true, name: true } } } });
    await this.auditLogService.log({ organizationId, actorUserId, action: "REVIEW", entityType: "FixedAsset", entityId: id, before: this.toAsset(before), after: this.toAsset(updated) });
    return this.toAsset(updated);
  }

  async capitalizeManual(organizationId: string, actorUserId: string, id: string, dto: ManualCapitalizationDto) {
    const result = await this.prisma.$transaction(async (tx) => {
      const asset = await tx.fixedAsset.findFirst({ where: { id, organizationId }, include: { category: { include: categoryInclude } } });
      if (!asset) throw new NotFoundException("Fixed asset not found.");
      if (asset.status !== FixedAssetStatus.READY_FOR_REVIEW) throw new ConflictException("Fixed asset must be reviewed before capitalization.");
      const offset = await this.assertPostingAccount(organizationId, dto.offsetAccountId, tx);
      const postingDate = dto.postingDate ? this.parseDate(dto.postingDate, "Posting date") : asset.acquisitionDate;
      await this.fiscalPeriodGuardService.assertPostingDateAllowed(organizationId, postingDate, tx);
      const journal = await this.createPostedJournal(organizationId, actorUserId, {
        entryDate: postingDate,
        description: `Fixed asset acquisition ${asset.assetNumber}`,
        reference: asset.assetNumber,
        currency: asset.baseCurrencyCode,
        lines: [
          this.line(asset.category.assetCostAccountId, String(asset.baseAcquisitionCost), "0", `Fixed asset ${asset.name}`, asset.costCenterId, asset.projectId),
          this.line(offset.id, "0", String(asset.baseAcquisitionCost), `Offset for fixed asset ${asset.name}`, asset.costCenterId, asset.projectId),
        ],
      }, tx);
      const updated = await tx.fixedAsset.update({ where: { id }, data: { status: FixedAssetStatus.ACTIVE, capitalizationJournalEntryId: journal.id, activatedAt: new Date(), updatedByUserId: actorUserId, version: { increment: 1 } }, include: { category: { select: { id: true, code: true, name: true } } } });
      await tx.fixedAssetSourceLink.create({ data: { organizationId, fixedAssetId: id, sourceType: "MANUAL", sourceEntityId: id, sourceJournalEntryId: journal.id, capitalizedBaseAmount: asset.baseAcquisitionCost, transactionAmount: asset.transactionAcquisitionCost, currencyCode: asset.transactionCurrencyCode } });
      await tx.fixedAssetMovement.create({ data: { organizationId, fixedAssetId: id, movementType: FixedAssetMovementType.ACQUISITION, effectiveDate: postingDate, baseAmount: asset.baseAcquisitionCost, journalEntryId: journal.id, reason: dto.reason, createdByUserId: actorUserId, postedAt: new Date() } });
      await this.auditLogService.log({ organizationId, actorUserId, action: "POST", entityType: "FixedAsset", entityId: id, before: this.toAsset(asset), after: this.toAsset(updated) }, tx);
      return { asset: updated, journalId: journal.id };
    });
    return { ...this.toAsset(result.asset), capitalizationJournalEntryId: result.journalId };
  }

  async capitalizationCandidates(organizationId: string) {
    const bills = await this.prisma.purchaseBill.findMany({
      where: { organizationId, status: PurchaseBillStatus.FINALIZED, journalEntry: { status: JournalEntryStatus.POSTED } },
      orderBy: { billDate: "asc" }, take: 100,
      select: { id: true, billNumber: true, billDate: true, currency: true, baseCurrency: true, journalEntryId: true, lines: { orderBy: { sortOrder: "asc" }, select: { id: true, description: true, accountId: true, taxableAmount: true, transactionTaxableAmount: true, lineTotal: true, transactionLineTotal: true, account: { select: { id: true, code: true, name: true, type: true } } } } },
    });
    const lines = bills.flatMap((bill) => bill.lines.map((line) => ({ ...line, billId: bill.id, billNumber: bill.billNumber, billDate: bill.billDate, currency: bill.currency, baseCurrency: bill.baseCurrency, journalEntryId: bill.journalEntryId })));
    const linked = await this.prisma.fixedAssetSourceLink.findMany({ where: { organizationId, sourceType: "PURCHASE_BILL_LINE", sourceLineId: { in: lines.map((line) => line.id) } }, select: { sourceLineId: true } });
    const linkedIds = new Set(linked.map((link) => link.sourceLineId));
    return lines.filter((line) => !linkedIds.has(line.id)).map((line) => ({ id: line.id, billId: line.billId, billNumber: line.billNumber, billDate: line.billDate, description: line.description, account: line.account, baseAmount: String(line.taxableAmount), transactionAmount: String(line.transactionTaxableAmount), journalEntryId: line.journalEntryId }));
  }

  async capitalizeFromBillLine(organizationId: string, actorUserId: string, dto: BillLineCapitalizationDto) {
    return this.prisma.$transaction(async (tx) => {
      const line = await tx.purchaseBillLine.findFirst({ where: { id: dto.billLineId, organizationId, bill: { organizationId, status: PurchaseBillStatus.FINALIZED, journalEntry: { status: JournalEntryStatus.POSTED } } }, include: { bill: { select: { id: true, billNumber: true, billDate: true, currency: true, baseCurrency: true, journalEntryId: true } }, account: { select: { id: true, code: true, name: true, type: true } } } });
      if (!line || !line.bill.journalEntryId) throw new NotFoundException("Finalized posted purchase-bill line not found.");
      const existing = await tx.fixedAssetSourceLink.findFirst({ where: { organizationId, sourceType: "PURCHASE_BILL_LINE", sourceEntityId: line.billId, sourceLineId: line.id } });
      if (existing) throw new ConflictException("This purchase-bill line has already been capitalized.");
      const sourceJournalLine = await tx.journalLine.findFirst({ where: { organizationId, journalEntryId: line.bill.journalEntryId, accountId: line.accountId, debit: line.taxableAmount }, select: { id: true, costCenterId: true, projectId: true } });
      if (!sourceJournalLine) throw new BadRequestException("The selected bill line has no exact posted base-amount journal evidence.");
      const category = await tx.fixedAssetCategory.findFirst({ where: { id: dto.categoryId, organizationId, status: FixedAssetCategoryStatus.ACTIVE }, include: categoryInclude });
      if (!category) throw new NotFoundException("Fixed-asset category not found.");
      const cost = toMoney(String(line.taxableAmount));
      const salvage = toMoney(dto.baseSalvageValue ?? String(category.defaultSalvageValue));
      const life = dto.usefulLifeMonths ?? category.defaultUsefulLifeMonths;
      validateFixedAssetInput({ baseAcquisitionCost: cost, baseSalvageValue: salvage, usefulLifeMonths: life });
      const inServiceDate = dto.inServiceDate ? this.parseDate(dto.inServiceDate, "In-service date") : line.bill.billDate;
      await this.fiscalPeriodGuardService.assertPostingDateAllowed(organizationId, line.bill.billDate, tx);
      const assetNumber = await this.numberSequenceService.next(organizationId, NumberSequenceScope.FIXED_ASSET, tx);
      const journal = line.accountId === category.assetCostAccountId ? null : await this.createPostedJournal(organizationId, actorUserId, {
        entryDate: line.bill.billDate,
        description: `Fixed asset capitalization ${line.bill.billNumber}`,
        reference: line.bill.billNumber,
        currency: line.bill.baseCurrency ?? line.bill.currency,
        lines: [
          this.line(category.assetCostAccountId, String(cost), "0", `Capitalize ${line.description}`, sourceJournalLine.costCenterId, sourceJournalLine.projectId),
          this.line(line.accountId, "0", String(cost), `Reclassify ${line.description}`, sourceJournalLine.costCenterId, sourceJournalLine.projectId),
        ],
      }, tx);
      const asset = await tx.fixedAsset.create({ data: { organizationId, assetNumber, categoryId: category.id, name: dto.name.trim(), status: FixedAssetStatus.ACTIVE, acquisitionSource: FixedAssetAcquisitionSource.PURCHASE_BILL, acquisitionDate: line.bill.billDate, inServiceDate, baseCurrencyCode: line.bill.baseCurrency ?? line.bill.currency, transactionCurrencyCode: line.bill.currency, transactionAcquisitionCost: line.transactionTaxableAmount, baseAcquisitionCost: cost, baseSalvageValue: salvage, usefulLifeMonths: life, depreciationMethod: FixedAssetDepreciationMethod.STRAIGHT_LINE, accumulatedDepreciation: 0, carryingAmount: cost, costCenterId: sourceJournalLine.costCenterId, projectId: sourceJournalLine.projectId, capitalizationJournalEntryId: journal?.id ?? line.bill.journalEntryId, createdByUserId: actorUserId, updatedByUserId: actorUserId, activatedAt: new Date() }, include: { category: { select: { id: true, code: true, name: true } } } });
      await tx.fixedAssetSourceLink.create({ data: { organizationId, fixedAssetId: asset.id, sourceType: "PURCHASE_BILL_LINE", sourceEntityId: line.billId, sourceLineId: line.id, sourceJournalEntryId: line.bill.journalEntryId, capitalizedBaseAmount: cost, transactionAmount: line.transactionTaxableAmount, currencyCode: line.bill.currency } });
      await tx.fixedAssetMovement.create({ data: { organizationId, fixedAssetId: asset.id, movementType: FixedAssetMovementType.ACQUISITION, effectiveDate: line.bill.billDate, baseAmount: cost, journalEntryId: journal?.id ?? line.bill.journalEntryId, reason: dto.reason, createdByUserId: actorUserId, postedAt: new Date() } });
      await this.auditLogService.log({ organizationId, actorUserId, action: "CAPITALIZE", entityType: "FixedAsset", entityId: asset.id, after: this.toAsset(asset) }, tx);
      return this.toAsset(asset);
    });
  }

  async createOpeningBalanceInTransaction(
    executor: Prisma.TransactionClient,
    organizationId: string,
    actorUserId: string,
    input: FixedAssetOpeningBalanceInput,
  ) {
    const organization = await executor.organization.findUnique({ where: { id: organizationId }, select: { baseCurrency: true } });
    if (!organization) throw new NotFoundException("Organization not found.");
    if (input.inServiceDate < input.acquisitionDate) throw new BadRequestException("In-service date cannot be before acquisition date.");
    const cost = toMoney(input.baseAcquisitionCost);
    const salvage = toMoney(input.baseSalvageValue);
    const accumulated = toMoney(input.accumulatedDepreciation);
    if (accumulated.gt(cost.sub(salvage))) throw new BadRequestException("Opening accumulated depreciation cannot exceed depreciable cost.");
    validateFixedAssetInput({ baseAcquisitionCost: cost, baseSalvageValue: salvage, usefulLifeMonths: input.usefulLifeMonths });
    const category = await executor.fixedAssetCategory.findFirst({ where: { id: input.categoryId, organizationId, status: FixedAssetCategoryStatus.ACTIVE }, include: categoryInclude });
    if (!category) throw new NotFoundException("Fixed-asset category not found.");
    const offset = await this.assertPostingAccount(organizationId, input.openingBalanceAccountId, executor);
    await this.fiscalPeriodGuardService.assertPostingDateAllowed(organizationId, input.acquisitionDate, executor);
    const assetNumber = await this.numberSequenceService.next(organizationId, NumberSequenceScope.FIXED_ASSET, executor);
    const carrying = cost.sub(accumulated);
    const openingLines: JournalLineInput[] = [
      this.line(category.assetCostAccountId, String(cost), "0", `Opening fixed asset ${input.name}`),
      ...(accumulated.gt(0) ? [this.line(category.accumulatedDepreciationAccountId, "0", String(accumulated), `Opening accumulated depreciation ${input.name}`)] : []),
      ...(cost.sub(accumulated).gt(0) ? [this.line(offset.id, "0", String(cost.sub(accumulated)), `Opening balance offset ${input.name}`)] : []),
    ];
    const journal = await this.createPostedJournal(organizationId, actorUserId, {
      entryDate: input.acquisitionDate,
      description: `Fixed asset opening balance ${assetNumber}`,
      reference: assetNumber,
      currency: organization.baseCurrency,
      lines: openingLines,
    }, executor);
    const asset = await executor.fixedAsset.create({
      data: {
        organizationId,
        assetNumber,
        categoryId: category.id,
        name: input.name.trim(),
        status: carrying.eq(salvage) ? FixedAssetStatus.FULLY_DEPRECIATED : FixedAssetStatus.ACTIVE,
        acquisitionSource: FixedAssetAcquisitionSource.OPENING_BALANCE,
        acquisitionDate: input.acquisitionDate,
        inServiceDate: input.inServiceDate,
        baseCurrencyCode: organization.baseCurrency,
        transactionCurrencyCode: organization.baseCurrency,
        transactionAcquisitionCost: cost,
        baseAcquisitionCost: cost,
        baseSalvageValue: salvage,
        accumulatedDepreciation: accumulated,
        carryingAmount: carrying,
        usefulLifeMonths: input.usefulLifeMonths,
        depreciationMethod: FixedAssetDepreciationMethod.STRAIGHT_LINE,
        capitalizationJournalEntryId: journal.id,
        activatedAt: new Date(),
        fullyDepreciatedAt: carrying.eq(salvage) ? new Date() : null,
        createdByUserId: actorUserId,
        updatedByUserId: actorUserId,
      },
      include: { category: { select: { id: true, code: true, name: true } } },
    });
    await executor.fixedAssetSourceLink.create({ data: { organizationId, fixedAssetId: asset.id, sourceType: "OPENING_BALANCE", sourceEntityId: asset.id, sourceJournalEntryId: journal.id, capitalizedBaseAmount: cost, transactionAmount: cost, currencyCode: organization.baseCurrency } });
    await executor.fixedAssetMovement.create({ data: { organizationId, fixedAssetId: asset.id, movementType: FixedAssetMovementType.OPENING_BALANCE, effectiveDate: input.acquisitionDate, baseAmount: cost, journalEntryId: journal.id, reason: input.reason, createdByUserId: actorUserId, postedAt: new Date() } });
    await this.auditLogService.log({ organizationId, actorUserId, action: "OPENING_BALANCE", entityType: "FixedAsset", entityId: asset.id, after: this.toAsset(asset) }, executor);
    return this.toAsset(asset);
  }

  async schedule(organizationId: string, id: string, query: ScheduleQueryDto = {}): Promise<{ assetId: string; data: any[] }> {
    const asset = await this.prisma.fixedAsset.findFirst({ where: { id, organizationId }, include: { scheduleLines: { orderBy: { depreciationDate: "asc" }, take: 500 } } });
    if (!asset) throw new NotFoundException("Fixed asset not found.");
    if (asset.scheduleLines.length === 0 && (asset.status === FixedAssetStatus.ACTIVE || asset.status === FixedAssetStatus.FULLY_DEPRECIATED)) {
      const rules = buildStraightLineSchedule({ inServiceDate: asset.inServiceDate, baseAcquisitionCost: toMoney(String(asset.baseAcquisitionCost)), baseSalvageValue: toMoney(String(asset.baseSalvageValue)), usefulLifeMonths: asset.usefulLifeMonths });
      if (rules.length > 0) {
        await this.prisma.$transaction(async (tx) => {
          for (const line of rules) await tx.fixedAssetDepreciationScheduleLine.create({ data: { organizationId, fixedAssetId: id, ...line, status: FixedAssetScheduleLineStatus.UNPOSTED } });
          await this.auditLogService.log({ organizationId, action: "GENERATE", entityType: "FixedAssetSchedule", entityId: id, after: { lineCount: rules.length } }, tx);
        });
      }
      return this.schedule(organizationId, id, query);
    }
    const status = query.status === "posted" ? FixedAssetScheduleLineStatus.POSTED : query.status === "reversed" ? FixedAssetScheduleLineStatus.REVERSED : query.status === "unposted" ? FixedAssetScheduleLineStatus.UNPOSTED : undefined;
    return { assetId: id, data: asset.scheduleLines.filter((line) => !status || line.status === status).map((line) => this.toScheduleLine(line)) };
  }

  async movements(organizationId: string, id: string) {
    const movements = await this.prisma.fixedAssetMovement.findMany({ where: { organizationId, fixedAssetId: id }, orderBy: { effectiveDate: "asc" }, take: 200 });
    return movements.map((movement) => this.toMovement(movement));
  }

  async listDepreciationRuns(organizationId: string) {
    const runs = await this.prisma.fixedAssetDepreciationRun.findMany({ where: { organizationId }, orderBy: { depreciationDate: "desc" }, take: 100, include: { _count: { select: { lines: true } } } });
    return runs.map((run) => this.toRun(run));
  }

  async getDepreciationRun(organizationId: string, id: string) {
    const run = await this.prisma.fixedAssetDepreciationRun.findFirst({ where: { id, organizationId }, include: { lines: { include: { fixedAsset: { select: { id: true, assetNumber: true, name: true } }, scheduleLine: true } } } });
    if (!run) throw new NotFoundException("Depreciation run not found.");
    return this.toRun(run);
  }

  async previewDepreciationRun(organizationId: string, actorUserId: string, dto: DepreciationRunPreviewDto) {
    const depreciationDate = this.parseDate(dto.depreciationDate, "Depreciation date");
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.fixedAssetDepreciationRun.findFirst({ where: { organizationId, idempotencyKey: dto.idempotencyKey }, include: { _count: { select: { lines: true } } } });
      if (existing) return this.toRun(existing);
      const period = await tx.fiscalPeriod.findFirst({ where: { id: dto.fiscalPeriodId, organizationId } });
      if (!period) throw new NotFoundException("Fiscal period not found.");
      if (period.status !== "OPEN") throw new BadRequestException("Depreciation can only be previewed for an open fiscal period.");
      if (depreciationDate < period.startsOn || depreciationDate > period.endsOn) throw new BadRequestException("Depreciation date must fall inside the selected fiscal period.");
      await this.ensureSchedules(organizationId, tx);
      const scheduleLines = await tx.fixedAssetDepreciationScheduleLine.findMany({ where: { organizationId, status: FixedAssetScheduleLineStatus.UNPOSTED, depreciationDate: { gte: period.startsOn, lte: depreciationDate }, fixedAsset: { organizationId, status: { in: [FixedAssetStatus.ACTIVE, FixedAssetStatus.FULLY_DEPRECIATED] } } }, orderBy: [{ depreciationDate: "asc" }, { fixedAssetId: "asc" }], take: 5000, include: { fixedAsset: { include: { category: true } } } });
      const total = scheduleLines.reduce((sum, line) => sum.plus(line.depreciationAmount), toMoney("0"));
      const run = await tx.fixedAssetDepreciationRun.create({ data: { organizationId, fiscalPeriodId: period.id, depreciationDate, status: FixedAssetDepreciationRunStatus.DRAFT, assetCount: new Set(scheduleLines.map((line) => line.fixedAssetId)).size, totalDepreciation: total, idempotencyKey: dto.idempotencyKey } });
      if (scheduleLines.length > 0) {
        await tx.fixedAssetDepreciationRunLine.createMany({ data: scheduleLines.map((line) => ({ organizationId, runId: run.id, fixedAssetId: line.fixedAssetId, scheduleLineId: line.id, depreciationAmount: line.depreciationAmount, expenseAccountId: line.fixedAsset.category.depreciationExpenseAccountId, accumulatedDepreciationAccountId: line.fixedAsset.category.accumulatedDepreciationAccountId, costCenterId: line.fixedAsset.costCenterId, projectId: line.fixedAsset.projectId })) });
      }
      const runWithCount = await tx.fixedAssetDepreciationRun.findUniqueOrThrow({ where: { id: run.id }, include: { _count: { select: { lines: true } } } });
      await this.auditLogService.log({ organizationId, actorUserId, action: "PREVIEW", entityType: "FixedAssetDepreciationRun", entityId: runWithCount.id, after: { assetCount: runWithCount.assetCount, totalDepreciation: String(runWithCount.totalDepreciation), fiscalPeriodId: runWithCount.fiscalPeriodId } }, tx);
      return this.toRun(runWithCount);
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async reviewDepreciationRun(organizationId: string, actorUserId: string, id: string, dto: ExpectedVersionDto) {
    const run = await this.prisma.fixedAssetDepreciationRun.findFirst({ where: { id, organizationId } });
    if (!run) throw new NotFoundException("Depreciation run not found.");
    if (run.status !== FixedAssetDepreciationRunStatus.DRAFT) throw new ConflictException("Only draft depreciation runs can be reviewed.");
    const updated = await this.prisma.fixedAssetDepreciationRun.updateMany({ where: { id, organizationId, status: FixedAssetDepreciationRunStatus.DRAFT, version: dto.expectedVersion }, data: { status: FixedAssetDepreciationRunStatus.REVIEWED, reviewedByUserId: actorUserId, reviewedAt: new Date(), version: { increment: 1 } } });
    if (updated.count !== 1) throw new ConflictException("Depreciation run changed. Reload and retry.");
    await this.auditLogService.log({ organizationId, actorUserId, action: "REVIEW", entityType: "FixedAssetDepreciationRun", entityId: id, after: { status: FixedAssetDepreciationRunStatus.REVIEWED } });
    return this.getDepreciationRun(organizationId, id);
  }

  async postDepreciationRun(organizationId: string, actorUserId: string, id: string, dto: ExpectedVersionDto) {
    return this.prisma.$transaction(async (tx) => {
      const run = await tx.fixedAssetDepreciationRun.findFirst({ where: { id, organizationId }, include: { lines: { include: { fixedAsset: { include: { category: true } }, scheduleLine: true } } } });
      if (!run) throw new NotFoundException("Depreciation run not found.");
      if (run.status === FixedAssetDepreciationRunStatus.POSTED) return this.toRun(run);
      if (run.status !== FixedAssetDepreciationRunStatus.REVIEWED) throw new ConflictException("Depreciation run must be reviewed before posting.");
      if (run.version !== dto.expectedVersion) throw new ConflictException("Depreciation run changed. Reload and retry.");
      if (run.lines.length === 0) throw new BadRequestException("Depreciation run has no eligible schedule lines for the selected period.");
      const period = await tx.fiscalPeriod.findFirst({ where: { id: run.fiscalPeriodId, organizationId } });
      if (!period) throw new NotFoundException("Fiscal period not found.");
      if (period.status !== "OPEN") throw new BadRequestException("Depreciation cannot be posted into a closed or locked period.");
      const organization = await tx.organization.findUnique({ where: { id: organizationId }, select: { baseCurrency: true } });
      if (!organization) throw new NotFoundException("Organization not found.");
      const groups = new Map<string, { expenseAccountId: string; accumulatedAccountId: string; costCenterId: string | null; projectId: string | null; amount: any }>();
      const assetGroups = new Map<string, { fixedAsset: (typeof run.lines)[number]["fixedAsset"]; amount: any; lines: (typeof run.lines)[number][] }>();
      for (const line of run.lines) {
        if (line.scheduleLine.status !== FixedAssetScheduleLineStatus.UNPOSTED) throw new ConflictException("A depreciation schedule line is no longer unposted.");
        const key = [line.expenseAccountId, line.accumulatedDepreciationAccountId, line.costCenterId ?? "", line.projectId ?? ""].join(":");
        const group = groups.get(key) ?? { expenseAccountId: line.expenseAccountId, accumulatedAccountId: line.accumulatedDepreciationAccountId, costCenterId: line.costCenterId, projectId: line.projectId, amount: toMoney("0") };
        group.amount = group.amount.plus(line.depreciationAmount);
        groups.set(key, group);
        const assetGroup = assetGroups.get(line.fixedAssetId) ?? { fixedAsset: line.fixedAsset, amount: toMoney("0"), lines: [] };
        assetGroup.amount = assetGroup.amount.plus(line.depreciationAmount);
        assetGroup.lines.push(line);
        assetGroups.set(line.fixedAssetId, assetGroup);
      }
      const journalLines: JournalLineInput[] = [];
      for (const group of groups.values()) {
        journalLines.push(this.line(group.expenseAccountId, String(group.amount), "0", `Depreciation ${run.depreciationDate.toISOString().slice(0, 7)}`, group.costCenterId, group.projectId));
        journalLines.push(this.line(group.accumulatedAccountId, "0", String(group.amount), `Accumulated depreciation ${run.depreciationDate.toISOString().slice(0, 7)}`, group.costCenterId, group.projectId));
      }
      const journal = await this.createPostedJournal(organizationId, actorUserId, { entryDate: run.depreciationDate, description: `Fixed asset depreciation ${run.depreciationDate.toISOString().slice(0, 7)}`, reference: id, currency: organization.baseCurrency, lines: journalLines }, tx);
      for (const assetGroup of assetGroups.values()) {
        const currentAccumulated = toMoney(String(assetGroup.fixedAsset.accumulatedDepreciation)).plus(assetGroup.amount);
        const baseCost = toMoney(String(assetGroup.fixedAsset.baseAcquisitionCost));
        const salvage = toMoney(String(assetGroup.fixedAsset.baseSalvageValue));
        const carrying = baseCost.minus(currentAccumulated).lt(salvage) ? salvage : baseCost.minus(currentAccumulated);
        const fully = carrying.eq(salvage);
        const claimed = await tx.fixedAsset.updateMany({ where: { id: assetGroup.fixedAsset.id, organizationId, version: assetGroup.fixedAsset.version, status: { in: [FixedAssetStatus.ACTIVE, FixedAssetStatus.FULLY_DEPRECIATED] } }, data: { accumulatedDepreciation: currentAccumulated, carryingAmount: carrying, status: fully ? FixedAssetStatus.FULLY_DEPRECIATED : FixedAssetStatus.ACTIVE, fullyDepreciatedAt: fully ? new Date() : null, version: { increment: 1 } } });
        if (claimed.count !== 1) throw new ConflictException("Fixed asset changed while posting depreciation.");
        for (const line of assetGroup.lines) {
          await tx.fixedAssetDepreciationScheduleLine.update({ where: { id: line.scheduleLineId }, data: { status: FixedAssetScheduleLineStatus.POSTED, journalEntryId: journal.id, postedAt: new Date() } });
          await tx.fixedAssetMovement.create({ data: { organizationId, fixedAssetId: line.fixedAssetId, movementType: FixedAssetMovementType.DEPRECIATION, effectiveDate: run.depreciationDate, baseAmount: line.depreciationAmount, journalEntryId: journal.id, createdByUserId: actorUserId, postedAt: new Date() } });
        }
      }
      const posted = await tx.fixedAssetDepreciationRun.update({ where: { id }, data: { status: FixedAssetDepreciationRunStatus.POSTED, postedByUserId: actorUserId, postedAt: new Date(), journalEntryId: journal.id, version: { increment: 1 } }, include: { _count: { select: { lines: true } } } });
      await this.auditLogService.log({ organizationId, actorUserId, action: "POST", entityType: "FixedAssetDepreciationRun", entityId: id, after: { status: posted.status, journalEntryId: journal.id, totalDepreciation: String(posted.totalDepreciation) } }, tx);
      return this.toRun(posted);
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async reverseDepreciationRun(organizationId: string, actorUserId: string, id: string, dto: ExpectedVersionDto) {
    return this.prisma.$transaction(async (tx) => {
      const run = await tx.fixedAssetDepreciationRun.findFirst({ where: { id, organizationId }, include: { lines: { include: { fixedAsset: true, scheduleLine: true } } } });
      if (!run) throw new NotFoundException("Depreciation run not found.");
      if (run.status === FixedAssetDepreciationRunStatus.REVERSED) return this.toRun(run);
      if (run.status !== FixedAssetDepreciationRunStatus.POSTED || !run.journalEntryId) throw new ConflictException("Only a posted depreciation run can be reversed.");
      if (run.version !== dto.expectedVersion) throw new ConflictException("Depreciation run changed. Reload and retry.");
      const laterMovement = await tx.fixedAssetMovement.count({ where: { organizationId, fixedAssetId: { in: run.lines.map((line) => line.fixedAssetId) }, effectiveDate: { gt: run.depreciationDate }, movementType: { in: [FixedAssetMovementType.DEPRECIATION, FixedAssetMovementType.DISPOSAL, FixedAssetMovementType.WRITE_OFF] } } });
      if (laterMovement > 0) throw new ConflictException("This depreciation run cannot be reversed after later fixed-asset movements.");
      const original = await tx.journalEntry.findFirst({ where: { id: run.journalEntryId, organizationId, status: JournalEntryStatus.POSTED }, include: { lines: true } });
      if (!original) throw new ConflictException("Depreciation journal evidence is unavailable for reversal.");
      const reversalLines = original.lines.map((line) => this.line(line.accountId, String(line.credit), String(line.debit), `Reversal: ${line.description ?? original.description}`, line.costCenterId, line.projectId));
      const reversal = await this.createPostedJournal(organizationId, actorUserId, { entryDate: new Date(), description: `Reversal of ${original.entryNumber}`, reference: original.entryNumber, currency: original.currency, lines: reversalLines }, tx);
      await tx.journalEntry.update({ where: { id: original.id }, data: { status: JournalEntryStatus.REVERSED } });
      for (const line of run.lines) {
        const accumulated = toMoney(String(line.fixedAsset.accumulatedDepreciation)).minus(line.depreciationAmount);
        const carrying = toMoney(String(line.fixedAsset.baseAcquisitionCost)).minus(accumulated);
        await tx.fixedAsset.update({ where: { id: line.fixedAssetId }, data: { accumulatedDepreciation: accumulated, carryingAmount: carrying, status: FixedAssetStatus.ACTIVE, fullyDepreciatedAt: null, version: { increment: 1 } } });
        await tx.fixedAssetDepreciationScheduleLine.update({ where: { id: line.scheduleLineId }, data: reopenedScheduleLineState() });
        await tx.fixedAssetMovement.create({ data: { organizationId, fixedAssetId: line.fixedAssetId, movementType: FixedAssetMovementType.DEPRECIATION_REVERSAL, effectiveDate: new Date(), baseAmount: line.depreciationAmount, journalEntryId: reversal.id, reversedMovementId: line.scheduleLineId, createdByUserId: actorUserId, postedAt: new Date() } });
      }
      const reversed = await tx.fixedAssetDepreciationRun.update({ where: { id }, data: { status: FixedAssetDepreciationRunStatus.REVERSED, reversedAt: new Date(), version: { increment: 1 } }, include: { _count: { select: { lines: true } } } });
      await this.auditLogService.log({ organizationId, actorUserId, action: "REVERSE", entityType: "FixedAssetDepreciationRun", entityId: id, after: { status: reversed.status, reversalJournalEntryId: reversal.id } }, tx);
      return this.toRun(reversed);
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async dispose(organizationId: string, actorUserId: string, id: string, dto: DisposalDto) {
    return this.disposeInternal(organizationId, actorUserId, id, dto, FixedAssetMovementType.DISPOSAL, FixedAssetStatus.DISPOSED);
  }

  async reviewDisposal(organizationId: string, actorUserId: string, id: string, dto: DisposalReviewDto) {
    const reason = dto.reason.trim();
    if (!reason) throw new BadRequestException("Disposal review reason is required.");
    return this.prisma.$transaction(async (tx) => {
      const asset = await tx.fixedAsset.findFirst({ where: { id, organizationId }, include: { category: { select: { id: true, code: true, name: true } } } });
      if (!asset) throw new NotFoundException("Fixed asset not found.");
      if (asset.status !== FixedAssetStatus.ACTIVE && asset.status !== FixedAssetStatus.FULLY_DEPRECIATED) throw new ConflictException("Only active fixed assets can be reviewed for disposal.");
      const reviewed = await tx.fixedAsset.update({ where: { id }, data: { disposalReviewedByUserId: actorUserId, disposalReviewedAt: new Date(), disposalReviewReason: reason, updatedByUserId: actorUserId }, include: { category: { select: { id: true, code: true, name: true } } } });
      await this.auditLogService.log({ organizationId, actorUserId, action: "REVIEW_DISPOSAL", entityType: "FixedAsset", entityId: id, before: this.toAsset(asset), after: this.toAsset(reviewed) }, tx);
      return this.toAsset(reviewed);
    });
  }

  async writeOff(organizationId: string, actorUserId: string, id: string, dto: Omit<DisposalDto, "proceedsAccountId">) {
    if (!toMoney(dto.proceeds).eq(0)) throw new BadRequestException("Write-off proceeds must be zero.");
    return this.disposeInternal(organizationId, actorUserId, id, { ...dto, proceeds: "0" }, FixedAssetMovementType.WRITE_OFF, FixedAssetStatus.WRITTEN_OFF);
  }

  async reverseDisposal(organizationId: string, actorUserId: string, id: string) {
    return this.prisma.$transaction(async (tx) => {
      const asset = await tx.fixedAsset.findFirst({ where: { id, organizationId }, include: { category: true } });
      if (!asset) throw new NotFoundException("Fixed asset not found.");
      if (asset.status !== FixedAssetStatus.DISPOSED && asset.status !== FixedAssetStatus.WRITTEN_OFF) throw new ConflictException("Only disposed or written-off assets can be reversed.");
      const laterMovement = await tx.fixedAssetMovement.count({ where: { organizationId, fixedAssetId: id, effectiveDate: { gt: asset.disposedAt ?? asset.writtenOffAt ?? new Date() } } });
      if (laterMovement > 0) throw new ConflictException("Disposal cannot be reversed after later fixed-asset movements.");
      if (!asset.disposalJournalEntryId) throw new ConflictException("Disposal journal evidence is unavailable.");
      const original = await tx.journalEntry.findFirst({ where: { id: asset.disposalJournalEntryId, organizationId, status: JournalEntryStatus.POSTED }, include: { lines: true } });
      if (!original) throw new ConflictException("Disposal journal is already reversed or unavailable.");
      const reversal = await this.createPostedJournal(organizationId, actorUserId, { entryDate: new Date(), description: `Reversal of ${original.entryNumber}`, reference: original.entryNumber, currency: original.currency, lines: original.lines.map((line) => this.line(line.accountId, String(line.credit), String(line.debit), `Reversal: ${line.description ?? original.description}`, line.costCenterId, line.projectId)) }, tx);
      await tx.journalEntry.update({ where: { id: original.id }, data: { status: JournalEntryStatus.REVERSED } });
      const restored = await tx.fixedAsset.update({ where: { id }, data: { status: asset.carryingAmount.eq(asset.baseSalvageValue) ? FixedAssetStatus.FULLY_DEPRECIATED : FixedAssetStatus.ACTIVE, disposalJournalEntryId: null, disposalReviewedByUserId: null, disposalReviewedAt: null, disposalReviewReason: null, disposedAt: null, writtenOffAt: null, version: { increment: 1 } }, include: { category: { select: { id: true, code: true, name: true } } } });
      await tx.fixedAssetMovement.create({ data: { organizationId, fixedAssetId: id, movementType: FixedAssetMovementType.DISPOSAL_REVERSAL, effectiveDate: new Date(), baseAmount: asset.carryingAmount, journalEntryId: reversal.id, createdByUserId: actorUserId, postedAt: new Date() } });
      await this.auditLogService.log({ organizationId, actorUserId, action: "REVERSE", entityType: "FixedAsset", entityId: id, after: { status: restored.status, reversalJournalEntryId: reversal.id } }, tx);
      return this.toAsset(restored);
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  private async disposeInternal(organizationId: string, actorUserId: string, id: string, dto: DisposalDto, movementType: FixedAssetMovementType, status: FixedAssetStatus) {
    return this.prisma.$transaction(async (tx) => {
      const asset = await tx.fixedAsset.findFirst({ where: { id, organizationId }, include: { category: true } });
      if (!asset) throw new NotFoundException("Fixed asset not found.");
      if (asset.status !== FixedAssetStatus.ACTIVE && asset.status !== FixedAssetStatus.FULLY_DEPRECIATED) throw new ConflictException("Only active fixed assets can be disposed.");
      if (!asset.disposalReviewedAt) throw new ConflictException("Disposal must be reviewed before posting.");
      const disposalDate = this.parseDate(dto.disposalDate, "Disposal date");
      await this.fiscalPeriodGuardService.assertPostingDateAllowed(organizationId, disposalDate, tx);
      const proceeds = toMoney(dto.proceeds);
      if (proceeds.lt(0)) throw new BadRequestException("Proceeds cannot be negative.");
      if (movementType === FixedAssetMovementType.DISPOSAL && !dto.proceedsAccountId) throw new BadRequestException("Sale requires a proceeds account.");
      const proceedsAccount = dto.proceedsAccountId ? await this.assertPostingAccount(organizationId, dto.proceedsAccountId, tx) : null;
      const amounts = calculateDisposal({ baseAcquisitionCost: toMoney(String(asset.baseAcquisitionCost)), accumulatedDepreciation: toMoney(String(asset.accumulatedDepreciation)), proceeds });
      const lines: JournalLineInput[] = [];
      if (toMoney(String(asset.accumulatedDepreciation)).gt(0)) lines.push(this.line(asset.category.accumulatedDepreciationAccountId, String(asset.accumulatedDepreciation), "0", `Accumulated depreciation on disposal ${asset.assetNumber}`, asset.costCenterId, asset.projectId));
      if (proceeds.gt(0) && proceedsAccount) lines.push(this.line(proceedsAccount.id, String(proceeds), "0", `Disposal proceeds ${asset.assetNumber}`, asset.costCenterId, asset.projectId));
      if (toMoney(amounts.loss).gt(0)) lines.push(this.line(asset.category.disposalLossAccountId, amounts.loss, "0", `Disposal loss ${asset.assetNumber}`, asset.costCenterId, asset.projectId));
      lines.push(this.line(asset.category.assetCostAccountId, "0", String(asset.baseAcquisitionCost), `Remove asset cost ${asset.assetNumber}`, asset.costCenterId, asset.projectId));
      if (toMoney(amounts.gain).gt(0)) lines.push(this.line(asset.category.disposalGainAccountId, "0", amounts.gain, `Disposal gain ${asset.assetNumber}`, asset.costCenterId, asset.projectId));
      const journal = await this.createPostedJournal(organizationId, actorUserId, { entryDate: disposalDate, description: `${movementType === FixedAssetMovementType.DISPOSAL ? "Sale" : "Write-off"} of fixed asset ${asset.assetNumber}`, reference: asset.assetNumber, currency: asset.baseCurrencyCode, lines }, tx);
      await tx.fixedAssetDepreciationScheduleLine.updateMany({ where: { organizationId, fixedAssetId: id, status: FixedAssetScheduleLineStatus.UNPOSTED, depreciationDate: { gte: disposalDate } }, data: { status: FixedAssetScheduleLineStatus.REVERSED } });
      const updated = await tx.fixedAsset.update({ where: { id }, data: { status, disposalJournalEntryId: journal.id, disposedAt: movementType === FixedAssetMovementType.DISPOSAL ? disposalDate : null, writtenOffAt: movementType === FixedAssetMovementType.WRITE_OFF ? disposalDate : null, version: { increment: 1 } }, include: { category: { select: { id: true, code: true, name: true } } } });
      await tx.fixedAssetMovement.create({ data: { organizationId, fixedAssetId: id, movementType, effectiveDate: disposalDate, baseAmount: asset.carryingAmount, proceedsAmount: proceeds, gainAmount: amounts.gain, lossAmount: amounts.loss, journalEntryId: journal.id, reason: dto.reason, createdByUserId: actorUserId, postedAt: new Date() } });
      await this.auditLogService.log({ organizationId, actorUserId, action: movementType === FixedAssetMovementType.DISPOSAL ? "DISPOSE" : "WRITE_OFF", entityType: "FixedAsset", entityId: id, after: { status, journalEntryId: journal.id, carryingAmount: amounts.carryingAmount, proceeds: String(proceeds), gain: amounts.gain, loss: amounts.loss } }, tx);
      return { ...this.toAsset(updated), disposal: amounts, journalEntryId: journal.id };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  private async ensureSchedules(organizationId: string, executor: Prisma.TransactionClient) {
    const assets = await executor.fixedAsset.findMany({ where: { organizationId, status: FixedAssetStatus.ACTIVE, scheduleLines: { none: {} } }, orderBy: { acquisitionDate: "asc" }, take: 500, select: { id: true, inServiceDate: true, baseAcquisitionCost: true, baseSalvageValue: true, usefulLifeMonths: true } });
    for (const asset of assets) {
      const lines = buildStraightLineSchedule({ inServiceDate: asset.inServiceDate, baseAcquisitionCost: toMoney(String(asset.baseAcquisitionCost)), baseSalvageValue: toMoney(String(asset.baseSalvageValue)), usefulLifeMonths: asset.usefulLifeMonths });
      for (const line of lines) await executor.fixedAssetDepreciationScheduleLine.create({ data: { organizationId, fixedAssetId: asset.id, ...line, status: FixedAssetScheduleLineStatus.UNPOSTED } });
    }
  }

  private async assertCategory(organizationId: string, id: string, executor: Executor) {
    const category = await executor.fixedAssetCategory.findFirst({ where: { id, organizationId, status: FixedAssetCategoryStatus.ACTIVE } });
    if (!category) throw new BadRequestException("Category must be active and belong to this organization.");
    return category;
  }

  private async assertCategoryAccounts(organizationId: string, input: { assetCostAccountId: string; accumulatedDepreciationAccountId: string; depreciationExpenseAccountId: string; disposalGainAccountId: string; disposalLossAccountId: string }, executor: Executor) {
    const ids = [input.assetCostAccountId, input.accumulatedDepreciationAccountId, input.depreciationExpenseAccountId, input.disposalGainAccountId, input.disposalLossAccountId];
    const accounts = await executor.account.findMany({ where: { organizationId, id: { in: ids }, isActive: true, allowPosting: true }, select: { id: true, type: true } });
    if (accounts.length !== new Set(ids).size) throw new BadRequestException("All fixed-asset accounts must be active, posting-enabled, and tenant-owned.");
    const byId = new Map(accounts.map((account) => [account.id, account.type]));
    if (byId.get(input.assetCostAccountId) !== AccountType.ASSET || byId.get(input.accumulatedDepreciationAccountId) !== AccountType.ASSET || byId.get(input.depreciationExpenseAccountId) !== AccountType.EXPENSE || byId.get(input.disposalLossAccountId) !== AccountType.EXPENSE || !( [AccountType.REVENUE, AccountType.EQUITY, AccountType.ASSET] as AccountType[]).includes(byId.get(input.disposalGainAccountId) as AccountType)) throw new BadRequestException("Fixed-asset account mappings use invalid account types.");
  }

  private async assertPostingAccount(organizationId: string, id: string, executor: Executor) {
    const account = await executor.account.findFirst({ where: { id, organizationId, isActive: true, allowPosting: true }, select: { id: true, type: true } });
    if (!account) throw new BadRequestException("Offset account must be active, posting-enabled, and tenant-owned.");
    return account;
  }

  private async assertDimensions(organizationId: string, costCenterId: string | undefined, projectId: string | undefined, executor: Executor) {
    if (costCenterId) {
      const item = await executor.costCenter.findFirst({ where: { id: costCenterId, organizationId, status: "ACTIVE" } });
      if (!item) throw new BadRequestException("Cost center must be active and tenant-owned.");
    }
    if (projectId) {
      const item = await executor.project.findFirst({ where: { id: projectId, organizationId, status: "ACTIVE" } });
      if (!item) throw new BadRequestException("Project must be active and tenant-owned.");
    }
  }

  private async createPostedJournal(organizationId: string, actorUserId: string, input: { entryDate: Date; description: string; reference?: string; currency: string; lines: JournalLineInput[] }, executor: Prisma.TransactionClient) {
    assertBalancedJournal(input.lines);
    const totals = getJournalTotals(input.lines);
    await this.assertPostingDateAllowed(organizationId, input.entryDate, executor);
    const entryNumber = await this.numberSequenceService.next(organizationId, NumberSequenceScope.JOURNAL_ENTRY, executor);
    const entry = await executor.journalEntry.create({ data: { organizationId, entryNumber, status: JournalEntryStatus.POSTED, entryDate: input.entryDate, description: input.description, reference: input.reference, currency: input.currency, totalDebit: totals.debit, totalCredit: totals.credit, postedAt: new Date(), postedById: actorUserId, createdById: actorUserId, lines: { create: input.lines.map((line, index) => ({ organizationId, accountId: line.accountId, lineNumber: index + 1, description: line.description, debit: line.debit, credit: line.credit, currency: input.currency, exchangeRate: 1, functionalCurrencyOnly: true, costCenterId: line.costCenterId, projectId: line.projectId })) } } });
    await this.auditLogService.log({ organizationId, actorUserId, action: "POST", entityType: "JournalEntry", entityId: entry.id, after: { id: entry.id, entryNumber: entry.entryNumber, totalDebit: String(entry.totalDebit), totalCredit: String(entry.totalCredit) } }, executor);
    return entry;
  }

  private async assertPostingDateAllowed(organizationId: string, date: Date, executor: Prisma.TransactionClient) {
    await this.fiscalPeriodGuardService.assertPostingDateAllowed(organizationId, date, executor);
  }

  private line(accountId: string, debit: string, credit: string, description: string, costCenterId?: string | null, projectId?: string | null): JournalLineInput {
    return { accountId, debit, credit, description, currency: "SAR", exchangeRate: "1", costCenterId: costCenterId ?? undefined, projectId: projectId ?? undefined };
  }

  private cleanCategoryInput(dto: CreateFixedAssetCategoryDto) {
    const defaultSalvageValue = toMoney(dto.defaultSalvageValue);
    if (defaultSalvageValue.lt(0)) throw new BadRequestException("Default salvage value cannot be negative.");
    return { code: dto.code.trim(), name: dto.name.trim(), description: dto.description?.trim(), assetCostAccountId: dto.assetCostAccountId, accumulatedDepreciationAccountId: dto.accumulatedDepreciationAccountId, depreciationExpenseAccountId: dto.depreciationExpenseAccountId, disposalGainAccountId: dto.disposalGainAccountId, disposalLossAccountId: dto.disposalLossAccountId, defaultUsefulLifeMonths: dto.defaultUsefulLifeMonths, defaultSalvageValue };
  }

  private cleanCategoryUpdate(dto: UpdateFixedAssetCategoryDto) {
    return { name: dto.name?.trim(), description: dto.description?.trim(), assetCostAccountId: dto.assetCostAccountId, accumulatedDepreciationAccountId: dto.accumulatedDepreciationAccountId, depreciationExpenseAccountId: dto.depreciationExpenseAccountId, disposalGainAccountId: dto.disposalGainAccountId, disposalLossAccountId: dto.disposalLossAccountId, defaultUsefulLifeMonths: dto.defaultUsefulLifeMonths, defaultSalvageValue: dto.defaultSalvageValue === undefined ? undefined : toMoney(dto.defaultSalvageValue) };
  }

  private parseDate(value: string, label: string): Date {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) throw new BadRequestException(`${label} is invalid.`);
    return date;
  }

  private toCategory(category: any) {
    return { ...category, defaultSalvageValue: String(category.defaultSalvageValue), archivedAt: category.archivedAt ?? null };
  }

  private toAsset(asset: any) {
    return { ...asset, baseAcquisitionCost: String(asset.baseAcquisitionCost), baseSalvageValue: String(asset.baseSalvageValue), accumulatedDepreciation: String(asset.accumulatedDepreciation), carryingAmount: String(asset.carryingAmount), transactionAcquisitionCost: asset.transactionAcquisitionCost == null ? null : String(asset.transactionAcquisitionCost), exchangeRate: asset.exchangeRate == null ? null : String(asset.exchangeRate), sourceLinks: asset.sourceLinks?.map((link: any) => ({ ...link, capitalizedBaseAmount: String(link.capitalizedBaseAmount), transactionAmount: link.transactionAmount == null ? null : String(link.transactionAmount) })) ?? undefined, scheduleLines: asset.scheduleLines?.map((line: any) => this.toScheduleLine(line)) ?? undefined, movements: asset.movements?.map((movement: any) => this.toMovement(movement)) ?? undefined };
  }

  private toMovement(movement: any) {
    return { ...movement, baseAmount: String(movement.baseAmount), proceedsAmount: movement.proceedsAmount == null ? null : String(movement.proceedsAmount), gainAmount: movement.gainAmount == null ? null : String(movement.gainAmount), lossAmount: movement.lossAmount == null ? null : String(movement.lossAmount) };
  }

  private toScheduleLine(line: any) {
    return { ...line, openingCarryingAmount: String(line.openingCarryingAmount), depreciationAmount: String(line.depreciationAmount), accumulatedDepreciationAfter: String(line.accumulatedDepreciationAfter), closingCarryingAmount: String(line.closingCarryingAmount) };
  }

  private toRun(run: any) {
    return { ...run, totalDepreciation: String(run.totalDepreciation), lines: run.lines?.map((line: any) => ({ ...line, depreciationAmount: String(line.depreciationAmount), scheduleLine: line.scheduleLine ? this.toScheduleLine(line.scheduleLine) : undefined })) ?? undefined };
  }
}
