import { NumberSequenceScope } from "@prisma/client";
import { NumberSequenceService } from "./number-sequence.service";

describe("number sequence service", () => {
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
});
