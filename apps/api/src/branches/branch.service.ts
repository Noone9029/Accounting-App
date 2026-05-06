import { Injectable, NotFoundException } from "@nestjs/common";
import { AuditLogService } from "../audit-log/audit-log.service";
import { PrismaService } from "../prisma/prisma.service";
import { CreateBranchDto } from "./dto/create-branch.dto";
import { UpdateBranchDto } from "./dto/update-branch.dto";

@Injectable()
export class BranchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  list(organizationId: string) {
    return this.prisma.branch.findMany({
      where: { organizationId },
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    });
  }

  async create(organizationId: string, actorUserId: string, dto: CreateBranchDto) {
    const branch = await this.prisma.branch.create({
      data: { organizationId, ...dto },
    });
    await this.auditLogService.log({ organizationId, actorUserId, action: "CREATE", entityType: "Branch", entityId: branch.id, after: branch });
    return branch;
  }

  async update(organizationId: string, actorUserId: string, id: string, dto: UpdateBranchDto) {
    const existing = await this.findExisting(organizationId, id);
    const branch = await this.prisma.branch.update({
      where: { id },
      data: dto,
    });
    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action: "UPDATE",
      entityType: "Branch",
      entityId: id,
      before: existing,
      after: branch,
    });
    return branch;
  }

  private async findExisting(organizationId: string, id: string) {
    const branch = await this.prisma.branch.findFirst({ where: { id, organizationId } });
    if (!branch) {
      throw new NotFoundException("Branch not found.");
    }
    return branch;
  }
}
