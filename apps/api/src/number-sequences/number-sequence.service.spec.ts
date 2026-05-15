import { NumberSequenceScope } from "@prisma/client";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { formatSequenceExample, NumberSequenceService } from "./number-sequence.service";

describe("number sequence service", () => {
  const sequence = {
    id: "seq-1",
    organizationId: "org-1",
    scope: NumberSequenceScope.INVOICE,
    prefix: "INV-",
    nextNumber: 123,
    padding: 6,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-02T00:00:00.000Z"),
  };

  it("increments and formats sequence numbers predictably", async () => {
    const prisma = {
      numberSequence: {
        upsert: jest
          .fn()
          .mockResolvedValueOnce({ prefix: "JE-", nextNumber: 2, padding: 6 })
          .mockResolvedValueOnce({ prefix: "JE-", nextNumber: 3, padding: 6 }),
      },
    };
    const service = new NumberSequenceService(prisma as never);

    await expect(service.next("org-1", NumberSequenceScope.JOURNAL_ENTRY)).resolves.toBe("JE-000001");
    await expect(service.next("org-1", NumberSequenceScope.JOURNAL_ENTRY)).resolves.toBe("JE-000002");
    expect(prisma.numberSequence.upsert).toHaveBeenCalledWith({
      where: { organizationId_scope: { organizationId: "org-1", scope: NumberSequenceScope.JOURNAL_ENTRY } },
      create: {
        organizationId: "org-1",
        scope: NumberSequenceScope.JOURNAL_ENTRY,
        prefix: `${NumberSequenceScope.JOURNAL_ENTRY}-`,
        nextNumber: 2,
        padding: 6,
      },
      update: { nextNumber: { increment: 1 } },
    });
  });

  it("uses the transaction client when one is provided", async () => {
    const prisma = { numberSequence: { upsert: jest.fn() } };
    const tx = {
      numberSequence: {
        upsert: jest.fn().mockResolvedValue({ prefix: "PAY-", nextNumber: 10, padding: 6 }),
      },
    };
    const service = new NumberSequenceService(prisma as never);

    await expect(service.next("org-1", NumberSequenceScope.PAYMENT, tx as never)).resolves.toBe("PAY-000009");
    expect(tx.numberSequence.upsert).toHaveBeenCalledTimes(1);
    expect(prisma.numberSequence.upsert).not.toHaveBeenCalled();
  });

  it("lists and formats configured sequences", async () => {
    const prisma = {
      numberSequence: {
        findMany: jest.fn().mockResolvedValue([sequence]),
      },
    };
    const service = new NumberSequenceService(prisma as never);

    await expect(service.list("org-1")).resolves.toEqual([
      expect.objectContaining({
        id: "seq-1",
        scope: NumberSequenceScope.INVOICE,
        exampleNextNumber: "INV-000123",
      }),
    ]);
    expect(prisma.numberSequence.findMany).toHaveBeenCalledWith({
      where: { organizationId: "org-1" },
      orderBy: { scope: "asc" },
    });
  });

  it("rejects invalid prefix, padding, and lowering next number", async () => {
    const prisma = {
      numberSequence: {
        findFirst: jest.fn().mockResolvedValue(sequence),
        update: jest.fn(),
      },
    };
    const service = new NumberSequenceService(prisma as never);

    await expect(service.update("org-1", "user-1", "seq-1", { prefix: "inv-" })).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.update("org-1", "user-1", "seq-1", { prefix: "INVOICE-LONG-" })).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.update("org-1", "user-1", "seq-1", { padding: 2 })).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.update("org-1", "user-1", "seq-1", { nextNumber: 122 })).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.numberSequence.update).not.toHaveBeenCalled();
  });

  it("updates future sequence settings and writes an audit log", async () => {
    const updated = { ...sequence, prefix: "SINV-", nextNumber: 130, padding: 7 };
    const prisma = {
      numberSequence: {
        findFirst: jest.fn().mockResolvedValue(sequence),
        update: jest.fn().mockResolvedValue(updated),
      },
    };
    const audit = { log: jest.fn().mockResolvedValue(undefined) };
    const service = new NumberSequenceService(prisma as never, audit as never);

    await expect(service.update("org-1", "user-1", "seq-1", { prefix: "SINV-", nextNumber: 130, padding: 7 })).resolves.toEqual(
      expect.objectContaining({
        prefix: "SINV-",
        nextNumber: 130,
        padding: 7,
        exampleNextNumber: "SINV-0000130",
      }),
    );

    expect(prisma.numberSequence.update).toHaveBeenCalledWith({
      where: { id: "seq-1" },
      data: { prefix: "SINV-", nextNumber: 130, padding: 7 },
    });
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-1",
        actorUserId: "user-1",
        action: "UPDATE",
        entityType: "NumberSequence",
        entityId: "seq-1",
        after: expect.objectContaining({ exampleNextNumber: "SINV-0000130" }),
      }),
    );
  });

  it("tenant scopes detail lookup", async () => {
    const prisma = {
      numberSequence: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    };
    const service = new NumberSequenceService(prisma as never);

    await expect(service.get("org-2", "seq-1")).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.numberSequence.findFirst).toHaveBeenCalledWith({ where: { id: "seq-1", organizationId: "org-2" } });
  });

  it("formats examples through the shared helper", () => {
    expect(formatSequenceExample("BILL-", 45, 6)).toBe("BILL-000045");
  });
});
