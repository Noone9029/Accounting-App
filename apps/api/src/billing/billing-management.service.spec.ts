import { BadRequestException, NotFoundException } from "@nestjs/common";
import { BillingManagementService } from "./billing-management.service";

describe("BillingManagementService", () => {
  function harness() {
    const prisma = { organizationBillingAccount: { findFirst: jest.fn() }, billingPlanVersion: { findFirst: jest.fn() }, organizationSubscription: { findFirst: jest.fn() } };
    const entitlements = { organizationAccessMode: jest.fn().mockResolvedValue({ accessMode: "FULL", enforcementMode: "DISABLED" }) };
    const lifecycle = { transition: jest.fn(), schedulePlanChange: jest.fn() };
    const providers = { active: jest.fn(() => ({ readiness: () => ({ status: "DISABLED" }) })) };
    return { service: new BillingManagementService(prisma as never, entitlements as never, lifecycle as never, providers as never), prisma, lifecycle };
  }
  it("does not expose prices or provider identifiers from the plan catalog", async () => {
    const { service, prisma } = harness();
    prisma.billingPlanVersion.findFirst.mockResolvedValue(null);
    (prisma as any).billingPlan = { findMany: jest.fn().mockResolvedValue([{ key: "STARTER", displayName: "Starter", versions: [{ id: "plan-v1", entitlements: [] }] }]) };
    await expect(service.availablePlans()).resolves.toEqual([{ key: "STARTER", displayName: "Starter", planVersionId: "plan-v1", entitlements: [] }]);
  });
  it("returns a disabled preparation result instead of creating checkout provider activity", async () => {
    const { service, prisma } = harness();
    prisma.billingPlanVersion.findFirst.mockResolvedValue({ id: "plan-v1", billingPlan: { key: "STARTER" } });
    await expect(service.prepareCheckout("tenant-a", "plan-v1", "plans")).resolves.toMatchObject({ prepared: false, reasonCode: "BILLING_PROVIDER_EXECUTION_DISABLED" });
  });
  it("rejects a foreign or missing subscription before lifecycle mutation", async () => {
    const { service, prisma, lifecycle } = harness();
    prisma.organizationSubscription.findFirst.mockResolvedValue(null);
    await expect(service.reactivate("tenant-a", "foreign-subscription", 1, "retry-1", "user-a")).rejects.toBeInstanceOf(NotFoundException);
    expect(lifecycle.transition).not.toHaveBeenCalled();
  });
  it("rejects unavailable plan changes before the lifecycle service", async () => {
    const { service, prisma, lifecycle } = harness();
    prisma.organizationSubscription.findFirst.mockResolvedValue({ id: "sub-1", organizationId: "tenant-a" });
    prisma.billingPlanVersion.findFirst.mockResolvedValue(null);
    await expect(service.schedulePlanChange("tenant-a", "sub-1", 1, "bad-plan", new Date("2026-08-01"), "change-1", "user-a")).rejects.toBeInstanceOf(BadRequestException);
    expect(lifecycle.schedulePlanChange).not.toHaveBeenCalled();
  });
  it("rejects an invalid plan-change time before looking up billing state", async () => {
    const { service, prisma } = harness();
    await expect(service.schedulePlanChange("tenant-a", "sub-1", 1, "plan-v2", new Date("invalid"), "change-1", "user-a")).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.organizationSubscription.findFirst).not.toHaveBeenCalled();
  });
});
