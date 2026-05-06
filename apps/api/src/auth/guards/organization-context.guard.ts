import { BadRequestException, CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { MembershipStatus } from "@prisma/client";
import type { AuthenticatedRequest } from "../auth.types";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class OrganizationContextGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const organizationIdHeader = request.headers["x-organization-id"];
    const organizationId = Array.isArray(organizationIdHeader) ? organizationIdHeader[0] : organizationIdHeader;

    if (!request.user) {
      throw new ForbiddenException("Authentication is required.");
    }

    if (!organizationId) {
      throw new BadRequestException("x-organization-id header is required.");
    }

    const membership = await this.prisma.organizationMember.findFirst({
      where: {
        organizationId,
        userId: request.user.id,
        status: MembershipStatus.ACTIVE,
      },
      select: { id: true },
    });

    if (!membership) {
      throw new ForbiddenException("You do not have access to this organization.");
    }

    request.organizationId = organizationId;
    return true;
  }
}
