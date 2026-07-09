import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import {
  AccountType,
  ContactType,
  ImportEntityType,
  ImportJobRowStatus,
  ImportJobStatus,
  ImportValidationIssueSeverity,
  ItemStatus,
  ItemType,
} from "@prisma/client";
import { AuditLogService } from "../audit-log/audit-log.service";
import { ObservabilityContextService } from "../observability/observability-context.service";
import { PrismaService } from "../prisma/prisma.service";
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
    headers: ["name", "sku", "type", "sellingPrice", "revenueAccountCode", "status"],
    requiredHeaders: ["name", "type", "sellingPrice", "revenueAccountCode"],
    notes: ["Creates local item catalog records only after explicit reviewed commit.", "Revenue account code must already exist in the selected tenant."],
    sample: { name: "Consulting", sku: "CONSULT", type: "SERVICE", sellingPrice: "100.0000", revenueAccountCode: "400", status: "ACTIVE" },
  },
  {
    entityType: ImportEntityType.CHART_OF_ACCOUNTS,
    label: "Chart of accounts",
    headers: ["code", "name", "type", "description", "allowPosting", "isActive", "parentCode"],
    requiredHeaders: ["code", "name", "type"],
    notes: ["Creates local non-system accounts only after explicit reviewed commit.", "Opening balances, journals, VAT mappings, and official filing data are not imported."],
    sample: { code: "410", name: "Service revenue", type: "REVENUE", description: "Imported local account", allowPosting: "true", isActive: "true", parentCode: "" },
  },
];

const templateByEntity = new Map(IMPORT_TEMPLATES.map((template) => [template.entityType, template]));

@Injectable()
export class MigrationToolkitService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
    private readonly observabilityContext?: ObservabilityContextService,
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
      unsupportedImports: ["Opening balances", "Posted journals", "Sales invoices", "Purchase bills", "Bank credentials", "Provider payloads"],
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
    const validationContext = await this.validationContext(organizationId, dto.entityType);
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

    const job = await this.prisma.importJob.create({
      data: {
        organizationId,
        entityType: dto.entityType,
        status: ImportJobStatus.READY_FOR_REVIEW,
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
      await this.prisma.importValidationIssue.createMany({
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
    });

    return this.getImportJob(organizationId, job.id);
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
      throw new BadRequestException("Only jobs ready for review can be committed.");
    }
    const errors = job.validationIssues.filter((issue) => issue.severity === ImportValidationIssueSeverity.ERROR);
    if (errors.length > 0) {
      await this.prisma.importJobRow.updateMany({
        where: { organizationId, importJobId: id },
        data: { status: ImportJobRowStatus.COMMIT_BLOCKED },
      });
      throw new BadRequestException("Import commit is blocked until validation errors and duplicates are resolved.");
    }

    const createdIds: string[] = [];
    for (const row of job.rows) {
      const normalized = row.normalizedJson as Record<string, string | boolean | null>;
      const created = await this.createRecord(organizationId, actorUserId, job.entityType, normalized);
      createdIds.push(created.id);
      await this.prisma.importJobRow.update({
        where: { id: row.id },
        data: { status: ImportJobRowStatus.COMMITTED, createdRecordId: created.id },
      });
    }

    await this.prisma.importJob.update({
      where: { id },
      data: {
        status: ImportJobStatus.COMMITTED_LOCAL,
        previewOnly: false,
        committedAt: new Date(),
        committedById: actorUserId,
        summaryJson: {
          ...(job.summaryJson as Record<string, unknown>),
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
      after: { entityType: job.entityType, committedRecordCount: createdIds.length, hostedMutation: false },
    });

    return this.getImportJob(organizationId, id);
  }

  async exportCsv(organizationId: string, entityType: ImportEntityType): Promise<CsvFile> {
    let rows: unknown[][];
    if (entityType === ImportEntityType.CUSTOMERS || entityType === ImportEntityType.SUPPLIERS) {
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
    if (entityType === ImportEntityType.CUSTOMERS || entityType === ImportEntityType.SUPPLIERS) {
      return normalizeContactRow(entityType, row, context);
    }
    if (entityType === ImportEntityType.PRODUCTS_SERVICES) {
      return normalizeItemRow(row, context);
    }
    return normalizeAccountRow(row, context);
  }

  private async validationContext(organizationId: string, entityType: ImportEntityType): Promise<ValidationContext> {
    const [contacts, items, accounts] = await Promise.all([
      entityType === ImportEntityType.CUSTOMERS || entityType === ImportEntityType.SUPPLIERS
        ? this.prisma.contact.findMany({ where: { organizationId }, select: { name: true, type: true } })
        : Promise.resolve([]),
      entityType === ImportEntityType.PRODUCTS_SERVICES
        ? this.prisma.item.findMany({ where: { organizationId }, select: { sku: true, name: true } })
        : Promise.resolve([]),
      this.prisma.account.findMany({ where: { organizationId }, select: { id: true, code: true, type: true, isActive: true, allowPosting: true } }),
    ]);
    return {
      seenFingerprints: new Set<string>(),
      contactFingerprints: new Set(contacts.map((contact) => contactFingerprint(contact.type, contact.name))),
      itemSkus: new Set(items.map((item) => normalizeKey(item.sku)).filter(Boolean)),
      itemNames: new Set(items.map((item) => normalizeKey(item.name))),
      accountsByCode: new Map(accounts.map((account) => [normalizeKey(account.code), account])),
    };
  }

  private async createRecord(organizationId: string, actorUserId: string, entityType: ImportEntityType, row: Record<string, string | boolean | null>) {
    if (entityType === ImportEntityType.CUSTOMERS || entityType === ImportEntityType.SUPPLIERS) {
      return this.prisma.contact.create({
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
      const revenueAccount = await this.prisma.account.findFirst({
        where: { organizationId, code: requireString(row.revenueAccountCode), type: AccountType.REVENUE, isActive: true, allowPosting: true },
        select: { id: true },
      });
      if (!revenueAccount) {
        throw new BadRequestException("Revenue account code must exist before committing products and services.");
      }
      return this.prisma.item.create({
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

    const parentCode = optionalString(row.parentCode);
    const parent = parentCode
      ? await this.prisma.account.findFirst({ where: { organizationId, code: parentCode }, select: { id: true } })
      : null;
    return this.prisma.account.create({
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
  accountsByCode: Map<string, { id: string; code: string; type: AccountType; isActive: boolean; allowPosting: boolean }>;
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
  return normalized(row, {
    name,
    sku,
    type,
    sellingPrice: cleanCell(row.raw.sellingPrice),
    revenueAccountCode,
    status: cleanOptionalCell(row.raw.status)?.toUpperCase() ?? ItemStatus.ACTIVE,
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
