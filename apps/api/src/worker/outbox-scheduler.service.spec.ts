import { ConfigService } from "@nestjs/config";
import { boundedWorkerInteger, OutboxSchedulerService } from "./outbox-scheduler.service";

function setup(values: Record<string, string> = {}) {
  const prisma = { organization: { findMany: jest.fn().mockResolvedValue([{ id: "org-a" }]) } };
  const email = { process: jest.fn().mockResolvedValue({}) };
  const billing = { processDueTransitions: jest.fn().mockResolvedValue({}), processDuePlanChanges: jest.fn().mockResolvedValue({}) };
  const webhooks = { processPending: jest.fn().mockResolvedValue({}) };
  const scheduler = new OutboxSchedulerService(prisma as never, new ConfigService(values), email as never, billing as never, webhooks as never);
  return { scheduler, prisma, email, billing, webhooks };
}
const emailEnabled = { LEDGERBYTE_EMAIL_RETRY_WORKER_ENABLED: "true", LEDGERBYTE_EMAIL_RETRY_PROCESSOR_ENABLED: "true" };

describe("production worker scheduling", () => {
  it("performs no DB or provider work when the independent gates are disabled", async () => {
    const s = setup();
    await s.scheduler.tick();
    expect(s.prisma.organization.findMany).not.toHaveBeenCalled();
    expect(s.email.process).not.toHaveBeenCalled();
    expect(s.webhooks.processPending).not.toHaveBeenCalled();
  });
  it("does not impersonate a user and bounds the email batch", async () => {
    const s = setup(emailEnabled);
    await s.scheduler.tick();
    expect(s.email.process).toHaveBeenCalledWith("org-a", undefined, 1);
    expect(s.prisma.organization.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 10 }));
  });
  it("does not overlap ticks or start another task after shutdown", async () => {
    const s = setup(emailEnabled);
    let finish!: () => void;
    s.email.process.mockImplementation(() => new Promise<void>((resolve) => { finish = resolve; }));
    const active = s.scheduler.tick();
    await Promise.resolve();
    expect(await s.scheduler.tick()).toEqual({ skipped: true, emailOrganizations: 0 });
    finish(); await active;
    const abort = new AbortController(); abort.abort();
    expect((await s.scheduler.tick(abort.signal)).skipped).toBe(true);
    expect(s.email.process).toHaveBeenCalledTimes(1);
  });
  it("advances the tenant cursor after a failure so one tenant cannot starve others", async () => {
    const s = setup(emailEnabled);
    s.email.process.mockRejectedValueOnce(new Error("provider unavailable"));
    await expect(s.scheduler.tick()).rejects.toThrow();
    s.prisma.organization.findMany.mockResolvedValueOnce([]);
    await s.scheduler.tick();
    expect(s.prisma.organization.findMany.mock.calls[1]?.[0].where.id).toEqual({ gt: "org-a" });
    await s.scheduler.tick();
    expect(s.prisma.organization.findMany.mock.calls[2]?.[0].where.id).toBeUndefined();
  });
  it("runs billing work sequentially behind its own gate", async () => {
    const s = setup({ LEDGERBYTE_BILLING_WORKER_ENABLED: "true" });
    await s.scheduler.tick();
    expect(s.webhooks.processPending).toHaveBeenCalledWith({ batchSize: 25 });
    expect(s.billing.processDueTransitions.mock.invocationCallOrder[0]).toBeGreaterThan(s.webhooks.processPending.mock.invocationCallOrder[0]!);
    expect(s.billing.processDuePlanChanges.mock.invocationCallOrder[0]).toBeGreaterThan(s.billing.processDueTransitions.mock.invocationCallOrder[0]!);
    expect(s.email.process).not.toHaveBeenCalled();
  });
  it.each(["0", "-1", "NaN", "11", "1.5"])("rejects invalid batch bound %s", (value) => {
    expect(() => boundedWorkerInteger(value, 1, 10)).toThrow();
  });
});
