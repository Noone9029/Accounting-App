import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { ZatcaController } from "./zatca.controller";
import { ZatcaService } from "./zatca.service";

const officialKeyOrder = [
  "csr.common.name",
  "csr.serial.number",
  "csr.organization.identifier",
  "csr.organization.unit.name",
  "csr.organization.name",
  "csr.country.name",
  "csr.invoice.type",
  "csr.location.address",
  "csr.industry.business.category",
];

const sanitizedPreview = officialKeyOrder
  .map((key) => {
    const values: Record<string, string> = {
      "csr.common.name": "TST-886431145-399999999900003",
      "csr.serial.number": "1-TST|2-TST|3-ed22f1d8-e6a2-1118-9b58-d9a8f11e445f",
      "csr.organization.identifier": "399999999900003",
      "csr.organization.unit.name": "Riyadh Branch",
      "csr.organization.name": "Maximum Speed Tech Supply LTD",
      "csr.country.name": "SA",
      "csr.invoice.type": "1100",
      "csr.location.address": "RRRD2929",
      "csr.industry.business.category": "Supply activities",
    };
    return `${key}=${values[key]}`;
  })
  .join("\n") + "\n";

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function makePreview(overrides: Record<string, unknown> = {}) {
  const configEntries = officialKeyOrder.map((key) => ({
    key,
    valuePreview: key,
    status: "AVAILABLE",
    source: key === "csr.organization.identifier" ? "ZATCA_PROFILE" : "EGS_UNIT",
    officialSource: "CSR_CONFIG_TEMPLATE",
    notes: "Official SDK CSR config preview field.",
  }));
  return {
    localOnly: true,
    dryRun: true,
    noMutation: true,
    noCsidRequest: true,
    noNetwork: true,
    productionCompliance: false,
    canPrepareConfig: true,
    sanitizedConfigPreview: sanitizedPreview,
    configEntries,
    missingFields: [],
    reviewFields: [],
    blockers: [],
    warnings: ["No private key, certificate body, CSID token, OTP, generated CSR body, signing output, or production credential is included."],
    officialSources: [],
    ...overrides,
  };
}

function makeReview(overrides: Record<string, unknown> = {}) {
  const now = new Date("2026-05-16T12:00:00.000Z");
  return {
    id: "review-1",
    organizationId: "org-1",
    egsUnitId: "egs-1",
    status: "DRAFT",
    configHash: sha256(sanitizedPreview),
    configPreviewRedacted: sanitizedPreview,
    configKeyOrder: officialKeyOrder,
    missingFieldsJson: [],
    reviewFieldsJson: [],
    blockersJson: [],
    warningsJson: [],
    approvedById: null,
    approvedAt: null,
    approvedBy: null,
    revokedById: null,
    revokedAt: null,
    revokedBy: null,
    note: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeEgsUnit(overrides: Record<string, unknown> = {}) {
  return {
    id: "egs-1",
    organizationId: "org-1",
    profileId: "profile-1",
    name: "Dev EGS",
    environment: "SANDBOX",
    status: "DRAFT",
    deviceSerialNumber: "DEV-001",
    solutionName: "LedgerByte",
    csrCommonName: "TST-886431145-399999999900003",
    csrSerialNumber: "1-TST|2-TST|3-ed22f1d8-e6a2-1118-9b58-d9a8f11e445f",
    csrOrganizationUnitName: "Riyadh Branch",
    csrInvoiceType: "1100",
    csrLocationAddress: "RRRD2929",
    csrPem: null,
    complianceCsidPem: null,
    productionCsidPem: null,
    certificateRequestId: null,
    lastInvoiceHash: "previous-hash",
    lastIcv: 9,
    hashMode: "SDK_GENERATED",
    hashModeEnabledAt: null,
    hashModeEnabledById: null,
    hashModeResetReason: null,
    sdkHashChainStartedAt: null,
    isActive: true,
    createdAt: new Date("2026-05-16T12:00:00.000Z"),
    updatedAt: new Date("2026-05-16T12:00:00.000Z"),
    privateKeyPem: null,
    ...overrides,
  };
}

function makePlan() {
  const values: Record<string, string> = {
    "csr.common.name": "TST-886431145-399999999900003",
    "csr.serial.number": "1-TST|2-TST|3-ed22f1d8-e6a2-1118-9b58-d9a8f11e445f",
    "csr.organization.identifier": "399999999900003",
    "csr.organization.unit.name": "Riyadh Branch",
    "csr.organization.name": "Maximum Speed Tech Supply LTD",
    "csr.country.name": "SA",
    "csr.invoice.type": "1100",
    "csr.location.address": "RRRD2929",
    "csr.industry.business.category": "Supply activities",
  };
  const requiredFields = officialKeyOrder.map((key) => ({
    sdkConfigKey: key,
    label: key,
    officialSource: "CSR_CONFIG_TEMPLATE",
    currentValue: values[key],
    status: "AVAILABLE",
    source: key === "csr.organization.identifier" ? "ZATCA_PROFILE" : "EGS_UNIT",
    notes: "Official SDK CSR config preview field.",
  }));
  return {
    localOnly: true,
    dryRun: true,
    noMutation: true,
    productionCompliance: false,
    noCsidRequest: true,
    warning: "Local-only CSR plan.",
    sdkCommand: "fatoora -csr",
    egsUnit: makeEgsUnit(),
    requiredFields,
    availableValues: requiredFields,
    missingValues: [],
    plannedSdkConfigFields: requiredFields.map((field) => ({ key: field.sdkConfigKey, currentValue: field.currentValue, status: field.status, source: field.source })),
    plannedFiles: { csrConfig: "csr-config.properties", privateKey: "private-key.pem", generatedCsr: "generated-csr.pem" },
    keyCustody: { mode: "MISSING", privateKeyConfigured: false, privateKeyReturned: false, redaction: "Private key content is never returned." },
    certificateState: {
      complianceCsid: "missing",
      productionCsid: "missing",
      certificateRequestId: null,
      certificateExpiryKnown: false,
      certificateExpiresAt: null,
      renewalStatus: "MISSING",
    },
    blockers: [],
    warnings: [],
    recommendedNextSteps: [],
  };
}

function makeDryRun(overrides: Record<string, unknown> = {}) {
  const plan = makePlan();
  const csrConfigEntries = officialKeyOrder.map((key) => ({
    key,
    valuePreview: key === "csr.common.name" ? "TST-886431145-399999999900003" : key,
    status: "AVAILABLE",
    source: key === "csr.organization.identifier" ? "ZATCA_PROFILE" : "EGS_UNIT",
    officialSource: "CSR_CONFIG_TEMPLATE",
    notes: "Official SDK CSR config preview field.",
  }));

  return {
    ...plan,
    noNetwork: true,
    configReviewRequired: true,
    latestReviewId: "review-1",
    latestReviewStatus: "APPROVED",
    configApprovedForDryRun: true,
    currentConfigHash: sha256(sanitizedPreview),
    executionEnabled: process.env.ZATCA_SDK_CSR_EXECUTION_ENABLED === "true",
    executionSkipped: true,
    executionSkipReason: "SDK execution is gated.",
    prepareFilesRequested: false,
    tempDirectory: null,
    plannedFiles: {
      csrConfig: "csr-config.properties",
      privateKey: "generated-private-key.pem",
      generatedCsr: "generated-csr.pem",
    },
    preparedFiles: { csrConfig: false, privateKey: false, generatedCsr: false, cleanupPerformed: false, retained: false },
    csrConfigEntries,
    commandPlan: {
      command: "node",
      args: [
        "-csr",
        "-csrConfig",
        "csr-config.properties",
        "-privateKey",
        "generated-private-key.pem",
        "-generatedCsr",
        "generated-csr.pem",
        "-pem",
      ],
      displayCommand: "node -csr -csrConfig csr-config.properties -privateKey generated-private-key.pem -generatedCsr generated-csr.pem -pem",
      envAdditions: {},
      workingDirectory: "temp",
      warnings: [],
    },
    sdkReadiness: {
      enabled: true,
      referenceFolderFound: true,
      sdkJarFound: true,
      fatooraLauncherFound: true,
      jqFound: true,
      configDirFound: true,
      workingDirectoryWritable: true,
      supportedCommandsKnown: true,
      javaFound: true,
      javaVersion: "11.0.20",
      javaMajorVersion: 11,
      javaVersionSupported: true,
      canAttemptSdkValidation: true,
      canRunLocalValidation: true,
      blockingReasons: [],
      warnings: [],
      timeoutMs: 30000,
    },
    blockers: [],
    warnings: [],
    ...overrides,
  };
}

describe("ZATCA CSR config review workflow routes", () => {
  it("exposes local-only CSR config review route handlers", () => {
    expect(typeof ZatcaController.prototype.createEgsUnitCsrConfigReview).toBe("function");
    expect(typeof ZatcaController.prototype.listEgsUnitCsrConfigReviews).toBe("function");
    expect(typeof ZatcaController.prototype.approveCsrConfigReview).toBe("function");
    expect(typeof ZatcaController.prototype.revokeCsrConfigReview).toBe("function");
    expect(typeof ZatcaController.prototype.getEgsCsrLocalGenerate).toBe("function");
  });
});

describe("ZATCA CSR config review workflow", () => {
  const originalCsrExecutionFlag = process.env.ZATCA_SDK_CSR_EXECUTION_ENABLED;

  afterEach(() => {
    if (originalCsrExecutionFlag === undefined) {
      delete process.env.ZATCA_SDK_CSR_EXECUTION_ENABLED;
    } else {
      process.env.ZATCA_SDK_CSR_EXECUTION_ENABLED = originalCsrExecutionFlag;
    }
    jest.restoreAllMocks();
  });

  it("creates a review from the sanitized preview, hashes it, supersedes active reviews, and audits without secrets", async () => {
    const createdReview = makeReview();
    const tx = {
      zatcaCsrConfigReview: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        create: jest.fn().mockResolvedValue(createdReview),
      },
    };
    const prisma = { $transaction: jest.fn((callback: (txArg: typeof tx) => Promise<unknown>) => callback(tx)) };
    const auditLogService = { log: jest.fn() };
    const service = new ZatcaService(prisma as never, auditLogService as never);
    jest.spyOn(service, "getEgsUnitCsrConfigPreview").mockResolvedValue(makePreview() as never);

    const result = await service.createEgsUnitCsrConfigReview("org-1", "user-1", "egs-1", { note: "Reviewed official CSR config values." });

    expect(tx.zatcaCsrConfigReview.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ egsUnitId: "egs-1", status: { in: ["DRAFT", "APPROVED"] } }),
        data: { status: "SUPERSEDED" },
      }),
    );
    expect(tx.zatcaCsrConfigReview.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          configHash: sha256(sanitizedPreview),
          configPreviewRedacted: sanitizedPreview,
          configKeyOrder: officialKeyOrder,
          note: "Reviewed official CSR config values.",
        }),
      }),
    );
    expect(result).toMatchObject({ status: "DRAFT", localOnly: true, noCsidRequest: true, noNetwork: true, productionCompliance: false });
    const serialized = JSON.stringify([result, auditLogService.log.mock.calls, tx.zatcaCsrConfigReview.create.mock.calls]);
    expect(serialized).not.toContain("PRIVATE KEY");
    expect(serialized).not.toContain("binarySecurityToken");
    expect(serialized).not.toContain("OTP");
    expect(serialized).not.toContain("BEGIN CERTIFICATE REQUEST");
    expect(auditLogService.log).toHaveBeenCalledWith(expect.objectContaining({ action: "CREATE", entityType: "ZatcaCsrConfigReview", entityId: "review-1" }));
  });

  it("blocks approval when required CSR config preview fields are missing", async () => {
    const preview = makePreview({ canPrepareConfig: false, missingFields: [{ key: "csr.common.name" }], blockers: ["Missing CSR config value csr.common.name"] });
    const prisma = {
      zatcaCsrConfigReview: { findFirst: jest.fn().mockResolvedValue(makeReview({ configHash: sha256(preview.sanitizedConfigPreview) })), update: jest.fn() },
      zatcaEgsUnit: { findFirst: jest.fn().mockResolvedValue(makeEgsUnit()), update: jest.fn() },
      zatcaSubmissionLog: { create: jest.fn() },
    };
    const service = new ZatcaService(prisma as never, { log: jest.fn() } as never);
    jest.spyOn(service, "getEgsUnitCsrConfigPreview").mockResolvedValue(preview as never);

    await expect(service.approveCsrConfigReview("org-1", "user-1", "review-1")).rejects.toThrow("cannot be approved");

    expect(prisma.zatcaCsrConfigReview.update).not.toHaveBeenCalled();
    expect(prisma.zatcaEgsUnit.update).not.toHaveBeenCalled();
    expect(prisma.zatcaSubmissionLog.create).not.toHaveBeenCalled();
  });

  it("approves an unchanged ready review without mutating hash-chain fields or calling adapters", async () => {
    const onboardingAdapter = { requestComplianceCsid: jest.fn(), requestProductionCsid: jest.fn() };
    const approvedReview = makeReview({ status: "APPROVED", approvedById: "user-1", approvedAt: new Date("2026-05-16T12:05:00.000Z") });
    const prisma = {
      zatcaCsrConfigReview: { findFirst: jest.fn().mockResolvedValue(makeReview()), update: jest.fn().mockResolvedValue(approvedReview) },
      zatcaEgsUnit: { findFirst: jest.fn().mockResolvedValue(makeEgsUnit()), update: jest.fn() },
      zatcaSubmissionLog: { create: jest.fn() },
    };
    const auditLogService = { log: jest.fn() };
    const service = new ZatcaService(prisma as never, auditLogService as never, onboardingAdapter as never);
    jest.spyOn(service, "getEgsUnitCsrConfigPreview").mockResolvedValue(makePreview() as never);

    const result = await service.approveCsrConfigReview("org-1", "user-1", "review-1");

    expect(result).toMatchObject({ status: "APPROVED", approvedById: "user-1", productionCompliance: false });
    expect(prisma.zatcaEgsUnit.update).not.toHaveBeenCalled();
    expect(prisma.zatcaSubmissionLog.create).not.toHaveBeenCalled();
    expect(onboardingAdapter.requestComplianceCsid).not.toHaveBeenCalled();
    expect(onboardingAdapter.requestProductionCsid).not.toHaveBeenCalled();
    expect(auditLogService.log).toHaveBeenCalledWith(expect.objectContaining({ action: "APPROVE", entityType: "ZatcaCsrConfigReview" }));
  });

  it("revokes an active review and audits the local-only action", async () => {
    const revokedReview = makeReview({ status: "REVOKED", revokedById: "user-1", revokedAt: new Date("2026-05-16T12:10:00.000Z") });
    const prisma = {
      zatcaCsrConfigReview: { findFirst: jest.fn().mockResolvedValue(makeReview({ status: "APPROVED" })), update: jest.fn().mockResolvedValue(revokedReview) },
      zatcaEgsUnit: { findFirst: jest.fn().mockResolvedValue(makeEgsUnit()), update: jest.fn() },
      zatcaSubmissionLog: { create: jest.fn() },
    };
    const auditLogService = { log: jest.fn() };
    const service = new ZatcaService(prisma as never, auditLogService as never);

    const result = await service.revokeCsrConfigReview("org-1", "user-1", "review-1", { note: "Local approval revoked." });

    expect(result).toMatchObject({ status: "REVOKED", revokedById: "user-1", noNetwork: true, productionCompliance: false });
    expect(prisma.zatcaEgsUnit.update).not.toHaveBeenCalled();
    expect(prisma.zatcaSubmissionLog.create).not.toHaveBeenCalled();
    expect(auditLogService.log).toHaveBeenCalledWith(expect.objectContaining({ action: "REVOKE", entityType: "ZatcaCsrConfigReview" }));
  });

  it("rejects production EGS review listing", async () => {
    const prisma = {
      zatcaCsrConfigReview: { findMany: jest.fn() },
      zatcaEgsUnit: { findFirst: jest.fn().mockResolvedValue(makeEgsUnit({ environment: "PRODUCTION" })) },
    };
    const service = new ZatcaService(prisma as never, { log: jest.fn() } as never);

    await expect(service.listEgsUnitCsrConfigReviews("org-1", "egs-1")).rejects.toThrow("non-production EGS units");
    expect(prisma.zatcaCsrConfigReview.findMany).not.toHaveBeenCalled();
  });

  it("surfaces latest review status in CSR dry-run without requiring SDK execution", async () => {
    const prisma = {
      zatcaCsrConfigReview: { findFirst: jest.fn().mockResolvedValue(makeReview({ status: "APPROVED" })) },
      zatcaEgsUnit: { update: jest.fn() },
      zatcaSubmissionLog: { create: jest.fn() },
    };
    const service = new ZatcaService(prisma as never, { log: jest.fn() } as never);
    jest.spyOn(service, "getEgsUnitCsrPlan").mockResolvedValue(makePlan() as never);

    const result = await service.getEgsUnitCsrDryRun("org-1", "egs-1");

    expect(result).toMatchObject({
      localOnly: true,
      dryRun: true,
      noMutation: true,
      noCsidRequest: true,
      noNetwork: true,
      productionCompliance: false,
      configReviewRequired: true,
      latestReviewId: "review-1",
      latestReviewStatus: "APPROVED",
      configApprovedForDryRun: true,
    });
    expect(prisma.zatcaEgsUnit.update).not.toHaveBeenCalled();
    expect(prisma.zatcaSubmissionLog.create).not.toHaveBeenCalled();
  });

  it("keeps CSR local generation blocked when the execution gate is disabled", async () => {
    process.env.ZATCA_SDK_CSR_EXECUTION_ENABLED = "false";
    const prisma = {
      zatcaEgsUnit: { update: jest.fn() },
      zatcaSubmissionLog: { create: jest.fn() },
    };
    const service = new ZatcaService(prisma as never, { log: jest.fn() } as never);
    jest.spyOn(service, "getEgsUnitCsrDryRun").mockResolvedValue(makeDryRun({ executionEnabled: false }) as never);
    const executeSpy = jest.spyOn(service as unknown as { executeZatcaSdkCsrCommand: () => Promise<unknown> }, "executeZatcaSdkCsrCommand");

    const result = await service.getEgsUnitCsrLocalGenerate("org-1", "egs-1");

    expect(result).toMatchObject({
      localOnly: true,
      noMutation: true,
      noCsidRequest: true,
      noNetwork: true,
      noSigning: true,
      noPersistence: true,
      productionCompliance: false,
      executionEnabled: false,
      executionAttempted: false,
      executionSkipped: true,
    });
    expect(result.blockers).toEqual(expect.arrayContaining(["ZATCA_SDK_CSR_EXECUTION_ENABLED is false; local SDK CSR generation is skipped."]));
    expect(executeSpy).not.toHaveBeenCalled();
    expect(prisma.zatcaEgsUnit.update).not.toHaveBeenCalled();
    expect(prisma.zatcaSubmissionLog.create).not.toHaveBeenCalled();
  });

  it("blocks CSR local generation without an approved current review", async () => {
    process.env.ZATCA_SDK_CSR_EXECUTION_ENABLED = "true";
    const prisma = {
      zatcaEgsUnit: { update: jest.fn() },
      zatcaSubmissionLog: { create: jest.fn() },
    };
    const service = new ZatcaService(prisma as never, { log: jest.fn() } as never);
    jest
      .spyOn(service, "getEgsUnitCsrDryRun")
      .mockResolvedValue(makeDryRun({ latestReviewStatus: "DRAFT", configApprovedForDryRun: false, executionEnabled: true }) as never);
    const executeSpy = jest.spyOn(service as unknown as { executeZatcaSdkCsrCommand: () => Promise<unknown> }, "executeZatcaSdkCsrCommand");

    const result = await service.getEgsUnitCsrLocalGenerate("org-1", "egs-1");

    expect(result.executionAttempted).toBe(false);
    expect(result.blockers).toEqual(expect.arrayContaining(["An APPROVED CSR config review is required before local SDK CSR generation can run."]));
    expect(executeSpy).not.toHaveBeenCalled();
    expect(prisma.zatcaEgsUnit.update).not.toHaveBeenCalled();
    expect(prisma.zatcaSubmissionLog.create).not.toHaveBeenCalled();
  });

  it("blocks CSR local generation when the approved review hash no longer matches the current preview", async () => {
    process.env.ZATCA_SDK_CSR_EXECUTION_ENABLED = "true";
    const prisma = {
      zatcaEgsUnit: { update: jest.fn() },
      zatcaSubmissionLog: { create: jest.fn() },
    };
    const service = new ZatcaService(prisma as never, { log: jest.fn() } as never);
    jest
      .spyOn(service, "getEgsUnitCsrDryRun")
      .mockResolvedValue(makeDryRun({ latestReviewStatus: "APPROVED", configApprovedForDryRun: false, executionEnabled: true }) as never);
    const executeSpy = jest.spyOn(service as unknown as { executeZatcaSdkCsrCommand: () => Promise<unknown> }, "executeZatcaSdkCsrCommand");

    const result = await service.getEgsUnitCsrLocalGenerate("org-1", "egs-1");

    expect(result.executionAttempted).toBe(false);
    expect(result.blockers).toEqual(expect.arrayContaining(["Current CSR config preview hash must match the latest approved review before execution."]));
    expect(executeSpy).not.toHaveBeenCalled();
    expect(prisma.zatcaEgsUnit.update).not.toHaveBeenCalled();
    expect(prisma.zatcaSubmissionLog.create).not.toHaveBeenCalled();
  });

  it("blocks CSR local generation when dry-run planning reports production or missing-field blockers", async () => {
    process.env.ZATCA_SDK_CSR_EXECUTION_ENABLED = "true";
    const prisma = {
      zatcaEgsUnit: { update: jest.fn() },
      zatcaSubmissionLog: { create: jest.fn() },
    };
    const service = new ZatcaService(prisma as never, { log: jest.fn() } as never);
    jest
      .spyOn(service, "getEgsUnitCsrDryRun")
      .mockResolvedValue(makeDryRun({ executionEnabled: true, blockers: ["CSR dry-run is restricted to non-production EGS units.", "Missing required official CSR fields: csr.common.name."] }) as never);
    const executeSpy = jest.spyOn(service as unknown as { executeZatcaSdkCsrCommand: () => Promise<unknown> }, "executeZatcaSdkCsrCommand");

    const result = await service.getEgsUnitCsrLocalGenerate("org-1", "egs-1");

    expect(result.executionAttempted).toBe(false);
    expect(result.blockers).toEqual(expect.arrayContaining(["CSR dry-run is restricted to non-production EGS units.", "Missing required official CSR fields: csr.common.name."]));
    expect(executeSpy).not.toHaveBeenCalled();
    expect(prisma.zatcaEgsUnit.update).not.toHaveBeenCalled();
    expect(prisma.zatcaSubmissionLog.create).not.toHaveBeenCalled();
  });

  it("executes CSR local generation only behind the gate, writes temp files, redacts output, cleans up, and does not persist secrets", async () => {
    process.env.ZATCA_SDK_CSR_EXECUTION_ENABLED = "true";
    const prisma = {
      zatcaEgsUnit: { update: jest.fn() },
      zatcaSubmissionLog: { create: jest.fn() },
    };
    const service = new ZatcaService(prisma as never, { log: jest.fn() } as never);
    jest.spyOn(service, "getEgsUnitCsrDryRun").mockResolvedValue(makeDryRun({ executionEnabled: true }) as never);
    jest.spyOn(service as unknown as { executeZatcaSdkCsrCommand: (commandPlan: { args: string[] }) => Promise<unknown> }, "executeZatcaSdkCsrCommand").mockImplementation(async (commandPlan) => {
      const privateKeyIndex = commandPlan.args.indexOf("-privateKey") + 1;
      const generatedCsrIndex = commandPlan.args.indexOf("-generatedCsr") + 1;
      const privateKeyPath = commandPlan.args[privateKeyIndex];
      const generatedCsrPath = commandPlan.args[generatedCsrIndex];
      if (!privateKeyPath || !generatedCsrPath) {
        throw new Error("CSR command plan did not include expected output paths.");
      }
      writeFileSync(privateKeyPath, "-----BEGIN PRIVATE KEY-----\nsecret\n-----END PRIVATE KEY-----\n");
      writeFileSync(generatedCsrPath, "-----BEGIN CERTIFICATE REQUEST-----\ncsr\n-----END CERTIFICATE REQUEST-----\n");
      return {
        exitCode: 0,
        stdout: "created PRIVATE KEY and -----BEGIN CERTIFICATE REQUEST-----csr-----END CERTIFICATE REQUEST----- binarySecurityToken=abc OTP=123",
        stderr: "privateKeyPem=secret token=abc",
        timedOut: false,
      };
    });

    const result = await service.getEgsUnitCsrLocalGenerate("org-1", "egs-1");
    const serialized = JSON.stringify(result);

    expect(result).toMatchObject({
      localOnly: true,
      noMutation: true,
      noCsidRequest: true,
      noNetwork: true,
      noSigning: true,
      noPersistence: true,
      productionCompliance: false,
      executionEnabled: true,
      executionAttempted: true,
      executionSkipped: false,
      reviewId: "review-1",
      configHash: sha256(sanitizedPreview),
      privateKeyDetected: true,
      generatedCsrDetected: true,
    });
    expect(result.tempFilesWritten).toMatchObject({ csrConfig: true, privateKey: true, generatedCsr: true });
    expect(result.cleanup).toMatchObject({ performed: true, success: true, filesRetained: false });
    expect(serialized).not.toContain("BEGIN PRIVATE KEY");
    expect(serialized).not.toContain("BEGIN CERTIFICATE REQUEST");
    expect(serialized).not.toContain("binarySecurityToken");
    expect(serialized).not.toContain("OTP");
    expect(serialized).not.toContain("privateKeyPem=secret");
    expect(prisma.zatcaEgsUnit.update).not.toHaveBeenCalled();
    expect(prisma.zatcaSubmissionLog.create).not.toHaveBeenCalled();
  });
});
