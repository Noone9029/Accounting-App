import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { AuditLogService } from "../audit-log/audit-log.service";
import { PrismaService } from "../prisma/prisma.service";
import { CreateAccountDto } from "./dto/create-account.dto";
import { UpdateAccountDto } from "./dto/update-account.dto";

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

  async create(organizationId: string, actorUserId: string, dto: CreateAccountDto) {
    await this.validateParent(organizationId, dto.parentId);
    const account = await this.prisma.account.create({
      data: {
        organizationId,
        code: dto.code.trim(),
        name: dto.name.trim(),
        type: dto.type,
        parentId: dto.parentId,
        description: dto.description,
        allowPosting: dto.allowPosting ?? true,
        isActive: dto.isActive ?? true,
      },
    });
    await this.auditLogService.log({ organizationId, actorUserId, action: "CREATE", entityType: "Account", entityId: account.id, after: account });
    return account;
  }

  async update(organizationId: string, actorUserId: string, id: string, dto: UpdateAccountDto) {
    const existing = await this.findExisting(organizationId, id);
    if (dto.parentId === id) {
      throw new BadRequestException("An account cannot be its own parent.");
    }
    await this.validateParent(organizationId, dto.parentId);

    const account = await this.prisma.account.update({
      where: { id },
      data: {
        code: dto.code?.trim(),
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
    return account;
  }

  async remove(organizationId: string, actorUserId: string, id: string) {
    const existing = await this.findExisting(organizationId, id);
    const [lineCount, childCount, invoiceLineCount, itemCount, paymentCount] = await Promise.all([
      this.prisma.journalLine.count({ where: { organizationId, accountId: id } }),
      this.prisma.account.count({ where: { organizationId, parentId: id } }),
      this.prisma.salesInvoiceLine.count({ where: { organizationId, accountId: id } }),
      this.prisma.item.count({ where: { organizationId, OR: [{ revenueAccountId: id }, { expenseAccountId: id }] } }),
      this.prisma.customerPayment.count({ where: { organizationId, accountId: id } }),
    ]);

    if (lineCount > 0 || childCount > 0 || invoiceLineCount > 0 || itemCount > 0 || paymentCount > 0 || existing.isSystem) {
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
}
