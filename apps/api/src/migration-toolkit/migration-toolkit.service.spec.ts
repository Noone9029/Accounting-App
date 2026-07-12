import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { AccountType, ContactType, CurrencyRateSource, ImportEntityType, ImportJobRowStatus, ImportJobStatus, ImportValidationIssueSeverity, Prisma } from "@prisma/client";
import { MigrationToolkitService } from "./migration-toolkit.service";

describe("MigrationToolkitService", () => {
  const matchingRateId = "11111111-1111-4111-8111-111111111111";
  const otherTenantRateId = "22222222-2222-4222-8222-222222222222";

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
    expect(service.templates().supportedImports).toContainEqual(expect.objectContaining({
      entityType: ImportEntityType.PRODUCTS_SERVICES,
      headers: expect.arrayContaining(["currency", "exchangeRate", "rateDate", "rateSource", "rateSnapshotId"]),
      requiredHeaders: ["name", "type", "sellingPrice", "revenueAccountCode"],
    }));
    expect(service.templates().supportedImports).toEqual(expect.arrayContaining([
      expect.objectContaining({ entityType: ImportEntityType.RECURRING_SALES_INVOICE_TEMPLATES, headers: expect.arrayContaining(["timezone", "frequency", "currencyCode", "accountCode", "costCenterCode", "projectCode"]) }),
      expect.objectContaining({ entityType: ImportEntityType.RECURRING_PURCHASE_BILL_TEMPLATES }),
      expect.objectContaining({ entityType: ImportEntityType.RECURRING_EXPENSE_TEMPLATES }),
      expect.objectContaining({ entityType: ImportEntityType.RECURRING_JOURNAL_TEMPLATES }),
    ]));
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
        status: ImportJobStatus.VALIDATING,
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
    }), prisma);
    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
    expect(prisma.importJob.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: ImportJobStatus.VALIDATING }),
    }));
    expect(prisma.importJob.updateMany).toHaveBeenCalledWith({
      where: { id: "job-1", organizationId: "org-1", status: ImportJobStatus.VALIDATING },
      data: { status: ImportJobStatus.READY_FOR_REVIEW },
    });
    expect(job.status).toBe(ImportJobStatus.READY_FOR_REVIEW);
  });

  it("previews a tenant-resolved recurring sales template as an inactive one-line draft", async () => {
    const { service, prisma } = makeService({
      baseCurrency: "AED",
      contacts: [{ id: "customer-1", name: "Beta Customer", type: ContactType.CUSTOMER, isActive: true }],
      accounts: [{ id: "revenue-1", code: "410", type: AccountType.REVENUE, isActive: true, allowPosting: true }],
      costCenters: [{ id: "cc-1", code: "OPS", status: "ACTIVE" }],
      projects: [{ id: "project-1", code: "FALCON", status: "ACTIVE" }],
    });

    const preview = await service.createImportJob("org-1", "user-1", {
      entityType: ImportEntityType.RECURRING_SALES_INVOICE_TEMPLATES,
      filename: "recurring-sales.csv",
      csvContent: "name,timezone,frequency,startDate,currencyCode,exchangeRatePolicy,partyName,description,accountCode,costCenterCode,projectCode,quantity,unitPrice\nMonthly support,Asia/Dubai,MONTHLY,2026-08-31,AED,BASE_CURRENCY_ONLY,Beta Customer,Support retainer,410,OPS,FALCON,1.0000,100.0000",
    });

    expect(preview.rows[0]).toMatchObject({
      status: ImportJobRowStatus.VALID,
      normalizedJson: expect.objectContaining({ transactionType: "SALES_INVOICE", partyId: "customer-1", accountId: "revenue-1", costCenterId: "cc-1", projectId: "project-1", activate: false }),
    });
    expect(prisma.recurringTransactionTemplate.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { organizationId: "org-1" } }));
  });

  it("rejects recurring imports with invalid timezone or missing tenant references", async () => {
    const { service } = makeService({ baseCurrency: "AED", contacts: [], accounts: [] });
    const preview = await service.createImportJob("org-1", "user-1", {
      entityType: ImportEntityType.RECURRING_PURCHASE_BILL_TEMPLATES,
      filename: "recurring-bills.csv",
      csvContent: "name,timezone,frequency,startDate,currencyCode,exchangeRatePolicy,partyName,description,accountCode\nBad schedule,Mars/Olympus,MONTHLY,2026-08-01,AED,BASE_CURRENCY_ONLY,Missing Supplier,Hosting,999",
    });
    expect(preview.validationIssues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "INVALID_TIMEZONE" }),
      expect.objectContaining({ code: "INVALID_REFERENCE", field: "partyName" }),
      expect.objectContaining({ code: "INVALID_REFERENCE", field: "accountCode" }),
    ]));
  });

  it("revalidates and commits recurring imports through the normal draft template service", async () => {
    const { service, prisma, recurringTemplates } = makeService({
      baseCurrency: "AED",
      contacts: [{ id: "customer-1", name: "Beta Customer", type: ContactType.CUSTOMER, isActive: true }],
      accounts: [{ id: "revenue-1", code: "410", type: AccountType.REVENUE, isActive: true, allowPosting: true }],
    });
    await service.createImportJob("org-1", "user-1", {
      entityType: ImportEntityType.RECURRING_SALES_INVOICE_TEMPLATES,
      filename: "recurring-sales.csv",
      csvContent: "name,timezone,frequency,startDate,currencyCode,exchangeRatePolicy,partyName,description,accountCode,quantity,unitPrice\nMonthly support,Asia/Dubai,MONTHLY,2026-08-31,AED,BASE_CURRENCY_ONLY,Beta Customer,Support retainer,410,1.0000,100.0000",
    });

    await service.commitImportJob("org-1", "user-1", "job-1", { confirmReviewed: true });

    expect(recurringTemplates.createInTransaction).toHaveBeenCalledWith(prisma, "org-1", "user-1", expect.objectContaining({
      transactionType: "SALES_INVOICE", name: "Monthly support", partyId: "customer-1", catchUpPolicy: "SKIP_MISSED",
      lines: [expect.objectContaining({ accountId: "revenue-1", description: "Support retainer" })],
    }));
  });

  it("exports recurring templates and run evidence with CSV injection protection", async () => {
    const { service } = makeService({
      recurringTemplates: [{ templateCode: "REC-000001", name: "=Unsafe name", transactionType: "SALES_INVOICE", status: "ACTIVE", timezone: "Asia/Dubai", frequency: "MONTHLY", interval: 1, nextRunAt: new Date("2026-08-31T20:00:00.000Z"), currencyCode: "AED", exchangeRatePolicy: "BASE_CURRENCY_ONLY", templateVersion: 2, party: { name: "Beta Customer" } }],
      recurringRuns: [{ id: "run-1", templateVersion: 2, scheduledFor: new Date("2026-08-31T20:00:00.000Z"), scheduledLocalDate: new Date("2026-09-01T00:00:00.000Z"), trigger: "SCHEDULED", status: "BLOCKED", attemptCount: 1, failureCode: "FISCAL_PERIOD_BLOCKED", failureMessageSafe: "Locked period", template: { templateCode: "REC-000001", name: "Monthly support" } }],
    });
    const templates = await service.exportCsv("org-1", ImportEntityType.RECURRING_SALES_INVOICE_TEMPLATES);
    const runs = await service.exportCsv("org-1", ImportEntityType.RECURRING_TRANSACTION_RUNS);
    expect(templates.filename).toBe("recurring_sales_invoice_templates-export.csv");
    expect(templates.content).toContain("templateCode,name,transactionType,status,timezone");
    expect(templates.content).toContain("'=Unsafe name");
    expect(runs.content).toContain("templateCode,templateName,runId,templateVersion,scheduledFor,scheduledLocalDate,trigger,status,attemptCount,failureCode,failureMessage");
    expect(runs.content).toContain("FISCAL_PERIOD_BLOCKED");
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
          organizationId: "org-1",
          importJobId: "job-1",
          rowNumber: 2,
          normalizedJson: {
            name: "Safe Customer",
            displayName: null,
            email: "billing@example.test",
            phone: null,
            taxNumber: null,
            countryCode: "AE",
            isActive: true,
          },
        },
      ],
    });
    prisma.__setJob(job);

    await service.commitImportJob("org-1", "user-1", "job-1", { confirmReviewed: true });

    expect(prisma.contact.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: "org-1",
        type: ContactType.CUSTOMER,
        name: "Safe Customer",
        email: "billing@example.test",
      }),
    });
    expect(prisma.importJob.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "job-1", organizationId: "org-1" },
      data: expect.objectContaining({
        status: ImportJobStatus.COMMITTED_LOCAL,
        committedById: "user-1",
      }),
    }));
    expect(auditLog.log).toHaveBeenCalledWith(expect.objectContaining({
      organizationId: "org-1",
      action: "COMMIT_LOCAL",
      after: expect.objectContaining({ hostedMutation: false }),
    }), prisma);
  });

  it("commits the reviewed base selling price inside one serializable transaction", async () => {
    const { service, prisma } = makeService({ baseCurrency: "AED" });
    const job = makeJob({
      entityType: ImportEntityType.PRODUCTS_SERVICES,
      rows: [{
        id: "row-1",
        organizationId: "org-1",
        importJobId: "job-1",
        rowNumber: 2,
        rawJson: {
          name: "Imported service",
          type: "SERVICE",
          sellingPrice: "100.0000",
          revenueAccountCode: "400",
          currency: "USD",
          exchangeRate: "3.67250000",
          rateDate: "2026-07-10",
          rateSource: CurrencyRateSource.IMPORT,
          rateSnapshotId: "",
        },
        normalizedJson: {
          name: "Imported service",
          sku: null,
          type: "SERVICE",
          sellingPrice: "367.2500",
          transactionSellingPrice: "100.0000",
          baseSellingPrice: "367.2500",
          currency: "USD",
          baseCurrency: "AED",
          exchangeRate: "3.67250000",
          rateDate: "2026-07-10",
          rateSource: CurrencyRateSource.IMPORT,
          rateSnapshotId: null,
          revenueAccountCode: "400",
          status: "ACTIVE",
        },
      }],
    });
    prisma.__setJob(job);

    await service.commitImportJob("org-1", "user-1", "job-1", { confirmReviewed: true });

    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
    expect(prisma.item.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ organizationId: "org-1", sellingPrice: "367.2500" }),
    });
    expect(prisma.importJob.updateMany).toHaveBeenCalledWith({
      where: { id: "job-1", organizationId: "org-1" },
      data: expect.objectContaining({ status: ImportJobStatus.COMMITTED_LOCAL }),
    });
  });

  it("rechecks validation errors inside the authoritative commit transaction", async () => {
    const { service, prisma, transactionState } = makeService();
    const row = {
      id: "row-1",
      organizationId: "org-1",
      importJobId: "job-1",
      rowNumber: 2,
      status: ImportJobRowStatus.VALID,
      normalizedJson: { name: "Safe Customer", countryCode: "AE", isActive: true },
    };
    prisma.importJob.findFirst
      .mockResolvedValueOnce(makeJob({ rows: [row] }))
      .mockResolvedValueOnce(makeJob({
        status: ImportJobStatus.VALIDATING,
        rows: [row],
        validationIssues: [{ id: "late-error", severity: ImportValidationIssueSeverity.ERROR, code: "LATE_ERROR" }],
      }));

    await expect(service.commitImportJob("org-1", "user-1", "job-1", { confirmReviewed: true }))
      .rejects.toThrow("validation errors");

    expect(transactionState.rolledBack).toBe(true);
    expect(prisma.contact.create).not.toHaveBeenCalled();
  });

  it("rechecks that every row remains valid inside the authoritative commit transaction", async () => {
    const { service, prisma, transactionState } = makeService();
    const validRow = {
      id: "row-1",
      organizationId: "org-1",
      importJobId: "job-1",
      rowNumber: 2,
      status: ImportJobRowStatus.VALID,
      normalizedJson: { name: "Safe Customer", countryCode: "AE", isActive: true },
    };
    prisma.importJob.findFirst
      .mockResolvedValueOnce(makeJob({ rows: [validRow] }))
      .mockResolvedValueOnce(makeJob({
        status: ImportJobStatus.VALIDATING,
        rows: [{ ...validRow, status: ImportJobRowStatus.DUPLICATE }],
      }));

    await expect(service.commitImportJob("org-1", "user-1", "job-1", { confirmReviewed: true }))
      .rejects.toThrow("remain valid and committable");

    expect(transactionState.rolledBack).toBe(true);
    expect(prisma.contact.create).not.toHaveBeenCalled();
  });

  it("rejects a contact that becomes a tenant duplicate after preview without creating anything", async () => {
    const contacts: Array<Record<string, unknown>> = [];
    const { service, prisma, transactionState } = makeService({ contacts });
    await service.createImportJob("org-1", "user-1", {
      entityType: ImportEntityType.CUSTOMERS,
      filename: "customers.csv",
      csvContent: "name,email\nLate Duplicate,billing@example.test",
    });
    contacts.push({ name: "Late Duplicate", type: ContactType.CUSTOMER });

    await expect(service.commitImportJob("org-1", "user-1", "job-1", { confirmReviewed: true }))
      .rejects.toThrow("Create a new preview");

    expect(transactionState.rolledBack).toBe(true);
    expect(prisma.contact.create).not.toHaveBeenCalled();
    expect(prisma.__getJob().status).toBe(ImportJobStatus.READY_FOR_REVIEW);
  });

  it("rejects a product when its reviewed revenue account becomes inactive before commit", async () => {
    const accounts = [{ id: "revenue-1", code: "400", type: AccountType.REVENUE, isActive: true, allowPosting: true }];
    const { service, prisma, transactionState } = makeService({ accounts });
    await service.createImportJob("org-1", "user-1", {
      entityType: ImportEntityType.PRODUCTS_SERVICES,
      filename: "items.csv",
      csvContent: "name,type,sellingPrice,revenueAccountCode\nReviewed service,SERVICE,10.0000,400",
    });
    accounts[0]!.isActive = false;

    await expect(service.commitImportJob("org-1", "user-1", "job-1", { confirmReviewed: true }))
      .rejects.toThrow("Create a new preview");

    expect(transactionState.rolledBack).toBe(true);
    expect(prisma.item.create).not.toHaveBeenCalled();
    expect(prisma.__getJob().status).toBe(ImportJobStatus.READY_FOR_REVIEW);
  });

  it("requires a new product preview when the organization base currency changed before commit", async () => {
    const { service, prisma, transactionState } = makeService({ baseCurrency: "SAR" });
    prisma.__setJob(makeJob({
      entityType: ImportEntityType.PRODUCTS_SERVICES,
      rows: [{
        id: "row-1",
        organizationId: "org-1",
        importJobId: "job-1",
        rowNumber: 2,
        status: ImportJobRowStatus.VALID,
        normalizedJson: {
          name: "Imported service",
          type: "SERVICE",
          sellingPrice: "367.2500",
          baseCurrency: "AED",
          revenueAccountCode: "400",
          status: "ACTIVE",
        },
      }],
    }));

    await expect(service.commitImportJob("org-1", "user-1", "job-1", { confirmReviewed: true }))
      .rejects.toThrow("base currency changed");

    expect(transactionState.rolledBack).toBe(true);
    expect(prisma.item.create).not.toHaveBeenCalled();
  });

  it("rolls back the commit claim and all mutations when a row creation fails", async () => {
    const { service, prisma, transactionState } = makeService({ failItemCreateAt: 2 });
    prisma.__setJob(makeJob({
      entityType: ImportEntityType.PRODUCTS_SERVICES,
      rows: [
        {
          id: "row-1",
          organizationId: "org-1",
          importJobId: "job-1",
          rowNumber: 2,
          status: ImportJobRowStatus.VALID,
          ...sameCurrencyProductEvidence("First item", "10.0000"),
        },
        {
          id: "row-2",
          organizationId: "org-1",
          importJobId: "job-1",
          rowNumber: 3,
          status: ImportJobRowStatus.VALID,
          ...sameCurrencyProductEvidence("Broken item", "20.0000"),
        },
      ],
    }));

    await expect(service.commitImportJob("org-1", "user-1", "job-1", { confirmReviewed: true })).rejects.toThrow("simulated item failure");

    expect(transactionState.rolledBack).toBe(true);
    expect(prisma.__getJob().status).toBe(ImportJobStatus.READY_FOR_REVIEW);
    expect(prisma.__getJob().rows).toEqual(expect.arrayContaining([
      expect.not.objectContaining({ createdRecordId: expect.any(String) }),
      expect.not.objectContaining({ createdRecordId: expect.any(String) }),
    ]));
    expect(prisma.item.create).toHaveBeenCalledTimes(2);
    expect(prisma.__getCreatedItemIds()).toEqual([]);
    expect(prisma.importJob.update).not.toHaveBeenCalled();
  });

  it("allows only one concurrent commit claim and creates no records for the loser", async () => {
    const { service, prisma } = makeService();
    prisma.__setJob(makeJob({
      rows: [{
        id: "row-1",
        organizationId: "org-1",
        importJobId: "job-1",
        rowNumber: 2,
        normalizedJson: {
          name: "Safe Customer",
          displayName: null,
          email: null,
          phone: null,
          taxNumber: null,
          countryCode: "AE",
          isActive: true,
        },
      }],
    }));

    const results = await Promise.allSettled([
      service.commitImportJob("org-1", "user-1", "job-1", { confirmReviewed: true }),
      service.commitImportJob("org-1", "user-2", "job-1", { confirmReviewed: true }),
    ]);

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    const rejected = results.find((result): result is PromiseRejectedResult => result.status === "rejected");
    expect(rejected?.reason).toBeInstanceOf(ConflictException);
    expect(prisma.contact.create).toHaveBeenCalledTimes(1);
    expect(prisma.importJobRow.updateMany).toHaveBeenCalledTimes(1);
  });

  it("returns a conflict when another request already holds the commit claim", async () => {
    const { service, prisma } = makeService();
    prisma.__setJob(makeJob({ status: ImportJobStatus.VALIDATING }));

    await expect(service.commitImportJob("org-1", "user-2", "job-1", { confirmReviewed: true })).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.contact.create).not.toHaveBeenCalled();
  });

  it("maps a Prisma serialization conflict to a safe commit conflict", async () => {
    const { service, prisma } = makeService();
    prisma.$transaction.mockRejectedValueOnce(Object.assign(new Error("transaction serialization conflict"), { code: "P2034" }));

    await expect(service.commitImportJob("org-1", "user-2", "job-1", { confirmReviewed: true })).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.contact.create).not.toHaveBeenCalled();
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

  it("normalizes legacy product rows at the tenant base currency and rate one", async () => {
    const { service, prisma } = makeService({ baseCurrency: "AED" });

    await service.createImportJob("org-1", "user-1", {
      entityType: ImportEntityType.PRODUCTS_SERVICES,
      filename: "items.csv",
      csvContent: "name,type,sellingPrice,revenueAccountCode\nConsulting,SERVICE,10.2500,400",
    });

    expect(prisma.organization.findUnique).toHaveBeenCalledWith({ where: { id: "org-1" }, select: { baseCurrency: true } });
    expect(prisma.importJob.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        rows: {
          create: [expect.objectContaining({
            normalizedJson: expect.objectContaining({
              sellingPrice: "10.2500",
              transactionSellingPrice: "10.2500",
              baseSellingPrice: "10.2500",
              currency: "AED",
              baseCurrency: "AED",
              exchangeRate: "1",
              rateDate: null,
              rateSource: CurrencyRateSource.SYSTEM_RATE_1,
              rateSnapshotId: null,
            }),
          })],
        },
      }),
    }));

    await service.commitImportJob("org-1", "user-1", "job-1", { confirmReviewed: true });
    expect(prisma.item.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ organizationId: "org-1", sellingPrice: "10.2500" }),
    });
  });

  it("previews an inline foreign product price as an exact base equivalent", async () => {
    const { service, prisma } = makeService({ baseCurrency: "AED" });

    await service.createImportJob("org-1", "user-1", {
      entityType: ImportEntityType.PRODUCTS_SERVICES,
      filename: "items.csv",
      csvContent: [
        "name,type,sellingPrice,revenueAccountCode,currency,exchangeRate,rateDate,rateSource,rateSnapshotId",
        "Consulting,SERVICE,100.0000,400,usd,3.67250000,2026-07-10,IMPORT,",
      ].join("\n"),
    });

    expect(prisma.importJob.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        rows: {
          create: [expect.objectContaining({
            status: ImportJobRowStatus.VALID,
            normalizedJson: expect.objectContaining({
              sellingPrice: "367.2500",
              transactionSellingPrice: "100.0000",
              baseSellingPrice: "367.2500",
              currency: "USD",
              baseCurrency: "AED",
              exchangeRate: "3.67250000",
              rateDate: "2026-07-10",
              rateSource: CurrencyRateSource.IMPORT,
              rateSnapshotId: null,
            }),
          })],
        },
      }),
    }));
  });

  it("rejects same-currency non-one rates row by row", async () => {
    const { service, prisma } = makeService({ baseCurrency: "AED" });

    await service.createImportJob("org-1", "user-1", {
      entityType: ImportEntityType.PRODUCTS_SERVICES,
      filename: "items.csv",
      csvContent: "name,type,sellingPrice,revenueAccountCode,currency,exchangeRate,rateDate\nConsulting,SERVICE,10.0000,400,AED,1.1,2026-07-10",
    });

    expect(prisma.importValidationIssue.createMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.arrayContaining([
        expect.objectContaining({ rowNumber: 2, field: "exchangeRate", code: "INVALID_FX_CONTEXT" }),
      ]),
    }));
  });

  it("rejects incomplete and malformed foreign FX tuples row by row", async () => {
    const { service, prisma } = makeService({ baseCurrency: "AED" });

    await service.createImportJob("org-1", "user-1", {
      entityType: ImportEntityType.PRODUCTS_SERVICES,
      filename: "items.csv",
      csvContent: [
        "name,sku,type,sellingPrice,revenueAccountCode,currency,exchangeRate,rateDate,rateSource",
        "Missing rate,FX-1,SERVICE,10.0000,400,USD,,2026-07-10,IMPORT",
        "Bad rate,FX-2,SERVICE,10.0000,400,USD,0,2026-07-10,IMPORT",
        "Bad date,FX-3,SERVICE,10.0000,400,USD,3.6725,2026-02-30,IMPORT",
        "Bad source,FX-4,SERVICE,10.0000,400,USD,3.6725,2026-07-10,MANUAL",
      ].join("\n"),
    });

    expect(prisma.importValidationIssue.createMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.arrayContaining([
        expect.objectContaining({ rowNumber: 2, field: "exchangeRate", code: "INCOMPLETE_FX_CONTEXT" }),
        expect.objectContaining({ rowNumber: 3, field: "exchangeRate", code: "INVALID_EXCHANGE_RATE" }),
        expect.objectContaining({ rowNumber: 4, field: "rateDate", code: "INVALID_RATE_DATE" }),
        expect.objectContaining({ rowNumber: 5, field: "rateSource", code: "INVALID_RATE_SOURCE" }),
      ]),
    }));
  });

  it("rejects unsupported product currencies row by row", async () => {
    const { service, prisma } = makeService({ baseCurrency: "AED" });

    await service.createImportJob("org-1", "user-1", {
      entityType: ImportEntityType.PRODUCTS_SERVICES,
      filename: "items.csv",
      csvContent: "name,type,sellingPrice,revenueAccountCode,currency,exchangeRate,rateDate\nConsulting,SERVICE,10.0000,400,XYZ,3.6725,2026-07-10",
    });

    expect(prisma.importValidationIssue.createMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.arrayContaining([
        expect.objectContaining({ rowNumber: 2, field: "currency", code: "UNSUPPORTED_CURRENCY" }),
      ]),
    }));
  });

  it("accepts only tenant-owned rate snapshots whose FX tuple matches exactly", async () => {
    const matchingRate = {
      id: matchingRateId,
      organizationId: "org-1",
      transactionCurrency: "USD",
      baseCurrency: "AED",
      rate: new Prisma.Decimal("3.67250000"),
      rateDate: new Date("2026-07-10T00:00:00.000Z"),
      source: CurrencyRateSource.MANUAL,
    };
    const { service, prisma } = makeService({ baseCurrency: "AED", rates: [matchingRate] });

    await service.createImportJob("org-1", "user-1", {
      entityType: ImportEntityType.PRODUCTS_SERVICES,
      filename: "items.csv",
      csvContent: [
        "name,sku,type,sellingPrice,revenueAccountCode,currency,exchangeRate,rateDate,rateSnapshotId",
        `Matched,FX-1,SERVICE,100.0000,400,USD,3.67250000,2026-07-10,${matchingRateId}`,
        `Mismatched rate,FX-2,SERVICE,100.0000,400,USD,3.70000000,2026-07-10,${matchingRateId}`,
        `Cross tenant,FX-3,SERVICE,100.0000,400,USD,3.67250000,2026-07-10,${otherTenantRateId}`,
      ].join("\n"),
    });

    expect(prisma.currencyRateSnapshot.findMany).toHaveBeenCalledWith({
      where: { organizationId: "org-1", id: { in: [matchingRateId, otherTenantRateId] } },
    });
    expect(prisma.importJob.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        rows: { create: expect.arrayContaining([
          expect.objectContaining({ rowNumber: 2, status: ImportJobRowStatus.VALID, normalizedJson: expect.objectContaining({ rateSource: CurrencyRateSource.MANUAL, rateSnapshotId: matchingRateId }) }),
          expect.objectContaining({ rowNumber: 3, status: ImportJobRowStatus.INVALID }),
          expect.objectContaining({ rowNumber: 4, status: ImportJobRowStatus.INVALID }),
        ]) },
      }),
    }));
    expect(prisma.importValidationIssue.createMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.arrayContaining([
        expect.objectContaining({ rowNumber: 3, field: "rateSnapshotId", code: "INVALID_RATE_SNAPSHOT" }),
        expect.objectContaining({ rowNumber: 4, field: "rateSnapshotId", code: "INVALID_RATE_SNAPSHOT" }),
      ]),
    }));
  });

  it("keeps a malformed rate snapshot id out of the UUID query and reports a row issue", async () => {
    const { service, prisma } = makeService({ baseCurrency: "AED" });

    await service.createImportJob("org-1", "user-1", {
      entityType: ImportEntityType.PRODUCTS_SERVICES,
      filename: "items.csv",
      csvContent: [
        "name,type,sellingPrice,revenueAccountCode,currency,exchangeRate,rateDate,rateSnapshotId",
        "Malformed snapshot,SERVICE,100.0000,400,USD,3.67250000,2026-07-10,not-a-uuid",
      ].join("\n"),
    });

    expect(prisma.currencyRateSnapshot.findMany).not.toHaveBeenCalled();
    expect(prisma.importValidationIssue.createMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.arrayContaining([
        expect.objectContaining({ rowNumber: 2, field: "rateSnapshotId", code: "INVALID_RATE_SNAPSHOT" }),
      ]),
    }));
  });

  it("canonicalizes an uppercase UUID snapshot id before query and lookup", async () => {
    const canonicalRateId = "abcdef12-abcd-4abc-8abc-abcdefabcdef";
    const matchingRate = {
      id: canonicalRateId,
      organizationId: "org-1",
      transactionCurrency: "USD",
      baseCurrency: "AED",
      rate: new Prisma.Decimal("3.67250000"),
      rateDate: new Date("2026-07-10T00:00:00.000Z"),
      source: CurrencyRateSource.MANUAL,
    };
    const { service, prisma } = makeService({ baseCurrency: "AED", rates: [matchingRate] });

    await service.createImportJob("org-1", "user-1", {
      entityType: ImportEntityType.PRODUCTS_SERVICES,
      filename: "items.csv",
      csvContent: [
        "name,type,sellingPrice,revenueAccountCode,currency,exchangeRate,rateDate,rateSnapshotId",
        `Uppercase snapshot,SERVICE,100.0000,400,USD,3.67250000,2026-07-10,${canonicalRateId.toUpperCase()}`,
      ].join("\n"),
    });

    expect(prisma.currencyRateSnapshot.findMany).toHaveBeenCalledWith({
      where: { organizationId: "org-1", id: { in: [canonicalRateId] } },
    });
    expect(prisma.importJob.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        rows: { create: [expect.objectContaining({
          status: ImportJobRowStatus.VALID,
          normalizedJson: expect.objectContaining({ rateSnapshotId: canonicalRateId }),
        })] },
      }),
    }));
  });

  it("rejects stored normalized evidence that omits a current material field", async () => {
    const { service, prisma, transactionState } = makeService();
    prisma.__setJob(makeJob({
      entityType: ImportEntityType.CUSTOMERS,
      rows: [{
        id: "row-1",
        organizationId: "org-1",
        importJobId: "job-1",
        rowNumber: 2,
        status: ImportJobRowStatus.VALID,
        rawJson: { name: "Reviewed customer", email: "reviewed@example.test" },
        normalizedJson: { name: "Reviewed customer", countryCode: "SA", isActive: true },
      }],
    }));

    await expect(service.commitImportJob("org-1", "user-1", "job-1", { confirmReviewed: true }))
      .rejects.toThrow("Create a new preview");

    expect(transactionState.rolledBack).toBe(true);
    expect(prisma.contact.create).not.toHaveBeenCalled();
    expect(prisma.__getJob().status).toBe(ImportJobStatus.READY_FOR_REVIEW);
  });
});

function makeService(seed: {
  contacts?: Array<Record<string, unknown>>;
  items?: Array<Record<string, unknown>>;
  accounts?: Array<{ id: string; code: string; type: AccountType; isActive: boolean; allowPosting: boolean }>;
  baseCurrency?: string;
  rates?: Array<Record<string, any>>;
  failItemCreateAt?: number;
  costCenters?: Array<Record<string, unknown>>;
  projects?: Array<Record<string, unknown>>;
  recurringTemplates?: Array<Record<string, unknown>>;
  recurringRuns?: Array<Record<string, unknown>>;
} = {}) {
  const store: { job: any; createdItemIds: string[] } = {
    job: makeJob(),
    createdItemIds: [],
  };
  let itemCreateAttempt = 0;
  const transactionState = { rolledBack: false };
  const prisma: any = {
    importJob: {
      create: jest.fn(async (args: any) => {
        store.job = makeJob({
          id: "job-1",
          entityType: args.data.entityType,
          status: args.data.status,
          filename: args.data.filename,
          previewOnly: args.data.previewOnly,
          rows: args.data.rows.create.map((row: any, index: number) => ({ id: `row-${index + 1}`, importJobId: "job-1", ...row })),
          validationIssues: [],
          summaryJson: args.data.summaryJson,
          requestId: args.data.requestId,
        });
        return store.job;
      }),
      findMany: jest.fn(async () => [store.job]),
      findFirst: jest.fn(async () => store.job),
      update: jest.fn(async (args: any) => {
        store.job = { ...store.job, ...args.data };
        return store.job;
      }),
      updateMany: jest.fn(async (args: any) => {
        const matches = store.job.id === args.where.id &&
          store.job.organizationId === args.where.organizationId &&
          (args.where.status === undefined || store.job.status === args.where.status);
        if (!matches) return { count: 0 };
        store.job = { ...store.job, ...args.data };
        return { count: 1 };
      }),
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
      update: jest.fn(async (args: any) => {
        store.job = { ...store.job, rows: store.job.rows.map((row: any) => row.id === args.where.id ? { ...row, ...args.data } : row) };
        return { id: args.where.id, ...args.data };
      }),
      updateMany: jest.fn(async (args: any) => {
        let count = 0;
        store.job = {
          ...store.job,
          rows: store.job.rows.map((row: any) => {
            const matches = (!args.where.id || row.id === args.where.id) &&
              (!args.where.organizationId || row.organizationId === args.where.organizationId) &&
              (!args.where.importJobId || row.importJobId === args.where.importJobId);
            if (matches) count += 1;
            return matches ? { ...row, ...args.data } : row;
          }),
        };
        return { count };
      }),
    },
    contact: {
      findMany: jest.fn(async () => seed.contacts ?? []),
      create: jest.fn(async (args: any) => ({ id: "contact-created", ...args.data })),
    },
    item: {
      findMany: jest.fn(async () => seed.items ?? []),
      create: jest.fn(async (args: any) => {
        itemCreateAttempt += 1;
        if (seed.failItemCreateAt === itemCreateAttempt) throw new Error("simulated item failure");
        const id = `item-created-${itemCreateAttempt}`;
        store.createdItemIds.push(id);
        return { id, ...args.data };
      }),
    },
    account: {
      findMany: jest.fn(async () => seed.accounts ?? [{ id: "revenue-1", code: "400", type: AccountType.REVENUE, isActive: true, allowPosting: true }]),
      findFirst: jest.fn(async (args: any) => (seed.accounts ?? [{ id: "revenue-1", code: "400", type: AccountType.REVENUE, isActive: true, allowPosting: true }]).find((account) => account.code === args.where.code) ?? null),
      create: jest.fn(async (args: any) => ({ id: "account-created", ...args.data })),
    },
    organization: {
      findUnique: jest.fn(async (args: any) => args.where.id === "org-1" ? { baseCurrency: seed.baseCurrency ?? "SAR" } : null),
    },
    currencyRateSnapshot: {
      findMany: jest.fn(async (args: any) => (seed.rates ?? []).filter((rate) =>
        rate.organizationId === args.where.organizationId && args.where.id.in.includes(rate.id))),
    },
    costCenter: { findMany: jest.fn(async () => seed.costCenters ?? []) },
    project: { findMany: jest.fn(async () => seed.projects ?? []) },
    taxRate: { findMany: jest.fn(async () => []) },
    branch: { findMany: jest.fn(async () => []) },
    recurringTransactionTemplate: { findMany: jest.fn(async () => seed.recurringTemplates ?? []) },
    recurringTransactionRun: { findMany: jest.fn(async () => seed.recurringRuns ?? []) },
  };
  prisma.__setJob = (job: any) => { store.job = job; };
  prisma.__getJob = () => store.job;
  prisma.__getCreatedItemIds = () => store.createdItemIds;
  prisma.$transaction = jest.fn(async (callback: (tx: any) => Promise<any>) => {
    const before = store.job;
    const createdItemCount = store.createdItemIds.length;
    try {
      return await callback(prisma);
    } catch (error) {
      store.job = before;
      store.createdItemIds.splice(createdItemCount);
      transactionState.rolledBack = true;
      throw error;
    }
  });
  const auditLog = { log: jest.fn(async () => undefined) };
  const observability = { getRequestId: jest.fn(() => "req-import-1") };
  const recurringTemplates = { createInTransaction: jest.fn(async (_tx, _organizationId, _actorUserId, dto) => ({ id: "recurring-created", ...dto })) };
  return { service: new (MigrationToolkitService as any)(prisma, auditLog, observability, recurringTemplates), prisma, auditLog, transactionState, recurringTemplates };
}

function makeJob(overrides: Record<string, any> = {}) {
  const rows = (overrides.rows ?? []).map((row: Record<string, any>) => ({
    status: ImportJobRowStatus.VALID,
    ...row,
    rawJson: row.rawJson ?? row.normalizedJson ?? {},
  }));
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
    validationIssues: [],
    ...overrides,
    rows,
  };
}

function sameCurrencyProductEvidence(name: string, sellingPrice: string) {
  return {
    rawJson: { name, type: "SERVICE", sellingPrice, revenueAccountCode: "400" },
    normalizedJson: {
      name,
      sku: null,
      type: "SERVICE",
      sellingPrice,
      transactionSellingPrice: sellingPrice,
      baseSellingPrice: sellingPrice,
      currency: "SAR",
      baseCurrency: "SAR",
      exchangeRate: "1",
      rateDate: null,
      rateSource: CurrencyRateSource.SYSTEM_RATE_1,
      rateSnapshotId: null,
      revenueAccountCode: "400",
      status: "ACTIVE",
    },
  };
}
