import { ServiceUnavailableException, UnauthorizedException } from "@nestjs/common";
import { RecurringWorkerController } from "./recurring-worker.controller";

describe("RecurringWorkerController", () => {
  it("fails closed when the cron secret is absent or invalid", async () => {
    const runs = { processDue: jest.fn() };
    const missing = new RecurringWorkerController(runs as never, { get: jest.fn() } as never);
    expect(() => missing.process("Bearer anything")).toThrow(ServiceUnavailableException);
    const configured = new RecurringWorkerController(runs as never, { get: jest.fn().mockReturnValue("cron-test-secret") } as never);
    expect(() => configured.process("Bearer wrong-secret")).toThrow(UnauthorizedException);
    expect(runs.processDue).not.toHaveBeenCalled();
  });

  it("runs one bounded durable batch for an authenticated scheduler", async () => {
    const runs = { processDue: jest.fn().mockResolvedValue({ recoveredRuns: 0, preparedRuns: 2 }) };
    const controller = new RecurringWorkerController(runs as never, { get: jest.fn().mockReturnValue("cron-test-secret") } as never);
    await expect(controller.process("Bearer cron-test-secret")).resolves.toEqual({ recoveredRuns: 0, preparedRuns: 2 });
    expect(runs.processDue).toHaveBeenCalledWith(expect.objectContaining({ workerClaimId: expect.stringMatching(/^vercel-cron:/), limit: 25 }));
  });
});
