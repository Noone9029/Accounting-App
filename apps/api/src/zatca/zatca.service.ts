import { execFile } from "node:child_process";
import { accessSync, constants, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { BadRequestException, Inject, Injectable, NotFoundException, NotImplementedException, Optional } from "@nestjs/common";
import { createHash } from "node:crypto";
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
  ZatcaCsrConfigReviewStatus,
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
import { UpdateZatcaCsrFieldsDto } from "./dto/update-zatca-csr-fields.dto";
import { UpdateZatcaEgsUnitDto } from "./dto/update-zatca-egs-unit.dto";
import { UpdateZatcaProfileDto } from "./dto/update-zatca-profile.dto";
import { sanitizeZatcaSdkOutput, ZatcaSdkService } from "../zatca-sdk/zatca-sdk.service";
import {
  buildZatcaSdkCsrCommand,
  buildZatcaSdkQrCommand,
  buildZatcaSdkSigningCommand,
  discoverZatcaSdkReadiness,
  isZatcaSdkCsrExecutionEnabled,
  isZatcaSdkSigningExecutionEnabled,
  type ZatcaSdkValidationCommandPlan,
  ZATCA_SDK_CSR_COMMAND,
  ZATCA_SDK_QR_COMMAND,
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
  csrCommonName: true,
  csrSerialNumber: true,
  csrOrganizationUnitName: true,
  csrInvoiceType: true,
  csrLocationAddress: true,
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

const safeCsrConfigReviewSelect = {
  id: true,
  organizationId: true,
  egsUnitId: true,
  status: true,
  configHash: true,
  configPreviewRedacted: true,
  configKeyOrder: true,
  missingFieldsJson: true,
  reviewFieldsJson: true,
  blockersJson: true,
  warningsJson: true,
  approvedById: true,
  approvedAt: true,
  revokedById: true,
  revokedAt: true,
  note: true,
  createdAt: true,
  updatedAt: true,
  approvedBy: { select: { id: true, name: true, email: true } },
  revokedBy: { select: { id: true, name: true, email: true } },
} satisfies Prisma.ZatcaCsrConfigReviewSelect;

type SafeEgsUnitRecord = Prisma.ZatcaEgsUnitGetPayload<{ select: typeof safeEgsUnitSelect }>;
type InternalEgsUnitRecord = Prisma.ZatcaEgsUnitGetPayload<{ select: typeof internalEgsUnitSelect }>;
type SafeCsrConfigReviewRecord = Prisma.ZatcaCsrConfigReviewGetPayload<{ select: typeof safeCsrConfigReviewSelect }>;
type ZatcaKeyCustodyMode = "MISSING" | "RAW_DATABASE_PEM";
type ZatcaCsrPlanFieldStatus = "AVAILABLE" | "MISSING" | "NEEDS_REVIEW";
const officialCsrConfigKeyOrder = [
  "csr.common.name",
  "csr.serial.number",
  "csr.organization.identifier",
  "csr.organization.unit.name",
  "csr.organization.name",
  "csr.country.name",
  "csr.invoice.type",
  "csr.location.address",
  "csr.industry.business.category",
] as const;
const officialExampleCsrInvoiceTypes = new Set(["1100"]);

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

  async updateEgsUnitCsrFields(organizationId: string, actorUserId: string, id: string, dto: UpdateZatcaCsrFieldsDto) {
    const existing = await this.getEgsUnitInternal(organizationId, id);
    if (existing.environment === "PRODUCTION") {
      throw new BadRequestException("CSR onboarding field capture is restricted to non-production EGS units.");
    }

    const before = this.toPublicEgsUnit(existing);
    const updated = await this.prisma.zatcaEgsUnit.update({
      where: { id },
      data: {
        csrCommonName: dto.csrCommonName === undefined ? undefined : this.optionalCsrField(dto.csrCommonName, "CSR common name"),
        csrSerialNumber: dto.csrSerialNumber === undefined ? undefined : this.optionalCsrField(dto.csrSerialNumber, "CSR serial number"),
        csrOrganizationUnitName: dto.csrOrganizationUnitName === undefined ? undefined : this.optionalCsrField(dto.csrOrganizationUnitName, "CSR organization unit name"),
        csrInvoiceType: dto.csrInvoiceType === undefined ? undefined : this.optionalCsrInvoiceType(dto.csrInvoiceType),
        csrLocationAddress: dto.csrLocationAddress === undefined ? undefined : this.optionalCsrField(dto.csrLocationAddress, "CSR location address"),
      },
      select: safeEgsUnitSelect,
    });

    const publicUnit = this.toPublicEgsUnit(updated);
    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action: "UPDATE",
      entityType: "ZatcaEgsUnitCsrFields",
      entityId: id,
      before,
      after: publicUnit,
    });
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
          zatcaInvoiceType: true,
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
          environment: true,
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
        zatcaInvoiceType: metadata?.zatcaInvoiceType ?? ZatcaInvoiceType.STANDARD_TAX_INVOICE,
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
            environment: activeEgs.environment,
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

  async getInvoiceZatcaLocalSigningDryRun(organizationId: string, invoiceId: string, options: { keepTempFiles?: boolean } = {}) {
    const signingPlan = await this.getInvoiceZatcaSigningPlan(organizationId, invoiceId);
    const executionEnabled = isZatcaSdkSigningExecutionEnabled();
    const keepTempFiles = options.keepTempFiles === true;
    const sdkReadiness = discoverZatcaSdkReadiness();
    const safeName = safeZatcaTempName(invoiceId);
    const plannedTempRoot = sdkReadiness.workDir || join(tmpdir(), "ledgerbyte-zatca-local-signing");
    const plannedUnsignedXmlPath = join(plannedTempRoot, `${safeName}-unsigned.xml`);
    const plannedSignedXmlPath = join(plannedTempRoot, `${safeName}-signed-dummy-only.xml`);
    const sdkDummyMaterial = this.getSdkDummySigningMaterial(sdkReadiness);
    const qrCommandPlan = buildZatcaSdkQrCommand({
      xmlFilePath: plannedSignedXmlPath,
      sdkJarPath: sdkReadiness.sdkJarPath,
      launcherPath: sdkReadiness.fatooraLauncherPath,
      jqPath: sdkReadiness.jqPath,
      configDirPath: sdkReadiness.configDirPath,
      workingDirectory: sdkReadiness.sdkRootPath ?? sdkReadiness.referenceFolderPath ?? sdkReadiness.projectRoot,
      platform: process.platform,
      javaFound: sdkReadiness.javaFound,
      javaCommand: sdkReadiness.javaCommand,
    });
    const blockers: string[] = [];
    const warnings = [
      "Local-only SDK signing/QR dry-run. No CSID request, ZATCA network call, clearance/reporting, PDF/A-3, or production-compliance claim is made.",
      "SDK bundled certificate/private-key material is test/dummy material only and must never be used as production credentials.",
      "Signed XML and QR payload bodies are not returned or persisted by this endpoint.",
      ...sdkReadiness.warnings,
      ...signingPlan.commandPlan.warnings,
      ...qrCommandPlan.warnings,
    ];

    if (!signingPlan.metadata) {
      blockers.push("Invoice ZATCA metadata is missing; generate local XML metadata before local SDK signing can be planned.");
    } else if (!signingPlan.metadata.hasXml) {
      blockers.push("Generated invoice XML is missing; generate local unsigned XML before local SDK signing can be planned.");
    }
    if (!executionEnabled) {
      blockers.push("ZATCA_SDK_SIGNING_EXECUTION_ENABLED is false; local SDK signing and QR generation are skipped.");
    }
    if (!signingPlan.egs) {
      blockers.push("Active ZATCA EGS unit is missing; local signing dry-run is restricted to non-production EGS context.");
    }
    if (signingPlan.egs?.environment === "PRODUCTION") {
      blockers.push("Local SDK signing dry-run is blocked for production EGS units.");
    }
    if (!signingPlan.commandPlan.command) {
      blockers.push("Official SDK -sign command could not be resolved locally.");
    }
    if (!qrCommandPlan.command) {
      blockers.push("Official SDK -qr command could not be resolved locally.");
    }
    if (!sdkReadiness.javaFound || !sdkReadiness.javaVersionSupported) {
      blockers.push(sdkReadiness.javaBlockerMessage ?? "Java runtime is not ready for local SDK signing.");
    }
    if (!sdkReadiness.sdkJarFound && !sdkReadiness.fatooraLauncherFound) {
      blockers.push("Official ZATCA SDK launcher/JAR is missing.");
    }
    if (!sdkReadiness.configDirFound) {
      blockers.push("Official ZATCA SDK Configuration directory is missing.");
    }
    if (!sdkReadiness.workingDirectoryWritable || !this.canWriteToDirectory(tmpdir())) {
      blockers.push("Local temporary directory is not writable; SDK signing execution cannot use temp files safely.");
    }
    if (!sdkDummyMaterial.certificateReady) {
      blockers.push("SDK dummy certificate file is missing or empty; local signing execution only allows the SDK Data/Certificates/cert.pem test material.");
    }
    if (!sdkDummyMaterial.privateKeyReady) {
      blockers.push("SDK dummy private key file is missing or empty; local signing execution only allows the SDK Data/Certificates/ec-secp256k1-priv-key.pem test material.");
    }
    if (this.commandPlanLooksNetworked(signingPlan.commandPlan) || this.commandPlanLooksNetworked(qrCommandPlan)) {
      blockers.push("Local signing command plan unexpectedly contains network-like arguments; execution is blocked.");
    }

    const baseResponse = (overrides: Partial<Record<string, unknown>> = {}) => ({
      localOnly: true,
      dryRun: true,
      noMutation: true,
      noCsidRequest: true,
      noNetwork: true,
      noClearanceReporting: true,
      noPdfA3: true,
      noProductionCredentials: true,
      noPersistence: true,
      productionCompliance: false,
      invoiceId: signingPlan.invoice.id,
      invoiceNumber: signingPlan.invoice.invoiceNumber,
      invoiceType: signingPlan.invoice.zatcaInvoiceType,
      executionEnabled,
      executionAttempted: false,
      executionSkipped: true,
      executionSkipReason: executionEnabled ? "Local signing dry-run prerequisites are blocked." : "Execution gate is disabled by default.",
      executionStatus: "SKIPPED",
      signingExecuted: false,
      qrExecuted: false,
      sdkCommand: ZATCA_SDK_SIGN_COMMAND,
      qrSdkCommand: ZATCA_SDK_QR_COMMAND,
      sdkMaterial: sdkDummyMaterial.summary,
      commandPlan: signingPlan.commandPlan,
      qrCommandPlan,
      phase2Qr: {
        currentBasicQrExists: Boolean(signingPlan.metadata?.hasXml),
        sdkCommand: ZATCA_SDK_QR_COMMAND,
        commandPlan: qrCommandPlan,
        dependencyChain: ["unsigned XML", "SDK hash", "signed XML", "Phase 2 QR", "final validation"],
        blockers: ["Phase 2 QR generation is blocked until signed XML exists and SDK -qr succeeds with certificate/signature material."],
        warnings: ["Do not fake Phase 2 QR cryptographic tags; QR must be regenerated after signing."],
      },
      tempFilesWritten: { unsignedXml: false, sdkConfig: false, signedXml: false, tempDirectory: null as string | null, filesRetained: false },
      cleanup: { performed: false, success: true, filesRetained: false, tempDirectory: null },
      signedXmlDetected: false,
      qrDetected: false,
      sdkExitCode: null,
      qrSdkExitCode: null,
      timedOut: false,
      stdoutSummary: "",
      stderrSummary: "",
      blockers: [...new Set(blockers)],
      warnings: [...new Set(warnings)],
      ...overrides,
    });

    if (blockers.length > 0) {
      return baseResponse();
    }

    const metadata = await this.getMetadataWithXml(organizationId, invoiceId);
    const tempRoot = join(tmpdir(), "ledgerbyte-zatca-local-signing");
    mkdirSync(tempRoot, { recursive: true });
    const tempDirectory = mkdtempSync(join(tempRoot, `${safeName}-`));
    const unsignedXmlPath = join(tempDirectory, "unsigned.xml");
    const signedXmlPath = join(tempDirectory, "signed.xml");
    const tempSdkConfig = this.prepareLocalSigningSdkConfig(sdkReadiness, tempDirectory);
    const executionCommandPlan = buildZatcaSdkSigningCommand({
      xmlFilePath: unsignedXmlPath,
      signedInvoiceFilePath: signedXmlPath,
      sdkJarPath: sdkReadiness.sdkJarPath,
      launcherPath: sdkReadiness.fatooraLauncherPath,
      jqPath: sdkReadiness.jqPath,
      configDirPath: tempSdkConfig.configDirPath ?? sdkReadiness.configDirPath,
      workingDirectory: sdkReadiness.sdkRootPath ?? sdkReadiness.referenceFolderPath ?? sdkReadiness.projectRoot,
      platform: process.platform,
      javaFound: sdkReadiness.javaFound,
      javaCommand: sdkReadiness.javaCommand,
    });
    const executionQrCommandPlan = buildZatcaSdkQrCommand({
      xmlFilePath: signedXmlPath,
      sdkJarPath: sdkReadiness.sdkJarPath,
      launcherPath: sdkReadiness.fatooraLauncherPath,
      jqPath: sdkReadiness.jqPath,
      configDirPath: tempSdkConfig.configDirPath ?? sdkReadiness.configDirPath,
      workingDirectory: sdkReadiness.sdkRootPath ?? sdkReadiness.referenceFolderPath ?? sdkReadiness.projectRoot,
      platform: process.platform,
      javaFound: sdkReadiness.javaFound,
      javaCommand: sdkReadiness.javaCommand,
    });
    const tempFilesWritten = { unsignedXml: false, sdkConfig: tempSdkConfig.configWritten, signedXml: false, tempDirectory, filesRetained: keepTempFiles };
    const cleanup = { performed: false, success: true, filesRetained: keepTempFiles, tempDirectory };
    let signingResult: { exitCode: number | null; stdout: string; stderr: string; timedOut: boolean } = { exitCode: null, stdout: "", stderr: "", timedOut: false };
    let qrResult: { exitCode: number | null; stdout: string; stderr: string; timedOut: boolean } = { exitCode: null, stdout: "", stderr: "", timedOut: false };

    if (tempSdkConfig.warnings.length > 0) {
      warnings.push(...tempSdkConfig.warnings);
    }
    if (tempSdkConfig.blockers.length > 0) {
      if (!keepTempFiles) {
        try {
          rmSync(tempDirectory, { recursive: true, force: true });
          cleanup.performed = true;
          cleanup.success = true;
        } catch {
          cleanup.performed = true;
          cleanup.success = false;
          warnings.push("Temporary local signing directory cleanup failed; inspect local temp storage manually.");
        }
      }
      return baseResponse({
        tempFilesWritten,
        cleanup,
        blockers: [...new Set([...blockers, ...tempSdkConfig.blockers])],
        warnings: [...new Set(warnings)],
      });
    }

    try {
      writeFileSync(unsignedXmlPath, Buffer.from(metadata.xmlBase64, "base64").toString("utf8"), { encoding: "utf8", mode: 0o600 });
      tempFilesWritten.unsignedXml = true;
      signingResult = await this.executeZatcaSdkCommand(executionCommandPlan, sdkReadiness.timeoutMs);
      tempFilesWritten.signedXml = this.fileExistsAndNotEmpty(signedXmlPath);
      if (tempFilesWritten.signedXml) {
        qrResult = await this.executeZatcaSdkCommand(executionQrCommandPlan, sdkReadiness.timeoutMs);
      } else {
        warnings.push("Signed XML was not produced; SDK -qr was not attempted.");
      }
      if (signingResult.timedOut || qrResult.timedOut) {
        warnings.push("Official SDK signing or QR command timed out.");
      }
      if (signingResult.exitCode !== 0) {
        warnings.push("Official SDK -sign command returned a non-zero exit code. Review sanitized summaries only.");
      }
      if (qrResult.exitCode !== null && qrResult.exitCode !== 0) {
        warnings.push("Official SDK -qr command returned a non-zero exit code. Review sanitized summaries only.");
      }
    } finally {
      if (!keepTempFiles) {
        try {
          rmSync(tempDirectory, { recursive: true, force: true });
          cleanup.performed = true;
          cleanup.success = true;
        } catch {
          cleanup.performed = true;
          cleanup.success = false;
          warnings.push("Temporary local signing directory cleanup failed; inspect local temp storage manually.");
        }
      }
    }

    const qrOutput = `${qrResult.stdout}\n${qrResult.stderr}`.trim();
    const signingExecuted = signingResult.exitCode !== null || signingResult.timedOut;
    const qrExecuted = qrResult.exitCode !== null || qrResult.timedOut;
    const signedXmlDetected = tempFilesWritten.signedXml;
    const qrDetected = qrResult.exitCode === 0 && qrOutput.length > 0;
    const executionBlockers: string[] = [];
    if (signingResult.exitCode !== 0 || !signedXmlDetected) {
      executionBlockers.push("Official SDK -sign command failed or did not produce signed XML; no success is inferred.");
    }
    if (signedXmlDetected && !qrDetected) {
      executionBlockers.push("Official SDK -qr command failed or did not produce QR output; Phase 2 QR remains blocked.");
    }
    const executionStatus = executionBlockers.length === 0 ? "SUCCEEDED_LOCALLY" : "FAILED";
    return baseResponse({
      executionAttempted: true,
      executionSkipped: false,
      executionSkipReason: null,
      executionStatus,
      signingExecuted,
      qrExecuted,
      commandPlan: executionCommandPlan,
      qrCommandPlan: executionQrCommandPlan,
      tempFilesWritten,
      cleanup,
      signedXmlDetected,
      qrDetected,
      sdkExitCode: signingResult.exitCode,
      qrSdkExitCode: qrResult.exitCode,
      timedOut: signingResult.timedOut || qrResult.timedOut,
      stdoutSummary: this.sanitizeSigningSdkOutput(`${signingResult.stdout}\n${qrResult.stdout}`),
      stderrSummary: this.sanitizeSigningSdkOutput(`${signingResult.stderr}\n${qrResult.stderr}`),
      blockers: executionBlockers,
      warnings: [...new Set(warnings)],
      phase2Qr: {
        currentBasicQrExists: true,
        sdkCommand: ZATCA_SDK_QR_COMMAND,
        commandPlan: executionQrCommandPlan,
        dependencyChain: ["unsigned XML", "SDK hash", "signed XML", "Phase 2 QR", "final validation"],
        blockers: signedXmlDetected && qrDetected ? [] : ["Phase 2 QR output was not detected from the local SDK dry-run."],
        warnings: ["QR payload body is intentionally not returned; use official SDK validation artifacts only in a controlled local experiment."],
      },
    });
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

  async getEgsUnitCsrConfigPreview(organizationId: string, id: string) {
    const plan = await this.getEgsUnitCsrPlan(organizationId, id);
    if (plan.egsUnit.environment === "PRODUCTION") {
      throw new BadRequestException("CSR config preview is restricted to non-production EGS units.");
    }

    const preview = this.buildSanitizedCsrConfigPreview(plan.requiredFields);
    const configEntries = preview.configEntries.map((entry) => ({
      key: entry.key,
      valuePreview: entry.valuePreview,
      status: entry.status,
      source: entry.source,
      officialSource: entry.officialSource,
      notes: entry.notes,
    }));
    const missingFields = configEntries.filter((entry) => entry.status === "MISSING");
    const reviewFields = configEntries.filter((entry) => entry.status === "NEEDS_REVIEW");
    const blockers = [
      ...missingFields.map((field) => `Missing CSR config value ${field.key}; no placeholder value is invented.`),
      ...preview.unsafeFields.map((field) => `CSR config value for ${field.key} contains characters that are unsafe for the official plain key=value properties format.`),
    ];
    const warnings = [
      "Sanitized CSR config preview only. No file is written and the SDK is not executed.",
      "No private key, certificate body, CSID token, one-time portal code, generated CSR body, signing, clearance/reporting, PDF/A-3, or ZATCA network call is included.",
      "Values are emitted in the official SDK CSR config template order using plain key=value lines.",
      "Production compliance remains false.",
      ...reviewFields.map((field) => `Review CSR config value ${field.key}: ${field.notes}`),
    ];

    return {
      localOnly: true,
      dryRun: true,
      noMutation: true,
      noCsidRequest: true,
      noNetwork: true,
      productionCompliance: false,
      canPrepareConfig: blockers.length === 0,
      sanitizedConfigPreview: preview.sanitizedConfigPreview,
      configEntries,
      missingFields,
      reviewFields,
      blockers,
      warnings,
      officialSources: [
        "reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Input/csr-config-template.properties",
        "reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Input/csr-config-example-EN.properties",
        "reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Input/csr-config-example-EN-VAT-group.properties",
      ],
    };
  }

  async listEgsUnitCsrConfigReviews(organizationId: string, id: string) {
    const egsUnit = await this.getEgsUnitInternal(organizationId, id);
    if (egsUnit.environment === "PRODUCTION") {
      throw new BadRequestException("CSR config review records are restricted to non-production EGS units.");
    }

    const reviews = await this.prisma.zatcaCsrConfigReview.findMany({
      where: { organizationId, egsUnitId: id },
      orderBy: { createdAt: "desc" },
      select: safeCsrConfigReviewSelect,
    });
    return reviews.map((review) => this.toPublicCsrConfigReview(review));
  }

  async createEgsUnitCsrConfigReview(organizationId: string, actorUserId: string, id: string, dto: { note?: string } = {}) {
    const preview = await this.getEgsUnitCsrConfigPreview(organizationId, id);
    const configHash = this.hashCsrConfigPreview(preview.sanitizedConfigPreview);
    const note = this.optionalCsrReviewNote(dto.note);

    const created = await this.prisma.$transaction(async (tx) => {
      await tx.zatcaCsrConfigReview.updateMany({
        where: {
          organizationId,
          egsUnitId: id,
          status: { in: [ZatcaCsrConfigReviewStatus.DRAFT, ZatcaCsrConfigReviewStatus.APPROVED] },
        },
        data: { status: ZatcaCsrConfigReviewStatus.SUPERSEDED },
      });

      return tx.zatcaCsrConfigReview.create({
        data: {
          organizationId,
          egsUnitId: id,
          status: ZatcaCsrConfigReviewStatus.DRAFT,
          configHash,
          configPreviewRedacted: preview.sanitizedConfigPreview,
          configKeyOrder: [...officialCsrConfigKeyOrder] as Prisma.InputJsonValue,
          missingFieldsJson: this.sanitizeCsrReviewJson(preview.missingFields),
          reviewFieldsJson: this.sanitizeCsrReviewJson(preview.reviewFields),
          blockersJson: this.sanitizeCsrReviewJson(preview.blockers),
          warningsJson: this.sanitizeCsrReviewJson(preview.warnings),
          note,
        },
        select: safeCsrConfigReviewSelect,
      });
    });

    const response = this.toPublicCsrConfigReview(created);
    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action: "CREATE",
      entityType: "ZatcaCsrConfigReview",
      entityId: created.id,
      after: response,
    });
    return response;
  }

  async approveCsrConfigReview(organizationId: string, actorUserId: string, reviewId: string, dto: { note?: string } = {}) {
    const review = await this.prisma.zatcaCsrConfigReview.findFirst({
      where: { id: reviewId, organizationId },
      select: safeCsrConfigReviewSelect,
    });
    if (!review) {
      throw new NotFoundException("ZATCA CSR config review not found.");
    }
    if (review.status !== ZatcaCsrConfigReviewStatus.DRAFT) {
      throw new BadRequestException("Only DRAFT CSR config reviews can be approved.");
    }

    const egsUnit = await this.getEgsUnitInternal(organizationId, review.egsUnitId);
    if (egsUnit.environment === "PRODUCTION") {
      throw new BadRequestException("CSR config review approval is restricted to non-production EGS units.");
    }

    const preview = await this.getEgsUnitCsrConfigPreview(organizationId, review.egsUnitId);
    const currentConfigHash = this.hashCsrConfigPreview(preview.sanitizedConfigPreview);
    if (review.configHash !== currentConfigHash) {
      throw new BadRequestException("CSR config preview changed after this review was created. Create a new review before approving.");
    }
    if (!preview.canPrepareConfig || preview.blockers.length > 0 || preview.missingFields.length > 0) {
      throw new BadRequestException("CSR config review cannot be approved while config preparation is blocked or required fields are missing.");
    }

    const note = this.optionalCsrReviewNote(dto.note);
    const approved = await this.prisma.zatcaCsrConfigReview.update({
      where: { id: review.id },
      data: {
        status: ZatcaCsrConfigReviewStatus.APPROVED,
        approvedById: actorUserId,
        approvedAt: new Date(),
        ...(note !== null ? { note } : {}),
      },
      select: safeCsrConfigReviewSelect,
    });
    const response = this.toPublicCsrConfigReview(approved);
    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action: "APPROVE",
      entityType: "ZatcaCsrConfigReview",
      entityId: approved.id,
      before: this.toPublicCsrConfigReview(review),
      after: response,
    });
    return response;
  }

  async revokeCsrConfigReview(organizationId: string, actorUserId: string, reviewId: string, dto: { note?: string } = {}) {
    const review = await this.prisma.zatcaCsrConfigReview.findFirst({
      where: { id: reviewId, organizationId },
      select: safeCsrConfigReviewSelect,
    });
    if (!review) {
      throw new NotFoundException("ZATCA CSR config review not found.");
    }
    if (review.status === ZatcaCsrConfigReviewStatus.REVOKED || review.status === ZatcaCsrConfigReviewStatus.SUPERSEDED) {
      throw new BadRequestException("Only active DRAFT or APPROVED CSR config reviews can be revoked.");
    }

    const egsUnit = await this.getEgsUnitInternal(organizationId, review.egsUnitId);
    if (egsUnit.environment === "PRODUCTION") {
      throw new BadRequestException("CSR config review revocation is restricted to non-production EGS units.");
    }

    const note = this.optionalCsrReviewNote(dto.note);
    const revoked = await this.prisma.zatcaCsrConfigReview.update({
      where: { id: review.id },
      data: {
        status: ZatcaCsrConfigReviewStatus.REVOKED,
        revokedById: actorUserId,
        revokedAt: new Date(),
        ...(note !== null ? { note } : {}),
      },
      select: safeCsrConfigReviewSelect,
    });
    const response = this.toPublicCsrConfigReview(revoked);
    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action: "REVOKE",
      entityType: "ZatcaCsrConfigReview",
      entityId: revoked.id,
      before: this.toPublicCsrConfigReview(review),
      after: response,
    });
    return response;
  }
  async getEgsUnitCsrDryRun(
    organizationId: string,
    id: string,
    options: { prepareFiles?: boolean; keepTempFiles?: boolean } = {},
  ) {
    const plan = await this.getEgsUnitCsrPlan(organizationId, id);
    const prepareFiles = options.prepareFiles === true;
    const keepTempFiles = options.keepTempFiles === true;
    const executionEnabled = isZatcaSdkCsrExecutionEnabled();
    const sdkReadiness = discoverZatcaSdkReadiness();
    const missingFields = plan.requiredFields.filter((field) => field.status === "MISSING");
    const reviewFields = plan.requiredFields.filter((field) => field.status === "NEEDS_REVIEW");
    const tempDirectory = join(tmpdir(), "ledgerbyte-zatca-csr-dry-run", safeZatcaTempName(`${plan.egsUnit.environment}-${plan.egsUnit.id}`));
    const plannedFiles = {
      csrConfig: join(tempDirectory, "csr-config.properties"),
      privateKey: join(tempDirectory, "generated-private-key.pem"),
      generatedCsr: join(tempDirectory, "generated-csr.pem"),
    };
    const commandPlan = buildZatcaSdkCsrCommand({
      csrConfigFilePath: plannedFiles.csrConfig,
      privateKeyFilePath: plannedFiles.privateKey,
      generatedCsrFilePath: plannedFiles.generatedCsr,
      sdkJarPath: sdkReadiness.sdkJarPath,
      launcherPath: sdkReadiness.fatooraLauncherPath,
      jqPath: sdkReadiness.jqPath,
      configDirPath: sdkReadiness.configDirPath,
      workingDirectory: tempDirectory,
      platform: process.platform,
      javaFound: sdkReadiness.javaFound,
      javaCommand: sdkReadiness.javaCommand,
    });
    const sanitizedPreview = this.buildSanitizedCsrConfigPreview(plan.requiredFields);
    const csrConfigEntries = sanitizedPreview.configEntries.map((field) => ({
      key: field.key,
      value: field.valuePreview,
      status: field.status,
      source: field.source,
      officialSource: field.officialSource,
      notes: field.notes,
    }));
    const blockers = plan.blockers.filter((reason) => !/CSID requests are intentionally disabled/i.test(reason));
    const warnings = [
      ...plan.warnings,
      "No CSID request is made by this CSR dry-run.",
      "No ZATCA network call is made by this CSR dry-run.",
      "SDK CSR execution is disabled by default with ZATCA_SDK_CSR_EXECUTION_ENABLED=false.",
    ];

    if (plan.egsUnit.environment === "PRODUCTION") {
      blockers.push("CSR dry-run file preparation is restricted to non-production EGS units.");
    }
    if (missingFields.length > 0) {
      blockers.push(
        `CSR dry-run cannot prepare an SDK config until required official CSR fields are mapped: ${missingFields
          .map((field) => field.sdkConfigKey)
          .join(", ")}.`,
      );
    }
    if (sanitizedPreview.unsafeFields.length > 0) {
      blockers.push(`CSR dry-run cannot prepare an SDK config while values contain unsafe properties-file characters: ${sanitizedPreview.unsafeFields.map((field) => field.key).join(", ")}.`);
    }
    if (reviewFields.length > 0) {
      warnings.push(
        `CSR config values need official-format review before any real CSR generation: ${reviewFields.map((field) => field.sdkConfigKey).join(", ")}.`,
      );
    }
    const canPrepareFiles = prepareFiles && missingFields.length === 0 && sanitizedPreview.unsafeFields.length === 0 && plan.egsUnit.environment !== "PRODUCTION";
    const preparedFiles = {
      requested: prepareFiles,
      csrConfigWritten: false,
      privateKeyWritten: false,
      generatedCsrWritten: false,
      filesRetained: false,
      cleanupPerformed: false,
      keepTempFiles,
    };

    if (canPrepareFiles) {
      mkdirSync(tempDirectory, { recursive: true });
      writeFileSync(plannedFiles.csrConfig, sanitizedPreview.sanitizedConfigPreview, { encoding: "utf8", mode: 0o600 });
      preparedFiles.csrConfigWritten = true;
      preparedFiles.filesRetained = keepTempFiles;
      if (!keepTempFiles) {
        rmSync(tempDirectory, { recursive: true, force: true });
        preparedFiles.cleanupPerformed = true;
      }
    } else if (prepareFiles) {
      warnings.push("No temporary CSR config file was written because dry-run blockers are present.");
    }

    const currentConfigHash = this.hashCsrConfigPreview(sanitizedPreview.sanitizedConfigPreview);
    const latestReview = await this.getLatestCsrConfigReviewOrNull(organizationId, id);
    const configApprovedForDryRun =
      latestReview?.status === ZatcaCsrConfigReviewStatus.APPROVED &&
      latestReview.configHash === currentConfigHash &&
      plan.egsUnit.environment !== "PRODUCTION" &&
      missingFields.length === 0 &&
      sanitizedPreview.unsafeFields.length === 0;
    if (!latestReview) {
      warnings.push("Operator CSR config review is required before any future controlled local SDK CSR generation phase.");
    } else if (latestReview.configHash !== currentConfigHash) {
      warnings.push("Latest CSR config review does not match the current sanitized config preview; create a fresh review before future SDK CSR generation.");
    } else if (latestReview.status !== ZatcaCsrConfigReviewStatus.APPROVED) {
      warnings.push(`Latest CSR config review is ${latestReview.status}; approval is required before future SDK CSR generation.`);
    }

    return {
      localOnly: true,
      dryRun: true,
      noMutation: true,
      noCsidRequest: true,
      noNetwork: true,
      productionCompliance: false,
      configReviewRequired: true,
      latestReviewId: latestReview?.id ?? null,
      latestReviewStatus: latestReview?.status ?? null,
      configApprovedForDryRun,
      warning: "Non-production CSR dry-run only. No CSID request, signing, clearance/reporting, PDF/A-3, network submission, or production compliance is enabled.",
      sdkCommand: ZATCA_SDK_CSR_COMMAND,
      executionEnabled,
      executionSkipped: true,
      executionSkipReason: executionEnabled
        ? "Execution flag is true, but CSR dry-run never executes SDK; use the gated csr-local-generate endpoint/script for local execution."
        : "ZATCA_SDK_CSR_EXECUTION_ENABLED is not true; SDK CSR execution is skipped by default.",
      prepareFilesRequested: prepareFiles,
      tempDirectory,
      plannedFiles,
      preparedFiles,
      commandPlan,
      sdkReadiness: {
        referenceFolderFound: sdkReadiness.referenceFolderFound,
        sdkJarFound: sdkReadiness.sdkJarFound,
        fatooraLauncherFound: sdkReadiness.fatooraLauncherFound,
        configDirFound: sdkReadiness.configDirFound,
        javaFound: sdkReadiness.javaFound,
        javaVersion: sdkReadiness.javaVersion,
        javaVersionSupported: sdkReadiness.javaVersionSupported,
        canAttemptSdkValidation: sdkReadiness.canAttemptSdkValidation,
        canRunLocalValidation: sdkReadiness.canRunLocalValidation,
        blockingReasons: sdkReadiness.blockingReasons,
        warnings: sdkReadiness.warnings,
      },
      egsUnit: plan.egsUnit,
      requiredFields: plan.requiredFields,
      availableValues: plan.availableValues,
      missingValues: plan.missingValues,
      plannedSdkConfigFields: plan.plannedSdkConfigFields,
      csrConfigEntries,
      keyCustody: plan.keyCustody,
      certificateState: plan.certificateState,
      blockers,
      warnings,
      recommendedNextSteps: [
        "Complete missing official CSR config values before preparing SDK input files.",
        "Keep CSR dry-runs in non-production EGS units only.",
        "Do not request compliance or production CSIDs until a dedicated onboarding phase is approved.",
        "Use KMS/HSM-style key custody before any production signing design is implemented.",
      ],
    };
  }

  async getEgsUnitCsrLocalGenerate(
    organizationId: string,
    id: string,
    options: { keepTempFiles?: boolean } = {},
  ) {
    const keepTempFiles = options.keepTempFiles === true;
    const executionEnabled = isZatcaSdkCsrExecutionEnabled();
    const dryRun = await this.getEgsUnitCsrDryRun(organizationId, id, { prepareFiles: false, keepTempFiles: false });
    const configHash = String((dryRun as { currentConfigHash?: string }).currentConfigHash ?? this.hashCsrConfigPreview(this.csrConfigPreviewFromDryRun(dryRun)));
    const blockers = [...(dryRun.blockers ?? [])];
    const warnings = [
      ...(dryRun.warnings ?? []),
      "Local CSR generation never requests compliance or production CSIDs.",
      "Local CSR generation never calls ZATCA network endpoints, signs invoices, performs clearance/reporting, or claims production compliance.",
      "Generated private key and CSR files are temporary and are deleted by default.",
    ];

    if (!executionEnabled) {
      blockers.push("ZATCA_SDK_CSR_EXECUTION_ENABLED is false; local SDK CSR generation is skipped.");
    }
    if (dryRun.egsUnit?.environment === "PRODUCTION") {
      blockers.push("CSR local generation is restricted to non-production EGS units.");
    }
    if (dryRun.latestReviewStatus !== ZatcaCsrConfigReviewStatus.APPROVED) {
      blockers.push("An APPROVED CSR config review is required before local SDK CSR generation can run.");
    } else if (!dryRun.configApprovedForDryRun) {
      blockers.push("Current CSR config preview hash must match the latest approved review before execution.");
    }
    if ((dryRun.missingValues?.length ?? 0) > 0) {
      blockers.push(`Missing required official CSR fields: ${dryRun.missingValues.map((field: ZatcaCsrPlanField) => field.sdkConfigKey).join(", ")}.`);
    }
    const sdkReadinessBlockers = (dryRun.sdkReadiness?.blockingReasons ?? []).filter(
      (reason: string) => !/ZATCA SDK local execution is disabled/i.test(reason),
    );
    blockers.push(...sdkReadinessBlockers.map((reason: string) => `SDK readiness: ${reason}`));
    if (!dryRun.commandPlan?.command) {
      blockers.push("Official SDK CSR command could not be resolved locally.");
    }

    const blockedResponse = () => ({
      localOnly: true,
      dryRun: false,
      noMutation: true,
      noCsidRequest: true,
      noNetwork: true,
      noSigning: true,
      noPersistence: true,
      productionCompliance: false,
      executionEnabled,
      executionAttempted: false,
      executionSkipped: true,
      executionSkipReason: executionEnabled ? "CSR local generation prerequisites are blocked." : "Execution gate is disabled by default.",
      reviewId: dryRun.latestReviewId ?? null,
      latestReviewStatus: dryRun.latestReviewStatus ?? null,
      configHash,
      sdkCommand: ZATCA_SDK_CSR_COMMAND,
      commandPlan: dryRun.commandPlan,
      tempFilesWritten: { csrConfig: false, privateKey: false, generatedCsr: false, tempDirectory: null, filesRetained: false },
      cleanup: { performed: false, success: true, filesRetained: false, tempDirectory: null },
      stdoutSummary: "",
      stderrSummary: "",
      sdkExitCode: null,
      timedOut: false,
      generatedCsrDetected: false,
      privateKeyDetected: false,
      blockers: [...new Set(blockers)],
      warnings: [...new Set(warnings)],
    });

    if (blockers.length > 0) {
      return blockedResponse();
    }

    const tempRoot = join(tmpdir(), "ledgerbyte-zatca-csr-local-generate");
    mkdirSync(tempRoot, { recursive: true });
    const tempDirectory = mkdtempSync(join(tempRoot, `${safeZatcaTempName(`${dryRun.egsUnit.environment}-${dryRun.egsUnit.id}`)}-`));
    const plannedFiles = {
      csrConfig: join(tempDirectory, "csr-config.properties"),
      privateKey: join(tempDirectory, "generated-private-key.pem"),
      generatedCsr: join(tempDirectory, "generated-csr.pem"),
    };
    const commandPlan = this.withLocalCsrCommandPaths(dryRun.commandPlan, plannedFiles, tempDirectory);
    const cleanup = { performed: false, success: true, filesRetained: keepTempFiles, tempDirectory };
    const tempFilesWritten = { csrConfig: false, privateKey: false, generatedCsr: false, tempDirectory, filesRetained: keepTempFiles };
    let executed: { exitCode: number | null; stdout: string; stderr: string; timedOut: boolean } = { exitCode: null, stdout: "", stderr: "", timedOut: false };

    try {
      writeFileSync(plannedFiles.csrConfig, this.csrConfigPreviewFromDryRun(dryRun), { encoding: "utf8", mode: 0o600 });
      tempFilesWritten.csrConfig = true;
      executed = await this.executeZatcaSdkCsrCommand(commandPlan, (dryRun.sdkReadiness as { timeoutMs?: number } | undefined)?.timeoutMs ?? 30000);
      tempFilesWritten.privateKey = this.fileExistsAndNotEmpty(plannedFiles.privateKey);
      tempFilesWritten.generatedCsr = this.fileExistsAndNotEmpty(plannedFiles.generatedCsr);
      if (executed.timedOut) {
        warnings.push("Official SDK CSR command timed out.");
      }
      if (executed.exitCode !== 0) {
        warnings.push("Official SDK CSR command returned a non-zero exit code. Review sanitized stderr/stdout summaries.");
      }
    } finally {
      if (!keepTempFiles) {
        try {
          rmSync(tempDirectory, { recursive: true, force: true });
          cleanup.performed = true;
          cleanup.success = true;
        } catch {
          cleanup.performed = true;
          cleanup.success = false;
          warnings.push("Temporary CSR generation directory cleanup failed; inspect the local temp directory manually.");
        }
      }
    }

    return {
      localOnly: true,
      dryRun: false,
      noMutation: true,
      noCsidRequest: true,
      noNetwork: true,
      noSigning: true,
      noPersistence: true,
      productionCompliance: false,
      executionEnabled,
      executionAttempted: true,
      executionSkipped: false,
      executionSkipReason: null,
      reviewId: dryRun.latestReviewId,
      latestReviewStatus: dryRun.latestReviewStatus,
      configHash,
      sdkCommand: ZATCA_SDK_CSR_COMMAND,
      commandPlan,
      tempFilesWritten,
      cleanup,
      stdoutSummary: this.sanitizeCsrSdkOutput(executed.stdout),
      stderrSummary: this.sanitizeCsrSdkOutput(executed.stderr),
      sdkExitCode: executed.exitCode,
      timedOut: executed.timedOut,
      generatedCsrDetected: tempFilesWritten.generatedCsr,
      privateKeyDetected: tempFilesWritten.privateKey,
      blockers: [],
      warnings: [...new Set(warnings)],
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
      if (!activeEgs) {
        throw new BadRequestException("Active ZATCA EGS unit is required before XML generation so a valid invoice counter value (ICV/KSA-16) can be assigned.");
      }

      const nextIcv = activeEgs.lastIcv + 1;
      const previousInvoiceHash = activeEgs.lastInvoiceHash ?? initialPreviousInvoiceHash;
      const payload = buildZatcaInvoicePayload(this.toZatcaInvoiceInput(invoice, profile, metadata.zatcaInvoiceType, metadata.invoiceUuid, previousInvoiceHash, nextIcv));
      const hashModeSnapshot = activeEgs.hashMode ?? ZatcaHashMode.LOCAL_DETERMINISTIC;
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
      this.toZatcaInvoiceInput(invoice, profile, metadata.zatcaInvoiceType, metadata.invoiceUuid, metadata.previousInvoiceHash ?? initialPreviousInvoiceHash, metadata.icv),
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
    invoiceType: ZatcaInvoiceType,
    invoiceUuid: string,
    previousInvoiceHash: string,
    icv?: number | null,
  ): ZatcaInvoiceInput {
    return {
      invoiceUuid,
      invoiceNumber: invoice.invoiceNumber,
      invoiceType,
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

  private buildCsrPlanFields(profile: ZatcaCsrProfileSource, egsUnit: Pick<InternalEgsUnitRecord, "name" | "deviceSerialNumber" | "csrCommonName" | "csrSerialNumber" | "csrOrganizationUnitName" | "csrInvoiceType" | "csrLocationAddress">): ZatcaCsrPlanField[] {
    return [
      this.csrPlanField("csr.common.name", "Common name", egsUnit.csrCommonName, "EGS_UNIT", hasText(egsUnit.csrCommonName) ? "AVAILABLE" : "MISSING", "CSR_CONFIG_TEMPLATE", "Official examples populate CN with an EGS/taxpayer identifier; capture it explicitly for the EGS and do not infer it from the display name."),
      this.csrPlanField(
        "csr.serial.number",
        "EGS serial number",
        egsUnit.csrSerialNumber ?? egsUnit.deviceSerialNumber,
        "EGS_UNIT",
        hasText(egsUnit.csrSerialNumber) ? "AVAILABLE" : hasText(egsUnit.deviceSerialNumber) ? "NEEDS_REVIEW" : "MISSING",
        "CSR_CONFIG_TEMPLATE",
        "Official examples use a structured serial-number value; capture it explicitly, otherwise the stored device serial is displayed for review only.",
      ),
      this.csrPlanField("csr.organization.identifier", "Organization VAT identifier", profile.vatNumber, "ZATCA_PROFILE", hasText(profile.vatNumber) ? "AVAILABLE" : "MISSING", "CSR_CONFIG_TEMPLATE", "Use the taxpayer VAT/TIN identifier from the ZATCA seller profile."),
      this.csrPlanField("csr.organization.unit.name", "Organization unit name", egsUnit.csrOrganizationUnitName ?? egsUnit.name, "EGS_UNIT", hasText(egsUnit.csrOrganizationUnitName) ? "AVAILABLE" : hasText(egsUnit.name) ? "NEEDS_REVIEW" : "MISSING", "CSR_CONFIG_TEMPLATE", "Official examples use branch or VAT group unit details; capture the official unit name explicitly, otherwise the EGS name is displayed for review only."),
      this.csrPlanField("csr.organization.name", "Organization legal name", profile.sellerName, "ZATCA_PROFILE", hasText(profile.sellerName) ? "AVAILABLE" : "MISSING", "CSR_CONFIG_TEMPLATE", "Use the official taxpayer legal name from the ZATCA seller profile."),
      this.csrPlanField("csr.country.name", "Country code", profile.countryCode, "ZATCA_PROFILE", hasText(profile.countryCode) ? "AVAILABLE" : "MISSING", "CSR_CONFIG_TEMPLATE", "Official CSR examples use SA for Saudi Arabia."),
      this.csrPlanField("csr.invoice.type", "Invoice type capability flags", egsUnit.csrInvoiceType, "EGS_UNIT", hasText(egsUnit.csrInvoiceType) ? "AVAILABLE" : "MISSING", "CSR_CONFIG_TEMPLATE", "Official SDK examples use invoice type flags such as 1100; LedgerByte stores only explicitly captured values."),
      this.csrPlanField("csr.location.address", "EGS location address", egsUnit.csrLocationAddress, "EGS_UNIT", hasText(egsUnit.csrLocationAddress) ? "AVAILABLE" : "MISSING", "CSR_CONFIG_TEMPLATE", "Official examples use a location-address value; LedgerByte does not infer this from postal address fields."),
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

  private buildSanitizedCsrConfigPreview(fields: ZatcaCsrPlanField[]) {
    const fieldsByKey = new Map(fields.map((field) => [field.sdkConfigKey, field]));
    const configEntries = officialCsrConfigKeyOrder.map((key) => {
      const field =
        fieldsByKey.get(key) ??
        this.csrPlanField(key, key, null, "NOT_MODELED", "MISSING", "CSR_CONFIG_TEMPLATE", "Official SDK CSR config key is not mapped in LedgerByte yet.");
      const unsafeForPropertiesFile = !this.isSafeCsrConfigValue(field.currentValue);
      return {
        key,
        valuePreview: unsafeForPropertiesFile ? null : field.currentValue,
        status: unsafeForPropertiesFile ? "MISSING" : field.status,
        source: field.source,
        officialSource: field.officialSource,
        notes: field.notes,
        unsafeForPropertiesFile,
      };
    });

    return {
      sanitizedConfigPreview: configEntries.map((entry) => `${entry.key}=${entry.valuePreview ?? ""}`).join("\n") + "\n",
      configEntries,
      unsafeFields: configEntries.filter((entry) => entry.unsafeForPropertiesFile),
    };
  }

  private async getLatestCsrConfigReviewOrNull(organizationId: string, egsUnitId: string): Promise<SafeCsrConfigReviewRecord | null> {
    const reviewModel = (this.prisma as PrismaService & { zatcaCsrConfigReview?: { findFirst: (args: unknown) => Promise<SafeCsrConfigReviewRecord | null> } }).zatcaCsrConfigReview;
    if (!reviewModel?.findFirst) {
      return null;
    }

    return reviewModel.findFirst({
      where: { organizationId, egsUnitId },
      orderBy: { createdAt: "desc" },
      select: safeCsrConfigReviewSelect,
    });
  }

  private toPublicCsrConfigReview(review: SafeCsrConfigReviewRecord) {
    return {
      id: review.id,
      organizationId: review.organizationId,
      egsUnitId: review.egsUnitId,
      status: review.status,
      configHash: review.configHash,
      configPreviewRedacted: review.configPreviewRedacted,
      configKeyOrder: review.configKeyOrder,
      missingFieldsJson: review.missingFieldsJson,
      reviewFieldsJson: review.reviewFieldsJson,
      blockersJson: review.blockersJson,
      warningsJson: review.warningsJson,
      approvedById: review.approvedById,
      approvedAt: review.approvedAt?.toISOString() ?? null,
      approvedBy: review.approvedBy ?? null,
      revokedById: review.revokedById,
      revokedAt: review.revokedAt?.toISOString() ?? null,
      revokedBy: review.revokedBy ?? null,
      note: review.note,
      localOnly: true,
      noCsidRequest: true,
      noNetwork: true,
      sdkExecution: false,
      productionCompliance: false,
      createdAt: review.createdAt.toISOString(),
      updatedAt: review.updatedAt.toISOString(),
    };
  }

  private csrConfigPreviewFromDryRun(dryRun: { csrConfigEntries?: Array<{ key: string; value?: string | null; valuePreview?: string | null }> }): string {
    const entriesByKey = new Map((dryRun.csrConfigEntries ?? []).map((entry) => [entry.key, entry]));
    return officialCsrConfigKeyOrder
      .map((key) => {
        const entry = entriesByKey.get(key);
        return `${key}=${entry?.value ?? entry?.valuePreview ?? ""}`;
      })
      .join("\n") + "\n";
  }

  private withLocalCsrCommandPaths(
    commandPlan: ZatcaSdkValidationCommandPlan,
    files: { csrConfig: string; privateKey: string; generatedCsr: string },
    tempDirectory: string,
  ): ZatcaSdkValidationCommandPlan {
    const args = [...commandPlan.args];
    this.replaceArgAfterFlag(args, "-csrConfig", files.csrConfig);
    this.replaceArgAfterFlag(args, "-privateKey", files.privateKey);
    this.replaceArgAfterFlag(args, "-generatedCsr", files.generatedCsr);
    return {
      ...commandPlan,
      args,
      workingDirectory: tempDirectory,
      displayCommand: commandPlan.command ? [commandPlan.command, ...args].map((part) => this.quoteForDisplay(part)).join(" ") : "",
    };
  }

  private replaceArgAfterFlag(args: string[], flag: string, value: string): void {
    const index = args.indexOf(flag);
    if (index >= 0 && index + 1 < args.length) {
      args[index + 1] = value;
    }
  }

  private quoteForDisplay(value: string): string {
    return /\s/.test(value) ? `"${value.replace(/"/g, '\\"')}"` : value;
  }

  private executeZatcaSdkCsrCommand(
    commandPlan: ZatcaSdkValidationCommandPlan,
    timeoutMs: number,
  ): Promise<{ exitCode: number | null; stdout: string; stderr: string; timedOut: boolean }> {
    return this.executeZatcaSdkCommand(commandPlan, timeoutMs);
  }

  private getSdkDummySigningMaterial(sdkReadiness: ReturnType<typeof discoverZatcaSdkReadiness>) {
    const sdkRootPath = sdkReadiness.sdkRootPath ?? null;
    const certificatePath = sdkRootPath ? join(sdkRootPath, "Data", "Certificates", "cert.pem") : null;
    const privateKeyPath = sdkRootPath ? join(sdkRootPath, "Data", "Certificates", "ec-secp256k1-priv-key.pem") : null;
    const certificateReady = certificatePath ? this.fileExistsAndNotEmpty(certificatePath) : false;
    const privateKeyReady = privateKeyPath ? this.fileExistsAndNotEmpty(privateKeyPath) : false;

    return {
      sdkRootPath,
      certificatePath,
      privateKeyPath,
      certificateReady,
      privateKeyReady,
      summary: {
        source: "SDK_DUMMY_TEST_MATERIAL",
        certificateFileName: "cert.pem",
        privateKeyFileName: "ec-secp256k1-priv-key.pem",
        certificateReady,
        privateKeyReady,
        productionCredentialsUsed: false,
        contentReturned: false,
      },
    };
  }

  private prepareLocalSigningSdkConfig(sdkReadiness: ReturnType<typeof discoverZatcaSdkReadiness>, tempDirectory: string) {
    const blockers: string[] = [];
    const warnings: string[] = [];
    const material = this.getSdkDummySigningMaterial(sdkReadiness);
    const sdkRootPath = material.sdkRootPath;
    const baseConfigPath = sdkReadiness.configDirPath ? join(sdkReadiness.configDirPath, "config.json") : null;
    const configDirPath = join(tempDirectory, "Configuration");
    const configPath = join(configDirPath, "config.json");

    if (!sdkRootPath) {
      blockers.push("SDK root path could not be resolved for local signing config preparation.");
      return { configDirPath: null as string | null, configPath: null as string | null, configWritten: false, blockers, warnings };
    }
    if (!baseConfigPath || !this.fileExistsAndNotEmpty(baseConfigPath)) {
      blockers.push("Official SDK config.json was not found for local signing config preparation.");
      return { configDirPath: null as string | null, configPath: null as string | null, configWritten: false, blockers, warnings };
    }
    if (!material.certificateReady || !material.privateKeyReady || !material.certificatePath || !material.privateKeyPath) {
      blockers.push("SDK dummy certificate/private-key files are required before writing the local signing SDK config.");
      return { configDirPath: null as string | null, configPath: null as string | null, configWritten: false, blockers, warnings };
    }

    try {
      const baseConfig = JSON.parse(readFileSync(baseConfigPath, "utf8")) as Record<string, unknown>;
      const config = {
        ...baseConfig,
        xsdPath: join(sdkRootPath, "Data", "Schemas", "xsds", "UBL2.1", "xsd", "maindoc", "UBL-Invoice-2.1.xsd"),
        enSchematron: join(sdkRootPath, "Data", "Rules", "Schematrons", "CEN-EN16931-UBL.xsl"),
        zatcaSchematron: join(sdkRootPath, "Data", "Rules", "Schematrons", "20210819_ZATCA_E-invoice_Validation_Rules.xsl"),
        certPath: material.certificatePath,
        privateKeyPath: material.privateKeyPath,
        pihPath: join(sdkRootPath, "Data", "PIH", "pih.txt"),
        inputPath: join(sdkRootPath, "Data", "Input"),
        usagePathFile: join(sdkReadiness.configDirPath ?? join(sdkRootPath, "Configuration"), "usage.txt"),
      };
      mkdirSync(configDirPath, { recursive: true });
      writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
      warnings.push("Temporary SDK_CONFIG was written with SDK dummy/test certificate paths only and will be deleted by default.");
      return { configDirPath, configPath, configWritten: true, blockers, warnings };
    } catch {
      blockers.push("Temporary local signing SDK config could not be prepared.");
      return { configDirPath: null as string | null, configPath: null as string | null, configWritten: false, blockers, warnings };
    }
  }

  private canWriteToDirectory(directory: string): boolean {
    try {
      accessSync(directory, constants.W_OK);
      return true;
    } catch {
      return false;
    }
  }

  private commandPlanLooksNetworked(commandPlan: ZatcaSdkValidationCommandPlan): boolean {
    const text = [commandPlan.displayCommand, ...commandPlan.args].join(" ");
    return /https?:\/\//i.test(text) || /\b(clearance|reporting|compliance|productionCsid|binarySecurityToken)\b/i.test(text);
  }

  private executeZatcaSdkCommand(
    commandPlan: ZatcaSdkValidationCommandPlan,
    timeoutMs: number,
  ): Promise<{ exitCode: number | null; stdout: string; stderr: string; timedOut: boolean }> {
    return new Promise((resolveResult) => {
      if (!commandPlan.command) {
        resolveResult({ exitCode: null, stdout: "", stderr: "SDK command is unavailable.", timedOut: false });
        return;
      }

      const env = { ...process.env };
      if (commandPlan.envAdditions.PATH_PREPEND) {
        const delimiter = process.platform === "win32" ? ";" : ":";
        const existingPath = env.PATH ?? env.Path ?? "";
        env.PATH = `${commandPlan.envAdditions.PATH_PREPEND}${delimiter}${existingPath}`;
        if (process.platform === "win32") {
          env.Path = env.PATH;
        }
      }
      if (commandPlan.envAdditions.SDK_CONFIG) {
        env.SDK_CONFIG = commandPlan.envAdditions.SDK_CONFIG;
      }
      if (commandPlan.envAdditions.FATOORA_HOME) {
        env.FATOORA_HOME = commandPlan.envAdditions.FATOORA_HOME;
      }

      const command =
        process.platform === "win32" && commandPlan.command.toLowerCase() === "cmd.exe"
          ? process.env.ComSpec || join(process.env.SystemRoot ?? "C:\\Windows", "System32", "cmd.exe")
          : commandPlan.command;

      execFile(command, commandPlan.args, { cwd: commandPlan.workingDirectory, env, timeout: timeoutMs, windowsHide: true, maxBuffer: 5 * 1024 * 1024 }, (error, stdout, stderr) => {
        const maybeCode =
          error && typeof (error as NodeJS.ErrnoException & { code?: unknown }).code === "number"
            ? (error as NodeJS.ErrnoException & { code: number }).code
            : null;
        resolveResult({
          exitCode: error ? maybeCode : 0,
          stdout: String(stdout ?? ""),
          stderr: String(stderr || error?.message || ""),
          timedOut: Boolean(error && /timed out/i.test(error.message)),
        });
      });
    });
  }

  private sanitizeSigningSdkOutput(output: string): string {
    return sanitizeZatcaSdkOutput(output)
      .replace(/-----BEGIN [^-]+-----[\s\S]*?-----END [^-]+-----/gi, "[REDACTED_PEM]")
      .replace(/<Invoice[\s\S]*?<\/Invoice>/gi, "[REDACTED_XML]")
      .replace(/<ds:X509Certificate>[\s\S]*?<\/ds:X509Certificate>/gi, "<ds:X509Certificate>[REDACTED_CERTIFICATE]</ds:X509Certificate>")
      .replace(/binarySecurityToken/gi, "[REDACTED_FIELD]")
      .replace(/\bOTP\b\s*[:=]?\s*[^\s,;]*/gi, "one-time portal code=[REDACTED]")
      .replace(/\bCSID\b/gi, "certificate identifier")
      .replace(/[A-Za-z0-9+/=]{120,}/g, "[REDACTED_BASE64]");
  }

  private sanitizeCsrSdkOutput(output: string): string {
    return sanitizeZatcaSdkOutput(output)
      .replace(/-----BEGIN CERTIFICATE REQUEST-----[\s\S]*?-----END CERTIFICATE REQUEST-----/gi, "[REDACTED_CSR]")
      .replace(/binarySecurityToken/gi, "[REDACTED_FIELD]")
      .replace(/\bOTP\b\s*[:=]?\s*[^\s,;]*/gi, "one-time portal code=[REDACTED]")
      .replace(/\bCSID\b/gi, "certificate identifier")
      .replace(/csrPem\s*[:=]\s*[^\s,;]+/gi, "csrPem=[REDACTED]");
  }

  private fileExistsAndNotEmpty(path: string): boolean {
    try {
      return existsSync(path) && statSync(path).size > 0;
    } catch {
      return false;
    }
  }

  private hashCsrConfigPreview(preview: string): string {
    return createHash("sha256").update(preview, "utf8").digest("hex");
  }

  private optionalCsrReviewNote(value: string | undefined): string | null {
    if (value === undefined) {
      return null;
    }
    const note = this.optionalText(value);
    if (!note) {
      return null;
    }
    if (note.length > 500) {
      throw new BadRequestException("CSR config review note must be 500 characters or fewer.");
    }
    if (/PRIVATE KEY|BEGIN CERTIFICATE|CERTIFICATE REQUEST|binarySecurityToken|CSID|OTP|SECRET|TOKEN/i.test(note)) {
      throw new BadRequestException("CSR config review notes must not include private keys, certificates, CSID tokens, OTPs, CSR bodies, or secrets.");
    }
    return note;
  }

  private sanitizeCsrReviewJson(value: unknown): Prisma.InputJsonValue {
    const serialized = JSON.stringify(value ?? null)
      .replace(/-----BEGIN [^-]+-----[\s\S]*?-----END [^-]+-----/gi, "[REDACTED]")
      .replace(/binarySecurityToken/gi, "[REDACTED_FIELD]")
      .replace(/\bOTP\b/gi, "one-time portal code")
      .replace(/\bCSID\b/gi, "certificate identifier")
      .replace(/\bSECRET\b/gi, "[REDACTED]");
    return JSON.parse(serialized) as Prisma.InputJsonValue;
  }

  private isSafeCsrConfigValue(value: string | null): boolean {
    return value === null || (!/[\r\n=]/.test(value) && !/[\u0000-\u001f\u007f]/.test(value));
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
      csrCommonName: unit.csrCommonName,
      csrSerialNumber: unit.csrSerialNumber,
      csrOrganizationUnitName: unit.csrOrganizationUnitName,
      csrInvoiceType: unit.csrInvoiceType,
      csrLocationAddress: unit.csrLocationAddress,
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

  private optionalCsrField(value: string | undefined, label: string, maxLength = 128): string | null {
    const trimmed = this.optionalText(value);
    if (!trimmed) {
      return null;
    }
    if (trimmed.length > maxLength) {
      throw new BadRequestException(`${label} must be ${maxLength} characters or fewer.`);
    }
    if (/[\r\n=]/.test(trimmed) || /[\u0000-\u001f\u007f]/.test(trimmed)) {
      throw new BadRequestException(`${label} cannot contain control characters, newlines, or equals signs.`);
    }
    return trimmed;
  }

  private optionalCsrInvoiceType(value: string | undefined): string | null {
    const trimmed = this.optionalCsrField(value, "CSR invoice type", 16);
    if (!trimmed) {
      return null;
    }
    if (!officialExampleCsrInvoiceTypes.has(trimmed)) {
      throw new BadRequestException("CSR invoice type must match an official SDK example value currently modeled by LedgerByte: 1100.");
    }
    return trimmed;
  }
}
