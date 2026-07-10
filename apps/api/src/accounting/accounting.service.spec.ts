import { BadRequestException } from "@nestjs/common";
import { DimensionStatus, JournalEntryStatus } from "@prisma/client";
import { AccountingService } from "./accounting.service";

const dimensionedLines = [
  {
    accountId: "account-cash",
    debit: "100.0000",
    credit: "0.0000",
    description: "Cash",
    currency: "SAR",
    exchangeRate: "1.00000000",
    taxRateId: null,
    costCenterId: "cost-center-1",
    projectId: "project-1",
  },
  {
    accountId: "account-sales",
    debit: "0.0000",
    credit: "100.0000",
    description: "Sales",
    currency: "SAR",
    exchangeRate: "1.00000000",
    taxRateId: null,
    costCenterId: null,
    projectId: null,
  },
];

const journal = {
  id: "journal-1",
  organizationId: "org-1",
  entryNumber: "JE-000001",
  entryDate: new Date("2026-07-10T00:00:00.000Z"),
  description: "Dimensioned journal",
  reference: null,
  currency: "SAR",
  totalDebit: "100.0000",
  totalCredit: "100.0000",
  status: JournalEntryStatus.DRAFT,
  reversedBy: null,
  reversalOf: null,
  lines: dimensionedLines,
};

const archivedDimensionJournal = {
  ...journal,
  lines: dimensionedLines.map((line, index) => ({
    ...line,
    costCenter:
      index === 0
        ? { id: "cost-center-1", code: "OPS", name: "Operations", status: DimensionStatus.ARCHIVED }
        : null,
    project:
      index === 0
        ? { id: "project-1", code: "ERP", name: "ERP rollout", status: DimensionStatus.ARCHIVED }
        : null,
  })),
};

describe("AccountingService journal dimensions", () => {
  function makeService() {
    const prisma = {
      account: { findMany: jest.fn() },
      taxRate: { findMany: jest.fn() },
      costCenter: { findMany: jest.fn() },
      project: { findMany: jest.fn() },
      journalLine: { deleteMany: jest.fn() },
      journalEntry: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn(),
    };
    prisma.$transaction.mockImplementation((callback: (client: typeof prisma) => Promise<unknown>) => callback(prisma));

    const audit = { log: jest.fn() };
    const sequences = { next: jest.fn().mockResolvedValue("JE-000002") };
    const service = new AccountingService(prisma as never, audit as never, sequences as never);
    return { service, prisma, audit, sequences };
  }

  function allowAccounts(prisma: ReturnType<typeof makeService>["prisma"]) {
    prisma.account.findMany.mockResolvedValue([{ id: "account-cash" }, { id: "account-sales" }]);
  }

  function createDto(lines: unknown = dimensionedLines) {
    return {
      entryDate: "2026-07-10T00:00:00.000Z",
      description: "Dimensioned journal",
      currency: "SAR",
      lines,
    };
  }

  it("creates a journal with same-tenant active dimension connections", async () => {
    const { service, prisma } = makeService();
    allowAccounts(prisma);
    prisma.costCenter.findMany.mockResolvedValue([{ id: "cost-center-1" }]);
    prisma.project.findMany.mockResolvedValue([{ id: "project-1" }]);
    prisma.journalEntry.create.mockResolvedValue(journal);

    await expect(service.create("org-1", "user-1", createDto() as never)).resolves.toEqual(journal);

    expect(prisma.costCenter.findMany).toHaveBeenCalledWith({
      where: {
        organizationId: "org-1",
        id: { in: ["cost-center-1"] },
        status: DimensionStatus.ACTIVE,
      },
      select: { id: true },
    });
    expect(prisma.project.findMany).toHaveBeenCalledWith({
      where: {
        organizationId: "org-1",
        id: { in: ["project-1"] },
        status: DimensionStatus.ACTIVE,
      },
      select: { id: true },
    });
    expect(prisma.journalEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          lines: {
            create: [
              expect.objectContaining({
                costCenter: { connect: { id: "cost-center-1" } },
                project: { connect: { id: "project-1" } },
              }),
              expect.objectContaining({ costCenter: undefined, project: undefined }),
            ],
          },
        }),
      }),
    );
  });

  it.each([
    ["missing cost center", "costCenter", "missing-cost-center", "One or more cost centers do not exist or are archived."],
    ["cross-tenant cost center", "costCenter", "other-tenant-cost-center", "One or more cost centers do not exist or are archived."],
    ["archived cost center", "costCenter", "archived-cost-center", "One or more cost centers do not exist or are archived."],
    ["missing project", "project", "missing-project", "One or more projects do not exist or are archived."],
    ["cross-tenant project", "project", "other-tenant-project", "One or more projects do not exist or are archived."],
    ["archived project", "project", "archived-project", "One or more projects do not exist or are archived."],
  ])("rejects %s with the stable message", async (_caseName, dimension, dimensionId, message) => {
    const { service, prisma } = makeService();
    allowAccounts(prisma);
    const lines = dimensionedLines.map((line) => ({
      ...line,
      costCenterId: dimension === "costCenter" ? dimensionId : null,
      projectId: dimension === "project" ? dimensionId : null,
    }));
    prisma.costCenter.findMany.mockResolvedValue([]);
    prisma.project.findMany.mockResolvedValue([]);
    prisma.journalEntry.create.mockResolvedValue(journal);

    await expect(service.create("org-1", "user-1", createDto(lines) as never)).rejects.toEqual(new BadRequestException(message));
    const catalog = dimension === "costCenter" ? prisma.costCenter : prisma.project;
    expect(catalog.findMany).toHaveBeenCalledWith({
      where: {
        organizationId: "org-1",
        id: { in: [dimensionId] },
        status: DimensionStatus.ACTIVE,
      },
      select: { id: true },
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("does not query either dimension catalog when assignments are absent", async () => {
    const { service, prisma } = makeService();
    allowAccounts(prisma);
    prisma.journalEntry.create.mockResolvedValue(journal);
    const lines = dimensionedLines.map(({ costCenterId: _costCenterId, projectId: _projectId, ...line }) => line);

    await service.create("org-1", "user-1", createDto(lines as never) as never);

    expect(prisma.costCenter.findMany).not.toHaveBeenCalled();
    expect(prisma.project.findMany).not.toHaveBeenCalled();
  });

  it("retains an archived assignment on a header-only update without active-dimension revalidation", async () => {
    const { service, prisma } = makeService();
    allowAccounts(prisma);
    prisma.journalEntry.findFirst.mockResolvedValue(archivedDimensionJournal);
    prisma.journalEntry.update.mockResolvedValue({ ...archivedDimensionJournal, description: "Updated header" });

    await service.update("org-1", "user-1", "journal-1", { description: "Updated header" });

    expect(prisma.costCenter.findMany).not.toHaveBeenCalled();
    expect(prisma.project.findMany).not.toHaveBeenCalled();
    expect(prisma.journalLine.deleteMany).not.toHaveBeenCalled();
    expect(prisma.journalEntry.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          lines: undefined,
        }),
      }),
    );
  });

  it("validates replacement lines against current active dimensions", async () => {
    const { service, prisma } = makeService();
    allowAccounts(prisma);
    prisma.journalEntry.findFirst.mockResolvedValue(journal);
    prisma.costCenter.findMany.mockResolvedValue([]);
    prisma.project.findMany.mockResolvedValue([{ id: "project-1" }]);

    await expect(service.update("org-1", "user-1", "journal-1", { lines: dimensionedLines } as never)).rejects.toEqual(
      new BadRequestException("One or more cost centers do not exist or are archived."),
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("selects assignment IDs in list summaries", async () => {
    const { service, prisma } = makeService();
    prisma.journalEntry.findMany.mockResolvedValue([]);

    await service.list("org-1");

    expect(prisma.journalEntry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: {
          lines: {
            select: expect.objectContaining({
              costCenterId: true,
              projectId: true,
            }),
          },
        },
      }),
    );
  });

  it("includes dimension metadata in detailed journal reads", async () => {
    const { service, prisma } = makeService();
    prisma.journalEntry.findFirst.mockResolvedValue(journal);

    await service.get("org-1", "journal-1");

    const dimensionSelect = { id: true, code: true, name: true, status: true };
    expect(prisma.journalEntry.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          lines: expect.objectContaining({
            include: expect.objectContaining({
              costCenter: { select: dimensionSelect },
              project: { select: dimensionSelect },
            }),
          }),
        }),
      }),
    );
  });

  it("preserves archived dimension assignments in reversal journal lines", async () => {
    const { service, prisma } = makeService();
    const posted = { ...archivedDimensionJournal, status: JournalEntryStatus.POSTED };
    prisma.journalEntry.findFirst.mockResolvedValue(posted);
    prisma.journalEntry.create.mockResolvedValue({ ...posted, id: "reversal-1", reversalOf: { id: "journal-1" } });
    prisma.journalEntry.update.mockResolvedValue({ ...posted, status: JournalEntryStatus.REVERSED });

    await service.reverse("org-1", "user-1", "journal-1");

    expect(prisma.costCenter.findMany).not.toHaveBeenCalled();
    expect(prisma.project.findMany).not.toHaveBeenCalled();
    expect(prisma.journalEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          reversalOfId: "journal-1",
          lines: {
            create: [
              expect.objectContaining({
                costCenter: { connect: { id: "cost-center-1" } },
                project: { connect: { id: "project-1" } },
              }),
              expect.objectContaining({ costCenter: undefined, project: undefined }),
            ],
          },
        }),
      }),
    );
  });
});
