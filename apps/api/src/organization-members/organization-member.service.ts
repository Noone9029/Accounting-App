import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { MembershipStatus, Prisma } from "@prisma/client";
import { hasPermission, normalizePermissions, PERMISSIONS } from "@ledgerbyte/shared";
import { AuditLogService } from "../audit-log/audit-log.service";
import { PrismaService } from "../prisma/prisma.service";
import { InviteOrganizationMemberDto } from "./dto/invite-organization-member.dto";
import { UpdateOrganizationMemberRoleDto } from "./dto/update-organization-member-role.dto";
import { UpdateOrganizationMemberStatusDto } from "./dto/update-organization-member-status.dto";

@Injectable()
export class OrganizationMemberService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async list(organizationId: string) {
    const members = await this.prisma.organizationMember.findMany({
      where: { organizationId },
      orderBy: [{ status: "asc" }, { user: { name: "asc" } }],
      select: MEMBER_SELECT,
    });

    return members.map(toMemberResponse);
  }

  async get(organizationId: string, id: string) {
    return toMemberResponse(await this.getMemberOrThrow(organizationId, id));
  }

  async updateRole(organizationId: string, actorUserId: string, id: string, dto: UpdateOrganizationMemberRoleDto) {
    const member = await this.getMemberOrThrow(organizationId, id);
    const role = await this.getRoleOrThrow(organizationId, dto.roleId);

    if (member.status === MembershipStatus.ACTIVE) {
      if (isFullAccessRole(member.role.permissions) && !isFullAccessRole(role.permissions)) {
        await this.assertOtherActiveFullAccessMember(organizationId, member.id);
      }

      if (isUserManagerRole(member.role.permissions) && !isUserManagerRole(role.permissions)) {
        await this.assertOtherActiveUserManager(organizationId, member.id);
      }

      if (member.userId === actorUserId && isUserManagerRole(member.role.permissions) && !isUserManagerRole(role.permissions)) {
        await this.assertOtherActiveUserManager(organizationId, member.id);
      }
    }

    const updated = await this.prisma.organizationMember.update({
      where: { id },
      data: { roleId: role.id },
      select: MEMBER_SELECT,
    });

    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action: "UPDATE_ROLE",
      entityType: "OrganizationMember",
      entityId: id,
      before: member,
      after: updated,
    });

    return toMemberResponse(updated);
  }

  async updateStatus(organizationId: string, actorUserId: string, id: string, dto: UpdateOrganizationMemberStatusDto) {
    const member = await this.getMemberOrThrow(organizationId, id);

    if (member.status === dto.status) {
      return toMemberResponse(member);
    }

    if (member.status === MembershipStatus.ACTIVE && dto.status !== MembershipStatus.ACTIVE) {
      if (isFullAccessRole(member.role.permissions)) {
        await this.assertOtherActiveFullAccessMember(organizationId, member.id);
      }

      if (isUserManagerRole(member.role.permissions)) {
        await this.assertOtherActiveUserManager(organizationId, member.id);
      }
    }

    const updated = await this.prisma.organizationMember.update({
      where: { id },
      data: { status: dto.status },
      select: MEMBER_SELECT,
    });

    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action: "UPDATE_STATUS",
      entityType: "OrganizationMember",
      entityId: id,
      before: member,
      after: updated,
    });

    return toMemberResponse(updated);
  }

  async invite(organizationId: string, actorUserId: string, dto: InviteOrganizationMemberDto) {
    const email = dto.email.toLowerCase().trim();
    const role = await this.getRoleOrThrow(organizationId, dto.roleId);
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, name: true },
    });

    if (!user) {
      throw new BadRequestException("Email invite delivery is not implemented. Create the user first or add email provider later.");
    }

    try {
      const member = await this.prisma.organizationMember.create({
        data: {
          organizationId,
          userId: user.id,
          roleId: role.id,
          status: MembershipStatus.INVITED,
        },
        select: MEMBER_SELECT,
      });

      await this.auditLogService.log({
        organizationId,
        actorUserId,
        action: "INVITE_PLACEHOLDER",
        entityType: "OrganizationMember",
        entityId: member.id,
        after: member,
      });

      return {
        message: "Invite placeholder created. Email invitations are not connected yet.",
        member: toMemberResponse(member),
      };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ConflictException("User already belongs to this organization.");
      }
      throw error;
    }
  }

  private async getMemberOrThrow(organizationId: string, id: string) {
    const member = await this.prisma.organizationMember.findFirst({
      where: { id, organizationId },
      select: MEMBER_SELECT,
    });

    if (!member) {
      throw new NotFoundException("Organization member not found.");
    }

    return member;
  }

  private async getRoleOrThrow(organizationId: string, id: string) {
    const role = await this.prisma.role.findFirst({
      where: { id, organizationId },
      select: {
        id: true,
        permissions: true,
      },
    });

    if (!role) {
      throw new NotFoundException("Role not found.");
    }

    return role;
  }

  private async assertOtherActiveFullAccessMember(organizationId: string, excludedMemberId: string): Promise<void> {
    const members = await this.getOtherActiveMembers(organizationId, excludedMemberId);

    if (!members.some((member) => isFullAccessRole(member.role.permissions))) {
      throw new ForbiddenException("Cannot remove the last active full-access member.");
    }
  }

  private async assertOtherActiveUserManager(organizationId: string, excludedMemberId: string): Promise<void> {
    const members = await this.getOtherActiveMembers(organizationId, excludedMemberId);

    if (!members.some((member) => isUserManagerRole(member.role.permissions))) {
      throw new ForbiddenException("Cannot leave the organization without an active user manager.");
    }
  }

  private getOtherActiveMembers(organizationId: string, excludedMemberId: string) {
    return this.prisma.organizationMember.findMany({
      where: {
        organizationId,
        status: MembershipStatus.ACTIVE,
        id: { not: excludedMemberId },
      },
      select: { role: { select: { permissions: true } } },
    });
  }
}

const MEMBER_SELECT = {
  id: true,
  organizationId: true,
  userId: true,
  roleId: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  user: { select: { id: true, email: true, name: true, createdAt: true } },
  role: { select: { id: true, name: true, permissions: true, isSystem: true } },
} satisfies Prisma.OrganizationMemberSelect;

type MemberSelectResult = Prisma.OrganizationMemberGetPayload<{ select: typeof MEMBER_SELECT }>;

function toMemberResponse(member: MemberSelectResult) {
  return {
    ...member,
    role: {
      ...member.role,
      permissions: normalizePermissions(member.role.permissions),
    },
  };
}

function isFullAccessRole(permissions: unknown): boolean {
  return hasPermission(permissions, PERMISSIONS.admin.fullAccess);
}

function isUserManagerRole(permissions: unknown): boolean {
  return isFullAccessRole(permissions) || hasPermission(permissions, PERMISSIONS.users.manage);
}
