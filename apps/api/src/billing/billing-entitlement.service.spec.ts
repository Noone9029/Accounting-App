import { ForbiddenException } from "@nestjs/common";
import { BillingEntitlementService } from "./billing-entitlement.service";
import { BILLING_ENTITLEMENT_KEYS } from "./billing-entitlement-registry";

describe("BillingEntitlementService", () => {
  function makeService(mode: string | undefined, overrides: Record<string, unknown> = {}) {
    const prisma = {
      organizationBillingAccount: { findFirst: jest.fn() },
      organizationMember: { count: jest.fn().mockResolvedValue(0) },
      ...overrides,
    };
    const config = { get: jest.fn(() => mode) };
    return { service: new BillingEntitlementService(prisma as never, config as never), prisma, config };
  }

  const activeAccount = (entitlements: Array<Record<string, unknown>>) => ({
    subscriptions: [{ status: "ACTIVE", planVersion: { entitlements } }],
  });

  it("preserves controlled-beta behavior while enforcement is disabled", async () => {
    const { service, prisma } = makeService(undefined);
    await expect(service.evaluate("org-a", BILLING_ENTITLEMENT_KEYS.activeMemberSeats)).resolves.toMatchObject({
      code: "ALLOW",
      enforcementMode: "DISABLED",
      subscriptionStatus: "MISSING",
    });
    expect(prisma.organizationBillingAccount.findFirst).not.toHaveBeenCalled();
  });

  it("observes missing billing setup without blocking", async () => {
    const { service, prisma } = makeService("OBSERVE");
    prisma.organizationBillingAccount.findFirst.mockResolvedValue(null);
    await expect(service.evaluate("org-a", BILLING_ENTITLEMENT_KEYS.coreAccounting)).resolves.toMatchObject({
      code: "ALLOW_OBSERVE_ONLY",
      enforcementMode: "OBSERVE",
    });
  });

  it("denies a missing billing account only in enforce mode", async () => {
    const { service, prisma } = makeService("ENFORCE");
    prisma.organizationBillingAccount.findFirst.mockResolvedValue(null);
    await expect(service.evaluate("org-a", BILLING_ENTITLEMENT_KEYS.coreAccounting)).resolves.toMatchObject({ code: "DENY_BILLING_STATE" });
  });

  it("honors an explicitly approved enforcement exemption", async () => {
    const { service, prisma } = makeService("ENFORCE");
    prisma.organizationBillingAccount.findFirst.mockResolvedValue({ enforcementExempt: true, subscriptions: [] });
    await expect(service.evaluate("org-a", BILLING_ENTITLEMENT_KEYS.coreAccounting)).resolves.toMatchObject({ code: "ALLOW" });
  });

  it("enforces seat limits using bounded active/invited membership usage", async () => {
    const { service, prisma } = makeService("ENFORCE");
    prisma.organizationBillingAccount.findFirst.mockResolvedValue(
      activeAccount([{ key: BILLING_ENTITLEMENT_KEYS.activeMemberSeats, valueType: "INTEGER", booleanValue: null, integerValue: 2, stringValue: null }]),
    );
    prisma.organizationMember.count.mockResolvedValue(2);
    await expect(service.assertSeatInvitationAllowed("org-a", prisma as never)).rejects.toThrow(ForbiddenException);
  });

  it("does not let a plan entitlement bypass an unavailable compliance operation", async () => {
    const { service, prisma } = makeService("ENFORCE");
    prisma.organizationBillingAccount.findFirst.mockResolvedValue(
      activeAccount([{ key: BILLING_ENTITLEMENT_KEYS.countryKsaModule, valueType: "BOOLEAN", booleanValue: true, integerValue: null, stringValue: null }]),
    );
    await expect(service.evaluate("org-a", BILLING_ENTITLEMENT_KEYS.countryKsaModule)).resolves.toMatchObject({
      code: "DENY_OPERATIONAL_READINESS",
    });
  });

  it("keeps organization decisions tenant-scoped", async () => {
    const { service, prisma } = makeService("ENFORCE");
    prisma.organizationBillingAccount.findFirst.mockImplementation(({ where }: { where: { organizationId: string } }) =>
      Promise.resolve(where.organizationId === "org-a" ? activeAccount([{ key: BILLING_ENTITLEMENT_KEYS.coreAccounting, valueType: "BOOLEAN", booleanValue: true, integerValue: null, stringValue: null }]) : null),
    );
    await expect(service.evaluate("org-a", BILLING_ENTITLEMENT_KEYS.coreAccounting)).resolves.toMatchObject({ code: "ALLOW" });
    await expect(service.evaluate("org-b", BILLING_ENTITLEMENT_KEYS.coreAccounting)).resolves.toMatchObject({ code: "DENY_BILLING_STATE" });
  });

  it("blocks a background mutation when enforced billing state is missing", async () => {
    const { service, prisma } = makeService("ENFORCE");
    prisma.organizationBillingAccount.findFirst.mockResolvedValue(null);
    await expect(service.assertBackgroundMutationAllowed("org-a", "job-1")).rejects.toThrow(ForbiddenException);
  });

  it("denies suspended organizations from mutating through the server-side entitlement check", async () => {
    const { service, prisma } = makeService("ENFORCE");
    prisma.organizationBillingAccount.findFirst.mockResolvedValue({
      enforcementExempt: false,
      subscriptions: [{ status: "SUSPENDED", currentPeriodEndsAt: null, planVersion: { entitlements: [] } }],
    });

    await expect(service.assertBackgroundMutationAllowed("org-a", "suspended-job")).rejects.toThrow(ForbiddenException);
  });

  it("keeps suspended tenants in read-only mode so billing and accounting reads remain available", async () => {
    const { service, prisma } = makeService("ENFORCE");
    prisma.organizationBillingAccount.findFirst.mockResolvedValue({
      enforcementExempt: false,
      subscriptions: [{ status: "SUSPENDED", currentPeriodEndsAt: null }],
    });

    await expect(service.organizationAccessMode("org-a")).resolves.toEqual({
      organizationId: "org-a",
      accessMode: "READ_ONLY",
      enforcementMode: "ENFORCE",
      subscriptionStatus: "SUSPENDED",
    });
  });

  it("preserves full access through cancellation period end and removes it afterwards", async () => {
    const { service, prisma } = makeService("ENFORCE");
    prisma.organizationBillingAccount.findFirst.mockResolvedValue({
      enforcementExempt: false,
      subscriptions: [{ status: "CANCEL_AT_PERIOD_END", currentPeriodEndsAt: new Date("2026-08-30T00:00:00.000Z"), planVersion: { entitlements: [{ key: BILLING_ENTITLEMENT_KEYS.coreAccounting, valueType: "BOOLEAN", booleanValue: true, integerValue: null, stringValue: null }] } }],
    });

    await expect(service.evaluate("org-a", BILLING_ENTITLEMENT_KEYS.coreAccounting, { now: new Date("2026-08-01T00:00:00.000Z") })).resolves.toMatchObject({ code: "ALLOW" });
    await expect(service.evaluate("org-a", BILLING_ENTITLEMENT_KEYS.coreAccounting, { now: new Date("2026-09-01T00:00:00.000Z") })).resolves.toMatchObject({ code: "DENY_BILLING_STATE" });
    await expect(service.organizationAccessMode("org-a", { now: new Date("2026-09-01T00:00:00.000Z") })).resolves.toMatchObject({ accessMode: "READ_ONLY" });
  });

  it("does not grant access from an uncertain cancellation record without a period end", async () => {
    const { service, prisma } = makeService("ENFORCE");
    prisma.organizationBillingAccount.findFirst.mockResolvedValue({
      enforcementExempt: false,
      subscriptions: [{ status: "CANCEL_AT_PERIOD_END", currentPeriodEndsAt: null, planVersion: { entitlements: [{ key: BILLING_ENTITLEMENT_KEYS.coreAccounting, valueType: "BOOLEAN", booleanValue: true, integerValue: null, stringValue: null }] } }],
    });

    await expect(service.evaluate("org-a", BILLING_ENTITLEMENT_KEYS.coreAccounting)).resolves.toMatchObject({ code: "DENY_BILLING_STATE" });
    await expect(service.organizationAccessMode("org-a")).resolves.toMatchObject({ accessMode: "READ_ONLY" });
  });
});
