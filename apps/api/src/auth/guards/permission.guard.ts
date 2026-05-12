import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { MembershipStatus } from "@prisma/client";
import { hasAnyPermission, type Permission } from "@ledgerbyte/shared";
import { PrismaService } from "../../prisma/prisma.service";
import type { AuthenticatedRequest } from "../auth.types";
import { REQUIRED_PERMISSIONS_KEY } from "../decorators/require-permissions.decorator";

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(REQUIRED_PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    if (!request.user || !request.organizationId) {
      throw new ForbiddenException("Authentication and organization context are required.");
    }

    const membership = await this.prisma.organizationMember.findFirst({
      where: {
        organizationId: request.organizationId,
        userId: request.user.id,
        status: MembershipStatus.ACTIVE,
      },
      select: {
        id: true,
        role: { select: { id: true, name: true, permissions: true } },
      },
    });

    if (!membership) {
      throw new ForbiddenException("You do not have access to this organization.");
    }

    request.membership = {
      id: membership.id,
      role: {
        id: membership.role.id,
        name: membership.role.name,
        permissions: membership.role.permissions,
      },
    };

    if (hasAnyPermission(membership.role.permissions, requiredPermissions)) {
      return true;
    }

    throw new ForbiddenException("You do not have permission to perform this action.");
  }
}
