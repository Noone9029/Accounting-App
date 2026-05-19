import { BadRequestException, Injectable, NotFoundException, Optional } from "@nestjs/common";
import {
  BackupRestoreEvidenceScope,
  BackupRestoreEvidenceStatus,
  BackupRestoreEvidenceType,
  Prisma,
} from "@prisma/client";
import { AUDIT_ENTITY_TYPES, AUDIT_EVENTS } from "../audit-log/audit-events";
import { AuditLogService } from "../audit-log/audit-log.service";
import { PrismaService } from "../prisma/prisma.service";
import { CreateBackupRestoreEvidenceDto } from "./dto/create-backup-restore-evidence.dto";
import { RevokeBackupRestoreEvidenceDto } from "./dto/revoke-backup-restore-evidence.dto";
import { VerifyBackupRestoreEvidenceDto } from "./dto/verify-backup-restore-evidence.dto";

const REQUIRED_BACKUP_EVIDENCE_TYPES = [
  BackupRestoreEvidenceType.DATABASE_BACKUP,
  BackupRestoreEvidenceType.POINT_IN_TIME_RECOVERY,
  BackupRestoreEvidenceType.MIGRATION_HISTORY,
  BackupRestoreEvidenceType.OBJECT_STORAGE_BACKUP,
  BackupRestoreEvidenceType.GENERATED_DOCUMENT_BACKUP,
  BackupRestoreEvidenceType.ATTACHMENT_BACKUP,
  BackupRestoreEvidenceType.RESTORE_DRILL,
  BackupRestoreEvidenceType.RESTORE_VERIFICATION,
  BackupRestoreEvidenceType.RPO_RTO_REVIEW,
] as const;

const BACKUP_RESTORE_EVIDENCE_SELECT = {
  id: true,
  organizationId: true,
  scope: true,
  status: true,
  evidenceType: true,
  provider: true,
  evidenceSummaryJson: true,
  verifiedById: true,
  verifiedAt: true,
  revokedById: true,
  revokedAt: true,
  note: true,
  productionReadyContribution: true,
  createdById: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.BackupRestoreEvidenceSelect;

type BackupRestoreEvidenceRecord = Prisma.BackupRestoreEvidenceGetPayload<{ select: typeof BACKUP_RESTORE_EVIDENCE_SELECT }>;

@Injectable()
export class BackupReadinessService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly auditLogService?: AuditLogService,
  ) {}

  async backupReadiness(organizationId: string) {
    const evidence = await this.findRelevantEvidence(organizationId);
    const verifiedEvidenceTypes = this.verifiedEvidenceTypes(evidence);
    const missingEvidenceTypes = REQUIRED_BACKUP_EVIDENCE_TYPES.filter((evidenceType) => !verifiedEvidenceTypes.includes(evidenceType));
    const productionReady = missingEvidenceTypes.length === 0;

    return {
      readOnly: true,
      noMutation: true,
      noBackupExecuted: true,
      noRestoreExecuted: true,
      noSecretsReturned: true,
      productionReady,
      databaseBackupConfigured: verifiedEvidenceTypes.includes(BackupRestoreEvidenceType.DATABASE_BACKUP),
      pointInTimeRecoveryConfigured: verifiedEvidenceTypes.includes(BackupRestoreEvidenceType.POINT_IN_TIME_RECOVERY),
      migrationHistoryAvailable: verifiedEvidenceTypes.includes(BackupRestoreEvidenceType.MIGRATION_HISTORY),
      objectStorageBackupConfigured: verifiedEvidenceTypes.includes(BackupRestoreEvidenceType.OBJECT_STORAGE_BACKUP),
      generatedDocumentBackupConfigured: verifiedEvidenceTypes.includes(BackupRestoreEvidenceType.GENERATED_DOCUMENT_BACKUP),
      attachmentBackupConfigured: verifiedEvidenceTypes.includes(BackupRestoreEvidenceType.ATTACHMENT_BACKUP),
      restoreDrillVerified: verifiedEvidenceTypes.includes(BackupRestoreEvidenceType.RESTORE_DRILL),
      restoreVerificationVerified: verifiedEvidenceTypes.includes(BackupRestoreEvidenceType.RESTORE_VERIFICATION),
      rpoRtoReviewed: verifiedEvidenceTypes.includes(BackupRestoreEvidenceType.RPO_RTO_REVIEW),
      evidenceRequired: true,
      requiredEvidenceTypes: [...REQUIRED_BACKUP_EVIDENCE_TYPES],
      verifiedEvidenceTypes,
      missingEvidenceTypes,
      blockers: backupReadinessBlockers(missingEvidenceTypes),
      warnings: [
        "This endpoint does not run database backups, object-storage exports, or restore operations.",
        "RPO/RTO targets remain business-review placeholders until RPO_RTO_REVIEW evidence is verified.",
        "Legal and accounting retention periods are not inferred by this readiness plan.",
      ],
      recommendedNextSteps: backupReadinessNextSteps(missingEvidenceTypes),
      redactionGuarantees: BACKUP_REDACTION_GUARANTEES,
    };
  }

  async restoreDrillPlan(organizationId: string) {
    const readiness = await this.backupReadiness(organizationId);
    return {
      readOnly: true,
      noMutation: true,
      noRestoreExecuted: true,
      noCustomerDataExported: true,
      noSecretsReturned: true,
      productionReady: false,
      plannedSteps: [
        "snapshot selected from the approved Supabase/Postgres backup source",
        "restore into isolated environment with production email sending disabled",
        "run migrations if the restored snapshot is behind the deployed schema",
        "verify organization and user counts without exporting customer data",
        "verify accounting reports and key ledger balances",
        "verify attachments and generated documents are reachable through tenant-scoped API reads",
        "verify ZATCA metadata remains non-production unless explicitly approved for a separate ZATCA phase",
        "verify email sending disabled in restored environment",
      ],
      blockers: [
        ...readiness.blockers.filter((blocker) => blocker.includes("restore") || blocker.includes("RPO/RTO")),
        "A supervised restore drill has not been executed by this application.",
      ],
      warnings: [
        "This is a restore drill plan only; no database, storage object, document, attachment, or customer data is restored or exported.",
        "Restored environments must keep real customer email sending and real ZATCA network calls disabled by default.",
      ],
      recommendedNextSteps: [
        "Schedule a non-production restore drill with a sanitized environment and documented operator checklist.",
        "Capture RESTORE_DRILL and RESTORE_VERIFICATION evidence after the drill completes.",
        "Capture RPO_RTO_REVIEW evidence after business owners approve targets.",
      ],
    };
  }

  async listBackupEvidence(organizationId: string) {
    const evidence = await this.findRelevantEvidence(organizationId);
    return {
      metadataOnly: true,
      noBackupExecuted: true,
      noRestoreExecuted: true,
      noSecretsReturned: true,
      evidence: evidence.map((entry) => this.backupEvidenceResponse(entry)),
    };
  }

  async createBackupEvidence(organizationId: string, actorUserId: string, dto: CreateBackupRestoreEvidenceDto) {
    this.assertBackupEvidenceContainsNoSecrets(dto);
    const scope = dto.scope ?? BackupRestoreEvidenceScope.ORGANIZATION;
    const scopedOrganizationId = scope === BackupRestoreEvidenceScope.GLOBAL ? null : organizationId;

    await this.prisma.backupRestoreEvidence.updateMany({
      data: {
        status: BackupRestoreEvidenceStatus.SUPERSEDED,
        productionReadyContribution: false,
      },
      where: {
        organizationId: scopedOrganizationId,
        scope,
        evidenceType: dto.evidenceType,
        status: { in: [BackupRestoreEvidenceStatus.DRAFT, BackupRestoreEvidenceStatus.VERIFIED] },
      },
    });

    const evidence = await this.prisma.backupRestoreEvidence.create({
      data: {
        organizationId: scopedOrganizationId,
        scope,
        evidenceType: dto.evidenceType,
        provider: normalizeOptionalText(dto.provider),
        evidenceSummaryJson: dto.evidenceSummaryJson as Prisma.InputJsonObject,
        note: normalizeOptionalText(dto.note),
        createdById: actorUserId,
        productionReadyContribution: false,
      },
      select: BACKUP_RESTORE_EVIDENCE_SELECT,
    });

    await this.auditLogService?.log({
      organizationId,
      actorUserId,
      action: AUDIT_EVENTS.BACKUP_RESTORE_EVIDENCE_CREATED,
      entityType: AUDIT_ENTITY_TYPES.BACKUP_RESTORE_EVIDENCE,
      entityId: evidence.id,
      after: evidence,
    });

    return this.backupEvidenceMutationResponse(evidence);
  }

  async verifyBackupEvidence(organizationId: string, actorUserId: string, id: string, dto: VerifyBackupRestoreEvidenceDto = {}) {
    const existing = await this.findEvidenceById(organizationId, id);
    if (existing.status !== BackupRestoreEvidenceStatus.DRAFT) {
      throw new BadRequestException("Only draft backup/restore evidence can be verified.");
    }
    this.assertBackupEvidenceContainsNoSecrets(existing);
    this.assertBackupEvidenceContainsNoSecrets(dto);

    const contributionRequested = dto.productionReadyContribution ?? isRequiredBackupEvidenceType(existing.evidenceType);
    const productionReadyContribution = contributionRequested && isRequiredBackupEvidenceType(existing.evidenceType);
    const verified = await this.prisma.backupRestoreEvidence.update({
      where: { id },
      data: {
        status: BackupRestoreEvidenceStatus.VERIFIED,
        verifiedById: actorUserId,
        verifiedAt: new Date(),
        note: normalizeOptionalText(dto.note) ?? existing.note,
        productionReadyContribution,
      },
      select: BACKUP_RESTORE_EVIDENCE_SELECT,
    });

    await this.auditLogService?.log({
      organizationId,
      actorUserId,
      action: AUDIT_EVENTS.BACKUP_RESTORE_EVIDENCE_VERIFIED,
      entityType: AUDIT_ENTITY_TYPES.BACKUP_RESTORE_EVIDENCE,
      entityId: verified.id,
      before: existing,
      after: verified,
    });

    return this.backupEvidenceMutationResponse(verified);
  }

  async revokeBackupEvidence(organizationId: string, actorUserId: string, id: string, dto: RevokeBackupRestoreEvidenceDto = {}) {
    const existing = await this.findEvidenceById(organizationId, id);
    if (existing.status === BackupRestoreEvidenceStatus.REVOKED) {
      throw new BadRequestException("Backup/restore evidence is already revoked.");
    }
    this.assertBackupEvidenceContainsNoSecrets(dto);

    const revoked = await this.prisma.backupRestoreEvidence.update({
      where: { id },
      data: {
        status: BackupRestoreEvidenceStatus.REVOKED,
        revokedById: actorUserId,
        revokedAt: new Date(),
        note: normalizeOptionalText(dto.note) ?? existing.note,
        productionReadyContribution: false,
      },
      select: BACKUP_RESTORE_EVIDENCE_SELECT,
    });

    await this.auditLogService?.log({
      organizationId,
      actorUserId,
      action: AUDIT_EVENTS.BACKUP_RESTORE_EVIDENCE_REVOKED,
      entityType: AUDIT_ENTITY_TYPES.BACKUP_RESTORE_EVIDENCE,
      entityId: revoked.id,
      before: existing,
      after: revoked,
    });

    return this.backupEvidenceMutationResponse(revoked);
  }

  private findRelevantEvidence(organizationId: string) {
    return this.prisma.backupRestoreEvidence.findMany({
      where: { OR: [{ organizationId }, { organizationId: null }] },
      orderBy: [{ createdAt: "desc" }],
      select: BACKUP_RESTORE_EVIDENCE_SELECT,
    });
  }

  private async findEvidenceById(organizationId: string, id: string) {
    const evidence = await this.prisma.backupRestoreEvidence.findFirst({
      where: { id, OR: [{ organizationId }, { organizationId: null }] },
      select: BACKUP_RESTORE_EVIDENCE_SELECT,
    });

    if (!evidence) {
      throw new NotFoundException("Backup/restore evidence not found.");
    }

    return evidence;
  }

  private verifiedEvidenceTypes(evidence: BackupRestoreEvidenceRecord[]): BackupRestoreEvidenceType[] {
    return REQUIRED_BACKUP_EVIDENCE_TYPES.filter((evidenceType) =>
      evidence.some(
        (entry) =>
          entry.evidenceType === evidenceType &&
          entry.status === BackupRestoreEvidenceStatus.VERIFIED &&
          entry.productionReadyContribution,
      ),
    );
  }

  private backupEvidenceMutationResponse(evidence: BackupRestoreEvidenceRecord) {
    return {
      metadataOnly: true,
      noBackupExecuted: true,
      noRestoreExecuted: true,
      noSecretsReturned: true,
      evidence: this.backupEvidenceResponse(evidence),
    };
  }

  private backupEvidenceResponse(evidence: BackupRestoreEvidenceRecord) {
    return {
      ...evidence,
      evidenceSummaryJson: evidence.evidenceSummaryJson,
    };
  }

  private assertBackupEvidenceContainsNoSecrets(value: unknown): void {
    if (containsBackupSecret(value) || containsProtectedBackupContent(value)) {
      throw new BadRequestException("Backup/restore evidence must be metadata-only and cannot include secrets, connection strings, signed XML/QR bodies, document bodies, or attachment contents.");
    }
  }
}

const BACKUP_REDACTION_GUARANTEES = [
  "Database URLs, Supabase service role keys, storage credentials, SMTP secrets, API keys, tokens, auth headers, connection URLs, private keys, and provider secrets are rejected.",
  "Evidence stores metadata only; customer document bodies, attachment bodies, signed XML bodies, and QR payload bodies are rejected.",
  "Backup readiness and restore drill plans do not run backup or restore operations.",
];

const SENSITIVE_KEY_NAME =
  /(database[_-]?url|direct[_-]?url|service[_-]?role|supabase[_-]?service|connection[_-]?string|password|passwd|pwd|secret|token|api[_-]?key|apikey|authorization|auth[_-]?header|authheader|bearer|smtp|webhook|private[_-]?key|privatekey|access[_-]?key|accesskey|storage[_-]?credential|storagecredential)/i;
const PROTECTED_CONTENT_KEY =
  /(signed[_-]?xml|signedxml|qr[_-]?(body|payload)|qrbody|qrpayload|document[_-]?(body|content)|documentbody|documentcontent|attachment[_-]?(body|content)|attachmentbody|attachmentcontent|content[_-]?base64|contentbase64|raw[_-]?payload|rawpayload|customer[_-]?document|customerdocument)/i;
const CONNECTION_URL = /\b(?:postgres|postgresql|mysql|redis|amqp|mongodb|smtp|smtps|https?):\/\/[^\s]+/i;
const AUTH_HEADER = /\bAuthorization:\s*[^\r\n]+/i;
const BEARER_TOKEN = /\bBearer\s+[A-Za-z0-9._~+/=-]+/i;
const PRIVATE_KEY_BLOCK = /-----BEGIN [A-Z ]*PRIVATE KEY-----/i;
const SENSITIVE_ASSIGNMENT =
  /\b(?:DATABASE_URL|DIRECT_URL|SERVICE_ROLE|SUPABASE_SERVICE_ROLE|S3_SECRET_ACCESS_KEY|S3_ACCESS_KEY_ID|SMTP_PASSWORD|WEBHOOK_SECRET|API_KEY|TOKEN|PASSWORD|SECRET)\b\s*[:=]\s*[^,\s;]+/i;
const XML_BODY = /<\s*(?:Invoice|CreditNote|DebitNote|ext:UBLExtensions|ds:Signature)\b/i;

function containsBackupSecret(value: unknown): boolean {
  if (value === undefined || value === null) {
    return false;
  }
  if (typeof value === "string") {
    return hasSecretText(value);
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return false;
  }
  if (Array.isArray(value)) {
    return value.some((entry) => containsBackupSecret(entry));
  }
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).some(([key, entry]) => SENSITIVE_KEY_NAME.test(key) || containsBackupSecret(entry));
  }
  return hasSecretText(String(value));
}

function containsProtectedBackupContent(value: unknown): boolean {
  if (value === undefined || value === null) {
    return false;
  }
  if (typeof value === "string") {
    return XML_BODY.test(value);
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return false;
  }
  if (Array.isArray(value)) {
    return value.some((entry) => containsProtectedBackupContent(entry));
  }
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).some(
      ([key, entry]) => PROTECTED_CONTENT_KEY.test(key) || containsProtectedBackupContent(entry),
    );
  }
  return XML_BODY.test(String(value));
}

function hasSecretText(value: string): boolean {
  return [CONNECTION_URL, AUTH_HEADER, BEARER_TOKEN, PRIVATE_KEY_BLOCK, SENSITIVE_ASSIGNMENT].some((pattern) => pattern.test(value));
}

function isRequiredBackupEvidenceType(evidenceType: BackupRestoreEvidenceType): boolean {
  return REQUIRED_BACKUP_EVIDENCE_TYPES.includes(evidenceType as (typeof REQUIRED_BACKUP_EVIDENCE_TYPES)[number]);
}

function backupReadinessBlockers(missingEvidenceTypes: BackupRestoreEvidenceType[]): string[] {
  if (missingEvidenceTypes.length === 0) {
    return [];
  }
  return missingEvidenceTypes.map((evidenceType) => `${backupEvidenceTypeSentence(evidenceType)} evidence is required before backup/restore production readiness review.`);
}

function backupReadinessNextSteps(missingEvidenceTypes: BackupRestoreEvidenceType[]): string[] {
  if (missingEvidenceTypes.length === 0) {
    return ["Run a final controlled-beta operations review before relying on production backup/restore readiness."];
  }
  return [
    "Capture metadata-only evidence for the missing backup and restore controls.",
    "Run a non-production restore drill and record RESTORE_DRILL plus RESTORE_VERIFICATION evidence.",
    "Review RPO/RTO targets with business owners before claiming production readiness.",
  ];
}

function backupEvidenceTypeSentence(evidenceType: BackupRestoreEvidenceType): string {
  return evidenceType
    .toLowerCase()
    .split("_")
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

function normalizeOptionalText(value?: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}
