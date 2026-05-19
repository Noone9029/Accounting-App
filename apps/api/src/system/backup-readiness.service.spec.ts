import {
  BackupRestoreEvidenceScope,
  BackupRestoreEvidenceStatus,
  BackupRestoreEvidenceType,
} from "@prisma/client";
import { BadRequestException } from "@nestjs/common";
import { AUDIT_EVENTS, AUDIT_ENTITY_TYPES } from "../audit-log/audit-events";
import { BackupReadinessService } from "./backup-readiness.service";

describe("BackupReadinessService", () => {
  function evidence(overrides: Record<string, unknown> = {}) {
    return {
      id: "evidence-1",
      organizationId: "org-1",
      scope: BackupRestoreEvidenceScope.ORGANIZATION,
      status: BackupRestoreEvidenceStatus.DRAFT,
      evidenceType: BackupRestoreEvidenceType.DATABASE_BACKUP,
      provider: null,
      evidenceSummaryJson: { summary: "Nightly non-production snapshot evidence." },
      verifiedById: null,
      verifiedAt: null,
      revokedById: null,
      revokedAt: null,
      note: null,
      productionReadyContribution: false,
      createdById: "user-1",
      createdAt: new Date("2026-05-19T10:00:00.000Z"),
      updatedAt: new Date("2026-05-19T10:00:00.000Z"),
      ...overrides,
    };
  }

  function makeService(records: Array<ReturnType<typeof evidence>> = []) {
    const prisma = {
      backupRestoreEvidence: {
        findMany: jest.fn().mockResolvedValue(records),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve(evidence({ ...data, id: "created-evidence" }))),
        findFirst: jest.fn().mockResolvedValue(records[0] ?? null),
        update: jest.fn().mockImplementation(({ data }) => Promise.resolve(evidence({ ...records[0], ...data }))),
      },
    };
    const audit = { log: jest.fn().mockResolvedValue(undefined) };
    return { service: new BackupReadinessService(prisma as never, audit as never), prisma, audit };
  }

  it("reports backup readiness as read-only with missing evidence by default", async () => {
    const { service, prisma } = makeService();

    const readiness = await service.backupReadiness("org-1");

    expect(readiness).toMatchObject({
      readOnly: true,
      noMutation: true,
      noBackupExecuted: true,
      noRestoreExecuted: true,
      noSecretsReturned: true,
      productionReady: false,
      databaseBackupConfigured: false,
      pointInTimeRecoveryConfigured: false,
      migrationHistoryAvailable: false,
      objectStorageBackupConfigured: false,
      generatedDocumentBackupConfigured: false,
      attachmentBackupConfigured: false,
      restoreDrillVerified: false,
      restoreVerificationVerified: false,
      rpoRtoReviewed: false,
      evidenceRequired: true,
    });
    expect(readiness.requiredEvidenceTypes).toContain("DATABASE_BACKUP");
    expect(readiness.missingEvidenceTypes).toContain("RPO_RTO_REVIEW");
    expect(readiness.blockers.length).toBeGreaterThan(0);
    expect(prisma.backupRestoreEvidence.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { OR: [{ organizationId: "org-1" }, { organizationId: null }] },
    }));
  });

  it("keeps production readiness false when RPO/RTO review evidence is missing", async () => {
    const verifiedExceptRpo = Object.values(BackupRestoreEvidenceType)
      .filter((evidenceType) => evidenceType !== BackupRestoreEvidenceType.RPO_RTO_REVIEW && evidenceType !== BackupRestoreEvidenceType.OTHER)
      .map((evidenceType, index) =>
        evidence({
          id: `evidence-${index}`,
          status: BackupRestoreEvidenceStatus.VERIFIED,
          evidenceType,
          productionReadyContribution: true,
        }),
      );
    const { service } = makeService(verifiedExceptRpo);

    const readiness = await service.backupReadiness("org-1");

    expect(readiness.productionReady).toBe(false);
    expect(readiness.rpoRtoReviewed).toBe(false);
    expect(readiness.missingEvidenceTypes).toContain("RPO_RTO_REVIEW");
  });

  it("returns a restore drill plan without executing restore or exposing data", async () => {
    const { service, prisma } = makeService();

    const plan = await service.restoreDrillPlan("org-1");

    expect(plan).toMatchObject({
      readOnly: true,
      noMutation: true,
      noRestoreExecuted: true,
      noCustomerDataExported: true,
      noSecretsReturned: true,
      productionReady: false,
    });
    expect(plan.plannedSteps).toEqual(expect.arrayContaining([
      expect.stringContaining("restore into isolated environment"),
      expect.stringContaining("verify email sending disabled"),
    ]));
    expect(prisma.backupRestoreEvidence.create).not.toHaveBeenCalled();
  });

  it("creates metadata-only evidence and audits it without secret values", async () => {
    const { service, prisma, audit } = makeService();

    const result = await service.createBackupEvidence("org-1", "user-1", {
      evidenceType: BackupRestoreEvidenceType.DATABASE_BACKUP,
      scope: BackupRestoreEvidenceScope.ORGANIZATION,
      provider: "Supabase",
      evidenceSummaryJson: { cadence: "nightly", storage: "managed snapshots" },
      note: "Controlled-beta backup runbook reviewed.",
    });

    expect(result).toMatchObject({
      metadataOnly: true,
      noBackupExecuted: true,
      noRestoreExecuted: true,
      noSecretsReturned: true,
      evidence: {
        id: "created-evidence",
        evidenceType: "DATABASE_BACKUP",
        provider: "Supabase",
      },
    });
    expect(prisma.backupRestoreEvidence.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ organizationId: "org-1", productionReadyContribution: false }),
    }));
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({
      action: AUDIT_EVENTS.BACKUP_RESTORE_EVIDENCE_CREATED,
      entityType: AUDIT_ENTITY_TYPES.BACKUP_RESTORE_EVIDENCE,
    }));
    expect(JSON.stringify(result)).not.toContain("DATABASE_URL");
  });

  it("rejects database URLs, service role keys, storage credentials, and signed XML or QR bodies", async () => {
    const { service } = makeService();
    const unsafePayloads = [
      { evidenceSummaryJson: { databaseUrl: "postgresql://user:pass@localhost:5432/db" } },
      { evidenceSummaryJson: { supabaseServiceRoleKey: "service-role-secret" } },
      { evidenceSummaryJson: { S3_SECRET_ACCESS_KEY: "object-storage-secret" } },
      { evidenceSummaryJson: { signedXmlBody: "<Invoice><ext:UBLExtensions /></Invoice>" } },
      { evidenceSummaryJson: { qrPayloadBody: "customer QR payload" } },
    ];

    for (const payload of unsafePayloads) {
      await expect(
        service.createBackupEvidence("org-1", "user-1", {
          evidenceType: BackupRestoreEvidenceType.RESTORE_DRILL,
          scope: BackupRestoreEvidenceScope.ORGANIZATION,
          ...payload,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    }
  });

  it("verifies and revokes backup evidence", async () => {
    const { service, prisma, audit } = makeService([evidence()]);

    const verified = await service.verifyBackupEvidence("org-1", "user-1", "evidence-1", {
      productionReadyContribution: true,
      note: "Reviewed by operations.",
    });
    expect(verified.evidence.status).toBe("VERIFIED");
    expect(verified.evidence.productionReadyContribution).toBe(true);

    prisma.backupRestoreEvidence.findFirst.mockResolvedValueOnce(evidence({ status: BackupRestoreEvidenceStatus.VERIFIED }));
    const revoked = await service.revokeBackupEvidence("org-1", "user-1", "evidence-1", { note: "Superseded." });
    expect(revoked.evidence.status).toBe("REVOKED");
    expect(revoked.evidence.productionReadyContribution).toBe(false);
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: AUDIT_EVENTS.BACKUP_RESTORE_EVIDENCE_VERIFIED }));
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: AUDIT_EVENTS.BACKUP_RESTORE_EVIDENCE_REVOKED }));
  });
});
