import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { DimensionStatus, Prisma } from "@prisma/client";
import { AuditLogService } from "../audit-log/audit-log.service";
import { PrismaService } from "../prisma/prisma.service";
import { CreateProjectDto } from "./dto/create-project.dto";
import { UpdateProjectDto } from "./dto/update-project.dto";

@Injectable()
export class ProjectService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  list(organizationId: string, status?: DimensionStatus) {
    return this.prisma.project.findMany({
      where: { organizationId, ...(status ? { status } : {}) },
      orderBy: { code: "asc" },
    });
  }

  async get(organizationId: string, id: string) {
    return this.findExisting(organizationId, id);
  }

  async create(organizationId: string, actorUserId: string, dto: CreateProjectDto) {
    const code = this.requiredCode(dto.code);
    const name = this.requiredName(dto.name);
    await this.assertCodeAvailable(organizationId, code);

    const project = await this.prisma.project
      .create({
        data: {
          organizationId,
          code,
          name,
          description: this.cleanOptional(dto.description),
        },
      })
      .catch((error: unknown) => {
        this.rethrowDuplicate(error);
      });

    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action: "CREATE",
      entityType: "Project",
      entityId: project.id,
      after: project,
    });
    return project;
  }

  async update(organizationId: string, actorUserId: string, id: string, dto: UpdateProjectDto) {
    const existing = await this.findExisting(organizationId, id);
    const code = dto.code === undefined ? undefined : this.requiredCode(dto.code);
    if (code !== undefined && code !== existing.code) {
      await this.assertCodeAvailable(organizationId, code, id);
    }

    const project = await this.prisma.project
      .update({
        where: { id, organizationId },
        data: {
          code,
          name: dto.name === undefined ? undefined : this.requiredName(dto.name),
          description: this.cleanNullable(dto.description),
          status: dto.status,
        },
      })
      .catch((error: unknown) => {
        this.rethrowDuplicate(error);
      });

    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action: "UPDATE",
      entityType: "Project",
      entityId: id,
      before: existing,
      after: project,
    });
    return project;
  }

  private async findExisting(organizationId: string, id: string) {
    const project = await this.prisma.project.findFirst({ where: { id, organizationId } });
    if (!project) {
      throw new NotFoundException("Project not found.");
    }
    return project;
  }

  private async assertCodeAvailable(organizationId: string, code: string, exceptId?: string): Promise<void> {
    const existing = await this.prisma.project.findFirst({
      where: { organizationId, code, ...(exceptId ? { id: { not: exceptId } } : {}) },
      select: { id: true },
    });
    if (existing) {
      throw new BadRequestException("Project code already exists.");
    }
  }

  private requiredCode(value: string): string {
    const code = value.trim().toUpperCase();
    if (!code) {
      throw new BadRequestException("Project code is required.");
    }
    return code;
  }

  private requiredName(value: string): string {
    const name = value.trim();
    if (!name) {
      throw new BadRequestException("Project name is required.");
    }
    return name;
  }

  private cleanOptional(value?: string | null): string | null {
    const description = value?.trim();
    return description || null;
  }

  private cleanNullable(value: string | null | undefined): string | null | undefined {
    return value === undefined ? undefined : this.cleanOptional(value);
  }

  private rethrowDuplicate(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new BadRequestException("Project code already exists.");
    }
    throw error;
  }
}
