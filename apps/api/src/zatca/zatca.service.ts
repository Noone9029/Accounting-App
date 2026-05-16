import { BadRequestException, Inject, Injectable, NotFoundException, NotImplementedException, Optional } from "@nestjs/common";
import { createHash } from "node:crypto";
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
      select: {
        id: true,
        name: true,
        status: true,
        isActive: true,
        csrPem: true,
        complianceCsidPem: true,
        lastIcv: true,
        lastInvoiceHash: true,
        hashMode: true,
      },
    });
    const localXmlCount = await this.prisma.zatcaInvoiceMetadata.count({
      where: { organizationId, xmlBase64: { not: null } },
    });
    const profileReady = profile.readiness.ready;
    const egsReady = Boolean(activeEgs);
    const localXmlReady = localXmlCount > 0;
    const mockCsidReady = Boolean(activeEgs?.complianceCsidPem);
    const adapterConfig = this.getAdapterConfig();
    const blockingReasons: string[] = [];

    if (!profileReady) {
      blockingReasons.push(`ZATCA profile is missing: ${profile.readiness.missingFields.join(", ")}.`);
    }
    if (!egsReady) {
      blockingReasons.push("No active development EGS unit is configured.");
    }
    if (egsReady && !activeEgs?.csrPem) {
      blockingReasons.push("Active EGS unit does not have a CSR yet.");
    }
    if (!mockCsidReady) {
      blockingReasons.push("No active EGS unit has a local mock compliance CSID.");
    }
    if (!localXmlReady) {
      blockingReasons.push("No local ZATCA XML has been generated for an invoice yet.");
    }
    if (!adapterConfig.effectiveRealNetworkEnabled) {
      blockingReasons.push("Real ZATCA network calls are disabled by configuration.");
    }
    blockingReasons.push("Production readiness is intentionally false until official validation, signing, API integration, and PDF/A-3 are complete.");

    return {
      warning: "This readiness summary is local engineering guidance only and is not legal certification.",
      profileReady,
      profileMissingFields: profile.readiness.missingFields,
      egsReady,
      activeEgsUnit: activeEgs
        ? {
            id: activeEgs.id,
            name: activeEgs.name,
            status: activeEgs.status,
            isActive: activeEgs.isActive,
            hasCsr: Boolean(activeEgs.csrPem),
            hasComplianceCsid: Boolean(activeEgs.complianceCsidPem),
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
      select: safeEgsUnitSelect,
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
    const egsUnit = await this.prisma.zatcaEgsUnit.findFirst({ where: { id, organizationId }, select: safeEgsUnitSelect });
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

  private async getEgsUnitInternal(organizationId: string, id: string): Promise<InternalEgsUnitRecord> {
    const egsUnit = await this.prisma.zatcaEgsUnit.findFirst({ where: { id, organizationId }, select: internalEgsUnitSelect });
    if (!egsUnit) {
      throw new NotFoundException("ZATCA EGS unit not found.");
    }
    return egsUnit;
  }

  private toPublicEgsUnit(unit: SafeEgsUnitRecord | InternalEgsUnitRecord) {
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
