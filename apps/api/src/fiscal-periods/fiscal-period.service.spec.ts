import { FiscalPeriodStatus } from "@prisma/client";
import { FiscalPeriodGuardService } from "./fiscal-period-guard.service";
import { FiscalPeriodService } from "./fiscal-period.service";

describe("fiscal period management", () => {
  it("creates fiscal periods after validating range and tenant overlap", async () => {
    const prisma = {
      fiscalPeriod: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: "period-1", name: "FY 2027", status: FiscalPeriodStatus.OPEN }),
      },
    };
    const service = new FiscalPeriodService(prisma as never, { log: jest.fn() } as never);

    await expect(
      service.create("org-1", "user-1", { name: "FY 2027", startsOn: "2027-01-01", endsOn: "2027-12-31" }),
    ).resolves.toMatchObject({ id: "period-1" });
    expect(prisma.fiscalPeriod.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ organizationId: "org-1" }),
      }),
    );
  });

  it("rejects overlapping fiscal periods", async () => {
    const prisma = {
      fiscalPeriod: {
        findFirst: jest.fn().mockResolvedValue({ id: "period-existing", name: "FY 2026" }),
      },
    };
    const service = new FiscalPeriodService(prisma as never, { log: jest.fn() } as never);

    await expect(service.create("org-1", "user-1", { name: "Overlap", startsOn: "2026-06-01", endsOn: "2026-06-30" })).rejects.toThrow(
      "Fiscal period overlaps with FY 2026.",
    );
  });

  it("rejects end dates before start dates", async () => {
    const service = new FiscalPeriodService({} as never, { log: jest.fn() } as never);
    await expect(service.create("org-1", "user-1", { name: "Bad", startsOn: "2026-12-31", endsOn: "2026-01-01" })).rejects.toThrow(
      "Fiscal period end date must be on or after the start date.",
    );
  });

  it("supports close, reopen, and lock transitions", async () => {
    const prisma = {
      fiscalPeriod: {
        findFirst: jest
          .fn()
          .mockResolvedValueOnce({ id: "period-1", name: "FY 2026", status: FiscalPeriodStatus.OPEN })
          .mockResolvedValueOnce({ id: "period-1", name: "FY 2026", status: FiscalPeriodStatus.CLOSED })
          .mockResolvedValueOnce({ id: "period-1", name: "FY 2026", status: FiscalPeriodStatus.OPEN }),
        update: jest
          .fn()
          .mockResolvedValueOnce({ id: "period-1", status: FiscalPeriodStatus.CLOSED })
          .mockResolvedValueOnce({ id: "period-1", status: FiscalPeriodStatus.OPEN })
          .mockResolvedValueOnce({ id: "period-1", status: FiscalPeriodStatus.LOCKED }),
      },
    };
    const service = new FiscalPeriodService(prisma as never, { log: jest.fn() } as never);

    await expect(service.close("org-1", "user-1", "period-1")).resolves.toMatchObject({ status: FiscalPeriodStatus.CLOSED });
    await expect(service.reopen("org-1", "user-1", "period-1")).resolves.toMatchObject({ status: FiscalPeriodStatus.OPEN });
    await expect(service.lock("org-1", "user-1", "period-1")).resolves.toMatchObject({ status: FiscalPeriodStatus.LOCKED });
  });

  it("does not reopen locked fiscal periods", async () => {
    const prisma = {
      fiscalPeriod: {
        findFirst: jest.fn().mockResolvedValue({ id: "period-1", name: "FY 2026", status: FiscalPeriodStatus.LOCKED }),
      },
    };
    const service = new FiscalPeriodService(prisma as never, { log: jest.fn() } as never);

    await expect(service.reopen("org-1", "user-1", "period-1")).rejects.toThrow("Locked fiscal periods cannot be reopened.");
  });
});

describe("fiscal period posting guard", () => {
  it("allows posting when no fiscal periods exist", async () => {
    const prisma = {
      fiscalPeriod: {
        count: jest.fn().mockResolvedValue(0),
        findFirst: jest.fn(),
      },
    };
    const guard = new FiscalPeriodGuardService(prisma as never);

    await expect(guard.assertPostingDateAllowed("org-1", "2026-05-12T00:00:00.000Z")).resolves.toBeUndefined();
    expect(prisma.fiscalPeriod.findFirst).not.toHaveBeenCalled();
  });

  it("allows posting in an open fiscal period", async () => {
    const guard = new FiscalPeriodGuardService(makeGuardPrisma(FiscalPeriodStatus.OPEN) as never);
    await expect(guard.assertPostingDateAllowed("org-1", "2026-05-12T15:00:00.000Z")).resolves.toBeUndefined();
  });

  it("rejects posting in a closed fiscal period", async () => {
    const guard = new FiscalPeriodGuardService(makeGuardPrisma(FiscalPeriodStatus.CLOSED) as never);
    await expect(guard.assertPostingDateAllowed("org-1", "2026-05-12")).rejects.toThrow("Posting date falls in a closed fiscal period.");
  });

  it("rejects posting in a locked fiscal period", async () => {
    const guard = new FiscalPeriodGuardService(makeGuardPrisma(FiscalPeriodStatus.LOCKED) as never);
    await expect(guard.assertPostingDateAllowed("org-1", "2026-05-12")).rejects.toThrow("Posting date falls in a locked fiscal period.");
  });

  it("rejects posting when periods exist but no period matches", async () => {
    const prisma = {
      fiscalPeriod: {
        count: jest.fn().mockResolvedValue(1),
        findFirst: jest.fn().mockResolvedValue(null),
      },
    };
    const guard = new FiscalPeriodGuardService(prisma as never);

    await expect(guard.assertPostingDateAllowed("org-1", "2028-01-01")).rejects.toThrow("Posting date does not fall in an open fiscal period.");
  });
});

function makeGuardPrisma(status: FiscalPeriodStatus) {
  return {
    fiscalPeriod: {
      count: jest.fn().mockResolvedValue(1),
      findFirst: jest.fn().mockResolvedValue({ id: "period-1", status }),
    },
  };
}
