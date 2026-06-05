import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { AccountType } from "@prisma/client";
import { AuditLogService } from "../audit-log/audit-log.service";
import { PrismaService } from "../prisma/prisma.service";
import { CreateAccountDto } from "./dto/create-account.dto";
import { UpdateAccountDto } from "./dto/update-account.dto";

const ACCOUNT_CODE_RANGES: Record<AccountType, { start: number; end: number }> = {
  [AccountType.ASSET]: { start: 100, end: 199 },
  [AccountType.LIABILITY]: { start: 200, end: 299 },
  [AccountType.EQUITY]: { start: 300, end: 399 },
  [AccountType.REVENUE]: { start: 400, end: 499 },
  [AccountType.EXPENSE]: { start: 500, end: 599 },
  [AccountType.COST_OF_SALES]: { start: 600, end: 699 },
};

const ACCOUNT_CODE_PATTERN = /^[A-Za-z0-9.-]+$/;

@Injectable()
export class ChartOfAccountsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  list(organizationId: string) {
    return this.prisma.account.findMany({
      where: { organizationId },
      orderBy: { code: "asc" },
      include: { parent: { select: { id: true, code: true, name: true } } },
    });
  }

  async get(organizationId: string, id: string) {
    return this.findExisting(organizationId, id);
  }

  async nextCode(organizationId: string, type: AccountType) {
    const accountType = this.cleanAccountType(type);
    const range = ACCOUNT_CODE_RANGES[accountType];
    const accounts = await this.prisma.account.findMany({
      where: { organizationId, type: accountType },
      select: { code: true },
      orderBy: { code: "asc" },
    });
    const usedCodes = new Set(accounts.map((account) => account.code.trim()));
    const numericCodes = accounts
      .map((account) => account.code.trim())
      .filter((code) => /^\d+$/.test(code))
      .map((code) => Number.parseInt(code, 10))
      .filter((code) => Number.isInteger(code) && code >= range.start && code <= range.end);
    let candidate = numericCodes.length > 0 ? Math.max(...numericCodes) + 1 : range.start;

    while (candidate <= range.end && usedCodes.has(String(candidate))) {
      candidate += 1;
    }

    if (candidate > range.end) {
      throw new BadRequestException(`No available ${accountType.replaceAll("_", " ").toLowerCase()} account codes remain in ${range.start}-${range.end}.`);
    }

    return {
      type: accountType,
      code: String(candidate),
      rangeStart: String(range.start),
      rangeEnd: String(range.end),
      manualOverrideAllowed: true,
      helperText: "Suggested from the existing LedgerByte account-code range. Manual overrides require account administration access and are audit logged.",
    };
  }

  async create(organizationId: string, actorUserId: string, dto: CreateAccountDto) {
    await this.validateParent(organizationId, dto.parentId);
    const suggestion = await this.nextCode(organizationId, dto.type);
    const manualCode = this.cleanCode(dto.code);
    const code = manualCode ?? suggestion.code;
    await this.assertCodeAvailable(organizationId, code);

    const account = await this.prisma.account.create({
      data: {
        organizationId,
        code,
        name: dto.name.trim(),
        type: dto.type,
        parentId: dto.parentId,
        description: dto.description,
        allowPosting: dto.allowPosting ?? true,
        isActive: dto.isActive ?? true,
      },
    });
    await this.auditLogService.log({ organizationId, actorUserId, action: "CREATE", entityType: "Account", entityId: account.id, after: account });
    if (manualCode && manualCode !== suggestion.code) {
      await this.auditLogService.log({
        organizationId,
        actorUserId,
        action: "MANUAL_CODE_OVERRIDE",
        entityType: "Account",
        entityId: account.id,
        after: { accountCode: account.code, suggestedCode: suggestion.code, accountType: account.type },
      });
    }
    return account;
  }

  async update(organizationId: string, actorUserId: string, id: string, dto: UpdateAccountDto) {
    const existing = await this.findExisting(organizationId, id);
    if (dto.parentId === id) {
      throw new BadRequestException("An account cannot be its own parent.");
    }
    await this.validateParent(organizationId, dto.parentId);
    const nextCode = this.cleanCode(dto.code);
    if (nextCode && nextCode !== existing.code) {
      await this.assertCodeAvailable(organizationId, nextCode, id);
    }

    const account = await this.prisma.account.update({
      where: { id },
      data: {
        code: nextCode,
        name: dto.name?.trim(),
        type: dto.type,
        parentId: dto.parentId,
        description: dto.description,
        allowPosting: dto.allowPosting,
        isActive: dto.isActive,
      },
    });
    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action: "UPDATE",
      entityType: "Account",
      entityId: id,
      before: existing,
      after: account,
    });
    if (nextCode && nextCode !== existing.code) {
      await this.auditLogService.log({
        organizationId,
        actorUserId,
        action: "MANUAL_CODE_OVERRIDE",
        entityType: "Account",
        entityId: id,
        before: { accountCode: existing.code },
        after: { accountCode: account.code, accountType: account.type },
      });
    }
    return account;
  }

  async remove(organizationId: string, actorUserId: string, id: string) {
    const existing = await this.findExisting(organizationId, id);
    const [lineCount, childCount, invoiceLineCount, itemCount, paymentCount, bankProfileCount] = await Promise.all([
      this.prisma.journalLine.count({ where: { organizationId, accountId: id } }),
      this.prisma.account.count({ where: { organizationId, parentId: id } }),
      this.prisma.salesInvoiceLine.count({ where: { organizationId, accountId: id } }),
      this.prisma.item.count({ where: { organizationId, OR: [{ revenueAccountId: id }, { expenseAccountId: id }] } }),
      this.prisma.customerPayment.count({ where: { organizationId, accountId: id } }),
      this.prisma.bankAccountProfile.count({ where: { organizationId, accountId: id } }),
    ]);

    if (lineCount > 0 || childCount > 0 || invoiceLineCount > 0 || itemCount > 0 || paymentCount > 0 || bankProfileCount > 0 || existing.isSystem) {
      throw new BadRequestException("Account can only be deleted when it is non-system, unused, and has no dependent records.");
    }

    await this.prisma.account.delete({ where: { id } });
    await this.auditLogService.log({ organizationId, actorUserId, action: "DELETE", entityType: "Account", entityId: id, before: existing });
    return { deleted: true };
  }

  private async findExisting(organizationId: string, id: string) {
    const account = await this.prisma.account.findFirst({
      where: { id, organizationId },
      include: { parent: { select: { id: true, code: true, name: true } } },
    });
    if (!account) {
      throw new NotFoundException("Account not found.");
    }
    return account;
  }

  private async validateParent(organizationId: string, parentId?: string): Promise<void> {
    if (!parentId) {
      return;
    }

    const parent = await this.prisma.account.findFirst({ where: { id: parentId, organizationId } });
    if (!parent) {
      throw new BadRequestException("Parent account does not exist in this organization.");
    }
  }

  private cleanAccountType(type: AccountType): AccountType {
    if (!Object.values(AccountType).includes(type)) {
      throw new BadRequestException("Account type must be one of ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE, or COST_OF_SALES.");
    }
    return type;
  }

  private cleanCode(value: string | null | undefined): string | undefined {
    const code = value?.trim();
    if (!code) {
      return undefined;
    }
    if (code.length > 20) {
      throw new BadRequestException("Account code must be 20 characters or fewer.");
    }
    if (!ACCOUNT_CODE_PATTERN.test(code)) {
      throw new BadRequestException("Account code can only contain letters, numbers, periods, and dashes.");
    }
    return code;
  }

  private async assertCodeAvailable(organizationId: string, code: string, exceptAccountId?: string): Promise<void> {
    const existing = await this.prisma.account.findFirst({
      where: { organizationId, code, ...(exceptAccountId ? { id: { not: exceptAccountId } } : {}) },
      select: { id: true },
    });
    if (existing) {
      throw new BadRequestException("Account code already exists in this organization.");
    }
  }
}
