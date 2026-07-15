import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import {
  AccountType,
  ContactType,
  CurrencyRateSource,
  ImportEntityType,
  ImportJobRowStatus,
  ImportJobStatus,
  ImportValidationIssueSeverity,
  ItemStatus,
  ItemType,
  Prisma,
  RecurringCatchUpPolicy,
  RecurringExchangeRatePolicy,
  RecurringFrequency,
  RecurringTransactionType,
} from "@prisma/client";
import { convertTransactionToBaseAmount } from "@ledgerbyte/accounting-core";
import { normalizeSupportedCurrencyCode } from "@ledgerbyte/shared";
import { AuditLogService } from "../audit-log/audit-log.service";
import { ObservabilityContextService } from "../observability/observability-context.service";
import { PrismaService } from "../prisma/prisma.service";
import { RecurringTemplateService } from "../recurring-transactions/recurring-template.service";
import { FixedAssetService } from "../fixed-assets/fixed-asset.service";
import { toCsv, type CsvFile } from "../reports/report-csv";
import { CommitImportJobDto, CreateImportJobDto } from "./dto/migration-toolkit.dto";

interface ImportTemplateDefinition {
  entityType: ImportEntityType;
  label: string;
  headers: string[];
  requiredHeaders: string[];
  notes: string[];
  sample: Record<string, string>;
}

interface ParsedImportRow {
  rowNumber: number;
  raw: Record<string, string>;
}

interface NormalizedImportRow {
  rowNumber: number;
  raw: Record<string, string>;
  normalized: Record<string, string | boolean | null>;
  fingerprint: string;
  duplicate: boolean;
  status: ImportJobRowStatus;
  issues: ImportValidationIssueInput[];
}

interface ImportValidationIssueInput {
  rowNumber?: number;
  field?: string;
  code: string;
  message: string;
  severity: ImportValidationIssueSeverity;
}

const IMPORT_TEMPLATES: ImportTemplateDefinition[] = [
  {
    entityType: ImportEntityType.CUSTOMERS,
    label: "Customers",
    headers: ["name", "displayName", "email", "phone", "taxNumber", "countryCode", "isActive"],
    requiredHeaders: ["name"],
    notes: ["Creates local customer contacts only after explicit reviewed commit.", "Duplicate names in the same tenant are blocked."],
    sample: { name: "Acme Trading", displayName: "Acme", email: "accounts@example.test", phone: "+971500000000", taxNumber: "", countryCode: "AE", isActive: "true" },
  },
  {
    entityType: ImportEntityType.SUPPLIERS,
    label: "Suppliers",
    headers: ["name", "displayName", "email", "phone", "taxNumber", "countryCode", "isActive"],
    requiredHeaders: ["name"],
    notes: ["Creates local supplier contacts only after explicit reviewed commit.", "Duplicate names in the same tenant are blocked."],
    sample: { name: "Local Supplier", displayName: "Supplier", email: "ap@example.test", phone: "+971500000001", taxNumber: "", countryCode: "AE", isActive: "true" },
  },
  {
    entityType: ImportEntityType.PRODUCTS_SERVICES,
    label: "Products and services",
    headers: ["name", "sku", "type", "sellingPrice", "revenueAccountCode", "status", "currency", "exchangeRate", "rateDate", "rateSource", "rateSnapshotId"],
    requiredHeaders: ["name", "type", "sellingPrice", "revenueAccountCode"],
    notes: ["Creates local item catalog records only after explicit reviewed commit.", "Revenue account code must already exist in the selected tenant."],
    sample: { name: "Consulting", sku: "CONSULT", type: "SERVICE", sellingPrice: "100.0000", revenueAccountCode: "400", status: "ACTIVE", currency: "", exchangeRate: "", rateDate: "", rateSource: "", rateSnapshotId: "" },
  },
  {
    entityType: ImportEntityType.CHART_OF_ACCOUNTS,
    label: "Chart of accounts",
    headers: ["code", "name", "type", "description", "allowPosting", "isActive", "parentCode"],
    requiredHeaders: ["code", "name", "type"],
    notes: ["Creates local non-system accounts only after explicit reviewed commit.", "Opening balances, journals, VAT mappings, and official filing data are not imported."],
    sample: { code: "410", name: "Service revenue", type: "REVENUE", description: "Imported local account", allowPosting: "true", isActive: "true", parentCode: "" },
  },
  {
    entityType: ImportEntityType.FIXED_ASSET_OPENING_BALANCES,
    label: "Fixed-asset opening balances",
    headers: ["name", "categoryCode", "openingBalanceAccountCode", "acquisitionDate", "inServiceDate", "baseAcquisitionCost", "baseSalvageValue", "accumulatedDepreciation", "usefulLifeMonths", "reason"],
    requiredHeaders: ["name", "categoryCode", "openingBalanceAccountCode", "acquisitionDate", "inServiceDate", "baseAcquisitionCost", "usefulLifeMonths"],
    notes: ["Creates active fixed assets and one posted opening-balance journal only after explicit reviewed commit.", "Category and opening-balance accounts must already exist in this tenant; previews are revalidated at commit."],
    sample: { name: "Existing laptop", categoryCode: "IT-EQUIPMENT", openingBalanceAccountCode: "3200", acquisitionDate: "2026-01-01", inServiceDate: "2026-01-01", baseAcquisitionCost: "1000.0000", baseSalvageValue: "0.0000", accumulatedDepreciation: "250.0000", usefulLifeMonths: "36", reason: "Opening balance migration" },
  },
  recurringTemplateDefinition(ImportEntityType.RECURRING_SALES_INVOICE_TEMPLATES, "Recurring sales invoice templates", {
    name: "Monthly support", partyName: "Acme Trading", accountCode: "410", description: "Support retainer", unitPrice: "100.0000",
  }),
  recurringTemplateDefinition(ImportEntityType.RECURRING_PURCHASE_BILL_TEMPLATES, "Recurring purchase bill templates", {
    name: "Monthly hosting bill", partyName: "Local Supplier", accountCode: "510", description: "Hosting", unitPrice: "250.0000",
  }),
  recurringTemplateDefinition(ImportEntityType.RECURRING_EXPENSE_TEMPLATES, "Recurring expense proposal templates", {
    name: "Monthly office expense", accountCode: "520", paidThroughAccountCode: "101", description: "Office supplies", unitPrice: "75.0000",
  }),
  recurringTemplateDefinition(ImportEntityType.RECURRING_JOURNAL_TEMPLATES, "Recurring manual journal templates", {
    name: "Monthly accrual", accountCode: "530", description: "Accrual debit", debit: "100.0000", credit: "0.0000",
  }),
];

function recurringTemplateDefinition(entityType: ImportEntityType, label: string, sampleOverrides: Record<string, string>): ImportTemplateDefinition {
  const headers = ["name", "timezone", "frequency", "interval", "startDate", "endDate", "catchUpPolicy", "currencyCode", "exchangeRatePolicy", "fixedExchangeRate", "rateSnapshotId", "partyName", "branchName", "paidThroughAccountCode", "paymentTermsDays", "reference", "description", "accountCode", "itemSku", "taxRateName", "costCenterCode", "projectCode", "quantity", "unitPrice", "discountRate", "debit", "credit", "counterDescription", "counterAccountCode", "counterCostCenterCode", "counterProjectCode"];
  return {
    entityType,
    label,
    headers,
    requiredHeaders: ["name", "timezone", "frequency", "startDate", "currencyCode", "exchangeRatePolicy", "description", "accountCode"],
    notes: ["Each row creates one inactive draft template with one source line after explicit reviewed commit.", "References are tenant-revalidated during the serializable commit; imported templates are never activated automatically."],
    sample: { name: "Recurring template", timezone: "Asia/Dubai", frequency: "MONTHLY", interval: "1", startDate: "2026-08-01", endDate: "", catchUpPolicy: "SKIP_MISSED", currencyCode: "AED", exchangeRatePolicy: "BASE_CURRENCY_ONLY", fixedExchangeRate: "", rateSnapshotId: "", partyName: "", branchName: "", paidThroughAccountCode: "", paymentTermsDays: "0", reference: "", description: "Recurring line", accountCode: "410", itemSku: "", taxRateName: "", costCenterCode: "", projectCode: "", quantity: "1.0000", unitPrice: "0.0000", discountRate: "0.0000", debit: "0.0000", credit: "0.0000", counterDescription: "Accrual credit", counterAccountCode: "210", counterCostCenterCode: "", counterProjectCode: "", ...sampleOverrides },
  };
}

const templateByEntity = new Map(IMPORT_TEMPLATES.map((template) => [template.entityType, template]));

@Injectable()
export class MigrationToolkitService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
    private readonly observabilityContext?: ObservabilityContextService,
    private readonly recurringTemplates?: RecurringTemplateService,
    private readonly fixedAssetService?: FixedAssetService,
  ) {}

  templates() {
    return {
      supportedImports: IMPORT_TEMPLATES.map((template) => ({
        entityType: template.entityType,
        label: template.label,
        headers: template.headers,
        requiredHeaders: template.requiredHeaders,
        notes: template.notes,
      })),
      unsupportedImports: ["Posted journals", "Sales invoices", "Purchase bills", "Bank credentials", "Provider payloads"],
      limitations: [
        "CSV files are parsed locally through the API request only.",
        "No external provider upload, hosted mutation, or production migration proof is performed.",
        "Accounting-impacting records remain outside this toolkit until a future approved migration plan exists.",
      ],
    };
  }

  templateCsv(entityType: ImportEntityType): CsvFile {
    const template = this.requireTemplate(entityType);
    return {
      filename: `${entityType.toLowerCase()}-import-template.csv`,
      content: toCsv([template.headers, template.headers.map((header) => template.sample[header] ?? "")]),
    };
  }

  async createImportJob(organizationId: string, actorUserId: string, dto: CreateImportJobDto) {
    const template = this.requireTemplate(dto.entityType);
    const parsedRows = parseCsv(dto.csvContent);
    assertHeaders(parsedRows.headers, template);
    const validationContext = await this.validationContext(organizationId, dto.entityType, parsedRows.rows);
    const normalizedRows = parsedRows.rows.map((row) => this.normalizeRow(dto.entityType, row, validationContext));
    const issues = normalizedRows.flatMap((row) => row.issues);
    const errorCount = issues.filter((issue) => issue.severity === ImportValidationIssueSeverity.ERROR).length;
    const duplicateCount = normalizedRows.filter((row) => row.duplicate).length;
    const summary = {
      rowCount: normalizedRows.length,
      validRowCount: normalizedRows.filter((row) => row.status === ImportJobRowStatus.VALID).length,
      duplicateRowCount: duplicateCount,
      errorCount,
      warningCount: issues.length - errorCount,
      externalUpload: false,
      providerCalls: false,
      accountingRecordsMutated: false,
    };

    return this.prisma.$transaction(async (tx) => {
      const job = await tx.importJob.create({
        data: {
          organizationId,
          entityType: dto.entityType,
          status: ImportJobStatus.VALIDATING,
          filename: cleanFilename(dto.filename),
          previewOnly: dto.previewOnly ?? true,
          summaryJson: summary,
          requestId: this.requestId(),
          createdById: actorUserId,
          rows: {
            create: normalizedRows.map((row) => ({
              organizationId,
              rowNumber: row.rowNumber,
              status: row.status,
              rawJson: row.raw,
              normalizedJson: row.normalized,
              fingerprint: row.fingerprint,
              duplicate: row.duplicate,
            })),
          },
        },
        include: { rows: true, validationIssues: true },
      });

      if (issues.length > 0) {
        const rowByNumber = new Map(job.rows.map((row) => [row.rowNumber, row.id]));
        await tx.importValidationIssue.createMany({
          data: issues.map((issue) => ({
            organizationId,
            importJobId: job.id,
            importJobRowId: issue.rowNumber ? rowByNumber.get(issue.rowNumber) : undefined,
            rowNumber: issue.rowNumber,
            field: issue.field,
            code: issue.code,
            message: issue.message,
            severity: issue.severity,
          })),
        });
      }

      await this.auditLogService.log({
        organizationId,
        actorUserId,
        action: "UPLOAD",
        entityType: "ImportJob",
        entityId: job.id,
        after: summary,
      }, tx);

      const published = await tx.importJob.updateMany({
        where: { id: job.id, organizationId, status: ImportJobStatus.VALIDATING },
        data: { status: ImportJobStatus.READY_FOR_REVIEW },
      });
      if (published.count !== 1) {
        throw new ConflictException("Import preview could not be published for review.");
      }

      const preview = await tx.importJob.findFirst({
        where: { id: job.id, organizationId },
        include: { rows: { orderBy: { rowNumber: "asc" } }, validationIssues: { orderBy: { createdAt: "asc" } } },
      });
      if (!preview) {
        throw new ConflictException("Import preview could not be loaded after validation.");
      }
      return preview;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async listImportJobs(organizationId: string) {
    return this.prisma.importJob.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      include: { rows: true, validationIssues: true },
      take: 50,
    });
  }

  async getImportJob(organizationId: string, id: string) {
    const job = await this.prisma.importJob.findFirst({
      where: { id, organizationId },
      include: { rows: { orderBy: { rowNumber: "asc" } }, validationIssues: { orderBy: { createdAt: "asc" } } },
    });
    if (!job) {
      throw new NotFoundException("Import job not found.");
    }
    return job;
  }

  async commitImportJob(organizationId: string, actorUserId: string, id: string, dto: CommitImportJobDto) {
    if (!dto.confirmReviewed) {
      throw new BadRequestException("Import commit requires explicit reviewed confirmation.");
    }
    const job = await this.getImportJob(organizationId, id);
    if (job.status !== ImportJobStatus.READY_FOR_REVIEW) {
      throw new ConflictException("Import job is already being committed or is no longer ready for review.");
    }
    const errors = job.validationIssues.filter((issue) => issue.severity === ImportValidationIssueSeverity.ERROR);
    if (errors.length > 0) {
      await this.prisma.importJobRow.updateMany({
        where: { organizationId, importJobId: id },
        data: { status: ImportJobRowStatus.COMMIT_BLOCKED },
      });
      throw new BadRequestException("Import commit is blocked until validation errors and duplicates are resolved.");
    }

    await this.prisma.$transaction(async (tx) => {
      const claim = await tx.importJob.updateMany({
        where: { id, organizationId, status: ImportJobStatus.READY_FOR_REVIEW },
        data: { status: ImportJobStatus.VALIDATING },
      });
      if (claim.count !== 1) {
        throw new ConflictException("Import job is already being committed or is no longer ready for review.");
      }

      const claimedJob = await tx.importJob.findFirst({
        where: { id, organizationId },
        include: { rows: { orderBy: { rowNumber: "asc" } }, validationIssues: { orderBy: { createdAt: "asc" } } },
      });
      if (!claimedJob) {
        throw new ConflictException("Import job claim could not be loaded.");
      }

      const authoritativeErrors = claimedJob.validationIssues.filter(
        (issue) => issue.severity === ImportValidationIssueSeverity.ERROR,
      );
      if (authoritativeErrors.length > 0) {
        throw new BadRequestException("Import commit is blocked until validation errors and duplicates are resolved.");
      }
      if (claimedJob.rows.some((row) => row.status !== ImportJobRowStatus.VALID)) {
        throw new BadRequestException("Import commit requires all rows to remain valid and committable. Create a new preview.");
      }

      const currentRows = claimedJob.rows.map((row) => ({
        rowNumber: row.rowNumber,
        raw: importRawJson(row.rawJson),
      }));
      const currentContext = await this.validationContext(
        organizationId,
        claimedJob.entityType,
        currentRows,
        tx,
      );
      if (claimedJob.entityType === ImportEntityType.PRODUCTS_SERVICES) {
        const currentBaseCurrency = currentContext.baseCurrency;
        const previewMatchesCurrentBase = Boolean(currentBaseCurrency) && claimedJob.rows.every((row) => {
          const normalized = row.normalizedJson as Record<string, string | boolean | null>;
          return normalizeSupportedCurrencyCode(optionalString(normalized.baseCurrency)) === currentBaseCurrency;
        });
        if (!previewMatchesCurrentBase) {
          throw new ConflictException("Organization base currency changed since this preview. Create a new import preview before committing.");
        }
      }

      const authoritativeRows = currentRows.map((row) => this.normalizeRow(claimedJob.entityType, row, currentContext));
      const currentValidationFailed = authoritativeRows.some((row) =>
        row.duplicate ||
        row.status !== ImportJobRowStatus.VALID ||
        row.issues.some((issue) => issue.severity === ImportValidationIssueSeverity.ERROR),
      );
      const normalizedEvidenceChanged = authoritativeRows.some((row, index) =>
        !matchesStoredNormalizedEvidence(claimedJob.rows[index]?.normalizedJson, row.normalized),
      );
      if (currentValidationFailed || normalizedEvidenceChanged) {
        throw new ConflictException("Import data or tenant references changed after review. Create a new preview before committing.");
      }

      const createdIds: string[] = [];
      for (const [index, row] of claimedJob.rows.entries()) {
        const authoritativeRow = authoritativeRows[index];
        if (!authoritativeRow) {
          throw new ConflictException("Import validation evidence changed after review. Create a new preview before committing.");
        }
        const normalized = authoritativeRow.normalized;
        const created = await this.createRecord(organizationId, actorUserId, claimedJob.entityType, normalized, tx);
        createdIds.push(created.id);
        const updatedRow = await tx.importJobRow.updateMany({
          where: { id: row.id, organizationId, importJobId: id },
          data: { status: ImportJobRowStatus.COMMITTED, createdRecordId: created.id },
        });
        if (updatedRow.count !== 1) {
          throw new ConflictException("Import job row changed while the commit was in progress.");
        }
      }

      await tx.importJob.updateMany({
        where: { id, organizationId },
        data: {
          status: ImportJobStatus.COMMITTED_LOCAL,
          previewOnly: false,
          committedAt: new Date(),
          committedById: actorUserId,
          summaryJson: {
            ...(claimedJob.summaryJson as Record<string, unknown>),
            committedRecordCount: createdIds.length,
            accountingRecordsMutated: false,
            committedLocallyOnly: true,
          },
        },
      });

      await this.auditLogService.log({
        organizationId,
        actorUserId,
        action: "COMMIT_LOCAL",
        entityType: "ImportJob",
        entityId: id,
        after: { entityType: claimedJob.entityType, committedRecordCount: createdIds.length, hostedMutation: false },
      }, tx);
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }).catch((error: unknown) => {
      if (typeof error === "object" && error !== null && "code" in error && error.code === "P2034") {
        throw new ConflictException("Import job is already being committed or is no longer ready for review.");
      }
      throw error;
    });

    return this.getImportJob(organizationId, id);
  }

  async exportCsv(organizationId: string, entityType: ImportEntityType): Promise<CsvFile> {
    let rows: unknown[][];
    if (entityType === ImportEntityType.RECURRING_TRANSACTION_RUNS) {
      const runs = await this.prisma.recurringTransactionRun.findMany({
        where: { organizationId }, orderBy: { scheduledFor: "desc" }, take: 10_000,
        include: { template: { select: { templateCode: true, name: true } } },
      });
      rows = [["templateCode", "templateName", "runId", "templateVersion", "scheduledFor", "scheduledLocalDate", "trigger", "status", "attemptCount", "failureCode", "failureMessage"],
        ...runs.map((run) => [run.template.templateCode, run.template.name, run.id, run.templateVersion, run.scheduledFor.toISOString(), run.scheduledLocalDate.toISOString().slice(0, 10), run.trigger, run.status, run.attemptCount, run.failureCode, run.failureMessageSafe])];
    } else if (isRecurringTemplateEntity(entityType)) {
      const transactionType = recurringTransactionType(entityType);
      const templates = await this.prisma.recurringTransactionTemplate.findMany({
        where: { organizationId, transactionType }, orderBy: { templateCode: "asc" }, take: 10_000,
        include: { party: { select: { name: true } } },
      });
      rows = [["templateCode", "name", "transactionType", "status", "timezone", "frequency", "interval", "nextRunAt", "currencyCode", "exchangeRatePolicy", "templateVersion", "partyName"],
        ...templates.map((template) => [template.templateCode, template.name, template.transactionType, template.status, template.timezone, template.frequency, template.interval, template.nextRunAt.toISOString(), template.currencyCode, template.exchangeRatePolicy, template.templateVersion, template.party?.name ?? ""])];
    } else if (entityType === ImportEntityType.CUSTOMERS || entityType === ImportEntityType.SUPPLIERS) {
      const type = entityType === ImportEntityType.CUSTOMERS ? ContactType.CUSTOMER : ContactType.SUPPLIER;
      const contacts = await this.prisma.contact.findMany({
        where: { organizationId, type: { in: [type, ContactType.BOTH] } },
        orderBy: { name: "asc" },
      });
      rows = [["name", "displayName", "email", "phone", "taxNumber", "countryCode", "isActive"], ...contacts.map((contact) => [contact.name, contact.displayName, contact.email, contact.phone, contact.taxNumber, contact.countryCode, contact.isActive])];
    } else if (entityType === ImportEntityType.PRODUCTS_SERVICES) {
      const items = await this.prisma.item.findMany({
        where: { organizationId },
        orderBy: { name: "asc" },
        include: { revenueAccount: { select: { code: true } } },
      });
      rows = [["name", "sku", "type", "sellingPrice", "revenueAccountCode", "status"], ...items.map((item) => [item.name, item.sku, item.type, item.sellingPrice, item.revenueAccount.code, item.status])];
    } else {
      const accounts = await this.prisma.account.findMany({
        where: { organizationId },
        orderBy: { code: "asc" },
        include: { parent: { select: { code: true } } },
      });
      rows = [["code", "name", "type", "description", "allowPosting", "isActive", "parentCode"], ...accounts.map((account) => [account.code, account.name, account.type, account.description, account.allowPosting, account.isActive, account.parent?.code ?? ""])];
    }

    await this.auditLogService.log({
      organizationId,
      action: "EXPORT_CSV",
      entityType: "ImportJob",
      entityId: entityType,
      after: { entityType, rowCount: Math.max(rows.length - 1, 0), csvInjectionProtected: true },
    });

    return { filename: `${entityType.toLowerCase()}-export.csv`, content: toCsv(rows) };
  }

  private normalizeRow(entityType: ImportEntityType, row: ParsedImportRow, context: ValidationContext): NormalizedImportRow {
    if (isRecurringTemplateEntity(entityType)) {
      return normalizeRecurringTemplateRow(entityType, row, context);
    }
    if (entityType === ImportEntityType.CUSTOMERS || entityType === ImportEntityType.SUPPLIERS) {
      return normalizeContactRow(entityType, row, context);
    }
    if (entityType === ImportEntityType.PRODUCTS_SERVICES) {
      return normalizeItemRow(row, context);
    }
    if (entityType === ImportEntityType.FIXED_ASSET_OPENING_BALANCES) {
      return normalizeFixedAssetOpeningBalanceRow(row, context);
    }
    return normalizeAccountRow(row, context);
  }

  private async validationContext(
    organizationId: string,
    entityType: ImportEntityType,
    rows: ParsedImportRow[],
    executor: ValidationExecutor = this.prisma,
  ): Promise<ValidationContext> {
    const recurring = isRecurringTemplateEntity(entityType);
    const fixedAssetOpening = entityType === ImportEntityType.FIXED_ASSET_OPENING_BALANCES;
    const rateSnapshotIds = entityType === ImportEntityType.PRODUCTS_SERVICES || recurring
      ? [...new Set(rows.map((row) => normalizeUuid(row.raw.rateSnapshotId)).filter((id): id is string => Boolean(id)))]
      : [];
    const [contacts, items, accounts, organization, rateSnapshots, costCenters, projects, taxRates, branches, recurringTemplates, fixedAssetCategories] = await Promise.all([
      entityType === ImportEntityType.CUSTOMERS || entityType === ImportEntityType.SUPPLIERS || recurring
        ? executor.contact.findMany({ where: { organizationId }, select: { id: true, name: true, type: true, isActive: true } })
        : Promise.resolve([]),
      entityType === ImportEntityType.PRODUCTS_SERVICES || recurring
        ? executor.item.findMany({ where: { organizationId }, select: { id: true, sku: true, name: true, status: true } })
        : Promise.resolve([]),
      executor.account.findMany({ where: { organizationId }, select: { id: true, code: true, type: true, isActive: true, allowPosting: true } }),
      entityType === ImportEntityType.PRODUCTS_SERVICES || recurring
        ? executor.organization.findUnique({ where: { id: organizationId }, select: { baseCurrency: true } })
        : Promise.resolve(null),
      rateSnapshotIds.length > 0
        ? executor.currencyRateSnapshot.findMany({ where: { organizationId, id: { in: rateSnapshotIds } } })
        : Promise.resolve([]),
      recurring ? executor.costCenter.findMany({ where: { organizationId }, select: { id: true, code: true, status: true } }) : Promise.resolve([]),
      recurring ? executor.project.findMany({ where: { organizationId }, select: { id: true, code: true, status: true } }) : Promise.resolve([]),
      recurring ? executor.taxRate.findMany({ where: { organizationId }, select: { id: true, name: true, isActive: true } }) : Promise.resolve([]),
      recurring ? executor.branch.findMany({ where: { organizationId }, select: { id: true, name: true } }) : Promise.resolve([]),
      recurring ? executor.recurringTransactionTemplate.findMany({ where: { organizationId }, select: { name: true } }) : Promise.resolve([]),
      fixedAssetOpening ? executor.fixedAssetCategory.findMany({ where: { organizationId, status: "ACTIVE" }, select: { id: true, code: true } }) : Promise.resolve([]),
    ]);
    const baseCurrency = entityType === ImportEntityType.PRODUCTS_SERVICES || recurring
      ? normalizeSupportedCurrencyCode(organization?.baseCurrency)
      : null;
    if ((entityType === ImportEntityType.PRODUCTS_SERVICES || recurring) && !baseCurrency) {
      throw new BadRequestException(organization ? "Organization base currency is unsupported." : "Organization not found.");
    }
    return {
      seenFingerprints: new Set<string>(),
      contactFingerprints: new Set(contacts.map((contact) => contactFingerprint(contact.type, contact.name))),
      itemSkus: new Set(items.map((item) => normalizeKey(item.sku)).filter(Boolean)),
      itemNames: new Set(items.map((item) => normalizeKey(item.name))),
      itemsBySku: new Map(items.filter((item: any) => Boolean(normalizeKey(item.sku))).map((item: any) => [normalizeKey(item.sku), item] as const)),
      accountsByCode: new Map(accounts.map((account) => [normalizeKey(account.code), account])),
      baseCurrency,
      rateSnapshotsById: new Map(rateSnapshots.map((snapshot) => [normalizeUuid(snapshot.id) ?? snapshot.id, snapshot])),
      contactsByName: new Map(contacts.map((contact: any) => [normalizeKey(contact.name), contact])),
      costCentersByCode: new Map(costCenters.map((dimension: any) => [normalizeKey(dimension.code), dimension])),
      projectsByCode: new Map(projects.map((dimension: any) => [normalizeKey(dimension.code), dimension])),
      taxRatesByName: new Map(taxRates.map((taxRate: any) => [normalizeKey(taxRate.name), taxRate])),
      branchesByName: new Map(branches.map((branch: any) => [normalizeKey(branch.name), branch])),
      recurringTemplateNames: new Set(recurringTemplates.map((template: any) => normalizeKey(template.name))),
      fixedAssetCategoriesByCode: new Map(fixedAssetCategories.map((category: any) => [normalizeKey(category.code), category])),
    };
  }

  private async createRecord(
    organizationId: string,
    actorUserId: string,
    entityType: ImportEntityType,
    row: Record<string, string | boolean | null>,
    executor: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    if (isRecurringTemplateEntity(entityType)) {
      if (!this.recurringTemplates) throw new ConflictException("Recurring template import service is unavailable.");
      const transactionType = requireString(row.transactionType) as RecurringTransactionType;
      const primaryLine = {
        accountId: requireString(row.accountId), itemId: optionalString(row.itemId), taxRateId: optionalString(row.taxRateId),
        costCenterId: optionalString(row.costCenterId), projectId: optionalString(row.projectId), description: requireString(row.description),
        quantity: optionalString(row.quantity) ?? "1.0000", unitPrice: optionalString(row.unitPrice) ?? "0.0000", discountRate: optionalString(row.discountRate) ?? "0.0000",
        debit: optionalString(row.debit) ?? "0.0000", credit: optionalString(row.credit) ?? "0.0000", sortOrder: 0,
      };
      const lines = transactionType === RecurringTransactionType.MANUAL_JOURNAL ? [primaryLine, {
        accountId: requireString(row.counterAccountId), itemId: null, taxRateId: null, costCenterId: optionalString(row.counterCostCenterId), projectId: optionalString(row.counterProjectId),
        description: optionalString(row.counterDescription) ?? `${requireString(row.description)} counter`, quantity: "1.0000", unitPrice: "0.0000", discountRate: "0.0000",
        debit: new Prisma.Decimal(primaryLine.credit).gt(0) ? primaryLine.credit : "0.0000", credit: new Prisma.Decimal(primaryLine.debit).gt(0) ? primaryLine.debit : "0.0000", sortOrder: 1,
      }] : [primaryLine];
      return this.recurringTemplates.createInTransaction(executor as Prisma.TransactionClient, organizationId, actorUserId, {
        transactionType, name: requireString(row.name), timezone: requireString(row.timezone), frequency: requireString(row.frequency) as RecurringFrequency,
        interval: Number(requireString(row.interval)), startDate: requireString(row.startDate), endDate: optionalString(row.endDate), catchUpPolicy: requireString(row.catchUpPolicy) as RecurringCatchUpPolicy,
        currencyCode: requireString(row.currencyCode), exchangeRatePolicy: requireString(row.exchangeRatePolicy) as RecurringExchangeRatePolicy,
        fixedExchangeRate: optionalString(row.fixedExchangeRate), rateSnapshotId: optionalString(row.rateSnapshotId), partyId: optionalString(row.partyId), branchId: optionalString(row.branchId),
        paidThroughAccountId: optionalString(row.paidThroughAccountId), paymentTermsDays: Number(optionalString(row.paymentTermsDays) ?? "0"), reference: optionalString(row.reference), lines,
      });
    }
    if (entityType === ImportEntityType.CUSTOMERS || entityType === ImportEntityType.SUPPLIERS) {
      return executor.contact.create({
        data: {
          organizationId,
          type: entityType === ImportEntityType.CUSTOMERS ? ContactType.CUSTOMER : ContactType.SUPPLIER,
          name: requireString(row.name),
          displayName: optionalString(row.displayName),
          email: optionalString(row.email),
          phone: optionalString(row.phone),
          taxNumber: optionalString(row.taxNumber),
          countryCode: optionalString(row.countryCode) ?? "SA",
          isActive: row.isActive !== false,
        },
      });
    }
    if (entityType === ImportEntityType.PRODUCTS_SERVICES) {
      const revenueAccount = await executor.account.findFirst({
        where: { organizationId, code: requireString(row.revenueAccountCode), type: AccountType.REVENUE, isActive: true, allowPosting: true },
        select: { id: true },
      });
      if (!revenueAccount) {
        throw new BadRequestException("Revenue account code must exist before committing products and services.");
      }
      return executor.item.create({
        data: {
          organizationId,
          name: requireString(row.name),
          sku: optionalString(row.sku),
          type: requireString(row.type) as ItemType,
          sellingPrice: requireString(row.sellingPrice),
          revenueAccountId: revenueAccount.id,
          status: (optionalString(row.status) as ItemStatus | null) ?? ItemStatus.ACTIVE,
        },
      });
    }

    if (entityType === ImportEntityType.FIXED_ASSET_OPENING_BALANCES) {
      if (!this.fixedAssetService || !("fixedAsset" in executor)) throw new ConflictException("Fixed-asset opening-balance import service is unavailable.");
      const created = await this.fixedAssetService.createOpeningBalanceInTransaction(executor as Prisma.TransactionClient, organizationId, actorUserId, {
        name: requireString(row.name),
        categoryId: requireString(row.categoryId),
        openingBalanceAccountId: requireString(row.openingBalanceAccountId),
        acquisitionDate: new Date(requireString(row.acquisitionDate)),
        inServiceDate: new Date(requireString(row.inServiceDate)),
        baseAcquisitionCost: requireString(row.baseAcquisitionCost),
        baseSalvageValue: optionalString(row.baseSalvageValue) ?? "0.0000",
        accumulatedDepreciation: optionalString(row.accumulatedDepreciation) ?? "0.0000",
        usefulLifeMonths: Number(requireString(row.usefulLifeMonths)),
        reason: optionalString(row.reason) ?? undefined,
      });
      return { id: created.id };
    }

    const parentCode = optionalString(row.parentCode);
    const parent = parentCode
      ? await executor.account.findFirst({ where: { organizationId, code: parentCode }, select: { id: true } })
      : null;
    return executor.account.create({
      data: {
        organizationId,
        code: requireString(row.code),
        name: requireString(row.name),
        type: requireString(row.type) as AccountType,
        description: optionalString(row.description),
        allowPosting: row.allowPosting !== false,
        isActive: row.isActive !== false,
        parentId: parent?.id,
      },
    });
  }

  private requireTemplate(entityType: ImportEntityType): ImportTemplateDefinition {
    const template = templateByEntity.get(entityType);
    if (!template) {
      throw new BadRequestException("Unsupported import entity type.");
    }
    return template;
  }

  private requestId() {
    return this.observabilityContext?.getRequestId();
  }
}

interface ValidationContext {
  seenFingerprints: Set<string>;
  contactFingerprints: Set<string>;
  itemSkus: Set<string>;
  itemNames: Set<string>;
  itemsBySku: Map<string, { id: string; sku: string | null; status: ItemStatus }>;
  accountsByCode: Map<string, { id: string; code: string; type: AccountType; isActive: boolean; allowPosting: boolean }>;
  baseCurrency: string | null;
  rateSnapshotsById: Map<string, {
    id: string;
    transactionCurrency: string;
    baseCurrency: string;
    rate: Prisma.Decimal;
    rateDate: Date;
    source: CurrencyRateSource;
  }>;
  contactsByName: Map<string, { id: string; name: string; type: ContactType; isActive: boolean }>;
  costCentersByCode: Map<string, { id: string; code: string; status: string }>;
  projectsByCode: Map<string, { id: string; code: string; status: string }>;
  taxRatesByName: Map<string, { id: string; name: string; isActive: boolean }>;
  branchesByName: Map<string, { id: string; name: string }>;
  recurringTemplateNames: Set<string>;
  fixedAssetCategoriesByCode: Map<string, { id: string; code: string }>;
}

type ValidationExecutor = Pick<
  Prisma.TransactionClient,
  "contact" | "item" | "account" | "organization" | "currencyRateSnapshot" | "costCenter" | "project" | "taxRate" | "branch" | "recurringTransactionTemplate" | "fixedAssetCategory"
>;

function isRecurringTemplateEntity(entityType: ImportEntityType): boolean {
  return entityType === ImportEntityType.RECURRING_SALES_INVOICE_TEMPLATES
    || entityType === ImportEntityType.RECURRING_PURCHASE_BILL_TEMPLATES
    || entityType === ImportEntityType.RECURRING_EXPENSE_TEMPLATES
    || entityType === ImportEntityType.RECURRING_JOURNAL_TEMPLATES;
}

function recurringTransactionType(entityType: ImportEntityType): RecurringTransactionType {
  if (entityType === ImportEntityType.RECURRING_SALES_INVOICE_TEMPLATES) return RecurringTransactionType.SALES_INVOICE;
  if (entityType === ImportEntityType.RECURRING_PURCHASE_BILL_TEMPLATES) return RecurringTransactionType.PURCHASE_BILL;
  if (entityType === ImportEntityType.RECURRING_EXPENSE_TEMPLATES) return RecurringTransactionType.EXPENSE;
  return RecurringTransactionType.MANUAL_JOURNAL;
}

function normalizeRecurringTemplateRow(entityType: ImportEntityType, row: ParsedImportRow, context: ValidationContext): NormalizedImportRow {
  const transactionType = recurringTransactionType(entityType);
  const name = cleanCell(row.raw.name);
  const timezone = cleanCell(row.raw.timezone);
  const frequency = cleanCell(row.raw.frequency).toUpperCase();
  const interval = cleanCell(row.raw.interval) || "1";
  const startDate = cleanCell(row.raw.startDate);
  const endDate = cleanOptionalCell(row.raw.endDate);
  const catchUpPolicy = cleanCell(row.raw.catchUpPolicy).toUpperCase() || RecurringCatchUpPolicy.SKIP_MISSED;
  const currencyCode = normalizeSupportedCurrencyCode(row.raw.currencyCode) ?? cleanCell(row.raw.currencyCode).toUpperCase();
  const exchangeRatePolicy = cleanCell(row.raw.exchangeRatePolicy).toUpperCase();
  const fixedExchangeRate = cleanOptionalCell(row.raw.fixedExchangeRate);
  const rateSnapshotId = cleanOptionalCell(row.raw.rateSnapshotId);
  const partyName = cleanOptionalCell(row.raw.partyName);
  const branchName = cleanOptionalCell(row.raw.branchName);
  const paidThroughAccountCode = cleanOptionalCell(row.raw.paidThroughAccountCode);
  const accountCode = cleanCell(row.raw.accountCode);
  const counterAccountCode = cleanOptionalCell(row.raw.counterAccountCode);
  const itemSku = cleanOptionalCell(row.raw.itemSku);
  const taxRateName = cleanOptionalCell(row.raw.taxRateName);
  const costCenterCode = cleanOptionalCell(row.raw.costCenterCode);
  const projectCode = cleanOptionalCell(row.raw.projectCode);
  const counterCostCenterCode = cleanOptionalCell(row.raw.counterCostCenterCode);
  const counterProjectCode = cleanOptionalCell(row.raw.counterProjectCode);
  const issues: ImportValidationIssueInput[] = [];
  required(row, issues, "name", name); required(row, issues, "timezone", timezone); required(row, issues, "frequency", frequency);
  required(row, issues, "startDate", startDate); required(row, issues, "currencyCode", currencyCode); required(row, issues, "exchangeRatePolicy", exchangeRatePolicy);
  required(row, issues, "description", row.raw.description); required(row, issues, "accountCode", accountCode);

  if (!isIanaTimezone(timezone)) issues.push(error(row.rowNumber, "timezone", "INVALID_TIMEZONE", "Timezone must be a valid IANA timezone."));
  if (!Object.values(RecurringFrequency).includes(frequency as RecurringFrequency)) issues.push(error(row.rowNumber, "frequency", "INVALID_ENUM", "Frequency is not supported."));
  if (!/^\d+$/.test(interval) || Number(interval) < 1 || Number(interval) > 24) issues.push(error(row.rowNumber, "interval", "INVALID_INTERVAL", "Interval must be between 1 and 24."));
  if (!isValidDateOnly(startDate)) issues.push(error(row.rowNumber, "startDate", "INVALID_DATE", "Start date must be a valid YYYY-MM-DD date."));
  if (endDate && (!isValidDateOnly(endDate) || (isValidDateOnly(startDate) && endDate < startDate))) issues.push(error(row.rowNumber, "endDate", "INVALID_DATE", "End date must be valid and not precede the start date."));
  if (!Object.values(RecurringCatchUpPolicy).includes(catchUpPolicy as RecurringCatchUpPolicy)) issues.push(error(row.rowNumber, "catchUpPolicy", "INVALID_ENUM", "Catch-up policy is not supported."));
  if (!normalizeSupportedCurrencyCode(currencyCode)) issues.push(error(row.rowNumber, "currencyCode", "UNSUPPORTED_CURRENCY", "Currency is unsupported."));
  if (!Object.values(RecurringExchangeRatePolicy).includes(exchangeRatePolicy as RecurringExchangeRatePolicy)) issues.push(error(row.rowNumber, "exchangeRatePolicy", "INVALID_ENUM", "Exchange-rate policy is not supported."));

  const party = partyName ? context.contactsByName.get(normalizeKey(partyName)) : undefined;
  let acceptedParty = party;
  if (transactionType === RecurringTransactionType.SALES_INVOICE && party?.type !== ContactType.CUSTOMER && party?.type !== ContactType.BOTH) acceptedParty = undefined;
  if (transactionType === RecurringTransactionType.PURCHASE_BILL && party?.type !== ContactType.SUPPLIER && party?.type !== ContactType.BOTH) acceptedParty = undefined;
  if ((transactionType === RecurringTransactionType.SALES_INVOICE || transactionType === RecurringTransactionType.PURCHASE_BILL) && (!partyName || !acceptedParty || !party?.isActive)) issues.push(error(row.rowNumber, "partyName", "INVALID_REFERENCE", "Party must resolve to an active tenant customer or supplier for this template type."));
  if (partyName && (!party || !party.isActive)) issues.push(error(row.rowNumber, "partyName", "INVALID_REFERENCE", "Party must resolve to an active tenant contact."));

  const account = context.accountsByCode.get(normalizeKey(accountCode));
  if (!account || !account.isActive || !account.allowPosting) issues.push(error(row.rowNumber, "accountCode", "INVALID_REFERENCE", "Account code must resolve to an active tenant posting account."));
  const paidThrough = paidThroughAccountCode ? context.accountsByCode.get(normalizeKey(paidThroughAccountCode)) : undefined;
  if (transactionType === RecurringTransactionType.EXPENSE && (!paidThrough || !paidThrough.isActive || !paidThrough.allowPosting)) issues.push(error(row.rowNumber, "paidThroughAccountCode", "INVALID_REFERENCE", "Expense templates require an active tenant paid-through account."));
  const counterAccount = counterAccountCode ? context.accountsByCode.get(normalizeKey(counterAccountCode)) : undefined;
  if (transactionType === RecurringTransactionType.MANUAL_JOURNAL && (!counterAccount || !counterAccount.isActive || !counterAccount.allowPosting)) issues.push(error(row.rowNumber, "counterAccountCode", "INVALID_REFERENCE", "Journal imports require an active tenant counter account."));

  const costCenter = resolveActiveDimension(row, issues, "costCenterCode", costCenterCode, context.costCentersByCode);
  const project = resolveActiveDimension(row, issues, "projectCode", projectCode, context.projectsByCode);
  const counterCostCenter = resolveActiveDimension(row, issues, "counterCostCenterCode", counterCostCenterCode, context.costCentersByCode);
  const counterProject = resolveActiveDimension(row, issues, "counterProjectCode", counterProjectCode, context.projectsByCode);
  const item = itemSku ? context.itemsBySku.get(normalizeKey(itemSku)) : undefined;
  if (itemSku && (!item || item.status !== ItemStatus.ACTIVE)) issues.push(error(row.rowNumber, "itemSku", "INVALID_REFERENCE", "Item SKU must resolve to an active tenant item."));
  const taxRate = taxRateName ? context.taxRatesByName.get(normalizeKey(taxRateName)) : undefined;
  if (taxRateName && (!taxRate || !taxRate.isActive)) issues.push(error(row.rowNumber, "taxRateName", "INVALID_REFERENCE", "Tax rate must resolve to an active tenant tax rate."));
  const branch = branchName ? context.branchesByName.get(normalizeKey(branchName)) : undefined;
  if (branchName && !branch) issues.push(error(row.rowNumber, "branchName", "INVALID_REFERENCE", "Branch must resolve inside this tenant."));

  if (exchangeRatePolicy === RecurringExchangeRatePolicy.BASE_CURRENCY_ONLY && (currencyCode !== context.baseCurrency || fixedExchangeRate || rateSnapshotId)) issues.push(error(row.rowNumber, "exchangeRatePolicy", "INVALID_FX_CONTEXT", "Base-currency-only templates must use the organization base currency without foreign-rate evidence."));
  if (currencyCode === context.baseCurrency && exchangeRatePolicy !== RecurringExchangeRatePolicy.BASE_CURRENCY_ONLY) issues.push(error(row.rowNumber, "exchangeRatePolicy", "INVALID_FX_CONTEXT", "Same-currency templates must use BASE_CURRENCY_ONLY."));
  if (exchangeRatePolicy === RecurringExchangeRatePolicy.FIXED_TEMPLATE_RATE && (!fixedExchangeRate || !isPositiveExchangeRate(fixedExchangeRate) || rateSnapshotId)) issues.push(error(row.rowNumber, "fixedExchangeRate", "INVALID_FX_CONTEXT", "Fixed-rate templates require one positive fixed rate and no snapshot."));
  if (exchangeRatePolicy === RecurringExchangeRatePolicy.REQUIRE_RATE_AT_RUN && (fixedExchangeRate || rateSnapshotId)) issues.push(error(row.rowNumber, "exchangeRatePolicy", "INVALID_FX_CONTEXT", "Rate-at-run templates cannot retain fixed or snapshot evidence."));
  const snapshot = rateSnapshotId && normalizeUuid(rateSnapshotId) ? context.rateSnapshotsById.get(normalizeUuid(rateSnapshotId)!) : undefined;
  if (exchangeRatePolicy === RecurringExchangeRatePolicy.RATE_SNAPSHOT && (!snapshot || snapshot.transactionCurrency !== currencyCode || snapshot.baseCurrency !== context.baseCurrency || fixedExchangeRate)) issues.push(error(row.rowNumber, "rateSnapshotId", "INVALID_RATE_SNAPSHOT", "Rate snapshot must belong to this tenant and match the currency pair."));

  const debit = cleanCell(row.raw.debit) || "0.0000"; const credit = cleanCell(row.raw.credit) || "0.0000";
  if (transactionType === RecurringTransactionType.MANUAL_JOURNAL && ((Number(debit) > 0) === (Number(credit) > 0))) issues.push(error(row.rowNumber, "debit", "UNBALANCED_JOURNAL", "Primary journal line must contain either a positive debit or a positive credit."));
  const fingerprint = `recurring:${transactionType}:${normalizeKey(name)}`;
  const duplicate = context.seenFingerprints.has(fingerprint) || context.recurringTemplateNames.has(normalizeKey(name));
  if (duplicate) issues.push(error(row.rowNumber, "name", "DUPLICATE", "Recurring template name already exists or is duplicated in this import."));
  context.seenFingerprints.add(fingerprint);

  return normalized(row, {
    transactionType, name, timezone, frequency, interval, startDate, endDate, catchUpPolicy, currencyCode, exchangeRatePolicy,
    fixedExchangeRate, rateSnapshotId: snapshot?.id ?? rateSnapshotId, partyId: acceptedParty?.id ?? null, branchId: branch?.id ?? null,
    paidThroughAccountId: paidThrough?.id ?? null, paymentTermsDays: cleanCell(row.raw.paymentTermsDays) || "0", reference: cleanOptionalCell(row.raw.reference),
    description: cleanCell(row.raw.description), accountId: account?.id ?? null, itemId: item?.id ?? null, taxRateId: taxRate?.id ?? null,
    costCenterId: costCenter?.id ?? null, projectId: project?.id ?? null, quantity: cleanCell(row.raw.quantity) || "1.0000", unitPrice: cleanCell(row.raw.unitPrice) || "0.0000",
    discountRate: cleanCell(row.raw.discountRate) || "0.0000", debit, credit, counterDescription: cleanOptionalCell(row.raw.counterDescription),
    counterAccountId: counterAccount?.id ?? null, counterCostCenterId: counterCostCenter?.id ?? null, counterProjectId: counterProject?.id ?? null, activate: false,
  }, fingerprint, duplicate, issues);
}

function resolveActiveDimension<T extends { id: string; status: string }>(row: ParsedImportRow, issues: ImportValidationIssueInput[], field: string, code: string | null, values: Map<string, T>): T | undefined {
  if (!code) return undefined;
  const value = values.get(normalizeKey(code));
  if (!value || value.status !== "ACTIVE") issues.push(error(row.rowNumber, field, "INVALID_REFERENCE", `${field} must resolve to an active tenant dimension.`));
  return value;
}

function isIanaTimezone(value: string): boolean {
  try { new Intl.DateTimeFormat("en", { timeZone: value }).format(new Date(0)); return Boolean(value); } catch { return false; }
}

function normalizeContactRow(entityType: ImportEntityType, row: ParsedImportRow, context: ValidationContext): NormalizedImportRow {
  const type = entityType === ImportEntityType.CUSTOMERS ? ContactType.CUSTOMER : ContactType.SUPPLIER;
  const name = cleanCell(row.raw.name);
  const fingerprint = contactFingerprint(type, name);
  const issues: ImportValidationIssueInput[] = [];
  if (!name) {
    issues.push(error(row.rowNumber, "name", "REQUIRED", "Name is required."));
  }
  if (cleanCell(row.raw.email) && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanCell(row.raw.email))) {
    issues.push(error(row.rowNumber, "email", "INVALID_EMAIL", "Email must be a valid email address."));
  }
  const duplicate = Boolean(name) && (context.seenFingerprints.has(fingerprint) || context.contactFingerprints.has(fingerprint));
  if (duplicate) {
    issues.push(error(row.rowNumber, "name", "DUPLICATE", "Contact name already exists or is duplicated in this import."));
  }
  context.seenFingerprints.add(fingerprint);
  return normalized(row, {
    name,
    displayName: cleanOptionalCell(row.raw.displayName),
    email: cleanOptionalCell(row.raw.email),
    phone: cleanOptionalCell(row.raw.phone),
    taxNumber: cleanOptionalCell(row.raw.taxNumber),
    countryCode: cleanOptionalCell(row.raw.countryCode) ?? "SA",
    isActive: parseBoolean(row.raw.isActive, true),
  }, fingerprint, duplicate, issues);
}

function normalizeItemRow(row: ParsedImportRow, context: ValidationContext): NormalizedImportRow {
  const name = cleanCell(row.raw.name);
  const sku = cleanOptionalCell(row.raw.sku);
  const type = cleanCell(row.raw.type).toUpperCase();
  const revenueAccountCode = cleanCell(row.raw.revenueAccountCode);
  const fingerprint = sku ? `item:sku:${normalizeKey(sku)}` : `item:name:${normalizeKey(name)}`;
  const issues: ImportValidationIssueInput[] = [];
  required(row, issues, "name", name);
  required(row, issues, "type", type);
  required(row, issues, "sellingPrice", row.raw.sellingPrice);
  required(row, issues, "revenueAccountCode", revenueAccountCode);
  if (type && !Object.values(ItemType).includes(type as ItemType)) {
    issues.push(error(row.rowNumber, "type", "INVALID_ENUM", "Item type must be SERVICE or PRODUCT."));
  }
  if (row.raw.sellingPrice && !isNonNegativeDecimal(row.raw.sellingPrice)) {
    issues.push(error(row.rowNumber, "sellingPrice", "INVALID_DECIMAL", "Selling price must be a non-negative decimal."));
  }
  const revenueAccount = context.accountsByCode.get(normalizeKey(revenueAccountCode));
  if (revenueAccountCode && (!revenueAccount || revenueAccount.type !== AccountType.REVENUE || !revenueAccount.isActive || !revenueAccount.allowPosting)) {
    issues.push(error(row.rowNumber, "revenueAccountCode", "INVALID_REFERENCE", "Revenue account code must be an active posting revenue account in this tenant."));
  }
  const duplicate = context.seenFingerprints.has(fingerprint) || Boolean(sku ? context.itemSkus.has(normalizeKey(sku)) : context.itemNames.has(normalizeKey(name)));
  if (duplicate) {
    issues.push(error(row.rowNumber, sku ? "sku" : "name", "DUPLICATE", "Product/service already exists or is duplicated in this import."));
  }
  context.seenFingerprints.add(fingerprint);
  const monetary = normalizeItemMonetaryFields(row, context, issues);
  return normalized(row, {
    name,
    sku,
    type,
    ...monetary,
    revenueAccountCode,
    status: cleanOptionalCell(row.raw.status)?.toUpperCase() ?? ItemStatus.ACTIVE,
  }, fingerprint, duplicate, issues);
}

function normalizeItemMonetaryFields(
  row: ParsedImportRow,
  context: ValidationContext,
  issues: ImportValidationIssueInput[],
): Record<string, string | null> {
  const transactionSellingPrice = cleanCell(row.raw.sellingPrice);
  const baseCurrency = context.baseCurrency!;
  const rawCurrency = cleanCell(row.raw.currency);
  const rawExchangeRate = cleanCell(row.raw.exchangeRate);
  const rawRateDate = cleanCell(row.raw.rateDate);
  const rawRateSource = cleanCell(row.raw.rateSource).toUpperCase();
  const rawRateSnapshotId = cleanOptionalCell(row.raw.rateSnapshotId);
  const rateSnapshotId = rawRateSnapshotId ? normalizeUuid(rawRateSnapshotId) ?? rawRateSnapshotId : null;
  const hasFxContext = Boolean(rawCurrency || rawExchangeRate || rawRateDate || rawRateSource || rateSnapshotId);

  if (!hasFxContext) {
    return {
      sellingPrice: transactionSellingPrice,
      transactionSellingPrice,
      baseSellingPrice: transactionSellingPrice,
      currency: baseCurrency,
      baseCurrency,
      exchangeRate: "1",
      rateDate: null,
      rateSource: CurrencyRateSource.SYSTEM_RATE_1,
      rateSnapshotId: null,
    };
  }

  const currency = normalizeSupportedCurrencyCode(rawCurrency);
  if (!currency) {
    issues.push(error(row.rowNumber, "currency", rawCurrency ? "UNSUPPORTED_CURRENCY" : "INCOMPLETE_FX_CONTEXT", rawCurrency ? "Currency is unsupported." : "Currency is required when FX fields are provided."));
  }
  if (!rawExchangeRate) {
    issues.push(error(row.rowNumber, "exchangeRate", "INCOMPLETE_FX_CONTEXT", "Exchange rate is required when FX fields are provided."));
  } else if (!isPositiveExchangeRate(rawExchangeRate)) {
    issues.push(error(row.rowNumber, "exchangeRate", "INVALID_EXCHANGE_RATE", "Exchange rate must be a positive plain decimal with at most eight decimal places."));
  }

  if (currency === baseCurrency) {
    if (rawExchangeRate && isPositiveExchangeRate(rawExchangeRate) && !new Prisma.Decimal(rawExchangeRate).eq(1)) {
      issues.push(error(row.rowNumber, "exchangeRate", "INVALID_FX_CONTEXT", "Same-currency product prices must use exchange rate 1."));
    }
    if (rateSnapshotId) {
      issues.push(error(row.rowNumber, "rateSnapshotId", "INVALID_RATE_SNAPSHOT", "Same-currency product prices cannot reference an FX rate snapshot."));
    }
    if (rawRateDate && !isValidDateOnly(rawRateDate)) {
      issues.push(error(row.rowNumber, "rateDate", "INVALID_RATE_DATE", "Rate date must be a valid YYYY-MM-DD calendar date."));
    }
    if (rawRateSource && rawRateSource !== CurrencyRateSource.SYSTEM_RATE_1) {
      issues.push(error(row.rowNumber, "rateSource", "INVALID_RATE_SOURCE", "Same-currency product prices use SYSTEM_RATE_1."));
    }
    return {
      sellingPrice: transactionSellingPrice,
      transactionSellingPrice,
      baseSellingPrice: transactionSellingPrice,
      currency: currency ?? rawCurrency,
      baseCurrency,
      exchangeRate: rawExchangeRate || "1",
      rateDate: rawRateDate || null,
      rateSource: CurrencyRateSource.SYSTEM_RATE_1,
      rateSnapshotId,
    };
  }

  if (!rawRateDate) {
    issues.push(error(row.rowNumber, "rateDate", "INCOMPLETE_FX_CONTEXT", "Rate date is required for a foreign-currency price."));
  } else if (!isValidDateOnly(rawRateDate)) {
    issues.push(error(row.rowNumber, "rateDate", "INVALID_RATE_DATE", "Rate date must be a valid YYYY-MM-DD calendar date."));
  }

  let rateSource: CurrencyRateSource = CurrencyRateSource.IMPORT;
  if (rateSnapshotId) {
    const snapshot = isUuid(rateSnapshotId) ? context.rateSnapshotsById.get(rateSnapshotId) : undefined;
    const matches = Boolean(
      snapshot &&
      currency &&
      snapshot.transactionCurrency === currency &&
      snapshot.baseCurrency === baseCurrency &&
      rawExchangeRate &&
      isPositiveExchangeRate(rawExchangeRate) &&
      new Prisma.Decimal(rawExchangeRate).eq(snapshot.rate) &&
      rawRateDate &&
      isValidDateOnly(rawRateDate) &&
      snapshot.rateDate.toISOString().slice(0, 10) === rawRateDate,
    );
    if (!matches) {
      issues.push(error(
        row.rowNumber,
        "rateSnapshotId",
        "INVALID_RATE_SNAPSHOT",
        isUuid(rateSnapshotId)
          ? "Rate snapshot must belong to this tenant and exactly match the imported FX tuple."
          : "Rate snapshot ID must be a valid UUID.",
      ));
    } else {
      rateSource = snapshot!.source;
      if (rawRateSource && rawRateSource !== snapshot!.source) {
        issues.push(error(row.rowNumber, "rateSource", "INVALID_RATE_SOURCE", "Rate source must match the referenced snapshot."));
      }
    }
  } else if (rawRateSource && rawRateSource !== CurrencyRateSource.IMPORT) {
    issues.push(error(row.rowNumber, "rateSource", "INVALID_RATE_SOURCE", "Inline imported foreign rates use IMPORT."));
  }

  let baseSellingPrice = transactionSellingPrice;
  if (transactionSellingPrice && isNonNegativeDecimal(transactionSellingPrice) && rawExchangeRate && isPositiveExchangeRate(rawExchangeRate)) {
    baseSellingPrice = convertTransactionToBaseAmount(transactionSellingPrice, rawExchangeRate);
  }
  return {
    sellingPrice: baseSellingPrice,
    transactionSellingPrice,
    baseSellingPrice,
    currency: currency ?? rawCurrency,
    baseCurrency,
    exchangeRate: rawExchangeRate,
    rateDate: rawRateDate || null,
    rateSource,
    rateSnapshotId,
  };
}

function normalizeFixedAssetOpeningBalanceRow(row: ParsedImportRow, context: ValidationContext): NormalizedImportRow {
  const name = cleanCell(row.raw.name);
  const categoryCode = cleanCell(row.raw.categoryCode);
  const openingBalanceAccountCode = cleanCell(row.raw.openingBalanceAccountCode);
  const acquisitionDate = cleanCell(row.raw.acquisitionDate);
  const inServiceDate = cleanCell(row.raw.inServiceDate);
  const baseAcquisitionCost = cleanCell(row.raw.baseAcquisitionCost);
  const baseSalvageValue = cleanCell(row.raw.baseSalvageValue) || "0.0000";
  const accumulatedDepreciation = cleanCell(row.raw.accumulatedDepreciation) || "0.0000";
  const usefulLifeMonths = cleanCell(row.raw.usefulLifeMonths);
  const issues: ImportValidationIssueInput[] = [];
  required(row, issues, "name", name);
  required(row, issues, "categoryCode", categoryCode);
  required(row, issues, "openingBalanceAccountCode", openingBalanceAccountCode);
  required(row, issues, "acquisitionDate", acquisitionDate);
  required(row, issues, "inServiceDate", inServiceDate);
  required(row, issues, "baseAcquisitionCost", baseAcquisitionCost);
  required(row, issues, "usefulLifeMonths", usefulLifeMonths);
  const category = context.fixedAssetCategoriesByCode.get(normalizeKey(categoryCode));
  const offset = context.accountsByCode.get(normalizeKey(openingBalanceAccountCode));
  if (categoryCode && !category) issues.push(error(row.rowNumber, "categoryCode", "INVALID_REFERENCE", "Category code must resolve to an active fixed-asset category in this tenant."));
  if (openingBalanceAccountCode && (!offset || !offset.isActive || !offset.allowPosting)) issues.push(error(row.rowNumber, "openingBalanceAccountCode", "INVALID_REFERENCE", "Opening-balance account must be an active posting account in this tenant."));
  if (baseAcquisitionCost && !isNonNegativeDecimal(baseAcquisitionCost)) issues.push(error(row.rowNumber, "baseAcquisitionCost", "INVALID_DECIMAL", "Acquisition cost must be a non-negative decimal with at most four places."));
  if (baseSalvageValue && !isNonNegativeDecimal(baseSalvageValue)) issues.push(error(row.rowNumber, "baseSalvageValue", "INVALID_DECIMAL", "Salvage value must be a non-negative decimal with at most four places."));
  if (accumulatedDepreciation && !isNonNegativeDecimal(accumulatedDepreciation)) issues.push(error(row.rowNumber, "accumulatedDepreciation", "INVALID_DECIMAL", "Accumulated depreciation must be a non-negative decimal with at most four places."));
  if (usefulLifeMonths && !/^\d+$/.test(usefulLifeMonths)) issues.push(error(row.rowNumber, "usefulLifeMonths", "INVALID_INTEGER", "Useful life must be a positive whole number of months."));
  if (usefulLifeMonths && Number(usefulLifeMonths) <= 0) issues.push(error(row.rowNumber, "usefulLifeMonths", "INVALID_INTEGER", "Useful life must be a positive whole number of months."));
  if (acquisitionDate && !isValidDateOnly(acquisitionDate)) issues.push(error(row.rowNumber, "acquisitionDate", "INVALID_DATE", "Acquisition date must be a valid YYYY-MM-DD date."));
  if (inServiceDate && !isValidDateOnly(inServiceDate)) issues.push(error(row.rowNumber, "inServiceDate", "INVALID_DATE", "In-service date must be a valid YYYY-MM-DD date."));
  if (isValidDateOnly(acquisitionDate) && isValidDateOnly(inServiceDate) && inServiceDate < acquisitionDate) issues.push(error(row.rowNumber, "inServiceDate", "INVALID_DATE_ORDER", "In-service date cannot be before acquisition date."));
  if (isNonNegativeDecimal(baseAcquisitionCost) && isNonNegativeDecimal(baseSalvageValue) && isNonNegativeDecimal(accumulatedDepreciation)) {
    const cost = new Prisma.Decimal(baseAcquisitionCost);
    const salvage = new Prisma.Decimal(baseSalvageValue);
    const accumulated = new Prisma.Decimal(accumulatedDepreciation);
    if (salvage.gt(cost)) issues.push(error(row.rowNumber, "baseSalvageValue", "INVALID_RANGE", "Salvage value cannot exceed acquisition cost."));
    if (accumulated.gt(cost.sub(salvage))) issues.push(error(row.rowNumber, "accumulatedDepreciation", "INVALID_RANGE", "Accumulated depreciation cannot exceed depreciable cost."));
  }
  const fingerprint = `fixed-asset-opening:${normalizeKey(name)}:${normalizeKey(categoryCode)}`;
  const duplicate = context.seenFingerprints.has(fingerprint);
  if (duplicate) issues.push(error(row.rowNumber, "name", "DUPLICATE", "Fixed-asset opening row is duplicated in this import."));
  context.seenFingerprints.add(fingerprint);
  return normalized(row, {
    name,
    categoryCode,
    categoryId: category?.id ?? null,
    openingBalanceAccountCode,
    openingBalanceAccountId: offset?.id ?? null,
    acquisitionDate,
    inServiceDate,
    baseAcquisitionCost,
    baseSalvageValue,
    accumulatedDepreciation,
    usefulLifeMonths,
    reason: cleanOptionalCell(row.raw.reason),
  }, fingerprint, duplicate, issues);
}

function normalizeAccountRow(row: ParsedImportRow, context: ValidationContext): NormalizedImportRow {
  const code = cleanCell(row.raw.code);
  const type = cleanCell(row.raw.type).toUpperCase();
  const fingerprint = `account:${normalizeKey(code)}`;
  const issues: ImportValidationIssueInput[] = [];
  required(row, issues, "code", code);
  required(row, issues, "name", row.raw.name);
  required(row, issues, "type", type);
  if (type && !Object.values(AccountType).includes(type as AccountType)) {
    issues.push(error(row.rowNumber, "type", "INVALID_ENUM", "Account type is not supported."));
  }
  if (code && !/^[A-Za-z0-9.-]+$/.test(code)) {
    issues.push(error(row.rowNumber, "code", "INVALID_CODE", "Account code can only contain letters, numbers, periods, and dashes."));
  }
  const parentCode = cleanOptionalCell(row.raw.parentCode);
  if (parentCode && !context.accountsByCode.has(normalizeKey(parentCode))) {
    issues.push(error(row.rowNumber, "parentCode", "INVALID_REFERENCE", "Parent account code must already exist in this tenant."));
  }
  const duplicate = context.seenFingerprints.has(fingerprint) || context.accountsByCode.has(normalizeKey(code));
  if (duplicate) {
    issues.push(error(row.rowNumber, "code", "DUPLICATE", "Account code already exists or is duplicated in this import."));
  }
  context.seenFingerprints.add(fingerprint);
  return normalized(row, {
    code,
    name: cleanCell(row.raw.name),
    type,
    description: cleanOptionalCell(row.raw.description),
    allowPosting: parseBoolean(row.raw.allowPosting, true),
    isActive: parseBoolean(row.raw.isActive, true),
    parentCode,
  }, fingerprint, duplicate, issues);
}

function normalized(
  row: ParsedImportRow,
  value: Record<string, string | boolean | null>,
  fingerprint: string,
  duplicate: boolean,
  issues: ImportValidationIssueInput[],
): NormalizedImportRow {
  return {
    rowNumber: row.rowNumber,
    raw: row.raw,
    normalized: value,
    fingerprint,
    duplicate,
    status: issues.some((issue) => issue.severity === ImportValidationIssueSeverity.ERROR)
      ? duplicate
        ? ImportJobRowStatus.DUPLICATE
        : ImportJobRowStatus.INVALID
      : ImportJobRowStatus.VALID,
    issues,
  };
}

function parseCsv(content: string): { headers: string[]; rows: ParsedImportRow[] } {
  if (!content.trim()) {
    throw new BadRequestException("CSV content is required.");
  }
  const records = parseCsvRecords(content);
  if (records.length < 2) {
    throw new BadRequestException("CSV must include a header row and at least one data row.");
  }
  const headers = records[0]!.map((header) => header.trim());
  const rows = records.slice(1).filter((record) => record.some((cell) => cell.trim() !== ""));
  return {
    headers,
    rows: rows.map((record, index) => ({
      rowNumber: index + 2,
      raw: Object.fromEntries(headers.map((header, headerIndex) => [header, record[headerIndex] ?? ""])),
    })),
  };
}

function parseCsvRecords(content: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];
    const next = content[index + 1];
    if (char === "\"" && inQuotes && next === "\"") {
      cell += "\"";
      index += 1;
    } else if (char === "\"") {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  row.push(cell);
  rows.push(row);
  return rows.filter((record) => record.some((value) => value.trim() !== ""));
}

function assertHeaders(headers: string[], template: ImportTemplateDefinition): void {
  const headerSet = new Set(headers);
  const missing = template.requiredHeaders.filter((header) => !headerSet.has(header));
  if (missing.length > 0) {
    throw new BadRequestException(`CSV is missing required headers: ${missing.join(", ")}.`);
  }
}

function required(row: ParsedImportRow, issues: ImportValidationIssueInput[], field: string, value: unknown): void {
  if (!cleanCell(value)) {
    issues.push(error(row.rowNumber, field, "REQUIRED", `${field} is required.`));
  }
}

function error(rowNumber: number, field: string, code: string, message: string): ImportValidationIssueInput {
  return { rowNumber, field, code, message, severity: ImportValidationIssueSeverity.ERROR };
}

function cleanCell(value: unknown): string {
  return value === null || value === undefined ? "" : String(value).trim();
}

function cleanOptionalCell(value: unknown): string | null {
  const cleaned = cleanCell(value);
  return cleaned ? cleaned : null;
}

function normalizeKey(value: unknown): string {
  return cleanCell(value).toLowerCase();
}

function contactFingerprint(type: ContactType, name: string): string {
  return `contact:${type}:${normalizeKey(name)}`;
}

function parseBoolean(value: unknown, fallback: boolean): boolean {
  const cleaned = cleanCell(value).toLowerCase();
  if (!cleaned) {
    return fallback;
  }
  return ["true", "1", "yes", "y"].includes(cleaned);
}

function isNonNegativeDecimal(value: unknown): boolean {
  return /^\d+(\.\d{1,4})?$/.test(cleanCell(value));
}

function isPositiveExchangeRate(value: unknown): boolean {
  const normalized = cleanCell(value);
  if (!/^\d{1,10}(?:\.\d{1,8})?$/.test(normalized)) {
    return false;
  }
  try {
    convertTransactionToBaseAmount("0", normalized);
    return new Prisma.Decimal(normalized).gt(0);
  } catch {
    return false;
  }
}

function isValidDateOnly(value: unknown): boolean {
  const normalized = cleanCell(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return false;
  }
  const date = new Date(`${normalized}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === normalized;
}

function normalizeUuid(value: unknown): string | null {
  const normalized = cleanCell(value);
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(normalized)
    ? normalized.toLowerCase()
    : null;
}

function isUuid(value: unknown): boolean {
  return normalizeUuid(value) !== null;
}

function importRawJson(value: Prisma.JsonValue): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ConflictException("Stored import row data is invalid. Create a new preview before committing.");
  }
  return Object.fromEntries(Object.entries(value).map(([key, cell]) => [key, cleanCell(cell)]));
}

function matchesStoredNormalizedEvidence(
  stored: Prisma.JsonValue | undefined,
  current: Record<string, string | boolean | null>,
): boolean {
  if (!stored || typeof stored !== "object" || Array.isArray(stored)) {
    return false;
  }
  const storedEntries = Object.entries(stored);
  const currentEntries = Object.entries(current);
  return storedEntries.length === currentEntries.length
    && currentEntries.every(([key, value]) => Object.prototype.hasOwnProperty.call(stored, key) && stored[key] === value);
}

function cleanFilename(value: string): string {
  return value.replace(/[^\w .-]/g, "_").slice(0, 180);
}

function requireString(value: unknown): string {
  const cleaned = cleanCell(value);
  if (!cleaned) {
    throw new BadRequestException("Required import value is missing.");
  }
  return cleaned;
}

function optionalString(value: unknown): string | null {
  return cleanOptionalCell(value);
}
