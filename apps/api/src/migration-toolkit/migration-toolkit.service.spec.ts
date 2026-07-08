import { BadRequestException, NotFoundException } from "@nestjs/common";
import { AccountType, ContactType, ImportEntityType, ImportJobRowStatus, ImportJobStatus, ImportValidationIssueSeverity } from "@prisma/client";
import { MigrationToolkitService } from "./migration-toolkit.service";

describe("MigrationToolkitService", () => {
  it("provides safe local templates and CSV template downloads", () => {
    const { service } = makeService();

    expect(service.templates()).toMatchObject({
      unsupportedImports: expect.arrayContaining(["Opening balances", "Posted journals", "Bank credentials"]),
      limitations: expect.arrayContaining([expect.stringContaining("No external provider upload")]),
    });
    expect(service.templateCsv(ImportEntityType.CUSTOMERS)).toMatchObject({
      filename: "customers-import-template.csv",
      content: expect.stringContaining("name,displayName,email"),
    });
  });

  it("creates preview jobs with row validation, duplicate detection, requestId, and no accounting mutation", async () => {
    const { service, prisma, auditLog } = makeService({
      contacts: [{ name: "Existing Customer", type: ContactType.CUSTOMER }],
    });

    const job = await service.createImportJob("org-1", "user-1", {
      entityType: ImportEntityType.CUSTOMERS,
      filename: "customers.csv",
      csvContent: "name,email\nExisting Customer,good@example.test\nNew Customer,not-an-email\nNew Customer,team@example.test",
    });

    expect(prisma.importJob.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        organizationId: "org-1",
        status: ImportJobStatus.READY_FOR_REVIEW,
        requestId: "req-import-1",
        summaryJson: expect.objectContaining({
          rowCount: 3,
          duplicateRowCount: 2,
          errorCount: 3,
          accountingRecordsMutated: false,
          providerCalls: false,
        }),
      }),
    }));
    expect(prisma.importValidationIssue.createMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.arrayContaining([
        expect.objectContaining({ organizationId: "org-1", code: "DUPLICATE", rowNumber: 2 }),
        expect.objectContaining({ organizationId: "org-1", code: "INVALID_EMAIL", rowNumber: 3 }),
      ]),
    }));
    expect(job.rows).toHaveLength(3);
    expect(auditLog.log).toHaveBeenCalledWith(expect.objectContaining({
      organizationId: "org-1",
      action: "UPLOAD",
      entityType: "ImportJob",
      after: expect.objectContaining({ accountingRecordsMutated: false }),
    }));
  });

  it("requires disposable local review commit and blocks jobs with validation errors", async () => {
    const { service, prisma } = makeService();
    const job = makeJob({
      validationIssues: [{ id: "issue-1", severity: ImportValidationIssueSeverity.ERROR, code: "DUPLICATE" }],
    });
    prisma.importJob.findFirst.mockResolvedValue(job);

    await expect(service.commitImportJob("org-1", "user-1", "job-1", { confirmReviewed: false })).rejects.toThrow(BadRequestException);
    await expect(service.commitImportJob("org-1", "user-1", "job-1", { confirmReviewed: true })).rejects.toThrow("validation errors");
    expect(prisma.contact.create).not.toHaveBeenCalled();
    expect(prisma.importJobRow.updateMany).toHaveBeenCalledWith({
      where: { organizationId: "org-1", importJobId: "job-1" },
      data: { status: ImportJobRowStatus.COMMIT_BLOCKED },
    });
  });

  it("commits reviewed local customer imports and keeps tenant scope on every mutation", async () => {
    const { service, prisma, auditLog } = makeService();
    const job = makeJob({
      rows: [
        {
          id: "row-1",
          rowNumber: 2,
          normalizedJson: { name: "Safe Customer", email: "billing@example.test", countryCode: "AE", isActive: true },
        },
      ],
    });
    prisma.importJob.findFirst.mockResolvedValueOnce(job as never).mockResolvedValueOnce({ ...job, status: ImportJobStatus.COMMITTED_LOCAL } as never);

    await service.commitImportJob("org-1", "user-1", "job-1", { confirmReviewed: true });

    expect(prisma.contact.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: "org-1",
        type: ContactType.CUSTOMER,
        name: "Safe Customer",
        email: "billing@example.test",
      }),
    });
    expect(prisma.importJob.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "job-1" },
      data: expect.objectContaining({
        status: ImportJobStatus.COMMITTED_LOCAL,
        committedById: "user-1",
      }),
    }));
    expect(auditLog.log).toHaveBeenCalledWith(expect.objectContaining({
      organizationId: "org-1",
      action: "COMMIT_LOCAL",
      after: expect.objectContaining({ hostedMutation: false }),
    }));
  });

  it("scopes import job lookup by tenant", async () => {
    const { service, prisma } = makeService();
    prisma.importJob.findFirst.mockResolvedValue(null as never);

    await expect(service.getImportJob("org-b", "job-owned-by-org-a")).rejects.toThrow(NotFoundException);
    expect(prisma.importJob.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "job-owned-by-org-a", organizationId: "org-b" },
    }));
  });

  it("exports tenant-scoped CSV with formula injection protection and audit logging", async () => {
    const { service, prisma, auditLog } = makeService({
      contacts: [{ name: "=HYPERLINK(\"http://bad\")", type: ContactType.CUSTOMER, displayName: null, email: null, phone: null, taxNumber: null, countryCode: "AE", isActive: true }],
    });

    const exported = await service.exportCsv("org-1", ImportEntityType.CUSTOMERS);

    expect(prisma.contact.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { organizationId: "org-1", type: { in: [ContactType.CUSTOMER, ContactType.BOTH] } },
    }));
    expect(exported.content).toContain("'=HYPERLINK");
    expect(auditLog.log).toHaveBeenCalledWith(expect.objectContaining({
      organizationId: "org-1",
      action: "EXPORT_CSV",
      after: expect.objectContaining({ csvInjectionProtected: true }),
    }));
  });

  it("validates product imports against tenant-owned revenue accounts", async () => {
    const { service, prisma } = makeService({
      accounts: [{ id: "acct-1", code: "400", type: AccountType.EXPENSE, isActive: true, allowPosting: true }],
    });

    await service.createImportJob("org-1", "user-1", {
      entityType: ImportEntityType.PRODUCTS_SERVICES,
      filename: "items.csv",
      csvContent: "name,sku,type,sellingPrice,revenueAccountCode,status\nConsulting,CONSULT,SERVICE,10.0000,400,ACTIVE",
    });

    expect(prisma.importValidationIssue.createMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.arrayContaining([
        expect.objectContaining({ code: "INVALID_REFERENCE", field: "revenueAccountCode" }),
      ]),
    }));
  });
});

function makeService(seed: {
  contacts?: Array<Record<string, unknown>>;
  items?: Array<Record<string, unknown>>;
  accounts?: Array<{ id: string; code: string; type: AccountType; isActive: boolean; allowPosting: boolean }>;
} = {}) {
  const store = {
    job: makeJob(),
  };
  const prisma = {
    importJob: {
      create: jest.fn(async (args: any) => {
        store.job = makeJob({
          id: "job-1",
          entityType: args.data.entityType,
          rows: args.data.rows.create.map((row: any, index: number) => ({ id: `row-${index + 1}`, ...row })),
          validationIssues: [],
          summaryJson: args.data.summaryJson,
          requestId: args.data.requestId,
        });
        return store.job;
      }),
      findMany: jest.fn(async () => [store.job]),
      findFirst: jest.fn(async () => store.job),
      update: jest.fn(async (args: any) => ({ ...store.job, ...args.data })),
    },
    importValidationIssue: {
      createMany: jest.fn(async (args: any) => {
        store.job = {
          ...store.job,
          validationIssues: args.data.map((issue: any, index: number) => ({ id: `issue-${index + 1}`, ...issue })),
        };
      }),
    },
    importJobRow: {
      update: jest.fn(async (args: any) => ({ id: args.where.id, ...args.data })),
      updateMany: jest.fn(async () => ({ count: 1 })),
    },
    contact: {
      findMany: jest.fn(async () => seed.contacts ?? []),
      create: jest.fn(async (args: any) => ({ id: "contact-created", ...args.data })),
    },
    item: {
      findMany: jest.fn(async () => seed.items ?? []),
      create: jest.fn(async (args: any) => ({ id: "item-created", ...args.data })),
    },
    account: {
      findMany: jest.fn(async () => seed.accounts ?? [{ id: "revenue-1", code: "400", type: AccountType.REVENUE, isActive: true, allowPosting: true }]),
      findFirst: jest.fn(async (args: any) => (seed.accounts ?? [{ id: "revenue-1", code: "400", type: AccountType.REVENUE, isActive: true, allowPosting: true }]).find((account) => account.code === args.where.code) ?? null),
      create: jest.fn(async (args: any) => ({ id: "account-created", ...args.data })),
    },
  };
  const auditLog = { log: jest.fn(async () => undefined) };
  const observability = { getRequestId: jest.fn(() => "req-import-1") };
  return { service: new MigrationToolkitService(prisma as never, auditLog as never, observability as never), prisma, auditLog };
}

function makeJob(overrides: Record<string, any> = {}) {
  return {
    id: "job-1",
    organizationId: "org-1",
    entityType: ImportEntityType.CUSTOMERS,
    status: ImportJobStatus.READY_FOR_REVIEW,
    filename: "customers.csv",
    sourceKind: "LOCAL_CSV_UPLOAD",
    previewOnly: true,
    summaryJson: {},
    requestId: "req-import-1",
    createdById: "user-1",
    committedById: null,
    committedAt: null,
    createdAt: new Date("2026-07-09T00:00:00.000Z"),
    updatedAt: new Date("2026-07-09T00:00:00.000Z"),
    rows: [],
    validationIssues: [],
    ...overrides,
  };
}
