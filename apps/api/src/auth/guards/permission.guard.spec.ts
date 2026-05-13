import { ForbiddenException } from "@nestjs/common";
import type { ExecutionContext } from "@nestjs/common";
import type { Reflector } from "@nestjs/core";
import { PERMISSIONS } from "@ledgerbyte/shared";
import { PermissionGuard } from "./permission.guard";

describe("PermissionGuard", () => {
  function makeGuard(requiredPermissions: string[], permissions: unknown, membershipId = "member-1") {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(requiredPermissions),
    } as unknown as Reflector;
    const prisma = {
      organizationMember: {
        findFirst: jest.fn().mockResolvedValue(
          membershipId
            ? {
                id: membershipId,
                role: { id: "role-1", name: "Role", permissions },
              }
            : null,
        ),
      },
    };
    const guard = new PermissionGuard(reflector, prisma as never);
    const request = {
      user: { id: "user-1", email: "user@example.com" },
      organizationId: "org-1",
    };
    const context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;

    return { guard, prisma, request, context };
  }

  it("allows admin.fullAccess", async () => {
    const { guard, context } = makeGuard([PERMISSIONS.reports.view], [PERMISSIONS.admin.fullAccess]);

    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it("allows a specific permission", async () => {
    const { guard, context } = makeGuard([PERMISSIONS.salesInvoices.finalize], [PERMISSIONS.salesInvoices.finalize]);

    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it("rejects missing permissions with a clear 403 message", async () => {
    const { guard, context } = makeGuard([PERMISSIONS.reports.view], [PERMISSIONS.salesInvoices.view]);

    await expect(guard.canActivate(context)).rejects.toThrow(
      new ForbiddenException("You do not have permission to perform this action."),
    );
  });

  it("rejects reports without reports.view", async () => {
    const { guard, context } = makeGuard([PERMISSIONS.reports.view], [PERMISSIONS.accounts.view]);

    await expect(guard.canActivate(context)).rejects.toThrow("You do not have permission to perform this action.");
  });

  it("rejects invoice finalization without salesInvoices.finalize", async () => {
    const { guard, context } = makeGuard([PERMISSIONS.salesInvoices.finalize], [PERMISSIONS.salesInvoices.view]);

    await expect(guard.canActivate(context)).rejects.toThrow("You do not have permission to perform this action.");
  });

  it("rejects customer payment void without customerPayments.void", async () => {
    const { guard, context } = makeGuard([PERMISSIONS.customerPayments.void], [PERMISSIONS.customerPayments.create]);

    await expect(guard.canActivate(context)).rejects.toThrow("You do not have permission to perform this action.");
  });

  it("rejects purchase bill finalization without purchaseBills.finalize", async () => {
    const { guard, context } = makeGuard([PERMISSIONS.purchaseBills.finalize], [PERMISSIONS.purchaseBills.view]);

    await expect(guard.canActivate(context)).rejects.toThrow("You do not have permission to perform this action.");
  });

  it("rejects purchase order conversion without purchaseOrders.convertToBill", async () => {
    const { guard, context } = makeGuard([PERMISSIONS.purchaseOrders.convertToBill], [PERMISSIONS.purchaseOrders.view]);

    await expect(guard.canActivate(context)).rejects.toThrow("You do not have permission to perform this action.");
  });

  it("rejects bank account transaction visibility without bankAccounts.transactions.view", async () => {
    const { guard, context } = makeGuard([PERMISSIONS.bankAccounts.transactionsView], [PERMISSIONS.bankAccounts.view]);

    await expect(guard.canActivate(context)).rejects.toThrow("You do not have permission to perform this action.");
  });

  it("rejects bank transfer creation without bankTransfers.create", async () => {
    const { guard, context } = makeGuard([PERMISSIONS.bankTransfers.create], [PERMISSIONS.bankTransfers.view]);

    await expect(guard.canActivate(context)).rejects.toThrow("You do not have permission to perform this action.");
  });

  it("rejects fiscal locks without fiscalPeriods.lock or fiscalPeriods.manage", async () => {
    const { guard, context } = makeGuard([PERMISSIONS.fiscalPeriods.lock, PERMISSIONS.fiscalPeriods.manage], [
      PERMISSIONS.fiscalPeriods.view,
    ]);

    await expect(guard.canActivate(context)).rejects.toThrow("You do not have permission to perform this action.");
  });

  it("allows fiscal locks with fiscalPeriods.manage", async () => {
    const { guard, context } = makeGuard([PERMISSIONS.fiscalPeriods.lock, PERMISSIONS.fiscalPeriods.manage], [
      PERMISSIONS.fiscalPeriods.manage,
    ]);

    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it("rejects ZATCA management without zatca.manage", async () => {
    const { guard, context } = makeGuard([PERMISSIONS.zatca.manage], [PERMISSIONS.zatca.view]);

    await expect(guard.canActivate(context)).rejects.toThrow("You do not have permission to perform this action.");
  });

  it("keeps tenant isolation by loading the current user's active membership for the current organization", async () => {
    const { guard, prisma, context } = makeGuard([PERMISSIONS.reports.view], [], "");

    await expect(guard.canActivate(context)).rejects.toThrow("You do not have access to this organization.");
    expect(prisma.organizationMember.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          organizationId: "org-1",
          userId: "user-1",
          status: "ACTIVE",
        },
      }),
    );
  });
});
