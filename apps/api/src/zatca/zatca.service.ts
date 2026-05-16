import { BadRequestException, Inject, Injectable, NotFoundException, NotImplementedException, Optional } from "@nestjs/common";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  combineZatcaReadinessStatus,
  createZatcaReadinessSection,
  type ZatcaReadinessCheck,
  type ZatcaReadinessSection,
  type ZatcaReadinessSeverity,
} from "@ledgerbyte/shared";
import {
  buildZatcaInvoicePayload,
  generateZatcaCsrPem,
  initialPreviousInvoiceHash,
  validateLocalZatcaXml,
  ZATCA_CHECKLIST_CATEGORIES,
  ZATCA_PHASE_2_CHECKLIST,
  ZATCA_XML_FIELD_MAPPING,
  type ZatcaCsrInput,
  type ZatcaChecklistCategory,
  type ZatcaChecklistItem,
  type ZatcaInvoiceInput,
  type ZatcaXmlFieldMappingItem,
} from "@ledgerbyte/zatca-core";
import {
  Prisma,
  SalesInvoiceStatus,
  ZatcaInvoiceStatus,
  ZatcaInvoiceType,
  ZatcaHashMode,
  ZatcaRegistrationStatus,
  ZatcaSubmissionStatus,
  ZatcaSubmissionType,
} from "@prisma/client";
import { AUDIT_EVENTS, AUDIT_ENTITY_TYPES } from "../audit-log/audit-events";
import { AuditLogService } from "../audit-log/audit-log.service";
import { PrismaService } from "../prisma/prisma.service";
import { CreateZatcaEgsUnitDto } from "./dto/create-zatca-egs-unit.dto";
import { EnableZatcaSdkHashModeDto } from "./dto/enable-zatca-sdk-hash-mode.dto";
import { RequestComplianceCsidDto } from "./dto/request-compliance-csid.dto";
import { UpdateZatcaEgsUnitDto } from "./dto/update-zatca-egs-unit.dto";
import { UpdateZatcaProfileDto } from "./dto/update-zatca-profile.dto";
import { ZatcaSdkService } from "../zatca-sdk/zatca-sdk.service";
import {
  buildZatcaSdkSigningCommand,
  discoverZatcaSdkReadiness,
  isZatcaSdkSigningExecutionEnabled,
  ZATCA_SDK_CSR_COMMAND,
  ZATCA_SDK_SIGN_COMMAND,
} from "../zatca-sdk/zatca-sdk-paths";
import { isZatcaAdapterError, ZatcaAdapterError } from "./adapters/zatca-adapter.error";
import { MockZatcaOnboardingAdapter } from "./adapters/mock-zatca-onboarding.adapter";
import { ZATCA_ONBOARDING_ADAPTER, type ComplianceCsidResult, type ZatcaAdapterResult, type ZatcaOnboardingAdapter } from "./adapters/zatca-onboarding.adapter";
import { readZatcaAdapterConfig, summarizeZatcaAdapterConfig, type ZatcaAdapterConfig, ZATCA_ADAPTER_CONFIG } from "./zatca.config";
import { readZatcaHashModeConfig } from "./zatca-hash-mode";

const zatcaMetadataInclude = {
  egsUnit: { select: { id: true, name: true, environment: true, isActive: true, lastIcv: true, hashMode: true } },
  submissionLogs: { orderBy: { createdAt: "desc" as const }, take: 5 },
};

const safeEgsUnitSelect = {
  id: true,
  organizationId: true,
  profileId: true,
  name: true,
  environment: true,
  status: true,
  deviceSerialNumber: true,
  solutionName: true,
  csrPem: true,
  complianceCsidPem: true,
  productionCsidPem: true,
  certificateRequestId: true,
  lastInvoiceHash: true,
  lastIcv: true,
  hashMode: true,
  hashModeEnabledAt: true,
  hashModeEnabledById: true,
  hashModeResetReason: true,
  sdkHashChainStartedAt: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ZatcaEgsUnitSelect;

const internalEgsUnitSelect = {
  ...safeEgsUnitSelect,
  privateKeyPem: true,
} satisfies Prisma.ZatcaEgsUnitSelect;

type SafeEgsUnitRecord = Prisma.ZatcaEgsUnitGetPayload<{ select: typeof safeEgsUnitSelect }>;
type InternalEgsUnitRecord = Prisma.ZatcaEgsUnitGetPayload<{ select: typeof internalEgsUnitSelect }>;
type ZatcaKeyCustodyMode = "MISSING" | "RAW_DATABASE_PEM";
type ZatcaCsrPlanFieldStatus = "AVAILABLE" | "MISSING" | "NEEDS_REVIEW";

interface ZatcaCsrProfileSource {
  sellerName?: string | null;
  vatNumber?: string | null;
  countryCode?: string | null;
  businessCategory?: string | null;
}

interface ZatcaCsrPlanField {
  sdkConfigKey: string;
  label: string;
  officialSource: string;
  currentValue: string | null;
  status: ZatcaCsrPlanFieldStatus;
  source: "ZATCA_PROFILE" | "EGS_UNIT" | "NOT_MODELED";
  notes: string;
}

export interface ZatcaProfileReadiness {
  ready: boolean;
  missingFields: string[];
}

export function getZatcaProfileReadiness(profile: {
  sellerName?: string | null;
  vatNumber?: string | null;
  city?: string | null;
  countryCode?: string | null;
}): ZatcaProfileReadiness {
  const missingFields = [
    ["sellerName", profile.sellerName],
    ["vatNumber", profile.vatNumber],
    ["city", profile.city],
    ["countryCode", profile.countryCode],
  ]
    .filter(([, value]) => !String(value ?? "").trim())
    .map(([field]) => String(field));

  return { ready: missingFields.length === 0, missingFields };
}

function hasText(value: string | null | undefined): boolean {
  return Boolean(value?.trim());
}

function isSaudiVatNumber(value: string | null | undefined): boolean {
  return /^[0-9]{15}$/.test(value?.trim() ?? "") && value?.trim().startsWith("3") === true && value?.trim().endsWith("3") === true;
}

function safeZatcaTempName(value: string): string {
  return (
    value
      .trim()
      .replace(/[^a-zA-Z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "zatca-invoice"
  );
}

@Injectable()
export class ZatcaService {
  private readonly onboardingAdapter: ZatcaOnboardingAdapter;
  private readonly adapterConfig: ZatcaAdapterConfig;

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
    @Optional()
    @Inject(ZATCA_ONBOARDING_ADAPTER)
    onboardingAdapter?: ZatcaOnboardingAdapter,
    @Optional()
    @Inject(ZATCA_ADAPTER_CONFIG)
    adapterConfig?: ZatcaAdapterConfig,
    @Optional()
    private readonly zatcaSdkService?: ZatcaSdkService,
  ) {
    this.adapterConfig = adapterConfig ?? readZatcaAdapterConfig();
    this.onboardingAdapter = onboardingAdapter ?? new MockZatcaOnboardingAdapter();
  }

  getAdapterConfig() {
    return summarizeZatcaAdapterConfig(this.adapterConfig);
  }

  getComplianceChecklist(_organizationId?: string) {
    const groups = Object.fromEntries(ZATCA_CHECKLIST_CATEGORIES.map((category) => [category, [] as ZatcaChecklistItem[]])) as Record<
      ZatcaChecklistCategory,
      ZatcaChecklistItem[]
    >;
    const byStatus: Record<string, number> = {};
    const byRisk: Record<string, number> = {};

    for (const item of ZATCA_PHASE_2_CHECKLIST) {
      groups[item.category].push(item);
      byStatus[item.status] = (byStatus[item.status] ?? 0) + 1;
      byRisk[item.riskLevel] = (byRisk[item.riskLevel] ?? 0) + 1;
    }

    return {
      warning: "This checklist is not legal certification.",
      summary: {
        total: ZATCA_PHASE_2_CHECKLIST.length,
        byStatus,
        byRisk,
      },
      groups,
    };
  }

  getXmlFieldMapping(_organizationId?: string) {
    const byStatus: Record<string, number> = {};
    const byCategory: Record<string, number> = {};

    for (const item of ZATCA_XML_FIELD_MAPPING) {
      byStatus[item.status] = (byStatus[item.status] ?? 0) + 1;
      byCategory[item.category] = (byCategory[item.category] ?? 0) + 1;
    }

    return {
      warning: "This XML mapping is local engineering scaffolding only and is not official ZATCA validation.",
      summary: {
        total: ZATCA_XML_FIELD_MAPPING.length,
        byStatus,
        byCategory,
      },
      items: ZATCA_XML_FIELD_MAPPING as readonly ZatcaXmlFieldMappingItem[],
    };
  }

  async getZatcaReadinessSummary(organizationId: string) {
    const profile = await this.getProfile(organizationId);
    const activeEgs = await this.prisma.zatcaEgsUnit.findFirst({
      where: { organizationId, isActive: true, status: ZatcaRegistrationStatus.ACTIVE },
      orderBy: { updatedAt: "desc" },
      select: internalEgsUnitSelect,
    });
    const localXmlCount = await this.prisma.zatcaInvoiceMetadata.count({
      where: { organizationId, xmlBase64: { not: null } },
    });
    const legacyProfileReadiness = getZatcaProfileReadiness(profile);
    const sellerProfile = this.buildSellerProfileReadiness(profile);
    const egs = this.buildEgsReadinessSection(activeEgs);
    const xml = this.buildSettingsXmlReadinessSection(localXmlCount);
    const sdk = this.buildSdkReadinessSection(this.zatcaSdkService?.getReadiness() ?? null);
    const signing = this.buildSigningReadinessSection(activeEgs);
    const keyCustody = this.buildKeyCustodyReadinessSection(activeEgs);
    const csr = this.buildCsrReadinessSection(profile, activeEgs);
    const phase2Qr = this.buildPhase2QrReadinessSection();
    const pdfA3 = this.buildPdfA3ReadinessSection();
    const sections = [sellerProfile, egs, xml, sdk, signing, keyCustody, csr, phase2Qr, pdfA3];
    const checks = sections.flatMap((section) => section.checks);
    const status = combineZatcaReadinessStatus(sections);
    const profileMissingFields = legacyProfileReadiness.missingFields;
    const profileReady = legacyProfileReadiness.ready;
    const egsReady = Boolean(activeEgs);
    const localXmlReady = localXmlCount > 0;
    const mockCsidReady = Boolean(activeEgs?.complianceCsidPem);
    const adapterConfig = this.getAdapterConfig();
    const blockingReasons = checks.filter((check) => check.severity === "ERROR").map((check) => `${check.code}: ${check.message}`);

    if (!legacyProfileReadiness.ready) {
      blockingReasons.unshift(`Missing ZATCA profile fields: ${legacyProfileReadiness.missingFields.join(", ")}`);
    }
    if (!egsReady) {
      blockingReasons.push("No active development EGS unit is configured.");
    }

    if (!adapterConfig.effectiveRealNetworkEnabled) {
      blockingReasons.push("Real ZATCA network calls are disabled by configuration.");
    }
    blockingReasons.push("Production readiness is intentionally false until official validation, signing, API integration, and PDF/A-3 are complete.");

    return {
      warning: "This readiness summary is local engineering guidance only and is not legal certification.",
      status,
      localOnly: true,
      productionCompliance: false,
      sellerProfile,
      egs,
      xml,
      sdk,
      signing,
      keyCustody,
      csr,
      phase2Qr,
      pdfA3,
      checks,
      profileReady,
      profileMissingFields,
      egsReady,
      activeEgsUnit: activeEgs
        ? {
            id: activeEgs.id,
            name: activeEgs.name,
            status: activeEgs.status,
            isActive: activeEgs.isActive,
            hasCsr: Boolean(activeEgs.csrPem),
            hasComplianceCsid: Boolean(activeEgs.complianceCsidPem),
            hasProductionCsid: Boolean(activeEgs.productionCsidPem),
            hasPrivateKey: hasText(activeEgs.privateKeyPem),
            certificateRequestId: activeEgs.certificateRequestId,
            keyCustodyMode: this.getKeyCustodyMode(activeEgs),
            certificateExpiryKnown: false,
            certificateExpiresAt: null,
            renewalStatus: "NOT_IMPLEMENTED",
            lastIcv: activeEgs.lastIcv,
            lastInvoiceHash: activeEgs.lastInvoiceHash,
            hashMode: activeEgs.hashMode,
          }
        : null,
      localXmlReady,
      mockCsidReady,
      realNetworkEnabled: adapterConfig.effectiveRealNetworkEnabled,
      productionReady: false,
      blockingReasons,
    };
  }

  async getHashChainResetPlan(organizationId: string) {
    const [egsUnits, metadata, metadataCounts] = await Promise.all([
      this.prisma.zatcaEgsUnit.findMany({
        where: { organizationId },
        orderBy: [{ isActive: "desc" }, { updatedAt: "desc" }],
        select: safeEgsUnitSelect,
      }),
      this.prisma.zatcaInvoiceMetadata.findMany({
        where: { organizationId },
        orderBy: { generatedAt: "desc" },
        take: 50,
        select: {
          id: true,
          invoiceId: true,
          invoiceUuid: true,
          zatcaStatus: true,
          icv: true,
          previousInvoiceHash: true,
          invoiceHash: true,
          xmlHash: true,
          egsUnitId: true,
          hashModeSnapshot: true,
          generatedAt: true,
          invoice: { select: { invoiceNumber: true, status: true } },
        },
      }),
      this.prisma.zatcaInvoiceMetadata.groupBy({
        by: ["egsUnitId"],
        where: { organizationId, egsUnitId: { not: null } },
        _count: { _all: true },
      }),
    ]);
    const activeEgsUnits = egsUnits.filter((unit) => unit.isActive && unit.status === ZatcaRegistrationStatus.ACTIVE);
    const newestActiveEgs = activeEgsUnits[0] ?? null;
    const sdkReadiness = this.zatcaSdkService?.getReadiness() ?? null;
    const sdkReadinessBlockers = sdkReadiness?.canRunLocalValidation ? [] : sdkReadiness?.blockingReasons?.length ? sdkReadiness.blockingReasons : ["ZATCA SDK local execution is not ready."];
    const metadataCountByEgsUnit = new Map<string, number>();
    for (const item of metadataCounts) {
      if (item.egsUnitId) {
        metadataCountByEgsUnit.set(item.egsUnitId, item._count._all);
      }
    }

    return {
      dryRunOnly: true,
      localOnly: true,
      noMutation: true,
      hashMode: readZatcaHashModeConfig(),
      sdkReadiness: sdkReadiness
        ? {
            enabled: sdkReadiness.enabled,
            javaSupported: sdkReadiness.javaSupported,
            sdkJarFound: sdkReadiness.sdkJarFound,
            configDirFound: sdkReadiness.configDirFound,
            canRunLocalValidation: sdkReadiness.canRunLocalValidation,
            blockingReasons: sdkReadiness.blockingReasons,
            warnings: sdkReadiness.warnings,
          }
        : null,
      summary: {
        activeEgsUnitCount: activeEgsUnits.length,
        totalEgsUnitCount: egsUnits.length,
        invoicesWithMetadataCount: metadata.length,
        sdkModeEgsUnitCount: egsUnits.filter((unit) => unit.hashMode === ZatcaHashMode.SDK_GENERATED).length,
        currentIcv: newestActiveEgs?.lastIcv ?? null,
        currentLastInvoiceHash: newestActiveEgs?.lastInvoiceHash ?? null,
      },
      egsUnits: egsUnits.map((unit) => {
        const metadataCount = metadataCountByEgsUnit.get(unit.id) ?? 0;
        const blockers = this.getSdkHashModeEnableBlockers(unit, metadataCount, sdkReadinessBlockers);
        return {
          id: unit.id,
          name: unit.name,
          environment: unit.environment,
          status: unit.status,
          isActive: unit.isActive,
          lastIcv: unit.lastIcv,
          lastInvoiceHash: unit.lastInvoiceHash,
          hashMode: unit.hashMode,
          hashModeEnabledAt: unit.hashModeEnabledAt,
          hashModeEnabledById: unit.hashModeEnabledById,
          hashModeResetReason: unit.hashModeResetReason,
          sdkHashChainStartedAt: unit.sdkHashChainStartedAt,
          metadataCount,
          canEnableSdkHashMode: blockers.length === 0,
          enableSdkHashModeBlockers: blockers,
          recommendedAction: blockers.length === 0 ? "Enable SDK hash mode before generating invoices for this fresh EGS unit." : "Create a new EGS unit or keep local deterministic mode.",
          updatedAt: unit.updatedAt,
        };
      }),
      invoicesWithMetadata: metadata.map((item) => ({
        id: item.id,
        invoiceId: item.invoiceId,
        invoiceNumber: item.invoice?.invoiceNumber ?? item.invoiceId,
        invoiceStatus: item.invoice?.status ?? null,
        invoiceUuid: item.invoiceUuid,
        zatcaStatus: item.zatcaStatus,
        icv: item.icv,
        previousInvoiceHash: item.previousInvoiceHash,
        invoiceHash: item.invoiceHash,
        xmlHash: item.xmlHash,
        egsUnitId: item.egsUnitId,
        hashModeSnapshot: item.hashModeSnapshot,
        generatedAt: item.generatedAt,
      })),
      resetRisks: [
        "Do not reset hash-chain metadata after production CSID issuance without a formally approved ZATCA recovery procedure.",
        "Existing development invoices use LedgerByte local deterministic hashes; switching to SDK hashes requires regenerating local metadata or starting a fresh test EGS sequence.",
        "Resetting ICV or last hash can create duplicate or broken chains if any invoices have been submitted outside local development.",
      ],
      recommendedNextSteps: [
        "Keep ZATCA_HASH_MODE=local until SDK hash storage, signing, CSID onboarding, and clearance/reporting are implemented.",
        "Use the invoice hash-compare endpoint to identify local app hash versus official SDK hash differences without mutating metadata.",
        "For local development, create a fresh EGS unit or reset the non-production test database before testing SDK-generated hash persistence.",
      ],
      warning: "Dry-run only. No EGS ICV, last hash, or invoice metadata is reset by this endpoint.",
    };
  }

  async getProfile(organizationId: string) {
    const organization = await this.prisma.organization.findFirst({
      where: { id: organizationId },
      select: { id: true, name: true, legalName: true, taxNumber: true, countryCode: true },
    });
    if (!organization) {
      throw new NotFoundException("Organization not found.");
    }

    const profile = await this.prisma.zatcaOrganizationProfile.upsert({
      where: { organizationId },
      update: {},
      create: {
        organizationId,
        sellerName: organization.legalName ?? organization.name,
        vatNumber: organization.taxNumber,
        countryCode: organization.countryCode,
      },
    });
    return this.withReadiness(profile);
  }

  async updateProfile(organizationId: string, actorUserId: string, dto: UpdateZatcaProfileDto) {
    const before = await this.getProfile(organizationId);
    const data = this.cleanProfileData(dto);
    const updated = await this.prisma.zatcaOrganizationProfile.update({
      where: { organizationId },
      data,
    });

    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action: "UPDATE",
      entityType: "ZatcaOrganizationProfile",
      entityId: updated.id,
      before,
      after: updated,
    });

    return this.withReadiness(updated);
  }

  async listEgsUnits(organizationId: string) {
    const units = await this.prisma.zatcaEgsUnit.findMany({
      where: { organizationId },
      orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
      select: internalEgsUnitSelect,
    });
    return units.map((unit) => this.toPublicEgsUnit(unit));
  }

  async createEgsUnit(organizationId: string, actorUserId: string, dto: CreateZatcaEgsUnitDto) {
    const profile = await this.getProfile(organizationId);
    const created = await this.prisma.zatcaEgsUnit.create({
      data: {
        organizationId,
        profileId: profile.id,
        name: this.requiredText(dto.name, "EGS unit name"),
        deviceSerialNumber: this.requiredText(dto.deviceSerialNumber, "Device serial number"),
        environment: dto.environment ?? profile.environment,
        solutionName: this.optionalText(dto.solutionName) ?? "LedgerByte",
      },
      select: safeEgsUnitSelect,
    });

    const publicUnit = this.toPublicEgsUnit(created);
    await this.auditLogService.log({ organizationId, actorUserId, action: "CREATE", entityType: "ZatcaEgsUnit", entityId: created.id, after: publicUnit });
    return publicUnit;
  }

  async getEgsUnit(organizationId: string, id: string) {
    const egsUnit = await this.prisma.zatcaEgsUnit.findFirst({ where: { id, organizationId }, select: internalEgsUnitSelect });
    if (!egsUnit) {
      throw new NotFoundException("ZATCA EGS unit not found.");
    }
    return this.toPublicEgsUnit(egsUnit);
  }

  async updateEgsUnit(organizationId: string, actorUserId: string, id: string, dto: UpdateZatcaEgsUnitDto) {
    const before = await this.getEgsUnit(organizationId, id);
    const updated = await this.prisma.zatcaEgsUnit.update({
      where: { id },
      data: {
        name: dto.name === undefined ? undefined : this.requiredText(dto.name, "EGS unit name"),
        deviceSerialNumber: dto.deviceSerialNumber === undefined ? undefined : this.requiredText(dto.deviceSerialNumber, "Device serial number"),
        environment: dto.environment,
        status: dto.status,
        solutionName: dto.solutionName === undefined ? undefined : this.requiredText(dto.solutionName, "Solution name"),
        csrPem: dto.csrPem === undefined ? undefined : this.optionalText(dto.csrPem),
      },
      select: safeEgsUnitSelect,
    });

    const publicUnit = this.toPublicEgsUnit(updated);
    await this.auditLogService.log({ organizationId, actorUserId, action: "UPDATE", entityType: "ZatcaEgsUnit", entityId: id, before, after: publicUnit });
    return publicUnit;
  }

  async enableSdkHashMode(organizationId: string, actorUserId: string, id: string, dto: EnableZatcaSdkHashModeDto) {
    if (!dto.confirmReset) {
      throw new BadRequestException("confirmReset must be true before enabling SDK hash mode.");
    }
    const reason = this.requiredText(dto.reason, "SDK hash mode enable reason");
    if (reason.length < 10) {
      throw new BadRequestException("SDK hash mode enable reason must be at least 10 characters.");
    }

    const existing = await this.prisma.zatcaEgsUnit.findFirst({ where: { id, organizationId }, select: safeEgsUnitSelect });
    if (!existing) {
      throw new NotFoundException("ZATCA EGS unit not found.");
    }

    const sdkReadiness = this.zatcaSdkService?.getReadiness();
    if (!sdkReadiness?.canRunLocalValidation) {
      const reasons = sdkReadiness?.blockingReasons?.length ? sdkReadiness.blockingReasons.join("; ") : "ZATCA SDK local execution is not ready.";
      throw new BadRequestException(`ZATCA SDK local execution is not ready. ${reasons}`);
    }

    const metadataCount = await this.prisma.zatcaInvoiceMetadata.count({ where: { organizationId, egsUnitId: id } });
    const blockers = this.getSdkHashModeEnableBlockers(existing, metadataCount, []);
    if (blockers.length > 0) {
      throw new BadRequestException(blockers.join(" "));
    }

    const now = new Date();
    const updated = await this.prisma.zatcaEgsUnit.update({
      where: { id },
      data: {
        hashMode: ZatcaHashMode.SDK_GENERATED,
        hashModeEnabledAt: now,
        hashModeEnabledById: actorUserId,
        hashModeResetReason: reason,
        sdkHashChainStartedAt: now,
        lastIcv: 0,
        lastInvoiceHash: initialPreviousInvoiceHash,
      },
      select: safeEgsUnitSelect,
    });

    const publicBefore = this.toPublicEgsUnit(existing);
    const publicUpdated = this.toPublicEgsUnit(updated);
    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action: AUDIT_EVENTS.ZATCA_SDK_HASH_MODE_ENABLED,
      entityType: AUDIT_ENTITY_TYPES.ZATCA_EGS_UNIT,
      entityId: id,
      before: publicBefore,
      after: { ...publicUpdated, reason },
    });
    return publicUpdated;
  }

  async activateDevEgsUnit(organizationId: string, actorUserId: string, id: string) {
    const existing = await this.getEgsUnitInternal(organizationId, id);
    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.zatcaEgsUnit.updateMany({ where: { organizationId, isActive: true }, data: { isActive: false } });
      return tx.zatcaEgsUnit.update({
        where: { id },
        data: {
          isActive: true,
          status: ZatcaRegistrationStatus.ACTIVE,
          csrPem: existing.csrPem ?? "-----BEGIN CSR-----\nLOCAL-DEV-PLACEHOLDER\n-----END CSR-----",
          // Development placeholder only. Production must use KMS/secrets-manager-backed private key storage.
          privateKeyPem: existing.privateKeyPem ?? "-----BEGIN PRIVATE KEY-----\nLOCAL-DEV-PLACEHOLDER\n-----END PRIVATE KEY-----",
          complianceCsidPem: existing.complianceCsidPem ?? "-----BEGIN CERTIFICATE-----\nLOCAL-DEV-COMPLIANCE-CSID\n-----END CERTIFICATE-----",
        },
        select: safeEgsUnitSelect,
      });
    });

    const publicBefore = this.toPublicEgsUnit(existing);
    const publicUpdated = this.toPublicEgsUnit(updated);
    await this.auditLogService.log({ organizationId, actorUserId, action: "ACTIVATE_DEV", entityType: "ZatcaEgsUnit", entityId: id, before: publicBefore, after: publicUpdated });
    return publicUpdated;
  }

  async generateEgsCsr(organizationId: string, actorUserId: string, id: string) {
    const existing = await this.getEgsUnitInternal(organizationId, id);
    const profile = await this.getProfile(organizationId);
    const readiness = getZatcaProfileReadiness(profile);
    if (!readiness.ready) {
      throw new BadRequestException(`ZATCA profile is missing required CSR fields: ${readiness.missingFields.join(", ")}.`);
    }

    const csrInput = this.toCsrInput(profile, existing);
    const { privateKeyPem, csrPem } = generateZatcaCsrPem(csrInput);
    const updated = await this.prisma.$transaction(async (tx) => {
      const unit = await tx.zatcaEgsUnit.update({
        where: { id },
        data: {
          csrPem,
          // Development-only storage. Production must use KMS/secrets manager. Never log or expose privateKeyPem.
          privateKeyPem,
          status: ZatcaRegistrationStatus.OTP_REQUIRED,
        },
        select: safeEgsUnitSelect,
      });
      await tx.zatcaOrganizationProfile.update({
        where: { organizationId },
        data: { registrationStatus: ZatcaRegistrationStatus.OTP_REQUIRED },
      });
      return unit;
    });

    const publicBefore = this.toPublicEgsUnit(existing);
    const publicUpdated = this.toPublicEgsUnit(updated);
    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action: "GENERATE_CSR",
      entityType: "ZatcaEgsUnit",
      entityId: id,
      before: publicBefore,
      after: publicUpdated,
    });
    return publicUpdated;
  }

  async getEgsCsr(organizationId: string, id: string): Promise<string> {
    const egsUnit = await this.getEgsUnitInternal(organizationId, id);
    if (!egsUnit.csrPem) {
      throw new NotFoundException("ZATCA CSR has not been generated for this EGS unit.");
    }
    return egsUnit.csrPem;
  }

  async requestComplianceCsid(organizationId: string, actorUserId: string, id: string, dto: RequestComplianceCsidDto) {
    const existing = await this.getEgsUnitInternal(organizationId, id);
    if (!existing.csrPem) {
      throw new BadRequestException("Generate a CSR before requesting a compliance CSID.");
    }
    if (this.adapterConfig.mode === "mock" && !dto.otp?.trim()) {
      throw new BadRequestException("OTP is required for the local mock compliance CSID flow.");
    }

    const requestPayload = {
      csrPem: existing.csrPem,
      otp: dto.otp,
      requestedMode: dto.mode ?? this.adapterConfig.mode,
      adapterMode: this.adapterConfig.mode,
      environment: existing.environment,
      // TODO: Verify the official compliance CSID payload shape before enabling real sandbox calls.
    };

    let adapterResult: ComplianceCsidResult;
    try {
      adapterResult = await this.onboardingAdapter.requestComplianceCsid({
        organizationId,
        egsUnitId: id,
        environment: existing.environment,
        request: requestPayload,
      });
    } catch (error) {
      await this.createEgsSubmissionFailureLog({
        organizationId,
        egsUnitId: id,
        submissionType: ZatcaSubmissionType.COMPLIANCE_CHECK,
        requestUrl: this.adapterRequestUrl(error) ?? `${this.adapterConfig.mode}-compliance-csid`,
        requestPayload: this.sanitizeComplianceCsidRequestForLog(requestPayload),
        error,
      });
      this.throwAdapterError(error);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const activeCount = await tx.zatcaEgsUnit.count({ where: { organizationId, isActive: true } });
      const unit = await tx.zatcaEgsUnit.update({
        where: { id },
        data: {
          complianceCsidPem: adapterResult.complianceCsidPem,
          certificateRequestId: adapterResult.certificateRequestId,
          status: ZatcaRegistrationStatus.ACTIVE,
          isActive: activeCount === 0 ? true : undefined,
        },
        select: safeEgsUnitSelect,
      });
      await tx.zatcaOrganizationProfile.update({
        where: { organizationId },
        data: { registrationStatus: ZatcaRegistrationStatus.ACTIVE },
      });
      await tx.zatcaSubmissionLog.create({
        data: {
          organizationId,
          invoiceMetadataId: null,
          egsUnitId: id,
          submissionType: ZatcaSubmissionType.COMPLIANCE_CHECK,
          status: ZatcaSubmissionStatus.SUCCESS,
          requestUrl: adapterResult.requestUrl ?? `local-${dto.mode ?? this.adapterConfig.mode}-compliance-csid`,
          requestPayloadBase64: this.encodePayload(this.sanitizeComplianceCsidRequestForLog(requestPayload)),
          responsePayloadBase64: Buffer.from(JSON.stringify(adapterResult.responsePayload), "utf8").toString("base64"),
          responseCode: adapterResult.responseCode,
          completedAt: new Date(),
        },
      });
      return unit;
    });

    const publicBefore = this.toPublicEgsUnit(existing);
    const publicUpdated = this.toPublicEgsUnit(updated);
    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action: "REQUEST_COMPLIANCE_CSID",
      entityType: "ZatcaEgsUnit",
      entityId: id,
      before: publicBefore,
      after: publicUpdated,
    });
    return publicUpdated;
  }

  async requestProductionCsid(organizationId: string, _actorUserId: string, id: string) {
    const existing = await this.getEgsUnitInternal(organizationId, id);
    const requestPayload = {
      complianceCsidPem: existing.complianceCsidPem ?? "",
      certificateRequestId: existing.certificateRequestId ?? "",
      adapterMode: this.adapterConfig.mode,
      // TODO: Verify official production CSID request fields before implementation.
    };

    try {
      const adapterResult = await this.onboardingAdapter.requestProductionCsid({
        organizationId,
        egsUnitId: id,
        complianceCsidPem: existing.complianceCsidPem ?? "",
        request: requestPayload,
      });

      if (!adapterResult.productionCsidPem) {
        throw new ZatcaAdapterError("Production CSID response mapping is incomplete. Verify official response fields before enabling this flow.", {
          responseCode: "OFFICIAL_RESPONSE_UNMAPPED",
          errorCode: "OFFICIAL_RESPONSE_UNMAPPED",
          responsePayload: adapterResult.responsePayload,
          requestUrl: adapterResult.requestUrl,
          httpStatus: 501,
        });
      }

      const updated = await this.prisma.zatcaEgsUnit.update({
        where: { id },
        data: {
          productionCsidPem: adapterResult.productionCsidPem,
          certificateRequestId: adapterResult.certificateRequestId ?? existing.certificateRequestId,
        },
        select: safeEgsUnitSelect,
      });

      await this.prisma.zatcaSubmissionLog.create({
        data: {
          organizationId,
          invoiceMetadataId: null,
          egsUnitId: id,
          submissionType: ZatcaSubmissionType.COMPLIANCE_CHECK,
          status: ZatcaSubmissionStatus.SUCCESS,
          requestUrl: adapterResult.requestUrl ?? `${this.adapterConfig.mode}-production-csid`,
          requestPayloadBase64: this.encodePayload(this.sanitizeProductionCsidRequestForLog(requestPayload)),
          responsePayloadBase64: this.encodePayload(adapterResult.responsePayload),
          responseCode: adapterResult.responseCode,
          completedAt: new Date(),
        },
      });

      return this.toPublicEgsUnit(updated);
    } catch (error) {
      await this.createEgsSubmissionFailureLog({
        organizationId,
        egsUnitId: id,
        submissionType: ZatcaSubmissionType.COMPLIANCE_CHECK,
        requestUrl: this.adapterRequestUrl(error) ?? `${this.adapterConfig.mode}-production-csid`,
        requestPayload: this.sanitizeProductionCsidRequestForLog(requestPayload),
        error,
      });
      this.throwAdapterError(error);
    }
  }

  async getInvoiceCompliance(organizationId: string, invoiceId: string) {
    await this.ensureInvoiceBelongsToOrganization(organizationId, invoiceId);
    return this.ensureInvoiceMetadata(organizationId, invoiceId);
  }

  async getInvoiceZatcaReadiness(organizationId: string, invoiceId: string) {
    const invoice = await this.prisma.salesInvoice.findFirst({
      where: { id: invoiceId, organizationId },
      include: {
        organization: { select: { id: true, name: true, legalName: true, taxNumber: true, countryCode: true } },
        customer: {
          select: {
            id: true,
            name: true,
            displayName: true,
            taxNumber: true,
            addressLine1: true,
            addressLine2: true,
            buildingNumber: true,
            district: true,
            city: true,
            postalCode: true,
            countryCode: true,
          },
        },
      },
    });
    if (!invoice) {
      throw new NotFoundException("Sales invoice not found.");
    }

    const [profile, metadata, activeEgs] = await Promise.all([
      this.prisma.zatcaOrganizationProfile.findUnique({ where: { organizationId } }),
      this.prisma.zatcaInvoiceMetadata.findFirst({
        where: { organizationId, invoiceId },
        select: {
          id: true,
          zatcaInvoiceType: true,
          xmlBase64: true,
          icv: true,
          previousInvoiceHash: true,
          invoiceHash: true,
          hashModeSnapshot: true,
          egsUnitId: true,
          generatedAt: true,
        },
      }),
      this.prisma.zatcaEgsUnit.findFirst({
        where: { organizationId, isActive: true, status: ZatcaRegistrationStatus.ACTIVE },
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          name: true,
          status: true,
          isActive: true,
          csrPem: true,
          complianceCsidPem: true,
          productionCsidPem: true,
          lastIcv: true,
          lastInvoiceHash: true,
          hashMode: true,
        },
      }),
    ]);

    const zatcaInvoiceType = metadata?.zatcaInvoiceType ?? ZatcaInvoiceType.STANDARD_TAX_INVOICE;
    const sellerProfile = profile
      ? this.buildSellerProfileReadiness(profile)
      : createZatcaReadinessSection("SELLER_PROFILE", [
          this.check("ZATCA_SELLER_PROFILE_MISSING", "ERROR", "seller.profile", "ZATCA seller profile is not configured.", "BR-06", "Configure the ZATCA seller profile before generating invoice XML."),
        ]);
    const buyerContact = this.buildBuyerContactReadiness(invoice.customer, zatcaInvoiceType);
    const invoiceReadiness = this.buildInvoiceReadinessSection(invoice, zatcaInvoiceType);
    const egs = this.buildEgsReadinessSection(activeEgs);
    const xml = this.buildInvoiceXmlReadinessSection(metadata);
    const signing = this.buildSigningReadinessSection(activeEgs);
    const phase2Qr = this.buildPhase2QrReadinessSection(metadata);
    const pdfA3 = this.buildPdfA3ReadinessSection();
    const sections = [sellerProfile, buyerContact, invoiceReadiness, egs, xml, signing, phase2Qr, pdfA3];
    const status = combineZatcaReadinessStatus(sections);
    const checks = sections.flatMap((section) => section.checks);

    return {
      status,
      localOnly: true,
      noMutation: true,
      productionCompliance: false,
      invoiceSummary: {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        status: invoice.status,
        zatcaInvoiceType,
        transactionCodeFlags: this.transactionCodeFlagsForReadiness(zatcaInvoiceType),
        customerId: invoice.customer.id,
        customerName: invoice.customer.displayName ?? invoice.customer.name,
      },
      sellerProfile,
      buyerContact,
      invoice: invoiceReadiness,
      egs,
      xml,
      signing,
      phase2Qr,
      pdfA3,
      checks,
      warnings: [
        "Local readiness only. No ZATCA network call is made.",
        "This does not sign, clear, report, embed PDF/A-3, request CSIDs, or prove production compliance.",
      ],
    };
  }

  async getInvoiceZatcaSigningPlan(organizationId: string, invoiceId: string) {
    const invoice = await this.prisma.salesInvoice.findFirst({
      where: { id: invoiceId, organizationId },
      select: { id: true, invoiceNumber: true, status: true },
    });
    if (!invoice) {
      throw new NotFoundException("Sales invoice not found.");
    }

    const [metadata, activeEgs] = await Promise.all([
      this.prisma.zatcaInvoiceMetadata.findFirst({
        where: { organizationId, invoiceId },
        select: {
          id: true,
          xmlBase64: true,
          invoiceHash: true,
          icv: true,
          previousInvoiceHash: true,
          egsUnitId: true,
        },
      }),
      this.prisma.zatcaEgsUnit.findFirst({
        where: { organizationId, isActive: true, status: ZatcaRegistrationStatus.ACTIVE },
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          name: true,
          status: true,
          isActive: true,
          csrPem: true,
          complianceCsidPem: true,
          productionCsidPem: true,
          lastIcv: true,
          lastInvoiceHash: true,
          hashMode: true,
        },
      }),
    ]);

    const sdkReadiness = discoverZatcaSdkReadiness();
    const executionEnabled = isZatcaSdkSigningExecutionEnabled();
    const tempRoot = sdkReadiness.workDir || join(tmpdir(), "ledgerbyte-zatca-sdk");
    const unsignedXmlPath = join(tempRoot, `${safeZatcaTempName(invoice.id)}-unsigned.xml`);
    const signedXmlPath = join(tempRoot, `${safeZatcaTempName(invoice.id)}-signed-dummy-only.xml`);
    const commandPlan = buildZatcaSdkSigningCommand({
      xmlFilePath: unsignedXmlPath,
      signedInvoiceFilePath: signedXmlPath,
      sdkJarPath: sdkReadiness.sdkJarPath,
      launcherPath: sdkReadiness.fatooraLauncherPath,
      jqPath: sdkReadiness.jqPath,
      configDirPath: sdkReadiness.configDirPath,
      workingDirectory: sdkReadiness.sdkRootPath ?? sdkReadiness.referenceFolderPath ?? sdkReadiness.projectRoot,
      platform: process.platform,
      javaFound: sdkReadiness.javaFound,
      javaCommand: sdkReadiness.javaCommand,
    });
    const sdkRootPath = sdkReadiness.sdkRootPath ?? join(sdkReadiness.projectRoot, "reference", "zatca-einvoicing-sdk-Java-238-R3.4.8");
    const certificatePath = join(sdkRootPath, "Data", "Certificates", "cert.pem");
    const privateKeyPath = join(sdkRootPath, "Data", "Certificates", "ec-secp256k1-priv-key.pem");
    const blockers: string[] = [];

    if (!metadata?.xmlBase64) {
      blockers.push("Generated invoice XML is missing; create local XML before planning SDK signing.");
    }
    if (!executionEnabled) {
      blockers.push("SDK signing execution is disabled by default. Set ZATCA_SDK_SIGNING_EXECUTION_ENABLED=false unless a controlled dummy-material experiment is explicitly approved.");
    }
    blockers.push("LedgerByte does not implement XAdES signing or certificate/key custody yet.");
    blockers.push("Private key custody is not configured; production must use a controlled KMS/HSM or equivalent secure key store.");
    if (!activeEgs?.complianceCsidPem) {
      blockers.push("Compliance CSID/certificate is missing; do not request CSIDs in this local-only phase.");
    }
    if (!activeEgs?.productionCsidPem) {
      blockers.push("Production CSID is missing and production credentials must not be used in this phase.");
    }
    if (!commandPlan.command) {
      blockers.push("No local SDK signing command could be planned from the official SDK files.");
    }

    return {
      localOnly: true,
      dryRun: true,
      noMutation: true,
      productionCompliance: false,
      executionEnabled,
      sdkCommand: ZATCA_SDK_SIGN_COMMAND,
      invoice: {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        status: invoice.status,
      },
      metadata: metadata
        ? {
            id: metadata.id,
            hasXml: Boolean(metadata.xmlBase64),
            hasInvoiceHash: Boolean(metadata.invoiceHash),
            icv: metadata.icv,
            previousInvoiceHash: metadata.previousInvoiceHash,
            egsUnitId: metadata.egsUnitId,
          }
        : null,
      egs: activeEgs
        ? {
            id: activeEgs.id,
            name: activeEgs.name,
            status: activeEgs.status,
            isActive: activeEgs.isActive,
            hasCsr: Boolean(activeEgs.csrPem),
            hasComplianceCsid: Boolean(activeEgs.complianceCsidPem),
            hasProductionCsid: Boolean(activeEgs.productionCsidPem),
            hashMode: activeEgs.hashMode,
          }
        : null,
      requiredInputs: [
        { id: "invoiceXml", label: "Unsigned generated XML", required: true, available: Boolean(metadata?.xmlBase64), path: unsignedXmlPath },
        { id: "signedInvoiceOutput", label: "Temporary signed XML output", required: true, available: true, path: signedXmlPath },
        { id: "sdkConfiguration", label: "Official SDK Configuration directory", required: true, available: Boolean(sdkReadiness.configDirPath), path: sdkReadiness.configDirPath ?? null },
        {
          id: "certificate",
          label: "Signing certificate",
          required: true,
          available: false,
          path: certificatePath,
          note: existsSync(certificatePath) ? "SDK bundled certificate exists but is dummy/testing-only and must not be treated as production signing material." : "No SDK certificate file was found.",
        },
        {
          id: "privateKeyCustody",
          label: "Private key custody",
          required: true,
          available: false,
          path: privateKeyPath,
          note: "Private key bytes are never returned by this endpoint. Production custody should use KMS/HSM-backed signing.",
        },
      ],
      commandPlan,
      blockers,
      warnings: [
        "Dry-run planning only. The SDK -sign command is not executed.",
        "Do not use SDK dummy certificate/private-key material for production invoices.",
        "Phase 2 QR tags that depend on signature/certificate material remain blocked until signing is implemented safely.",
        "No ZATCA network call, clearance, reporting, CSID request, or PDF/A-3 generation is performed.",
        ...sdkReadiness.warnings,
        ...commandPlan.warnings,
      ],
    };
  }

  async getEgsUnitCsrPlan(organizationId: string, id: string) {
    const [profile, egsUnit] = await Promise.all([this.getCsrProfileSnapshot(organizationId), this.getEgsUnitInternal(organizationId, id)]);
    const requiredFields = this.buildCsrPlanFields(profile, egsUnit);
    const missingValues = requiredFields.filter((field) => field.status === "MISSING");
    const reviewValues = requiredFields.filter((field) => field.status === "NEEDS_REVIEW");
    const safeName = safeZatcaTempName(egsUnit.id);
    const tempRoot = join(tmpdir(), "ledgerbyte-zatca-csr");
    const keyCustodyMode = this.getKeyCustodyMode(egsUnit);
    const blockers = [
      "CSID requests are intentionally disabled in this local-only CSR planning endpoint.",
      "Compliance CSID and production CSID issuance require controlled ZATCA onboarding access and must not be requested from this phase.",
      "Production private key custody is not configured; use KMS/HSM-backed custody before any production signing design.",
      ...missingValues.map((field) => `Missing CSR field ${field.sdkConfigKey}: ${field.label}.`),
    ];
    const warnings = [
      "Dry-run planning only. No CSR file, private key, CSID request, SDK execution, signing, clearance, reporting, or network call is performed.",
      "Official SDK dummy certificate/private-key material is testing-only and must not be stored as tenant production credentials.",
      "Certificate expiry, renewal, rotation, revocation, and token custody remain design blockers.",
      ...reviewValues.map((field) => `Review CSR field ${field.sdkConfigKey}: ${field.notes}`),
    ];

    return {
      localOnly: true,
      dryRun: true,
      noMutation: true,
      productionCompliance: false,
      noCsidRequest: true,
      warning: "This CSR plan is local architecture guidance only; it does not request a CSID or run the official SDK.",
      egsUnit: {
        id: egsUnit.id,
        name: egsUnit.name,
        status: egsUnit.status,
        environment: egsUnit.environment,
        isActive: egsUnit.isActive,
        hasCsr: Boolean(egsUnit.csrPem),
        hasComplianceCsid: Boolean(egsUnit.complianceCsidPem),
        hasProductionCsid: Boolean(egsUnit.productionCsidPem),
        hasPrivateKey: hasText(egsUnit.privateKeyPem),
        certificateRequestId: egsUnit.certificateRequestId,
        keyCustodyMode,
        certificateExpiryKnown: false,
        certificateExpiresAt: null,
        renewalStatus: "NOT_IMPLEMENTED",
      },
      sdkCommand: ZATCA_SDK_CSR_COMMAND,
      requiredFields,
      availableValues: requiredFields.filter((field) => field.status !== "MISSING"),
      missingValues,
      plannedSdkConfigFields: requiredFields.map((field) => ({
        key: field.sdkConfigKey,
        currentValue: field.currentValue,
        status: field.status,
        source: field.source,
      })),
      plannedFiles: {
        csrConfig: join(tempRoot, `${safeName}.properties`),
        privateKey: join(tempRoot, `${safeName}-private-key.pem`),
        generatedCsr: join(tempRoot, `${safeName}.csr`),
      },
      keyCustody: {
        mode: keyCustodyMode,
        privateKeyConfigured: hasText(egsUnit.privateKeyPem),
        privateKeyReturned: false,
        redaction: "Private key PEM, certificates, binary security tokens, and CSID secrets are never returned by this endpoint.",
      },
      certificateState: {
        complianceCsid: egsUnit.complianceCsidPem ? "present-redacted" : "missing",
        productionCsid: egsUnit.productionCsidPem ? "present-redacted" : "missing",
        certificateRequestId: egsUnit.certificateRequestId,
        certificateExpiryKnown: false,
        certificateExpiresAt: null,
        renewalStatus: "NOT_IMPLEMENTED",
      },
      blockers,
      warnings,
      recommendedNextSteps: [
        "Finalize CSR field ownership and validation from the official CSR config template before generating any real CSR.",
        "Choose production key custody before signing work; prefer KMS/HSM-backed signing and audit logging over raw PEM storage.",
        "Keep CSID requests, production credentials, and signing disabled until an explicit onboarding implementation phase.",
      ],
    };
  }

  async generateInvoiceCompliance(organizationId: string, actorUserId: string, invoiceId: string) {
    const result = await this.prisma.$transaction(async (tx) => {
      const invoice = await tx.salesInvoice.findFirst({
        where: { id: invoiceId, organizationId },
        include: {
          organization: { select: { id: true, name: true, legalName: true, taxNumber: true, countryCode: true } },
          customer: {
            select: {
              id: true,
              name: true,
              displayName: true,
              taxNumber: true,
              addressLine1: true,
              addressLine2: true,
              buildingNumber: true,
              district: true,
              city: true,
              postalCode: true,
              countryCode: true,
            },
          },
          lines: { orderBy: { sortOrder: "asc" }, include: { taxRate: { select: { name: true } } } },
        },
      });
      if (!invoice) {
        throw new NotFoundException("Sales invoice not found.");
      }
      if (invoice.status !== SalesInvoiceStatus.FINALIZED) {
        throw new BadRequestException("ZATCA XML can only be generated for finalized invoices.");
      }

      const profile = await tx.zatcaOrganizationProfile.findUnique({ where: { organizationId } });
      if (!profile?.sellerName?.trim() || !profile.vatNumber?.trim()) {
        throw new BadRequestException("ZATCA seller name and VAT number are required before XML generation.");
      }

      const metadata = await tx.zatcaInvoiceMetadata.upsert({
        where: { invoiceId },
        update: {},
        create: {
          organizationId,
          invoiceId,
          zatcaInvoiceType: ZatcaInvoiceType.STANDARD_TAX_INVOICE,
        },
      });

      if (
        metadata.xmlBase64 &&
        metadata.qrCodeBase64 &&
        metadata.invoiceHash &&
        metadata.generatedAt
      ) {
        return tx.zatcaInvoiceMetadata.findUniqueOrThrow({
          where: { id: metadata.id },
          include: zatcaMetadataInclude,
        });
      }

      const activeEgs = await tx.zatcaEgsUnit.findFirst({
        where: { organizationId, isActive: true, status: ZatcaRegistrationStatus.ACTIVE },
        orderBy: { updatedAt: "desc" },
      });
      const nextIcv = activeEgs ? activeEgs.lastIcv + 1 : metadata.icv;
      const previousInvoiceHash = activeEgs?.lastInvoiceHash ?? initialPreviousInvoiceHash;
      const payload = buildZatcaInvoicePayload(this.toZatcaInvoiceInput(invoice, profile, metadata.invoiceUuid, previousInvoiceHash, nextIcv));
      const hashModeSnapshot = activeEgs?.hashMode ?? ZatcaHashMode.LOCAL_DETERMINISTIC;
      const invoiceHash = await this.resolveInvoiceHashForMode({
        hashMode: hashModeSnapshot,
        xmlBase64: payload.xmlBase64,
        appHash: payload.invoiceHash,
        invoiceId,
      });

      const updatedMetadata = await tx.zatcaInvoiceMetadata.update({
        where: { id: metadata.id },
        data: {
          zatcaStatus: ZatcaInvoiceStatus.XML_GENERATED,
          icv: nextIcv,
          previousInvoiceHash,
          invoiceHash,
          qrCodeBase64: payload.qrCodeBase64,
          xmlBase64: payload.xmlBase64,
          xmlHash: invoiceHash,
          egsUnitId: activeEgs?.id ?? null,
          hashModeSnapshot,
          generatedAt: new Date(),
          lastErrorCode: null,
          lastErrorMessage: null,
        },
        include: zatcaMetadataInclude,
      });

      if (activeEgs) {
        await tx.zatcaEgsUnit.update({
          where: { id: activeEgs.id },
          data: { lastIcv: nextIcv ?? activeEgs.lastIcv, lastInvoiceHash: invoiceHash },
        });
      }

      await tx.zatcaSubmissionLog.create({
        data: {
          organizationId,
          invoiceMetadataId: metadata.id,
          egsUnitId: activeEgs?.id ?? null,
          submissionType: ZatcaSubmissionType.COMPLIANCE_CHECK,
          status: ZatcaSubmissionStatus.SUCCESS,
          requestUrl: "local-generation-only",
          responseCode: "LOCAL_GENERATION_ONLY",
          responsePayloadBase64: Buffer.from(JSON.stringify({ message: "Local XML/QR/hash generation only. Not submitted to ZATCA." }), "utf8").toString("base64"),
          completedAt: new Date(),
        },
      });

      return updatedMetadata;
    });

    await this.auditLogService.log({ organizationId, actorUserId, action: "GENERATE", entityType: "ZatcaInvoiceMetadata", entityId: result.id, after: result });
    return result;
  }

  async submitInvoiceComplianceCheck(organizationId: string, actorUserId: string, invoiceId: string) {
    const metadata = await this.getMetadataWithXml(organizationId, invoiceId);
    const invoiceXml = Buffer.from(metadata.xmlBase64, "base64").toString("utf8");
    const egsUnitId = await this.resolveSubmissionEgsUnitId(organizationId, metadata.egsUnitId);
    const requestPayload = this.buildInvoiceSubmissionRequestPayload(metadata, "compliance-check");

    let adapterResult: ZatcaAdapterResult;
    try {
      adapterResult = await this.onboardingAdapter.submitComplianceCheck({
        organizationId,
        invoiceId,
        invoiceMetadataId: metadata.id,
        egsUnitId,
        invoiceXml,
        request: requestPayload,
      });
    } catch (error) {
      await this.createInvoiceSubmissionFailureLog({
        organizationId,
        invoiceMetadataId: metadata.id,
        egsUnitId,
        submissionType: ZatcaSubmissionType.COMPLIANCE_CHECK,
        requestUrl: this.adapterRequestUrl(error) ?? `${this.adapterConfig.mode}-compliance-check`,
        requestPayload,
        error,
      });
      this.throwAdapterError(error);
    }

    const nextStatus =
      metadata.zatcaStatus === ZatcaInvoiceStatus.XML_GENERATED || metadata.zatcaStatus === ZatcaInvoiceStatus.NOT_SUBMITTED
        ? ZatcaInvoiceStatus.READY_FOR_SUBMISSION
        : metadata.zatcaStatus;

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.zatcaSubmissionLog.create({
        data: {
          organizationId,
          invoiceMetadataId: metadata.id,
          egsUnitId,
          submissionType: ZatcaSubmissionType.COMPLIANCE_CHECK,
          status: ZatcaSubmissionStatus.SUCCESS,
          requestUrl: adapterResult.requestUrl ?? `${this.adapterConfig.mode}-compliance-check`,
          requestPayloadBase64: this.encodePayload(requestPayload),
          responsePayloadBase64: this.encodePayload(adapterResult.responsePayload),
          responseCode: adapterResult.responseCode,
          completedAt: new Date(),
        },
      });
      return tx.zatcaInvoiceMetadata.update({
        where: { id: metadata.id },
        data: {
          zatcaStatus: nextStatus,
          egsUnitId,
          lastErrorCode: null,
          lastErrorMessage: null,
        },
        include: zatcaMetadataInclude,
      });
    });

    await this.auditLogService.log({ organizationId, actorUserId, action: "ZATCA_COMPLIANCE_CHECK", entityType: "ZatcaInvoiceMetadata", entityId: updated.id, after: updated });
    return updated;
  }

  async requestInvoiceClearance(organizationId: string, _actorUserId: string, invoiceId: string) {
    const metadata = await this.getMetadataWithXml(organizationId, invoiceId);
    const invoiceXml = Buffer.from(metadata.xmlBase64, "base64").toString("utf8");
    const egsUnitId = await this.resolveSubmissionEgsUnitId(organizationId, metadata.egsUnitId);
    const requestPayload = this.buildInvoiceSubmissionRequestPayload(metadata, "clearance");

    try {
      const adapterResult = await this.onboardingAdapter.submitClearance({
        organizationId,
        invoiceId,
        invoiceMetadataId: metadata.id,
        egsUnitId,
        invoiceXml,
        request: requestPayload,
      });

      await this.prisma.zatcaSubmissionLog.create({
        data: {
          organizationId,
          invoiceMetadataId: metadata.id,
          egsUnitId,
          submissionType: ZatcaSubmissionType.CLEARANCE,
          status: ZatcaSubmissionStatus.SUCCESS,
          requestUrl: adapterResult.requestUrl ?? `${this.adapterConfig.mode}-clearance`,
          requestPayloadBase64: this.encodePayload(requestPayload),
          responsePayloadBase64: this.encodePayload(adapterResult.responsePayload),
          responseCode: adapterResult.responseCode,
          completedAt: new Date(),
        },
      });

      return this.ensureInvoiceMetadata(organizationId, invoiceId);
    } catch (error) {
      await this.createInvoiceSubmissionFailureLog({
        organizationId,
        invoiceMetadataId: metadata.id,
        egsUnitId,
        submissionType: ZatcaSubmissionType.CLEARANCE,
        requestUrl: this.adapterRequestUrl(error) ?? `${this.adapterConfig.mode}-clearance`,
        requestPayload,
        error,
      });
      this.throwAdapterError(error);
    }
  }

  async requestInvoiceReporting(organizationId: string, _actorUserId: string, invoiceId: string) {
    const metadata = await this.getMetadataWithXml(organizationId, invoiceId);
    const invoiceXml = Buffer.from(metadata.xmlBase64, "base64").toString("utf8");
    const egsUnitId = await this.resolveSubmissionEgsUnitId(organizationId, metadata.egsUnitId);
    const requestPayload = this.buildInvoiceSubmissionRequestPayload(metadata, "reporting");

    try {
      const adapterResult = await this.onboardingAdapter.submitReporting({
        organizationId,
        invoiceId,
        invoiceMetadataId: metadata.id,
        egsUnitId,
        invoiceXml,
        request: requestPayload,
      });

      await this.prisma.zatcaSubmissionLog.create({
        data: {
          organizationId,
          invoiceMetadataId: metadata.id,
          egsUnitId,
          submissionType: ZatcaSubmissionType.REPORTING,
          status: ZatcaSubmissionStatus.SUCCESS,
          requestUrl: adapterResult.requestUrl ?? `${this.adapterConfig.mode}-reporting`,
          requestPayloadBase64: this.encodePayload(requestPayload),
          responsePayloadBase64: this.encodePayload(adapterResult.responsePayload),
          responseCode: adapterResult.responseCode,
          completedAt: new Date(),
        },
      });

      return this.ensureInvoiceMetadata(organizationId, invoiceId);
    } catch (error) {
      await this.createInvoiceSubmissionFailureLog({
        organizationId,
        invoiceMetadataId: metadata.id,
        egsUnitId,
        submissionType: ZatcaSubmissionType.REPORTING,
        requestUrl: this.adapterRequestUrl(error) ?? `${this.adapterConfig.mode}-reporting`,
        requestPayload,
        error,
      });
      this.throwAdapterError(error);
    }
  }

  async getInvoiceXmlValidation(organizationId: string, invoiceId: string) {
    await this.ensureInvoiceBelongsToOrganization(organizationId, invoiceId);
    const localOnlyWarning = "Local LedgerByte XML checks only. This is not official ZATCA SDK validation and is not legal certification.";
    const metadata = await this.prisma.zatcaInvoiceMetadata.findFirst({ where: { organizationId, invoiceId } });
    if (!metadata?.xmlBase64) {
      return {
        localOnly: true,
        officialValidation: false,
        valid: false,
        errors: ["ZATCA XML has not been generated for this invoice."],
        warnings: [localOnlyWarning],
      };
    }

    const invoice = await this.prisma.salesInvoice.findFirst({
      where: { id: invoiceId, organizationId },
      include: {
        organization: { select: { id: true, name: true, legalName: true, taxNumber: true, countryCode: true } },
        customer: {
          select: {
            id: true,
            name: true,
            displayName: true,
            taxNumber: true,
            addressLine1: true,
            addressLine2: true,
            buildingNumber: true,
            district: true,
            city: true,
            postalCode: true,
            countryCode: true,
          },
        },
        lines: { orderBy: { sortOrder: "asc" }, include: { taxRate: { select: { name: true } } } },
      },
    });
    if (!invoice) {
      throw new NotFoundException("Sales invoice not found.");
    }

    const profile = await this.prisma.zatcaOrganizationProfile.findUnique({ where: { organizationId } });
    if (!profile) {
      return {
        localOnly: true,
        officialValidation: false,
        valid: false,
        errors: ["ZATCA profile is not configured."],
        warnings: [localOnlyWarning],
      };
    }

    const validation = validateLocalZatcaXml(
      this.toZatcaInvoiceInput(invoice, profile, metadata.invoiceUuid, metadata.previousInvoiceHash ?? initialPreviousInvoiceHash, metadata.icv),
    );
    const xml = Buffer.from(metadata.xmlBase64, "base64").toString("utf8");
    const warnings = [...validation.warnings];
    if (!xml.includes(metadata.invoiceUuid)) {
      warnings.push("Generated XML does not contain the stored invoice UUID.");
    }

    return {
      localOnly: true,
      officialValidation: false,
      valid: validation.errors.length === 0,
      errors: validation.errors,
      warnings,
    };
  }

  async getInvoiceXml(organizationId: string, invoiceId: string) {
    const metadata = await this.getMetadataWithXml(organizationId, invoiceId);
    return Buffer.from(metadata.xmlBase64, "base64");
  }

  async getInvoiceQr(organizationId: string, invoiceId: string) {
    const metadata = await this.getMetadataWithQr(organizationId, invoiceId);
    return { qrCodeBase64: metadata.qrCodeBase64 };
  }

  listSubmissions(organizationId: string) {
    return this.prisma.zatcaSubmissionLog.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      include: {
        invoiceMetadata: { select: { id: true, invoiceId: true, invoiceUuid: true, zatcaStatus: true } },
        egsUnit: { select: { id: true, name: true, environment: true } },
      },
    });
  }

  async ensureInvoiceMetadata(organizationId: string, invoiceId: string, executor: Prisma.TransactionClient | PrismaService = this.prisma) {
    await this.ensureInvoiceBelongsToOrganization(organizationId, invoiceId, executor);
    return executor.zatcaInvoiceMetadata.upsert({
      where: { invoiceId },
      update: {},
      create: { organizationId, invoiceId, zatcaInvoiceType: ZatcaInvoiceType.STANDARD_TAX_INVOICE },
      include: zatcaMetadataInclude,
    });
  }

  private async ensureInvoiceBelongsToOrganization(
    organizationId: string,
    invoiceId: string,
    executor: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    const invoice = await executor.salesInvoice.findFirst({ where: { id: invoiceId, organizationId }, select: { id: true } });
    if (!invoice) {
      throw new NotFoundException("Sales invoice not found.");
    }
    return invoice;
  }

  private async resolveSubmissionEgsUnitId(organizationId: string, currentEgsUnitId: string | null): Promise<string | null> {
    if (currentEgsUnitId) {
      return currentEgsUnitId;
    }

    const activeEgs = await this.prisma.zatcaEgsUnit.findFirst({
      where: { organizationId, isActive: true, status: ZatcaRegistrationStatus.ACTIVE },
      orderBy: { updatedAt: "desc" },
      select: { id: true },
    });

    return activeEgs?.id ?? null;
  }

  private buildInvoiceSubmissionRequestPayload(
    metadata: {
      id: string;
      invoiceId: string;
      invoiceUuid: string;
      invoiceHash: string | null;
      xmlHash: string | null;
      xmlBase64: string;
    },
    operation: "compliance-check" | "clearance" | "reporting",
  ) {
    return {
      operation,
      adapterMode: this.adapterConfig.mode,
      invoiceId: metadata.invoiceId,
      invoiceMetadataId: metadata.id,
      invoiceUuid: metadata.invoiceUuid,
      invoiceHash: metadata.invoiceHash,
      xmlHash: metadata.xmlHash,
      invoiceXmlBase64: metadata.xmlBase64,
      // TODO: Verify official ZATCA signed XML, hash, and invoice-type payload fields before real sandbox calls.
    };
  }

  private async createEgsSubmissionFailureLog(params: {
    organizationId: string;
    egsUnitId: string;
    submissionType: ZatcaSubmissionType;
    requestUrl: string;
    requestPayload: unknown;
    error: unknown;
  }) {
    const details = this.adapterErrorDetails(params.error);
    await this.prisma.zatcaSubmissionLog.create({
      data: {
        organizationId: params.organizationId,
        invoiceMetadataId: null,
        egsUnitId: params.egsUnitId,
        submissionType: params.submissionType,
        status: ZatcaSubmissionStatus.FAILED,
        requestUrl: params.requestUrl,
        requestPayloadBase64: this.encodePayload(params.requestPayload),
        responsePayloadBase64: this.encodePayload(details.responsePayload),
        responseCode: details.responseCode,
        errorCode: details.errorCode,
        errorMessage: details.message,
        completedAt: new Date(),
      },
    });
  }

  private async createInvoiceSubmissionFailureLog(params: {
    organizationId: string;
    invoiceMetadataId: string;
    egsUnitId: string | null;
    submissionType: ZatcaSubmissionType;
    requestUrl: string;
    requestPayload: unknown;
    error: unknown;
  }) {
    const details = this.adapterErrorDetails(params.error);
    await this.prisma.$transaction(async (tx) => {
      await tx.zatcaSubmissionLog.create({
        data: {
          organizationId: params.organizationId,
          invoiceMetadataId: params.invoiceMetadataId,
          egsUnitId: params.egsUnitId,
          submissionType: params.submissionType,
          status: ZatcaSubmissionStatus.FAILED,
          requestUrl: params.requestUrl,
          requestPayloadBase64: this.encodePayload(params.requestPayload),
          responsePayloadBase64: this.encodePayload(details.responsePayload),
          responseCode: details.responseCode,
          errorCode: details.errorCode,
          errorMessage: details.message,
          completedAt: new Date(),
        },
      });
      await tx.zatcaInvoiceMetadata.update({
        where: { id: params.invoiceMetadataId },
        data: {
          egsUnitId: params.egsUnitId ?? undefined,
          lastErrorCode: details.errorCode,
          lastErrorMessage: details.message,
        },
      });
    });
  }

  private sanitizeComplianceCsidRequestForLog(requestPayload: { csrPem?: string; otp?: string; requestedMode?: string; adapterMode?: string; environment?: string }) {
    return {
      adapterMode: requestPayload.adapterMode,
      requestedMode: requestPayload.requestedMode,
      environment: requestPayload.environment,
      otpLength: requestPayload.otp?.length ?? 0,
      csrHash: requestPayload.csrPem ? this.hashForLog(requestPayload.csrPem) : null,
    };
  }

  private sanitizeProductionCsidRequestForLog(requestPayload: { complianceCsidPem?: string; certificateRequestId?: string; adapterMode?: string }) {
    return {
      adapterMode: requestPayload.adapterMode,
      certificateRequestId: requestPayload.certificateRequestId,
      complianceCsidHash: requestPayload.complianceCsidPem ? this.hashForLog(requestPayload.complianceCsidPem) : null,
    };
  }

  private adapterRequestUrl(error: unknown): string | undefined {
    return isZatcaAdapterError(error) ? error.requestUrl : undefined;
  }

  private adapterErrorDetails(error: unknown): { message: string; responseCode: string; errorCode: string; responsePayload: Record<string, unknown> } {
    if (isZatcaAdapterError(error)) {
      return {
        message: error.message,
        responseCode: error.responseCode,
        errorCode: error.errorCode ?? error.responseCode,
        responsePayload: error.responsePayload,
      };
    }

    const message = error instanceof Error ? error.message : "ZATCA adapter request failed.";
    return {
      message,
      responseCode: "ZATCA_ADAPTER_ERROR",
      errorCode: "ZATCA_ADAPTER_ERROR",
      responsePayload: { message },
    };
  }

  private throwAdapterError(error: unknown): never {
    if (isZatcaAdapterError(error)) {
      if (error.httpStatus === 501) {
        throw new NotImplementedException(error.message);
      }
      throw new BadRequestException(error.message);
    }

    if (error instanceof BadRequestException || error instanceof NotImplementedException) {
      throw error;
    }

    throw new BadRequestException(error instanceof Error ? error.message : "ZATCA adapter request failed.");
  }

  private encodePayload(value: unknown): string {
    return Buffer.from(JSON.stringify(value), "utf8").toString("base64");
  }

  private async getMetadataWithXml(organizationId: string, invoiceId: string) {
    const metadata = await this.prisma.zatcaInvoiceMetadata.findFirst({ where: { organizationId, invoiceId } });
    if (!metadata?.xmlBase64) {
      throw new NotFoundException("ZATCA XML has not been generated for this invoice.");
    }
    return metadata as typeof metadata & { xmlBase64: string };
  }

  private async getMetadataWithQr(organizationId: string, invoiceId: string) {
    const metadata = await this.prisma.zatcaInvoiceMetadata.findFirst({ where: { organizationId, invoiceId } });
    if (!metadata?.qrCodeBase64) {
      throw new NotFoundException("ZATCA QR payload has not been generated for this invoice.");
    }
    return metadata as typeof metadata & { qrCodeBase64: string };
  }

  private toZatcaInvoiceInput(
    invoice: Prisma.SalesInvoiceGetPayload<{
      include: {
        organization: { select: { id: true; name: true; legalName: true; taxNumber: true; countryCode: true } };
        customer: {
          select: {
            id: true;
            name: true;
            displayName: true;
            taxNumber: true;
            addressLine1: true;
            addressLine2: true;
            buildingNumber: true;
            district: true;
            city: true;
            postalCode: true;
            countryCode: true;
          };
        };
        lines: { include: { taxRate: { select: { name: true } } } };
      };
    }>,
    profile: { sellerName: string | null; vatNumber: string | null; companyIdType: string | null; companyIdNumber: string | null; buildingNumber: string | null; streetName: string | null; district: string | null; city: string | null; postalCode: string | null; countryCode: string; additionalAddressNumber: string | null },
    invoiceUuid: string,
    previousInvoiceHash: string,
    icv?: number | null,
  ): ZatcaInvoiceInput {
    return {
      invoiceUuid,
      invoiceNumber: invoice.invoiceNumber,
      invoiceType: ZatcaInvoiceType.STANDARD_TAX_INVOICE,
      issueDate: invoice.issueDate,
      supplyDate: invoice.issueDate,
      currency: invoice.currency,
      seller: {
        name: profile.sellerName ?? invoice.organization.legalName ?? invoice.organization.name,
        vatNumber: profile.vatNumber ?? invoice.organization.taxNumber ?? "",
        companyIdType: profile.companyIdType,
        companyIdNumber: profile.companyIdNumber,
        buildingNumber: profile.buildingNumber,
        streetName: profile.streetName,
        district: profile.district,
        city: profile.city,
        postalCode: profile.postalCode,
        countryCode: profile.countryCode,
        additionalAddressNumber: profile.additionalAddressNumber,
      },
      buyer: {
        name: invoice.customer.displayName ?? invoice.customer.name,
        vatNumber: invoice.customer.taxNumber,
        streetName: invoice.customer.addressLine1,
        additionalAddressNumber: invoice.customer.addressLine2,
        buildingNumber: invoice.customer.buildingNumber,
        district: invoice.customer.district,
        city: invoice.customer.city,
        postalCode: invoice.customer.postalCode,
        countryCode: invoice.customer.countryCode,
      },
      subtotal: String(invoice.subtotal),
      discountTotal: String(invoice.discountTotal),
      taxableTotal: String(invoice.taxableTotal),
      taxTotal: String(invoice.taxTotal),
      total: String(invoice.total),
      previousInvoiceHash,
      icv,
      lines: invoice.lines.map((line) => ({
        id: line.id,
        description: line.description,
        quantity: String(line.quantity),
        unitPrice: String(line.unitPrice),
        taxableAmount: String(line.taxableAmount),
        taxAmount: String(line.taxAmount),
        lineTotal: String(line.lineTotal),
        taxRateName: line.taxRate?.name ?? null,
      })),
    };
  }

  private async getCsrProfileSnapshot(organizationId: string): Promise<ZatcaCsrProfileSource> {
    const [organization, profile] = await Promise.all([
      this.prisma.organization.findFirst({
        where: { id: organizationId },
        select: { id: true, name: true, legalName: true, taxNumber: true, countryCode: true },
      }),
      this.prisma.zatcaOrganizationProfile.findFirst({
        where: { organizationId },
        select: { sellerName: true, vatNumber: true, countryCode: true, businessCategory: true },
      }),
    ]);
    if (!organization) {
      throw new NotFoundException("Organization not found.");
    }
    return {
      sellerName: profile?.sellerName ?? organization.legalName ?? organization.name,
      vatNumber: profile?.vatNumber ?? organization.taxNumber,
      countryCode: profile?.countryCode ?? organization.countryCode,
      businessCategory: profile?.businessCategory ?? null,
    };
  }

  private async getEgsUnitInternal(organizationId: string, id: string): Promise<InternalEgsUnitRecord> {
    const egsUnit = await this.prisma.zatcaEgsUnit.findFirst({ where: { id, organizationId }, select: internalEgsUnitSelect });
    if (!egsUnit) {
      throw new NotFoundException("ZATCA EGS unit not found.");
    }
    return egsUnit;
  }

  private buildCsrPlanFields(profile: ZatcaCsrProfileSource, egsUnit: Pick<InternalEgsUnitRecord, "name" | "deviceSerialNumber">): ZatcaCsrPlanField[] {
    return [
      this.csrPlanField("csr.common.name", "Common name", null, "NOT_MODELED", "MISSING", "SDK_README_CSR", "Official examples populate CN with an EGS/taxpayer identifier; LedgerByte does not infer it from the EGS display name."),
      this.csrPlanField(
        "csr.serial.number",
        "EGS serial number",
        egsUnit.deviceSerialNumber,
        "EGS_UNIT",
        hasText(egsUnit.deviceSerialNumber) ? "NEEDS_REVIEW" : "MISSING",
        "CSR_CONFIG_TEMPLATE",
        "Official examples use a structured serial-number value; the stored device serial is displayed for review only.",
      ),
      this.csrPlanField("csr.organization.identifier", "Organization VAT identifier", profile.vatNumber, "ZATCA_PROFILE", hasText(profile.vatNumber) ? "AVAILABLE" : "MISSING", "CSR_CONFIG_TEMPLATE", "Use the taxpayer VAT/TIN identifier from the ZATCA seller profile."),
      this.csrPlanField("csr.organization.unit.name", "Organization unit name", egsUnit.name, "EGS_UNIT", hasText(egsUnit.name) ? "NEEDS_REVIEW" : "MISSING", "CSR_CONFIG_TEMPLATE", "Official examples use branch or VAT group unit details; the EGS name is displayed for review only."),
      this.csrPlanField("csr.organization.name", "Organization legal name", profile.sellerName, "ZATCA_PROFILE", hasText(profile.sellerName) ? "AVAILABLE" : "MISSING", "CSR_CONFIG_TEMPLATE", "Use the official taxpayer legal name from the ZATCA seller profile."),
      this.csrPlanField("csr.country.name", "Country code", profile.countryCode, "ZATCA_PROFILE", hasText(profile.countryCode) ? "AVAILABLE" : "MISSING", "CSR_CONFIG_TEMPLATE", "Official CSR examples use SA for Saudi Arabia."),
      this.csrPlanField("csr.invoice.type", "Invoice type capability flags", null, "NOT_MODELED", "MISSING", "CSR_CONFIG_TEMPLATE", "Official examples use invoice type flags such as 1100; LedgerByte does not model the final EGS invoice-type capability yet."),
      this.csrPlanField("csr.location.address", "EGS location address", null, "NOT_MODELED", "MISSING", "CSR_CONFIG_TEMPLATE", "Official examples use a location-address value; LedgerByte does not infer this from postal address fields."),
      this.csrPlanField(
        "csr.industry.business.category",
        "Industry/business category",
        profile.businessCategory,
        "ZATCA_PROFILE",
        hasText(profile.businessCategory) ? "AVAILABLE" : "MISSING",
        "CSR_CONFIG_TEMPLATE",
        "Use the taxpayer industry/business category captured in ZATCA profile settings.",
      ),
    ];
  }

  private csrPlanField(
    sdkConfigKey: string,
    label: string,
    currentValue: string | null | undefined,
    source: ZatcaCsrPlanField["source"],
    status: ZatcaCsrPlanFieldStatus,
    officialSource: string,
    notes: string,
  ): ZatcaCsrPlanField {
    return {
      sdkConfigKey,
      label,
      officialSource,
      currentValue: hasText(currentValue) ? currentValue!.trim() : null,
      status,
      source,
      notes,
    };
  }

  private getKeyCustodyMode(unit: { privateKeyPem?: string | null } | null): ZatcaKeyCustodyMode {
    return hasText(unit?.privateKeyPem) ? "RAW_DATABASE_PEM" : "MISSING";
  }

  private toPublicEgsUnit(unit: SafeEgsUnitRecord | InternalEgsUnitRecord) {
    const keyCustodyMode = "privateKeyPem" in unit ? this.getKeyCustodyMode(unit) : "MISSING";
    return {
      id: unit.id,
      organizationId: unit.organizationId,
      profileId: unit.profileId,
      name: unit.name,
      environment: unit.environment,
      status: unit.status,
      deviceSerialNumber: unit.deviceSerialNumber,
      solutionName: unit.solutionName,
      hasCsr: Boolean(unit.csrPem),
      hasComplianceCsid: Boolean(unit.complianceCsidPem),
      hasProductionCsid: Boolean(unit.productionCsidPem),
      hasPrivateKey: keyCustodyMode === "RAW_DATABASE_PEM",
      keyCustodyMode,
      certificateExpiryKnown: false,
      certificateExpiresAt: null,
      renewalStatus: "NOT_IMPLEMENTED",
      certificateRequestId: unit.certificateRequestId,
      lastInvoiceHash: unit.lastInvoiceHash,
      lastIcv: unit.lastIcv,
      hashMode: unit.hashMode,
      hashModeEnabledAt: unit.hashModeEnabledAt,
      hashModeEnabledById: unit.hashModeEnabledById,
      hashModeResetReason: unit.hashModeResetReason,
      sdkHashChainStartedAt: unit.sdkHashChainStartedAt,
      isActive: unit.isActive,
      createdAt: unit.createdAt,
      updatedAt: unit.updatedAt,
    };
  }

  private async resolveInvoiceHashForMode(params: { hashMode: ZatcaHashMode; xmlBase64: string; appHash: string; invoiceId: string }): Promise<string> {
    if (params.hashMode === ZatcaHashMode.LOCAL_DETERMINISTIC) {
      return params.appHash;
    }
    if (!this.zatcaSdkService) {
      throw new BadRequestException("SDK hash generation service is not available.");
    }

    const xml = Buffer.from(params.xmlBase64, "base64").toString("utf8");
    const result = await this.zatcaSdkService.generateOfficialZatcaHash(xml, { appHash: params.appHash, tempName: params.invoiceId });
    if (result.hashComparisonStatus === "BLOCKED" || !result.sdkHash) {
      const reason = result.blockingReasons.length > 0 ? result.blockingReasons.join("; ") : "No SDK hash was returned.";
      throw new BadRequestException(`SDK hash generation failed or is blocked: ${reason}`);
    }
    return result.sdkHash;
  }

  private getSdkHashModeEnableBlockers(unit: SafeEgsUnitRecord, metadataCount: number, sdkReadinessBlockers: string[]): string[] {
    const blockers = [...sdkReadinessBlockers];
    if (unit.hashMode === ZatcaHashMode.SDK_GENERATED) {
      blockers.push("SDK hash mode is already enabled for this EGS unit.");
    }
    if (metadataCount > 0) {
      blockers.push("This EGS already has ZATCA invoice metadata; Create a new EGS unit for SDK hash mode.");
    }
    if (unit.environment === "PRODUCTION" || unit.productionCsidPem) {
      blockers.push("SDK hash mode cannot be enabled on an EGS unit with production CSID state.");
    }
    return blockers;
  }

  private buildSellerProfileReadiness(profile: {
    sellerName?: string | null;
    vatNumber?: string | null;
    streetName?: string | null;
    buildingNumber?: string | null;
    district?: string | null;
    city?: string | null;
    postalCode?: string | null;
    countryCode?: string | null;
  }): ZatcaReadinessSection {
    const checks: ZatcaReadinessCheck[] = [];
    this.addRequiredCheck(checks, profile.sellerName, "ZATCA_SELLER_NAME_MISSING", "seller.sellerName", "Seller name is required in generated invoice XML.", "BR-06", "Add seller name in ZATCA profile settings.");
    this.addRequiredCheck(checks, profile.vatNumber, "ZATCA_SELLER_VAT_NUMBER_MISSING", "seller.vatNumber", "Seller VAT registration number is required in generated invoice XML.", "BR-KSA-39", "Add the seller VAT number in ZATCA profile settings.");
    if (hasText(profile.vatNumber) && !isSaudiVatNumber(profile.vatNumber)) {
      checks.push(this.check("ZATCA_SELLER_VAT_NUMBER_INVALID", "ERROR", "seller.vatNumber", "Seller VAT registration number must be 15 digits and start/end with 3 when present.", "BR-KSA-40", "Enter a 15-digit Saudi VAT number that starts and ends with 3."));
    }
    this.addRequiredCheck(checks, profile.streetName, "ZATCA_SELLER_STREET_MISSING", "seller.streetName", "Seller street name is required in generated invoice XML.", "BR-KSA-09", "Add seller street in ZATCA profile settings.");
    this.addRequiredCheck(checks, profile.buildingNumber, "ZATCA_SELLER_BUILDING_NUMBER_MISSING", "seller.buildingNumber", "Seller building number is required in generated invoice XML.", "BR-KSA-09", "Add a 4-digit building number in ZATCA profile settings.");
    const sellerBuildingNumber = profile.buildingNumber?.trim() ?? "";
    if (sellerBuildingNumber && !/^[0-9]{4}$/.test(sellerBuildingNumber)) {
      checks.push(this.check("ZATCA_SELLER_BUILDING_NUMBER_INVALID", "WARNING", "seller.buildingNumber", "Seller building number must contain 4 digits.", "BR-KSA-37", "Use the 4-digit Saudi national address building number."));
    }
    this.addRequiredCheck(checks, profile.district, "ZATCA_SELLER_DISTRICT_MISSING", "seller.district", "Seller district is required in generated invoice XML.", "BR-KSA-09", "Add seller district in ZATCA profile settings.");
    this.addRequiredCheck(checks, profile.city, "ZATCA_SELLER_CITY_MISSING", "seller.city", "Seller city is required in generated invoice XML.", "BR-KSA-09", "Add seller city in ZATCA profile settings.");
    this.addRequiredCheck(checks, profile.postalCode, "ZATCA_SELLER_POSTAL_CODE_MISSING", "seller.postalCode", "Seller postal code is required in generated invoice XML.", "BR-KSA-09", "Add the 5-digit seller postal code in ZATCA profile settings.");
    const sellerPostalCode = profile.postalCode?.trim() ?? "";
    if (sellerPostalCode && !/^[0-9]{5}$/.test(sellerPostalCode)) {
      checks.push(this.check("ZATCA_SELLER_POSTAL_CODE_INVALID", "WARNING", "seller.postalCode", "Seller postal code must be 5 digits.", "BR-KSA-66", "Use the 5-digit Saudi postal code."));
    }
    this.addRequiredCheck(checks, profile.countryCode, "ZATCA_SELLER_COUNTRY_CODE_MISSING", "seller.countryCode", "Seller country code is required in generated invoice XML.", "BR-KSA-09", "Add seller country code in ZATCA profile settings.");
    if (checks.length === 0) {
      checks.push(this.check("ZATCA_SELLER_INVOICE_XML_READY", "INFO", "seller", "Seller invoice XML address fields are ready locally.", "BR-KSA-09", "No seller address action is required for local XML readiness."));
    }
    return createZatcaReadinessSection("SELLER_PROFILE", checks);
  }

  private buildBuyerContactReadiness(
    buyer: {
      name?: string | null;
      displayName?: string | null;
      taxNumber?: string | null;
      addressLine1?: string | null;
      buildingNumber?: string | null;
      district?: string | null;
      city?: string | null;
      postalCode?: string | null;
      countryCode?: string | null;
    },
    invoiceType: ZatcaInvoiceType,
  ): ZatcaReadinessSection {
    const checks: ZatcaReadinessCheck[] = [];
    const simplified = invoiceType === ZatcaInvoiceType.SIMPLIFIED_TAX_INVOICE;
    const buyerCountryCode = buyer.countryCode?.trim().toUpperCase() ?? "";

    if (simplified) {
      checks.push(this.check("ZATCA_BUYER_SIMPLIFIED_ADDRESS_OPTIONAL", "INFO", "buyer", "Official simplified invoice samples inspected do not require buyer postal address.", "KSA-2=0200000", "Do not block simplified invoices only because buyer address fields are empty."));
      return createZatcaReadinessSection("BUYER_CONTACT", checks);
    }

    if (!hasText(buyer.displayName) && !hasText(buyer.name)) {
      checks.push(this.check("ZATCA_BUYER_NAME_MISSING", "WARNING", "buyer.name", "Buyer name should be present on standard tax invoices.", "BR-KSA-42", "Add a buyer display name on the contact."));
    }
    if (hasText(buyer.taxNumber) && !isSaudiVatNumber(buyer.taxNumber)) {
      checks.push(this.check("ZATCA_BUYER_VAT_NUMBER_INVALID", "ERROR", "buyer.taxNumber", "Buyer VAT number must be 15 digits and start/end with 3 when it exists.", "BR-KSA-44", "Fix the buyer VAT number or leave it empty when not applicable."));
    } else if (!hasText(buyer.taxNumber)) {
      checks.push(this.check("ZATCA_BUYER_VAT_NUMBER_CONDITIONAL", "INFO", "buyer.taxNumber", "Buyer VAT number is conditional; when present it must match the Saudi VAT format.", "BR-KSA-44", "Add a valid buyer VAT number only when applicable to the transaction."));
    }

    if (!hasText(buyer.countryCode)) {
      checks.push(this.check("ZATCA_BUYER_COUNTRY_CODE_MISSING", "ERROR", "buyer.countryCode", "Buyer country code is required for standard buyer address readiness.", "BR-KSA-63", "Add buyer country code on the contact."));
    }

    if (buyerCountryCode === "SA") {
      this.addRequiredCheck(checks, buyer.addressLine1, "ZATCA_BUYER_STREET_MISSING", "buyer.addressLine1", "Saudi standard buyer street name is required.", "BR-KSA-63", "Add buyer street name on the contact.");
      this.addRequiredCheck(checks, buyer.buildingNumber, "ZATCA_BUYER_BUILDING_NUMBER_MISSING", "buyer.buildingNumber", "Saudi standard buyer building number is required.", "BR-KSA-63", "Add the buyer building number on the contact.");
      this.addRequiredCheck(checks, buyer.district, "ZATCA_BUYER_DISTRICT_MISSING", "buyer.district", "Saudi standard buyer district is required.", "BR-KSA-63", "Add buyer district on the contact.");
      this.addRequiredCheck(checks, buyer.city, "ZATCA_BUYER_CITY_MISSING", "buyer.city", "Saudi standard buyer city is required.", "BR-KSA-63", "Add buyer city on the contact.");
      this.addRequiredCheck(checks, buyer.postalCode, "ZATCA_BUYER_POSTAL_CODE_MISSING", "buyer.postalCode", "Saudi standard buyer postal code is required.", "BR-KSA-63", "Add buyer postal code on the contact.");
      const buyerPostalCode = buyer.postalCode?.trim() ?? "";
      if (buyerPostalCode && !/^[0-9]{5}$/.test(buyerPostalCode)) {
        checks.push(this.check("ZATCA_BUYER_POSTAL_CODE_INVALID", "WARNING", "buyer.postalCode", "Saudi buyer postal code must be 5 digits.", "BR-KSA-67", "Use the 5-digit Saudi postal code."));
      }
      if (!checks.some((check) => check.severity === "ERROR" || check.severity === "WARNING")) {
        checks.push(this.check("ZATCA_BUYER_STANDARD_SA_ADDRESS_READY", "INFO", "buyer", "Saudi standard buyer address fields are ready locally.", "BR-KSA-63", "No buyer address action is required for local XML readiness."));
      }
      return createZatcaReadinessSection("BUYER_CONTACT", checks);
    }

    this.addRequiredCheck(checks, buyer.addressLine1, "ZATCA_BUYER_NON_SA_STREET_MISSING", "buyer.addressLine1", "Non-Saudi standard buyer street name is expected.", "BR-KSA-10", "Add buyer street name on the contact.");
    this.addRequiredCheck(checks, buyer.city, "ZATCA_BUYER_NON_SA_CITY_MISSING", "buyer.city", "Non-Saudi standard buyer city is expected.", "BR-KSA-10", "Add buyer city on the contact.");
    if (!checks.some((check) => check.severity === "ERROR" || check.severity === "WARNING")) {
      checks.push(this.check("ZATCA_BUYER_STANDARD_NON_SA_ADDRESS_READY", "INFO", "buyer", "Non-Saudi standard buyer address fields are ready locally.", "BR-KSA-10", "No buyer address action is required for local XML readiness."));
    }
    return createZatcaReadinessSection("BUYER_CONTACT", checks);
  }

  private buildInvoiceReadinessSection(invoice: { status: SalesInvoiceStatus | string; invoiceNumber: string }, invoiceType: ZatcaInvoiceType): ZatcaReadinessSection {
    const checks: ZatcaReadinessCheck[] = [
      this.check("ZATCA_INVOICE_TYPE_FLAGS_LOCAL", "INFO", "invoice.zatcaInvoiceType", `Invoice readiness uses transaction code flags ${this.transactionCodeFlagsForReadiness(invoiceType)} for ${invoiceType}.`, "BR-KSA-06", "Confirm the invoice type before generating XML."),
    ];
    if (invoice.status !== SalesInvoiceStatus.FINALIZED) {
      checks.push(this.check("ZATCA_INVOICE_NOT_FINALIZED", "ERROR", "invoice.status", "ZATCA XML readiness requires a finalized invoice.", "BR-02", "Finalize the invoice before generating ZATCA XML."));
    }
    return createZatcaReadinessSection("INVOICE", checks);
  }

  private buildEgsReadinessSection(
    activeEgs: {
      id: string;
      name: string;
      status: ZatcaRegistrationStatus;
      isActive: boolean;
      csrPem?: string | null;
      complianceCsidPem?: string | null;
      lastIcv: number;
      lastInvoiceHash: string | null;
      hashMode: ZatcaHashMode;
    } | null,
  ): ZatcaReadinessSection {
    const checks: ZatcaReadinessCheck[] = [];
    if (!activeEgs) {
      checks.push(this.check("ZATCA_EGS_ACTIVE_MISSING", "ERROR", "egs.active", "No active development EGS unit is configured for local hash-chain continuity.", undefined, "Create and activate a development EGS unit."));
      return createZatcaReadinessSection("EGS", checks);
    }
    checks.push(this.check("ZATCA_EGS_ACTIVE_READY", "INFO", "egs.active", `Active EGS unit '${activeEgs.name}' is available for local generated invoice metadata.`, undefined, "No EGS action is required for local invoice readiness."));
    if (activeEgs.hashMode !== ZatcaHashMode.SDK_GENERATED) {
      checks.push(this.check("ZATCA_EGS_HASH_MODE_LOCAL", "WARNING", "egs.hashMode", "EGS unit is using local deterministic hash mode, not SDK-generated hash mode.", undefined, "Use SDK hash mode only on a fresh local EGS when local SDK validation is configured."));
    }
    if (!activeEgs.csrPem) {
      checks.push(this.check("ZATCA_EGS_CSR_NOT_REQUIRED_FOR_XML", "INFO", "egs.csrPem", "CSR is future onboarding/signing readiness and is not required for unsigned generated XML readiness.", undefined, "Generate CSR only when continuing into onboarding/signing work."));
    }
    if (!activeEgs.complianceCsidPem) {
      checks.push(this.check("ZATCA_EGS_CSID_NOT_REQUIRED_FOR_XML", "INFO", "egs.complianceCsidPem", "Compliance CSID is future onboarding/signing readiness and is not required for unsigned generated XML readiness.", undefined, "Do not request CSIDs in this readiness-only phase."));
    }
    return createZatcaReadinessSection("EGS", checks);
  }

  private buildSettingsXmlReadinessSection(localXmlCount: number): ZatcaReadinessSection {
    const checks = [
      localXmlCount > 0
        ? this.check("ZATCA_XML_GENERATED_LOCALLY", "INFO", "xml.generatedCount", `${localXmlCount} local generated XML record(s) exist.`, undefined, "Use invoice readiness for invoice-specific field checks.")
        : this.check("ZATCA_XML_NOT_GENERATED_YET", "WARNING", "xml.generatedCount", "No local ZATCA XML has been generated for an invoice yet.", undefined, "Generate XML from a finalized invoice after seller and buyer readiness is clean."),
    ];
    return createZatcaReadinessSection("XML", checks);
  }

  private buildInvoiceXmlReadinessSection(metadata: { xmlBase64: string | null; generatedAt: Date | null; hashModeSnapshot?: ZatcaHashMode | null } | null): ZatcaReadinessSection {
    const checks: ZatcaReadinessCheck[] = [];
    if (!metadata?.xmlBase64) {
      checks.push(this.check("ZATCA_XML_NOT_GENERATED_FOR_INVOICE", "WARNING", "xml.xmlBase64", "ZATCA XML has not been generated for this invoice yet.", undefined, "Generate XML only after readiness checks are clean."));
    } else {
      checks.push(this.check("ZATCA_XML_EXISTS_FOR_INVOICE", "INFO", "xml.xmlBase64", "Generated XML exists for this invoice.", undefined, "Refresh readiness if seller or buyer data changes after generation."));
    }
    return createZatcaReadinessSection("XML", checks);
  }

  private buildSdkReadinessSection(
    sdkReadiness: {
      enabled: boolean;
      canRunLocalValidation: boolean;
      blockingReasons: string[];
      warnings: string[];
    } | null,
  ): ZatcaReadinessSection {
    const checks: ZatcaReadinessCheck[] = [];
    if (!sdkReadiness) {
      checks.push(this.check("ZATCA_SDK_READINESS_UNAVAILABLE", "INFO", "sdk", "Local SDK readiness service is not available in this process.", undefined, "Use local XML readiness when SDK validation is not configured."));
      return createZatcaReadinessSection("XML", checks);
    }
    if (sdkReadiness.canRunLocalValidation) {
      checks.push(this.check("ZATCA_SDK_LOCAL_VALIDATION_READY", "INFO", "sdk.canRunLocalValidation", "Local SDK validation can run when explicitly requested.", undefined, "Keep SDK validation local-only and disabled by default where appropriate."));
    } else {
      checks.push(this.check("ZATCA_SDK_LOCAL_VALIDATION_BLOCKED", "WARNING", "sdk.canRunLocalValidation", "Local SDK validation is not ready or is disabled.", undefined, "Configure Java 11-14, official SDK paths, and local execution only if SDK validation is needed."));
    }
    for (const reason of sdkReadiness.blockingReasons ?? []) {
      checks.push(this.check("ZATCA_SDK_BLOCKING_REASON", "WARNING", "sdk.blockingReasons", reason, undefined, "Resolve local SDK setup only for optional local validation."));
    }
    for (const warning of sdkReadiness.warnings ?? []) {
      checks.push(this.check("ZATCA_SDK_WARNING", "INFO", "sdk.warnings", warning, undefined, "Review the local SDK setup note."));
    }
    return createZatcaReadinessSection("XML", checks);
  }

  private buildKeyCustodyReadinessSection(activeEgs: InternalEgsUnitRecord | null): ZatcaReadinessSection {
    const checks: ZatcaReadinessCheck[] = [];
    if (!activeEgs) {
      checks.push(
        this.check(
          "ZATCA_KEY_CUSTODY_EGS_MISSING",
          "ERROR",
          "egs.active",
          "No active EGS unit exists for certificate/key custody planning.",
          "SECURITY_FEATURES_EGS_ONBOARDING",
          "Create and activate a development EGS unit before CSR/key-custody planning.",
        ),
      );
    } else if (hasText(activeEgs.privateKeyPem)) {
      checks.push(
        this.check(
          "ZATCA_PRIVATE_KEY_STORED_IN_DATABASE",
          "ERROR",
          "egs.privateKeyCustody",
          "The current schema can contain raw private key PEM material, which is not acceptable for production key custody.",
          "SECURITY_FEATURES_PRIVATE_KEY",
          "Do not use raw database PEM for production signing; move production custody to KMS/HSM-backed signing.",
        ),
      );
    } else {
      checks.push(
        this.check(
          "ZATCA_PRIVATE_KEY_CUSTODY_MODE_MISSING",
          "ERROR",
          "egs.privateKeyCustody",
          "Private key custody mode is not configured.",
          "SECURITY_FEATURES_PRIVATE_KEY",
          "Choose local temporary files only for development experiments and KMS/HSM-backed custody for production.",
        ),
      );
    }

    if (!activeEgs?.complianceCsidPem) {
      checks.push(this.check("ZATCA_COMPLIANCE_CSID_MISSING", "ERROR", "egs.complianceCsidPem", "Compliance CSID/certificate is missing.", "COMPLIANCE_CSID_API", "Do not request a CSID in this local-only phase; plan the controlled onboarding flow first."));
    }
    if (!activeEgs?.productionCsidPem) {
      checks.push(this.check("ZATCA_PRODUCTION_CSID_MISSING", "ERROR", "egs.productionCsidPem", "Production CSID/certificate is missing.", "PRODUCTION_CSID_ONBOARDING_API", "Production credentials must wait for a dedicated onboarding phase."));
    }
    checks.push(
      this.check(
        "ZATCA_CERTIFICATE_EXPIRY_UNKNOWN",
        "WARNING",
        "egs.certificateExpiresAt",
        "Certificate expiry metadata is not modelled yet.",
        "RENEWAL_API",
        "Track certificate issue/expiry dates before implementing renewal or signing.",
      ),
      this.check(
        "ZATCA_RENEWAL_WORKFLOW_MISSING",
        "ERROR",
        "egs.renewal",
        "Certificate renewal workflow is not implemented.",
        "RENEWAL_API",
        "Design renewal, OTP handling, current CSID usage, and safe token rotation before production onboarding.",
      ),
      this.check(
        "ZATCA_KEY_ROTATION_WORKFLOW_MISSING",
        "ERROR",
        "egs.keyRotation",
        "Key rotation and revocation workflow is not implemented.",
        "SECURITY_FEATURES_KEY_LIFECYCLE",
        "Define rotation, revocation, restore, and incident-response procedures before signing.",
      ),
      this.check(
        "ZATCA_KMS_HSM_NOT_CONFIGURED",
        "ERROR",
        "egs.keyCustodyMode",
        "KMS/HSM-style key custody is not configured for production.",
        "SECURITY_FEATURES_PRIVATE_KEY",
        "Use KMS/HSM-backed custody for production private keys; do not persist production keys as application-table PEM.",
      ),
    );
    return createZatcaReadinessSection("KEY_CUSTODY", checks);
  }

  private buildCsrReadinessSection(profile: ZatcaCsrProfileSource, activeEgs: InternalEgsUnitRecord | null): ZatcaReadinessSection {
    const checks: ZatcaReadinessCheck[] = [];
    if (!activeEgs) {
      checks.push(this.check("ZATCA_CSR_EGS_MISSING", "ERROR", "egs.active", "No active EGS unit exists for CSR planning.", "CSR_CONFIG_TEMPLATE", "Create and activate a development EGS unit first."));
      return createZatcaReadinessSection("CSR", checks);
    }

    const fields = this.buildCsrPlanFields(profile, activeEgs);
    const missingFields = fields.filter((field) => field.status === "MISSING");
    const reviewFields = fields.filter((field) => field.status === "NEEDS_REVIEW");
    if (!activeEgs.csrPem) {
      checks.push(this.check("ZATCA_CSR_NOT_GENERATED", "ERROR", "egs.csrPem", "CSR PEM is missing for this EGS unit.", "SDK_README_CSR", "Generate CSR material only in a controlled local onboarding phase; do not request CSIDs here."));
    }
    if (missingFields.length > 0) {
      checks.push(
        this.check(
          "ZATCA_CSR_REQUIRED_FIELDS_MISSING",
          "ERROR",
          "csr.config",
          `CSR config values are missing: ${missingFields.map((field) => field.sdkConfigKey).join(", ")}.`,
          "CSR_CONFIG_TEMPLATE",
          "Complete the official CSR config mapping before generating any real CSR.",
        ),
      );
    }
    if (reviewFields.length > 0) {
      checks.push(
        this.check(
          "ZATCA_CSR_FIELDS_NEED_REVIEW",
          "WARNING",
          "csr.config",
          `CSR config values need official-format review: ${reviewFields.map((field) => field.sdkConfigKey).join(", ")}.`,
          "CSR_CONFIG_TEMPLATE",
          "Do not infer official CSR values; confirm them against the taxpayer/EGS onboarding data.",
        ),
      );
    }
    return createZatcaReadinessSection("CSR", checks);
  }

  private buildSigningReadinessSection(
    activeEgs: {
      csrPem?: string | null;
      complianceCsidPem?: string | null;
      productionCsidPem?: string | null;
    } | null,
  ): ZatcaReadinessSection {
    const checks: ZatcaReadinessCheck[] = [
      this.check(
        "ZATCA_SIGNING_NOT_IMPLEMENTED",
        "ERROR",
        "signing.implementation",
        "XAdES invoice signing is not implemented in LedgerByte yet.",
        "KSA-15",
        "Keep generated XML unsigned until certificate lifecycle, signing, validation, and key custody are implemented safely.",
      ),
      this.check(
        "ZATCA_SIGNING_CERTIFICATE_NOT_CONFIGURED",
        "ERROR",
        "signing.certificate",
        "A signing certificate is not configured for local or production signing.",
        "SDK_README_SIGN",
        "Use the official CSR/CSID lifecycle before enabling signing; SDK dummy certificates are test-only.",
      ),
      this.check(
        "ZATCA_PRIVATE_KEY_CUSTODY_NOT_CONFIGURED",
        "ERROR",
        "signing.privateKeyCustody",
        "Private key custody is not configured.",
        "SECURITY_FEATURES_XADES",
        "Use KMS/HSM-backed custody for production instead of storing private keys in application tables.",
      ),
    ];

    if (!activeEgs?.csrPem) {
      checks.push(this.check("ZATCA_CSR_NOT_GENERATED_FOR_SIGNING", "ERROR", "egs.csrPem", "CSR material is missing for the signing/onboarding lifecycle.", "CSR_CONFIG_TEMPLATE", "Generate CSR only when continuing into controlled onboarding work."));
    }
    if (!activeEgs?.complianceCsidPem) {
      checks.push(this.check("ZATCA_COMPLIANCE_CSID_MISSING_FOR_SIGNING", "ERROR", "egs.complianceCsidPem", "Compliance CSID/certificate is missing for safe signing validation.", "SDK_README_SIGN", "Do not request CSIDs in this local-only planning phase."));
    }
    if (!activeEgs?.productionCsidPem) {
      checks.push(this.check("ZATCA_PRODUCTION_CSID_MISSING_FOR_SIGNING", "ERROR", "egs.productionCsidPem", "Production CSID is missing.", "SECURITY_FEATURES_AUTH", "Production credentials must wait for a dedicated production onboarding phase."));
    }
    checks.push(this.check("ZATCA_SDK_DUMMY_MATERIAL_TEST_ONLY", "WARNING", "sdk.certificates", "The official SDK bundled certificate/private key are dummy testing material only.", "SDK_README_DUMMY_CERT", "Never persist or use SDK dummy material as tenant production credentials."));
    return createZatcaReadinessSection("SIGNING", checks);
  }

  private buildPhase2QrReadinessSection(metadata?: { xmlBase64?: string | null; invoiceHash?: string | null } | null): ZatcaReadinessSection {
    const checks: ZatcaReadinessCheck[] = [
      this.check(
        "ZATCA_PHASE_2_QR_NOT_IMPLEMENTED",
        "ERROR",
        "qr.phase2",
        "Phase 2 QR cryptographic tags are not implemented.",
        "KSA-14",
        "Keep using the current basic QR payload only as local groundwork until signing/certificate material is available.",
      ),
      this.check(
        "ZATCA_PHASE_2_QR_SIGNATURE_DEPENDENCY",
        "ERROR",
        "qr.tags6to9",
        "Phase 2 QR tags 6-9 depend on the XML hash, ECDSA signature, public key, and simplified-invoice certificate signature.",
        "SECURITY_FEATURES_QR_TAGS_6_9",
        "Generate Phase 2 QR only after signed XML and certificate validation are implemented.",
      ),
    ];
    if (metadata?.xmlBase64 && metadata.invoiceHash) {
      checks.push(this.check("ZATCA_BASIC_QR_SOURCE_AVAILABLE", "INFO", "qr.basic", "Generated XML and invoice hash exist for current local basic QR payloads.", "KSA-14", "Regenerate QR after signing is implemented so cryptographic tags are included correctly."));
    } else {
      checks.push(this.check("ZATCA_BASIC_QR_SOURCE_MISSING", "WARNING", "qr.basic", "Generated XML/hash are missing for this invoice.", "KSA-14", "Generate unsigned XML before planning Phase 2 QR work."));
    }
    return createZatcaReadinessSection("PHASE_2_QR", checks);
  }

  private buildPdfA3ReadinessSection(): ZatcaReadinessSection {
    return createZatcaReadinessSection("PDF_A3", [
      this.check(
        "ZATCA_PDF_A3_NOT_IMPLEMENTED",
        "ERROR",
        "pdfA3",
        "PDF/A-3 embedding is not implemented.",
        "SECURITY_FEATURES_PADES",
        "Implement signed XML first, then add PDF/A-3 embedding in a separate controlled phase.",
      ),
    ]);
  }

  private addRequiredCheck(checks: ZatcaReadinessCheck[], value: string | null | undefined, code: string, field: string, message: string, sourceRule: string, fixHint: string): void {
    if (!hasText(value)) {
      checks.push(this.check(code, "ERROR", field, message, sourceRule, fixHint));
    }
  }

  private check(code: string, severity: ZatcaReadinessSeverity, field: string, message: string, sourceRule: string | undefined, fixHint: string): ZatcaReadinessCheck {
    return sourceRule ? { code, severity, field, message, sourceRule, fixHint } : { code, severity, field, message, fixHint };
  }

  private transactionCodeFlagsForReadiness(invoiceType: ZatcaInvoiceType): string {
    return invoiceType === ZatcaInvoiceType.SIMPLIFIED_TAX_INVOICE ? "0200000" : "0100000";
  }

  private withReadiness<T extends { sellerName?: string | null; vatNumber?: string | null; city?: string | null; countryCode?: string | null }>(profile: T) {
    return { ...profile, readiness: getZatcaProfileReadiness(profile) };
  }

  private toCsrInput(
    profile: {
      sellerName?: string | null;
      vatNumber?: string | null;
      companyIdNumber?: string | null;
      city?: string | null;
      countryCode?: string | null;
      businessCategory?: string | null;
    },
    egsUnit: InternalEgsUnitRecord,
  ): ZatcaCsrInput {
    return {
      sellerName: profile.sellerName ?? "",
      vatNumber: profile.vatNumber ?? "",
      organizationIdentifier: profile.companyIdNumber ?? profile.vatNumber ?? "",
      organizationUnitName: egsUnit.name,
      organizationName: profile.sellerName ?? "",
      countryCode: profile.countryCode ?? "SA",
      city: profile.city ?? "",
      deviceSerialNumber: egsUnit.deviceSerialNumber,
      solutionName: egsUnit.solutionName,
      businessCategory: profile.businessCategory?.trim() || "General business",
    };
  }

  private hashForLog(value: string): string {
    return createHash("sha256").update(value, "utf8").digest("base64");
  }

  private cleanProfileData(dto: UpdateZatcaProfileDto): Prisma.ZatcaOrganizationProfileUpdateInput {
    return {
      environment: dto.environment,
      registrationStatus: dto.registrationStatus,
      sellerName: dto.sellerName === undefined ? undefined : this.optionalText(dto.sellerName),
      vatNumber: dto.vatNumber === undefined ? undefined : this.optionalText(dto.vatNumber),
      companyIdType: dto.companyIdType === undefined ? undefined : this.optionalText(dto.companyIdType),
      companyIdNumber: dto.companyIdNumber === undefined ? undefined : this.optionalText(dto.companyIdNumber),
      buildingNumber: dto.buildingNumber === undefined ? undefined : this.optionalText(dto.buildingNumber),
      streetName: dto.streetName === undefined ? undefined : this.optionalText(dto.streetName),
      district: dto.district === undefined ? undefined : this.optionalText(dto.district),
      city: dto.city === undefined ? undefined : this.optionalText(dto.city),
      postalCode: dto.postalCode === undefined ? undefined : this.optionalText(dto.postalCode),
      countryCode: dto.countryCode === undefined ? undefined : this.requiredText(dto.countryCode, "Country code").toUpperCase(),
      additionalAddressNumber: dto.additionalAddressNumber === undefined ? undefined : this.optionalText(dto.additionalAddressNumber),
      businessCategory: dto.businessCategory === undefined ? undefined : this.optionalText(dto.businessCategory),
    };
  }

  private requiredText(value: string, label: string): string {
    const trimmed = value.trim();
    if (!trimmed) {
      throw new BadRequestException(`${label} cannot be blank.`);
    }
    return trimmed;
  }

  private optionalText(value: string | undefined): string | null {
    const trimmed = value?.trim();
    return trimmed || null;
  }
}
