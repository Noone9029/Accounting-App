import { BadRequestException, ForbiddenException } from "@nestjs/common";
import type { ExecutionContext } from "@nestjs/common";
import { MembershipStatus } from "@prisma/client";
import { OrganizationContextGuard } from "./organization-context.guard";

describe("OrganizationContextGuard", () => {
  function makeGuard(input: { userId?: string; organizationHeader?: string | string[]; membershipId?: string | null }) {
    const prisma = {
      organizationMember: {
        findFirst: jest.fn().mockResolvedValue(input.membershipId ? { id: input.membershipId } : null),
      },
    };
    const guard = new OrganizationContextGuard(prisma as never);
    const request = {
      headers: input.organizationHeader === undefined ? {} : { "x-organization-id": input.organizationHeader },
      user: input.userId ? { id: input.userId, email: "user@example.com" } : undefined,
      organizationId: undefined as string | undefined,
    };
    const context = {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;

    return { guard, prisma, request, context };
  }

  it("rejects requests before trusting an organization header when no user is authenticated", async () => {
    const { guard, prisma, context } = makeGuard({
      organizationHeader: "org-a",
      membershipId: "member-a",
    });

    await expect(guard.canActivate(context)).rejects.toThrow(new ForbiddenException("Authentication is required."));
    expect(prisma.organizationMember.findFirst).not.toHaveBeenCalled();
  });

  it("requires an organization header before loading membership", async () => {
    const { guard, prisma, context } = makeGuard({
      userId: "user-a",
      membershipId: "member-a",
    });

    await expect(guard.canActivate(context)).rejects.toThrow(new BadRequestException("x-organization-id header is required."));
    expect(prisma.organizationMember.findFirst).not.toHaveBeenCalled();
  });

  it("rejects an organization header for a user without active membership", async () => {
    const { guard, prisma, request, context } = makeGuard({
      userId: "user-a",
      organizationHeader: "org-b",
      membershipId: null,
    });

    await expect(guard.canActivate(context)).rejects.toThrow(
      new ForbiddenException("You do not have access to this organization."),
    );
    expect(prisma.organizationMember.findFirst).toHaveBeenCalledWith({
      where: {
        organizationId: "org-b",
        userId: "user-a",
        status: MembershipStatus.ACTIVE,
      },
      select: { id: true },
    });
    expect(request.organizationId).toBeUndefined();
  });

  it("trusts only the first organization header value after active membership is proven", async () => {
    const { guard, prisma, request, context } = makeGuard({
      userId: "user-a",
      organizationHeader: ["org-a", "org-b"],
      membershipId: "member-a",
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(prisma.organizationMember.findFirst).toHaveBeenCalledWith({
      where: {
        organizationId: "org-a",
        userId: "user-a",
        status: MembershipStatus.ACTIVE,
      },
      select: { id: true },
    });
    expect(request.organizationId).toBe("org-a");
  });
});
