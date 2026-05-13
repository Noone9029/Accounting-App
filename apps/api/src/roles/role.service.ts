import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { ALL_PERMISSIONS, hasPermission, normalizePermissions, PERMISSIONS } from "@ledgerbyte/shared";
import { AuditLogService } from "../audit-log/audit-log.service";
import { PrismaService } from "../prisma/prisma.service";
import { CreateRoleDto } from "./dto/create-role.dto";
import { UpdateRoleDto } from "./dto/update-role.dto";

@Injectable()
export class RoleService {
  private readonly allowedPermissions = new Set<string>(ALL_PERMISSIONS);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async list(organizationId: string) {
    const roles = await this.prisma.role.findMany({
      where: { organizationId },
      orderBy: { name: "asc" },
      select: {
        id: true,
        organizationId: true,
        name: true,
        permissions: true,
        isSystem: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { members: true } },
      },
    });

    return roles.map((role) => this.toRoleResponse(role));
  }

  async get(organizationId: string, id: string) {
    const role = await this.prisma.role.findFirst({
      where: { id, organizationId },
      select: {
        id: true,
        organizationId: true,
        name: true,
        permissions: true,
        isSystem: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { members: true } },
      },
    });

    if (!role) {
      throw new NotFoundException("Role not found.");
    }

    return this.toRoleResponse(role);
  }

  async create(organizationId: string, actorUserId: string, dto: CreateRoleDto) {
    const permissions = this.validatePermissions(dto.permissions);

    try {
      const role = await this.prisma.role.create({
        data: {
          organizationId,
          name: dto.name.trim(),
          permissions,
          isSystem: false,
        },
        select: ROLE_SELECT,
      });

      await this.auditLogService.log({
        organizationId,
        actorUserId,
        action: "CREATE",
        entityType: "Role",
        entityId: role.id,
        after: role,
      });

      return this.toRoleResponse(role);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ConflictException("A role with this name already exists.");
      }
      throw error;
    }
  }

  async update(organizationId: string, actorUserId: string, id: string, dto: UpdateRoleDto) {
    const existing = await this.getRoleOrThrow(organizationId, id);

    if (existing.isSystem) {
      throw new ForbiddenException("System roles cannot be edited.");
    }

    const permissions = dto.permissions === undefined ? undefined : this.validatePermissions(dto.permissions);
    if (permissions && hasPermission(existing.permissions, PERMISSIONS.admin.fullAccess) && !hasPermission(permissions, PERMISSIONS.admin.fullAccess)) {
      await this.assertNotRemovingLastFullAccessRole(organizationId, id);
    }

    try {
      const role = await this.prisma.role.update({
        where: { id },
        data: {
          name: dto.name?.trim(),
          permissions,
        },
        select: ROLE_SELECT,
      });

      await this.auditLogService.log({
        organizationId,
        actorUserId,
        action: "UPDATE",
        entityType: "Role",
        entityId: role.id,
        before: existing,
        after: role,
      });

      return this.toRoleResponse(role);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ConflictException("A role with this name already exists.");
      }
      throw error;
    }
  }

  async remove(organizationId: string, actorUserId: string, id: string) {
    const existing = await this.getRoleOrThrow(organizationId, id);

    if (existing.isSystem) {
      throw new ForbiddenException("System roles cannot be deleted.");
    }

    const activeMembers = await this.prisma.organizationMember.count({
      where: { organizationId, roleId: id, status: "ACTIVE" },
    });

    if (activeMembers > 0) {
      throw new ConflictException("Cannot delete a role assigned to active members.");
    }

    await this.prisma.role.delete({ where: { id } });

    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action: "DELETE",
      entityType: "Role",
      entityId: id,
      before: existing,
    });

    return { deleted: true };
  }

  private validatePermissions(permissions: string[]): string[] {
    const unique = Array.from(new Set(permissions.map((permission) => permission.trim()).filter(Boolean)));
    const unknown = unique.filter((permission) => !this.allowedPermissions.has(permission));

    if (unknown.length > 0) {
      throw new BadRequestException(`Unknown permissions: ${unknown.join(", ")}`);
    }

    return unique;
  }

  private async getRoleOrThrow(organizationId: string, id: string) {
    const role = await this.prisma.role.findFirst({
      where: { id, organizationId },
      select: ROLE_SELECT,
    });

    if (!role) {
      throw new NotFoundException("Role not found.");
    }

    return role;
  }

  private async assertNotRemovingLastFullAccessRole(organizationId: string, roleId: string): Promise<void> {
    const members = await this.prisma.organizationMember.findMany({
      where: {
        organizationId,
        status: "ACTIVE",
        roleId: { not: roleId },
      },
      select: { role: { select: { permissions: true } } },
    });

    if (!members.some((member) => hasPermission(member.role.permissions, PERMISSIONS.admin.fullAccess))) {
      throw new ForbiddenException("Cannot remove full access from the last active full-access role.");
    }
  }

  private toRoleResponse(role: RoleSelectResult) {
    const { _count, ...rest } = role;
    return { ...rest, permissions: normalizePermissions(rest.permissions), memberCount: _count.members };
  }
}

const ROLE_SELECT = {
  id: true,
  organizationId: true,
  name: true,
  permissions: true,
  isSystem: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { members: true } },
} satisfies Prisma.RoleSelect;

type RoleSelectResult = Prisma.RoleGetPayload<{ select: typeof ROLE_SELECT }>;
