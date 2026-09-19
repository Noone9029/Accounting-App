import { createHash, randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { AuditLogService } from "../audit-log/audit-log.service";
import { BillingEntitlementService } from "./billing-entitlement.service";
import { SelfServiceBillingService } from "./self-service-billing.service";
import { LoginThrottleService } from "../auth/login-throttle.service";

const enabled = process.env.LEDGERBYTE_RUN_LOCAL_DB_INTEGRATION === "true";
(enabled ? describe : describe.skip)("self-service trial with the migrated launch catalog", () => {
  const prisma = new PrismaClient();
  if (!enabled) void prisma.$disconnect();
  const org = randomUUID(), owner = randomUUID(), role = randomUUID();
  const members = [randomUUID(), randomUUID()];
  const marker = `self-service-proof-${randomUUID()}`;
  const config = { get: (key: string) => ({ LEDGERBYTE_SELF_SERVICE_ENABLED: "true", BILLING_ENFORCEMENT_MODE: "ENFORCE" } as Record<string, string>)[key] };
  const trials = new SelfServiceBillingService(prisma as never, config as never, new AuditLogService(prisma as never));
  const access = new BillingEntitlementService(prisma as never, config as never);
  const signupEmail = `${marker}@example.test`;
  const signupIp = "127.0.0.1";
  const signupHashes = [
    `EMAIL:registration:${signupEmail}`,
    `IP:registration:${signupIp}`,
    `EMAIL_IP:registration:${signupEmail}|registration:${signupIp}`,
  ].map((key) => createHash("sha256").update(`${marker}:${key}`).digest("hex"));
  beforeAll(async () => {
    await prisma.organization.create({ data: { id: org, name: marker, countryCode: "SA", baseCurrency: "SAR" } });
    await prisma.user.create({ data: { id: owner, email: `${marker}@example.test`, name: "Synthetic owner", passwordHash: "synthetic-only" } });
    await prisma.role.create({ data: { id: role, organizationId: org, name: "Owner", permissions: ["admin.full_access"] } });
    await prisma.organizationMember.create({ data: { organizationId: org, userId: owner, roleId: role, status: "ACTIVE" } });
  });
  afterAll(async () => {
    await prisma.loginRateLimit.deleteMany({ where: { keyHash: { in: signupHashes } } });
    await prisma.auditLog.deleteMany({ where: { organizationId: org } });
    await prisma.billingLifecycleEvent.deleteMany({ where: { organizationId: org } });
    await prisma.organizationSubscription.deleteMany({ where: { organizationId: org } });
    await prisma.organizationBillingAccount.deleteMany({ where: { organizationId: org } });
    await prisma.organizationMember.deleteMany({ where: { organizationId: org } });
    await prisma.role.deleteMany({ where: { organizationId: org } });
    await prisma.user.deleteMany({ where: { id: { in: [owner, ...members] } } });
    await prisma.organization.deleteMany({ where: { id: org } });
    await prisma.$disconnect();
  });
  it("atomically bounds concurrent signup work using the existing persistent rate-limit table", async () => {
    const throttle = new LoginThrottleService(prisma as never, { get: (key: string) => key === "LOGIN_THROTTLE_PEPPER" ? marker : undefined } as never);
    const outcomes = await Promise.all(Array.from({ length: 5 }, () => throttle.reserveRegistration({ email: signupEmail, ipAddress: signupIp })));
    expect(outcomes.filter((result) => result.allowed)).toHaveLength(3);
    expect(outcomes.filter((result) => !result.allowed)).toHaveLength(2);
    expect(await prisma.loginRateLimit.count({ where: { keyHash: { in: signupHashes }, attempts: 3 } })).toBe(3);
  });
  it("requires verification, starts one trial under concurrent replay, and expires safely with the worker stopped", async () => {
    await expect(trials.startTrial(org, owner, "STARTER")).rejects.toThrow("verify their email");
    await expect(access.organizationAccessMode(org)).resolves.toMatchObject({ accessMode: "BILLING_ONLY" });
    await prisma.user.update({ where: { id: owner }, data: { emailVerifiedAt: new Date() } });
    const outcomes = await Promise.allSettled([trials.startTrial(org, owner, "STARTER"), trials.startTrial(org, owner, "STARTER")]);
    expect(outcomes.some((outcome) => outcome.status === "fulfilled")).toBe(true);
    const replay = await trials.startTrial(org, owner, "STARTER");
    expect(replay.replay).toBe(true);
    expect(await prisma.organizationSubscription.count({ where: { organizationId: org } })).toBe(1);
    expect(await prisma.billingLifecycleEvent.count({ where: { organizationId: org, eventType: "TRIAL_STARTED" } })).toBe(1);
    const subscription = await prisma.organizationSubscription.findUniqueOrThrow({ where: { id: replay.id }, include: { planVersion: { include: { billingPlan: true } } } });
    expect(subscription.planVersion.version).toBe(20260919);
    expect(subscription.planVersion.billingPlan.key).toBe("STARTER");
    expect(subscription.trialEndsAt!.getTime() - subscription.trialStartedAt!.getTime()).toBe(14 * 86400000);
    await expect(access.organizationAccessMode(org)).resolves.toMatchObject({ accessMode: "FULL" });
    await prisma.user.createMany({ data: members.map((id, index) => ({ id, email: `${marker}-${index}@example.test`, name: "Synthetic invite", passwordHash: "synthetic-only" })) });
    await prisma.organizationMember.createMany({ data: members.map((userId) => ({ organizationId: org, userId, roleId: role, status: "INVITED" as const })) });
    await expect(prisma.$transaction((tx) => access.assertSeatInvitationAllowed(org, tx))).rejects.toThrow("another member");
    const expiry = new Date(Date.now() - 1000);
    await prisma.organizationSubscription.update({ where: { id: replay.id }, data: { trialStartedAt: new Date(expiry.getTime() - 14 * 86400000), trialEndsAt: expiry } });
    // Deliberately do not run lifecycle workers: request-time checks own this boundary.
    await expect(access.organizationAccessMode(org)).resolves.toMatchObject({ accessMode: "READ_ONLY", subscriptionStatus: "TRIALING" });
    await expect(access.assertBackgroundMutationAllowed(org)).rejects.toThrow("does not allow");
    await expect(trials.startTrial(org, owner, "GROWTH")).resolves.toMatchObject({ id: replay.id, trialEndsAt: expiry, replay: true });
    expect(await prisma.billingProviderCustomer.count({ where: { billingAccount: { organizationId: org } } })).toBe(0);
    expect(await prisma.journalEntry.count({ where: { organizationId: org } })).toBe(0);
  });
});
