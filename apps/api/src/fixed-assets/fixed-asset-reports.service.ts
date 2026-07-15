import { Injectable } from "@nestjs/common";
import { FixedAssetMovementType, Prisma } from "@prisma/client";
import { renderFixedAssetReportPdf } from "@ledgerbyte/pdf-core";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class FixedAssetReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async register(organizationId: string, categoryId?: string) {
    const assets = await this.prisma.fixedAsset.findMany({ where: { organizationId, categoryId }, orderBy: [{ assetNumber: "asc" }], take: 1000, include: { category: { select: { id: true, code: true, name: true } }, costCenter: { select: { id: true, code: true, name: true } }, project: { select: { id: true, code: true, name: true } } } });
    return assets.map((asset) => this.assetRow(asset));
  }

  async depreciation(organizationId: string, from?: string, to?: string) {
    const lines = await this.prisma.fixedAssetDepreciationScheduleLine.findMany({ where: { organizationId, depreciationDate: { gte: from ? new Date(from) : undefined, lte: to ? new Date(to) : undefined } }, orderBy: [{ depreciationDate: "asc" }, { fixedAssetId: "asc" }], take: 5000, include: { fixedAsset: { select: { id: true, assetNumber: true, name: true, category: { select: { code: true, name: true } } } } } });
    return lines.map((line) => ({ period: line.periodStart.toISOString().slice(0, 7), assetId: line.fixedAssetId, assetNumber: line.fixedAsset.assetNumber, assetName: line.fixedAsset.name, category: line.fixedAsset.category, openingCarryingAmount: String(line.openingCarryingAmount), depreciationAmount: String(line.depreciationAmount), accumulatedDepreciation: String(line.accumulatedDepreciationAfter), closingCarryingAmount: String(line.closingCarryingAmount), status: line.status }));
  }

  async disposals(organizationId: string) {
    const movements = await this.prisma.fixedAssetMovement.findMany({ where: { organizationId, movementType: { in: [FixedAssetMovementType.DISPOSAL, FixedAssetMovementType.WRITE_OFF] } }, orderBy: { effectiveDate: "desc" }, take: 1000, include: { fixedAsset: { select: { id: true, assetNumber: true, name: true, baseAcquisitionCost: true, accumulatedDepreciation: true, carryingAmount: true, category: { select: { code: true, name: true } } } } } });
    return movements.map((movement) => ({ assetId: movement.fixedAssetId, assetNumber: movement.fixedAsset.assetNumber, assetName: movement.fixedAsset.name, category: movement.fixedAsset.category, disposalDate: movement.effectiveDate, cost: String(movement.fixedAsset.baseAcquisitionCost), accumulatedDepreciation: String(movement.fixedAsset.accumulatedDepreciation), carryingAmount: String(movement.baseAmount), proceeds: movement.proceedsAmount === null ? "0.0000" : String(movement.proceedsAmount), gain: movement.gainAmount === null ? "0.0000" : String(movement.gainAmount), loss: movement.lossAmount === null ? "0.0000" : String(movement.lossAmount), movementType: movement.movementType, reason: movement.reason, journalEntryId: movement.journalEntryId }));
  }

  async registerPdf(organizationId: string, categoryId?: string) {
    const rows = await this.register(organizationId, categoryId);
    const organization = await this.organizationPdf(organizationId);
    return renderFixedAssetReportPdf({
      organization,
      currency: organization.baseCurrency,
      title: "Fixed Asset Register",
      generatedAt: new Date(),
      columns: [
        { label: "Asset", width: 70 },
        { label: "Name", width: 105 },
        { label: "Category", width: 85 },
        { label: "Cost", width: 80, align: "right" },
        { label: "Accum. dep.", width: 80, align: "right" },
        { label: "Carrying", width: 79, align: "right" },
      ],
      reportRows: rows.map((row) => [row.assetNumber, row.name, row.category?.code ?? "-", row.originalCost, row.accumulatedDepreciation, row.carryingAmount]),
      reportSummary: [["Rows", String(rows.length)]],
    }, { title: "Fixed Asset Register" });
  }

  async depreciationPdf(organizationId: string, from?: string, to?: string) {
    const rows = await this.depreciation(organizationId, from, to);
    const organization = await this.organizationPdf(organizationId);
    return renderFixedAssetReportPdf({
      organization,
      currency: organization.baseCurrency,
      title: "Fixed Asset Depreciation Schedule",
      generatedAt: new Date(),
      columns: [
        { label: "Period", width: 55 },
        { label: "Asset", width: 75 },
        { label: "Category", width: 80 },
        { label: "Opening", width: 75, align: "right" },
        { label: "Depreciation", width: 85, align: "right" },
        { label: "Closing", width: 75, align: "right" },
        { label: "Status", width: 54 },
      ],
      reportRows: rows.map((row) => [row.period, row.assetNumber, row.category.code, row.openingCarryingAmount, row.depreciationAmount, row.closingCarryingAmount, row.status]),
      reportSummary: [["Rows", String(rows.length)]],
    }, { title: "Fixed Asset Depreciation Schedule" });
  }

  async reconciliationPdf(organizationId: string) {
    const report = await this.reconciliation(organizationId);
    const organization = await this.organizationPdf(organizationId);
    return renderFixedAssetReportPdf({
      organization,
      currency: organization.baseCurrency,
      title: "Fixed Asset GL Reconciliation",
      generatedAt: new Date(),
      columns: [
        { label: "Measure", width: 180 },
        { label: "Register", width: 105, align: "right" },
        { label: "General ledger", width: 105, align: "right" },
        { label: "Difference", width: 109, align: "right" },
      ],
      reportRows: [
        ["Fixed-asset cost", report.register.cost, report.generalLedger.fixedAssetCost, report.differences.cost],
        ["Accumulated depreciation", report.register.accumulatedDepreciation, report.generalLedger.accumulatedDepreciation, report.differences.accumulatedDepreciation],
        ["Depreciation expense", report.register.depreciationExpense, report.generalLedger.depreciationExpense, report.differences.depreciationExpense],
      ],
      reportSummary: [["Status", report.reconciled ? "Reconciled" : "Difference requires review"]],
    }, { title: "Fixed Asset GL Reconciliation" });
  }

  async reconciliation(organizationId: string) {
    const categories = await this.prisma.fixedAssetCategory.findMany({ where: { organizationId }, take: 200, select: { assetCostAccountId: true, accumulatedDepreciationAccountId: true, depreciationExpenseAccountId: true } });
    const costAccounts = [...new Set(categories.map((category) => category.assetCostAccountId))];
    const accumulatedAccounts = [...new Set(categories.map((category) => category.accumulatedDepreciationAccountId))];
    const expenseAccounts = [...new Set(categories.map((category) => category.depreciationExpenseAccountId))];
    const accounts = [...new Set([...costAccounts, ...accumulatedAccounts, ...expenseAccounts])];
    const [registerTotals, glLines, depreciationMovements] = await Promise.all([
      this.prisma.fixedAsset.aggregate({ where: { organizationId, status: { in: ["ACTIVE", "FULLY_DEPRECIATED"] } }, _sum: { baseAcquisitionCost: true, accumulatedDepreciation: true, carryingAmount: true } }),
      accounts.length ? this.prisma.journalLine.groupBy({ by: ["accountId"], where: { organizationId, accountId: { in: accounts }, journalEntry: { status: { in: ["POSTED", "REVERSED"] } } }, _sum: { debit: true, credit: true } }) : Promise.resolve([]),
      this.prisma.fixedAssetMovement.aggregate({ where: { organizationId, movementType: FixedAssetMovementType.DEPRECIATION }, _sum: { baseAmount: true } }),
    ]);
    const glByAccount = new Map(glLines.map((line) => [line.accountId, { debit: line._sum.debit ?? new Prisma.Decimal(0), credit: line._sum.credit ?? new Prisma.Decimal(0) }]));
    const sumNet = (ids: string[], debitPositive: boolean) => ids.reduce((total, id) => { const line = glByAccount.get(id); if (!line) return total; return total.plus(debitPositive ? line.debit.minus(line.credit) : line.credit.minus(line.debit)); }, new Prisma.Decimal(0));
    const registerCost = registerTotals._sum.baseAcquisitionCost ?? new Prisma.Decimal(0);
    const registerAccumulated = registerTotals._sum.accumulatedDepreciation ?? new Prisma.Decimal(0);
    const registerCarrying = registerTotals._sum.carryingAmount ?? new Prisma.Decimal(0);
    const glCost = sumNet(costAccounts, true);
    const glAccumulated = sumNet(accumulatedAccounts, false);
    const depreciationRuns = depreciationMovements._sum.baseAmount ?? new Prisma.Decimal(0);
    const glExpense = sumNet(expenseAccounts, true);
    return {
      register: { cost: String(registerCost), accumulatedDepreciation: String(registerAccumulated), carryingAmount: String(registerCarrying), depreciationExpense: String(depreciationRuns) },
      generalLedger: { fixedAssetCost: String(glCost), accumulatedDepreciation: String(glAccumulated), depreciationExpense: String(glExpense) },
      differences: { cost: String(registerCost.minus(glCost)), accumulatedDepreciation: String(registerAccumulated.minus(glAccumulated)), depreciationExpense: String(depreciationRuns.minus(glExpense)) },
      reconciled: registerCost.eq(glCost) && registerAccumulated.eq(glAccumulated) && depreciationRuns.eq(glExpense),
    };
  }

  toCsv(rows: Array<Record<string, unknown>>): string {
    if (rows.length === 0) return "";
    const headers = Object.keys(rows[0]!);
    return [headers, ...rows.map((row) => headers.map((header) => this.csvCell(row[header])))].map((row) => row.join(",")).join("\n");
  }

  private assetRow(asset: any) {
    return { assetNumber: asset.assetNumber, name: asset.name, category: asset.category, acquisitionDate: asset.acquisitionDate, inServiceDate: asset.inServiceDate, originalCost: String(asset.baseAcquisitionCost), accumulatedDepreciation: String(asset.accumulatedDepreciation), carryingAmount: String(asset.carryingAmount), salvageValue: String(asset.baseSalvageValue), status: asset.status, costCenter: asset.costCenter, project: asset.project };
  }

  private csvCell(value: unknown): string {
    const raw = value === null || value === undefined ? "" : typeof value === "object" ? JSON.stringify(value) : String(value);
    const safe = /^[=+\-@]/.test(raw) ? `'${raw}` : raw;
    return /[",\n]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
  }

  private async organizationPdf(organizationId: string) {
    const organization = await this.prisma.organization.findUnique({ where: { id: organizationId }, select: { id: true, name: true, legalName: true, taxNumber: true, countryCode: true, baseCurrency: true } });
    if (!organization) throw new Error("Organization not found.");
    return organization;
  }
}
