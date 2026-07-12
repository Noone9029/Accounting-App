import { BadRequestException } from "@nestjs/common";
import { lockActiveDocumentLineDimensions, normalizedDocumentLineDimensions } from "./document-line-dimensions";

describe("document line dimensions", () => {
  it("does not query dimension catalogs when every line is unassigned", async () => {
    const tx = { $queryRaw: jest.fn() };
    await lockActiveDocumentLineDimensions(tx as never, "org-1", [{ costCenterId: null, projectId: undefined }]);
    expect(tx.$queryRaw).not.toHaveBeenCalled();
  });

  it("locks active tenant cost centers and projects before document persistence", async () => {
    const tx = {
      $queryRaw: jest.fn()
        .mockResolvedValueOnce([{ id: "cost-1" }])
        .mockResolvedValueOnce([{ id: "project-1" }]),
    };

    await lockActiveDocumentLineDimensions(tx as never, "org-1", [
      { costCenterId: "cost-1", projectId: "project-1" },
      { costCenterId: "cost-1", projectId: null },
    ]);

    expect(tx.$queryRaw).toHaveBeenCalledTimes(2);
    for (const [query] of tx.$queryRaw.mock.calls) {
      const sql = (query as { strings?: readonly string[] }).strings?.join("?") ?? "";
      expect(sql).toContain('"organizationId" =');
      expect(sql).toContain('"status" =');
      expect(sql).toContain("FOR UPDATE");
    }
  });

  it("rejects an archived, missing, or cross-tenant cost center", async () => {
    const tx = { $queryRaw: jest.fn().mockResolvedValue([]) };
    await expect(lockActiveDocumentLineDimensions(tx as never, "org-1", [{ costCenterId: "cost-other" }])).rejects.toThrow(
      "cost centers do not exist or are archived",
    );
  });

  it("rejects an archived, missing, or cross-tenant project", async () => {
    const tx = { $queryRaw: jest.fn().mockResolvedValue([]) };
    await expect(lockActiveDocumentLineDimensions(tx as never, "org-1", [{ projectId: "project-other" }])).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it("normalizes optional dimension fields for Prisma line creation", () => {
    expect(normalizedDocumentLineDimensions({ costCenterId: " cost-1 ", projectId: "" })).toEqual({
      costCenterId: "cost-1",
      projectId: null,
    });
  });
});
