import { ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AuthTokenPurpose, MembershipStatus, Prisma } from "@prisma/client";
import { hasPermission, normalizePermissions, PERMISSIONS } from "@ledgerbyte/shared";
import * as bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { AuditLogService } from "../audit-log/audit-log.service";
import { AuthTokenRateLimitService, type AuthTokenDeliveryRequestMeta } from "../auth/auth-token-rate-limit.service";
import { AuthTokenService } from "../auth/auth-token.service";
import { EmailService } from "../email/email.service";
import { PrismaService } from "../prisma/prisma.service";
import { InviteOrganizationMemberDto } from "./dto/invite-organization-member.dto";
import { UpdateOrganizationMemberRoleDto } from "./dto/update-organization-member-role.dto";
import { UpdateOrganizationMemberStatusDto } from "./dto/update-organization-member-status.dto";

@Injectable()
export class OrganizationMemberService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
    private readonly authTokenService: AuthTokenService,
    private readonly authTokenRateLimitService: AuthTokenRateLimitService,
    private readonly emailService: EmailService,
    private readonly config: ConfigService,
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

  async invite(organizationId: string, actorUserId: string, dto: InviteOrganizationMemberDto, requestMeta: AuthTokenDeliveryRequestMeta = {}) {
    const email = dto.email.toLowerCase().trim();
    const role = await this.getRoleOrThrow(organizationId, dto.roleId);
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { id: true, name: true },
    });

    if (!organization) {
      throw new NotFoundException("Organization not found.");
    }

    const existingUserForRateLimit = await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        memberships: {
          where: { organizationId },
          select: { id: true, status: true },
          take: 1,
        },
      },
    });

    const existingMembership = existingUserForRateLimit?.memberships?.[0];
    if (existingMembership?.status === MembershipStatus.ACTIVE) {
      throw new ConflictException("User already belongs to this organization.");
    }

    await this.authTokenRateLimitService.assertInviteAllowed({
      organizationId,
      email,
      ipAddress: requestMeta.ipAddress,
      userAgent: requestMeta.userAgent,
    });

    const invite = await this.prisma.$transaction(async (tx) => {
      let user = await tx.user.findUnique({
        where: { email },
        select: { id: true, email: true, name: true },
      });

      if (!user) {
        const placeholderPasswordHash = await bcrypt.hash(randomBytes(32).toString("hex"), 12);
        user = await tx.user.create({
          data: {
            email,
            name: dto.name?.trim() || email.split("@")[0] || "Invited user",
            passwordHash: placeholderPasswordHash,
          },
          select: { id: true, email: true, name: true },
        });
      }

      const existingMember = await tx.organizationMember.findUnique({
        where: { organizationId_userId: { organizationId, userId: user.id } },
        select: { id: true, status: true },
      });

      if (existingMember?.status === MembershipStatus.ACTIVE) {
        throw new ConflictException("User already belongs to this organization.");
      }

      const member = existingMember
        ? await tx.organizationMember.update({
            where: { id: existingMember.id },
            data: { roleId: role.id, status: MembershipStatus.INVITED },
            select: MEMBER_SELECT,
          })
        : await tx.organizationMember.create({
            data: {
              organizationId,
              userId: user.id,
              roleId: role.id,
              status: MembershipStatus.INVITED,
            },
            select: MEMBER_SELECT,
          });

      const { rawToken } = await this.authTokenService.create(
        {
          organizationId,
          userId: user.id,
          email,
          purpose: AuthTokenPurpose.ORGANIZATION_INVITE,
          expiresAt: new Date(Date.now() + INVITE_TTL_MS),
          createdById: actorUserId,
        },
        tx,
      );

      return { member, rawToken };
    });

    const invitePreviewUrl = this.buildWebUrl(`/invite/accept?token=${encodeURIComponent(invite.rawToken)}`);
    const emailOutbox = await this.emailService.sendOrganizationInvite({
      organizationId,
      toEmail: email,
      organizationName: organization.name,
      roleName: role.name,
      acceptUrl: invitePreviewUrl,
    });

    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action: "INVITE_EMAIL",
      entityType: "OrganizationMember",
      entityId: invite.member.id,
      after: invite.member,
    });

    return {
      message: "Invite email queued through the mock email provider.",
      member: toMemberResponse(invite.member),
      emailOutboxId: emailOutbox.id,
      ...(this.emailService.isMockProvider ? { invitePreviewUrl } : {}),
    };
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
        name: true,
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

  private buildWebUrl(path: string): string {
    const baseUrl = this.config.get<string>("APP_WEB_URL")?.trim() || "http://localhost:3000";
    return `${baseUrl.replace(/\/$/, "")}${path}`;
  }
}

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

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
