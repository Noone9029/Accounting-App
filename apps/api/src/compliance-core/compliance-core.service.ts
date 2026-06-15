import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import {
  ComplianceCountryCode,
  ComplianceDocumentSourceType,
  ComplianceDocumentStatus,
  ComplianceDocumentType,
  ComplianceProfileStatus,
  ComplianceValidationStatus,
  CreditNoteStatus,
  Prisma,
  SalesInvoiceStatus,
} from "@prisma/client";
import {
  buildUaeDocumentReadinessReport,
  buildUaePintXml,
  buildUaeReadinessReport,
  deriveUaePeppolParticipantId,
  type UaePintDocumentInput,
} from "@ledgerbyte/uae-peppol-pint-ae";
import { AuditLogService } from "../audit-log/audit-log.service";
import { PrismaService } from "../prisma/prisma.service";

export const UAE_COMPLIANCE_SOURCES = [
  "https://mof.gov.ae/wp-content/uploads/2026/02/UAE-Electronic-Invoicing-Guidelines_V-1.0-23Feb2026.pdf",
  "https://mof.gov.ae/en/about-us/initiatives/einvoicing/pre-approved-einvoicing-service-providers/",
  "https://mof.gov.ae/wp-content/uploads/2025/09/Ministerial-Decision-No.-244-of-2025-on-the-Implementation-of-the-Electronic-Invoicing-System.pdf",
  "https://docs.peppol.eu/poac/ae/v1.0.1/pint-ae/",
] as const;

@Injectable()
export class ComplianceCoreService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async getReadiness(organizationId: string) {
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        name: true,
        legalName: true,
        taxNumber: true,
        countryCode: true,
        tradeLicenseNumber: true,
        uaeTrn: true,
        uaeTin: true,
        uaeVatRegistrationStatus: true,
        uaeAddressLine1: true,
        uaeAddressLine2: true,
        uaeEmirate: true,
        uaeBusinessActivity: true,
        peppolParticipantId: true,
        uaeAspSelected: true,
        uaeAspOnboardingStatus: true,
      },
    });
    if (!organization) {
      throw new NotFoundException("Organization not found.");
    }

    const [buyerCount, buyerEndpointCount, documentStatusCounts] = await Promise.all([
      this.prisma.contact.count({ where: { organizationId, type: { in: ["CUSTOMER", "BOTH"] }, isActive: true } }),
      this.prisma.contact.count({ where: { organizationId, type: { in: ["CUSTOMER", "BOTH"] }, isActive: true, peppolParticipantId: { not: null } } }),
      this.prisma.complianceDocument.groupBy({
        by: ["status"],
        where: { organizationId },
        _count: { status: true },
      }),
    ]);

    const expectedParticipantId = safeDeriveParticipantId(organization.uaeTin);
    const readiness = buildUaeReadinessReport({
      organization: {
        legalName: organization.legalName ?? organization.name,
        tradeLicenseNumber: organization.tradeLicenseNumber,
        tin: organization.uaeTin,
        trn: organization.uaeTrn ?? organization.taxNumber,
        vatRegistrationStatus: organization.uaeVatRegistrationStatus,
        addressLine1: organization.uaeAddressLine1,
        addressLine2: organization.uaeAddressLine2,
        emirate: organization.uaeEmirate,
        businessActivity: organization.uaeBusinessActivity,
        peppolParticipantId: organization.peppolParticipantId,
        aspSelected: organization.uaeAspSelected,
        aspOnboardingStatus: organization.uaeAspOnboardingStatus,
        countryCode: "AE",
      },
    });

    return {
      posture: "CONTROLLED_BETA_USER_TESTING_ONLY",
      claim: "UAE eInvoicing-ready / Peppol PINT-AE-ready data preparation with disabled ASP connectivity.",
      prohibitedClaims: ["FTA certified", "Peppol certified", "Official UAE eInvoicing provider", "Accredited ASP"],
      noNetworkByDefault: true,
      countries: [
        { code: "AE", module: "uae-peppol-pint-ae", status: "ACTIVE_FOUNDATION" },
        { code: "SA", module: "ksa-zatca", status: "PARKED_NO_PRODUCTION_NETWORK" },
      ],
      uae: {
        framework: "Five-corner Peppol/ASP model; EmaraTax/ASP onboarding remains outside this disabled-by-default core.",
        deadlines: [
          { segment: "Annual revenue >= AED 50m", appointAspBy: "2026-07-31", implementBy: "2027-01-01" },
          { segment: "Annual revenue < AED 50m", appointAspBy: "2027-03-31", implementBy: "2027-07-01" },
        ],
        sources: UAE_COMPLIANCE_SOURCES,
        expectedParticipantId,
        readiness,
        buyerEndpointCoverage: { activeBuyerCount: buyerCount, buyerPeppolParticipantCount: buyerEndpointCount },
      },
      documentStatusCounts: Object.fromEntries(documentStatusCounts.map((row) => [row.status, row._count.status])),
    };
  }

  async listDocuments(organizationId: string) {
    return this.prisma.complianceDocument.findMany({
      where: { organizationId },
      orderBy: { updatedAt: "desc" },
      include: {
        validationResults: { orderBy: { createdAt: "desc" }, take: 1 },
        transmissions: { orderBy: { createdAt: "desc" }, take: 1 },
        archiveRecords: { orderBy: { archivedAt: "desc" }, take: 3 },
      },
    });
  }

  async getSalesInvoiceReadiness(organizationId: string, invoiceId: string) {
    const invoice = await this.prisma.salesInvoice.findFirst({
      where: { id: invoiceId, organizationId },
      include: { organization: true, customer: true, lines: { orderBy: { sortOrder: "asc" } } },
    });
    if (!invoice) {
      throw new NotFoundException("Sales invoice not found.");
    }

    const readiness = buildUaeDocumentReadinessReport(salesInvoicePintInput(invoice));
    return this.sourceReadinessResponse({
      organizationId,
      sourceType: ComplianceDocumentSourceType.SALES_INVOICE,
      sourceId: invoice.id,
      sourceStatus: invoice.status,
      readiness,
    });
  }

  async getCreditNoteReadiness(organizationId: string, creditNoteId: string) {
    const creditNote = await this.prisma.creditNote.findFirst({
      where: { id: creditNoteId, organizationId },
      include: { organization: true, customer: true, originalInvoice: true, lines: { orderBy: { sortOrder: "asc" } } },
    });
    if (!creditNote) {
      throw new NotFoundException("Credit note not found.");
    }

    const readiness = buildUaeDocumentReadinessReport(creditNotePintInput(creditNote));
    return this.sourceReadinessResponse({
      organizationId,
      sourceType: ComplianceDocumentSourceType.CREDIT_NOTE,
      sourceId: creditNote.id,
      sourceStatus: creditNote.status,
      readiness,
    });
  }

  async getTimeline(organizationId: string, id: string) {
    await this.requireDocument(organizationId, id);
    return this.prisma.complianceEventLog.findMany({
      where: { organizationId, complianceDocumentId: id },
      orderBy: { createdAt: "asc" },
    });
  }

  async prepareSalesInvoice(organizationId: string, actorUserId: string, invoiceId: string) {
    const invoice = await this.prisma.salesInvoice.findFirst({
      where: { id: invoiceId, organizationId },
      include: { organization: true, customer: true, lines: { orderBy: { sortOrder: "asc" } } },
    });
    if (!invoice) {
      throw new NotFoundException("Sales invoice not found.");
    }
    if (invoice.status !== SalesInvoiceStatus.FINALIZED) {
      throw new BadRequestException("Only finalized sales invoices can be prepared for compliance validation.");
    }

    return this.prepareDocument({
      organizationId,
      actorUserId,
      sourceType: ComplianceDocumentSourceType.SALES_INVOICE,
      sourceId: invoice.id,
      documentType: invoice.taxTotal.greaterThan(0) ? ComplianceDocumentType.TAX_INVOICE : ComplianceDocumentType.COMMERCIAL_INVOICE,
      documentNumber: invoice.invoiceNumber,
      issueDate: invoice.issueDate,
      currency: invoice.currency,
      snapshot: invoice,
    });
  }

  async prepareCreditNote(organizationId: string, actorUserId: string, creditNoteId: string) {
    const creditNote = await this.prisma.creditNote.findFirst({
      where: { id: creditNoteId, organizationId },
      include: { organization: true, customer: true, originalInvoice: true, lines: { orderBy: { sortOrder: "asc" } } },
    });
    if (!creditNote) {
      throw new NotFoundException("Credit note not found.");
    }
    if (creditNote.status !== CreditNoteStatus.FINALIZED) {
      throw new BadRequestException("Only finalized credit notes can be prepared for compliance validation.");
    }

    return this.prepareDocument({
      organizationId,
      actorUserId,
      sourceType: ComplianceDocumentSourceType.CREDIT_NOTE,
      sourceId: creditNote.id,
      documentType: creditNote.taxTotal.greaterThan(0) ? ComplianceDocumentType.TAX_CREDIT_NOTE : ComplianceDocumentType.CREDIT_NOTE,
      documentNumber: creditNote.creditNoteNumber,
      issueDate: creditNote.issueDate,
      currency: creditNote.currency,
      snapshot: creditNote,
    });
  }

  async validateDocument(organizationId: string, actorUserId: string, id: string) {
    const document = await this.requireDocument(organizationId, id);
    const input = await this.buildPintInput(document);
    const result = buildUaePintXml(input);
    const status = result.validation.valid ? ComplianceValidationStatus.PASSED : ComplianceValidationStatus.FAILED;
    const nextDocumentStatus = result.validation.valid ? ComplianceDocumentStatus.READY_FOR_ASP : ComplianceDocumentStatus.VALIDATION_FAILED;
    const archiveMetadata = result.validation.valid
      ? {
          filename: `${document.documentNumber}.xml`,
          mimeType: "application/xml",
          contentHash: await sha256(result.xml),
          sizeBytes: Buffer.byteLength(result.xml, "utf8"),
          storageProvider: "metadata-only",
        }
      : null;

    const updated = await this.prisma.$transaction(async (tx) => {
      const validation = await tx.complianceValidationResult.create({
        data: {
          organizationId,
          complianceDocumentId: id,
          status,
          validatorKey: "uae-peppol-pint-ae-local",
          summary: result.validation.valid ? "Local PINT-AE readiness validation passed. ASP submission remains disabled." : "Local PINT-AE readiness validation failed.",
          issuesJson: toInputJson({ issues: result.validation.issues }),
          metadataJson: toInputJson({ noNetwork: true, noAspSubmission: true }),
        },
      });

      let latestArchiveRecordId: string | undefined;
      if (archiveMetadata) {
        const archive = await tx.documentArchiveRecord.create({
          data: {
            organizationId,
            complianceDocumentId: id,
            artifactType: "XML",
            sourceType: document.sourceType,
            sourceId: document.sourceId,
            filename: archiveMetadata.filename,
            mimeType: archiveMetadata.mimeType,
            storageProvider: archiveMetadata.storageProvider,
            contentHash: archiveMetadata.contentHash,
            sizeBytes: archiveMetadata.sizeBytes,
            metadataJson: toInputJson({ generatedBy: "uae-peppol-pint-ae-local", bodyStored: false }),
            createdById: actorUserId,
          },
        });
        latestArchiveRecordId = archive.id;
      }

      const updatedDocument = await tx.complianceDocument.update({
        where: { id },
        data: {
          status: nextDocumentStatus,
          latestValidationStatus: status,
          validationSummaryJson: toInputJson({ validatorKey: "uae-peppol-pint-ae-local", issueCount: result.validation.issues.length }),
          latestArchiveRecordId,
        },
      });

      await tx.complianceEventLog.create({
        data: {
          organizationId,
          complianceDocumentId: id,
          eventType: "VALIDATED_LOCALLY",
          fromStatus: document.status,
          toStatus: updatedDocument.status,
          message: "Local validation completed without ASP network calls.",
          metadataJson: toInputJson({ validationResultId: validation.id, noNetwork: true }),
          actorUserId,
        },
      });

      return updatedDocument;
    });

    await this.auditLogService.log({ organizationId, actorUserId, action: "UPDATE", entityType: "ComplianceDocument", entityId: id, after: updated });
    return { document: updated, validation: result.validation, archiveCreated: Boolean(archiveMetadata) };
  }

  private async prepareDocument(input: {
    organizationId: string;
    actorUserId: string;
    sourceType: ComplianceDocumentSourceType;
    sourceId: string;
    documentType: ComplianceDocumentType;
    documentNumber: string;
    issueDate: Date;
    currency: string;
    snapshot: unknown;
  }) {
    const profile = await this.prisma.complianceProfile.upsert({
      where: { organizationId_countryCode_profileKey: { organizationId: input.organizationId, countryCode: ComplianceCountryCode.AE, profileKey: "uae-peppol-pint-ae" } },
      create: {
        organizationId: input.organizationId,
        countryCode: ComplianceCountryCode.AE,
        profileKey: "uae-peppol-pint-ae",
        status: ComplianceProfileStatus.DRAFT,
        settingsJson: toInputJson({ noNetworkByDefault: true, aspConnector: "disabled" }),
      },
      update: {},
    });

    const document = await this.prisma.complianceDocument.upsert({
      where: {
        organizationId_countryCode_sourceType_sourceId: {
          organizationId: input.organizationId,
          countryCode: ComplianceCountryCode.AE,
          sourceType: input.sourceType,
          sourceId: input.sourceId,
        },
      },
      create: {
        organizationId: input.organizationId,
        profileId: profile.id,
        countryCode: ComplianceCountryCode.AE,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        documentType: input.documentType,
        status: ComplianceDocumentStatus.READY_FOR_VALIDATION,
        documentNumber: input.documentNumber,
        issueDate: input.issueDate,
        currency: input.currency,
        sourceSnapshotJson: redactSnapshot(input.snapshot),
      },
      update: {
        profileId: profile.id,
        documentType: input.documentType,
        status: ComplianceDocumentStatus.READY_FOR_VALIDATION,
        documentNumber: input.documentNumber,
        issueDate: input.issueDate,
        currency: input.currency,
        sourceSnapshotJson: redactSnapshot(input.snapshot),
      },
    });

    await this.prisma.complianceEventLog.create({
      data: {
        organizationId: input.organizationId,
        complianceDocumentId: document.id,
        eventType: "PREPARED_FOR_LOCAL_VALIDATION",
        toStatus: document.status,
        message: "Compliance document prepared for local UAE PINT-AE readiness validation.",
        metadataJson: toInputJson({ noNetwork: true, sourceType: input.sourceType }),
        actorUserId: input.actorUserId,
      },
    });
    await this.auditLogService.log({ organizationId: input.organizationId, actorUserId: input.actorUserId, action: "CREATE", entityType: "ComplianceDocument", entityId: document.id, after: document });
    return document;
  }

  private async requireDocument(organizationId: string, id: string) {
    const document = await this.prisma.complianceDocument.findFirst({ where: { id, organizationId } });
    if (!document) {
      throw new NotFoundException("Compliance document not found.");
    }
    return document;
  }

  private async buildPintInput(document: { organizationId: string; sourceId: string; sourceType: ComplianceDocumentSourceType }): Promise<UaePintDocumentInput> {
    if (document.sourceType === ComplianceDocumentSourceType.SALES_INVOICE) {
      const invoice = await this.prisma.salesInvoice.findFirst({
        where: { id: document.sourceId, organizationId: document.organizationId },
        include: { organization: true, customer: true, lines: { orderBy: { sortOrder: "asc" } } },
      });
      if (!invoice) {
        throw new NotFoundException("Sales invoice source not found.");
      }
      return salesInvoicePintInput(invoice);
    }

    const creditNote = await this.prisma.creditNote.findFirst({
      where: { id: document.sourceId, organizationId: document.organizationId },
      include: { organization: true, customer: true, originalInvoice: true, lines: { orderBy: { sortOrder: "asc" } } },
    });
    if (!creditNote) {
      throw new NotFoundException("Credit note source not found.");
    }
    return creditNotePintInput(creditNote);
  }

  private async sourceReadinessResponse(input: {
    organizationId: string;
    sourceType: ComplianceDocumentSourceType;
    sourceId: string;
    sourceStatus: string;
    readiness: ReturnType<typeof buildUaeDocumentReadinessReport>;
  }) {
    const complianceDocument = await this.prisma.complianceDocument.findFirst({
      where: {
        organizationId: input.organizationId,
        countryCode: ComplianceCountryCode.AE,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
      },
      include: {
        validationResults: { orderBy: { createdAt: "desc" }, take: 1 },
        archiveRecords: { orderBy: { archivedAt: "desc" }, take: 1 },
      },
    });

    return {
      posture: "CONTROLLED_BETA_USER_TESTING_ONLY",
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      sourceStatus: input.sourceStatus,
      localOnly: true,
      noNetwork: true,
      noAspSubmission: true,
      noFtaReporting: true,
      productionCompliance: false,
      canAttemptLocalXmlGeneration: input.sourceStatus === "FINALIZED" && input.readiness.canAttemptLocalXmlGeneration,
      readiness: input.readiness,
      complianceDocument,
    };
  }
}

function salesInvoicePintInput(invoice: {
  invoiceNumber: string;
  issueDate: Date;
  currency: string;
  organization: Parameters<typeof organizationParty>[0];
  customer: Parameters<typeof contactParty>[0];
  lines: Array<{
    id: string;
    sortOrder: number;
    description: string;
    quantity: Prisma.Decimal;
    unitPrice: Prisma.Decimal;
    taxableAmount: Prisma.Decimal;
    taxAmount: Prisma.Decimal;
    lineTotal: Prisma.Decimal;
  }>;
  taxableTotal: Prisma.Decimal;
  taxTotal: Prisma.Decimal;
  total: Prisma.Decimal;
}): UaePintDocumentInput {
  return {
    kind: "invoice",
    documentNumber: invoice.invoiceNumber,
    issueDate: toDateOnly(invoice.issueDate),
    currency: invoice.currency,
    supplier: organizationParty(invoice.organization),
    buyer: contactParty(invoice.customer),
    lines: invoice.lines.map((line) => ({
      id: line.sortOrder ? String(line.sortOrder) : line.id,
      description: line.description,
      quantity: moneyString(line.quantity),
      unitPrice: moneyString(line.unitPrice),
      taxableAmount: moneyString(line.taxableAmount),
      taxAmount: moneyString(line.taxAmount),
      lineTotal: moneyString(line.lineTotal),
    })),
    subtotal: moneyString(invoice.taxableTotal),
    taxTotal: moneyString(invoice.taxTotal),
    total: moneyString(invoice.total),
  };
}

function creditNotePintInput(creditNote: {
  creditNoteNumber: string;
  issueDate: Date;
  currency: string;
  organization: Parameters<typeof organizationParty>[0];
  customer: Parameters<typeof contactParty>[0];
  originalInvoice: { invoiceNumber: string } | null;
  reason: string | null;
  lines: Array<{
    id: string;
    sortOrder: number;
    description: string;
    quantity: Prisma.Decimal;
    unitPrice: Prisma.Decimal;
    taxableAmount: Prisma.Decimal;
    taxAmount: Prisma.Decimal;
    lineTotal: Prisma.Decimal;
  }>;
  taxableTotal: Prisma.Decimal;
  taxTotal: Prisma.Decimal;
  total: Prisma.Decimal;
}): UaePintDocumentInput {
  return {
    kind: "credit-note",
    documentNumber: creditNote.creditNoteNumber,
    issueDate: toDateOnly(creditNote.issueDate),
    currency: creditNote.currency,
    supplier: organizationParty(creditNote.organization),
    buyer: contactParty(creditNote.customer),
    lines: creditNote.lines.map((line) => ({
      id: line.sortOrder ? String(line.sortOrder) : line.id,
      description: line.description,
      quantity: moneyString(line.quantity),
      unitPrice: moneyString(line.unitPrice),
      taxableAmount: moneyString(line.taxableAmount),
      taxAmount: moneyString(line.taxAmount),
      lineTotal: moneyString(line.lineTotal),
    })),
    subtotal: moneyString(creditNote.taxableTotal),
    taxTotal: moneyString(creditNote.taxTotal),
    total: moneyString(creditNote.total),
    creditNoteReason: creditNote.reason,
    originalInvoiceNumber: creditNote.originalInvoice?.invoiceNumber,
  };
}

function organizationParty(organization: {
  name: string;
  legalName: string | null;
  taxNumber: string | null;
  uaeTrn: string | null;
  uaeTin: string | null;
  uaeAddressLine1: string | null;
  uaeAddressLine2: string | null;
  uaeEmirate: string | null;
  peppolParticipantId: string | null;
}) {
  return {
    legalName: organization.legalName ?? organization.name,
    trn: organization.uaeTrn ?? organization.taxNumber,
    tin: organization.uaeTin,
    addressLine1: organization.uaeAddressLine1,
    addressLine2: organization.uaeAddressLine2,
    emirate: organization.uaeEmirate,
    countryCode: "AE",
    peppolParticipantId: organization.peppolParticipantId,
  };
}

function contactParty(contact: {
  name: string;
  legalName: string | null;
  taxNumber: string | null;
  uaeTrn: string | null;
  uaeTin: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  uaeAddressLine1: string | null;
  uaeAddressLine2: string | null;
  city: string | null;
  uaeEmirate: string | null;
  countryCode: string;
  peppolParticipantId: string | null;
}) {
  return {
    legalName: contact.legalName ?? contact.name,
    trn: contact.uaeTrn ?? contact.taxNumber,
    tin: contact.uaeTin,
    addressLine1: contact.uaeAddressLine1 ?? contact.addressLine1,
    addressLine2: contact.uaeAddressLine2 ?? contact.addressLine2,
    city: contact.city,
    emirate: contact.uaeEmirate,
    countryCode: contact.countryCode || "AE",
    peppolParticipantId: contact.peppolParticipantId,
  };
}

function redactSnapshot(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(
    JSON.stringify(value, (key, nestedValue) => {
      if (["email", "phone", "contentBase64", "privateKeyPem", "csrPem"].includes(key)) {
        return nestedValue ? "[REDACTED]" : nestedValue;
      }
      if (nestedValue instanceof Prisma.Decimal) {
        return nestedValue.toString();
      }
      if (nestedValue instanceof Date) {
        return nestedValue.toISOString();
      }
      return nestedValue;
    }),
  ) as Prisma.InputJsonValue;
}

function toInputJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function safeDeriveParticipantId(tin: string | null): string | null {
  try {
    return deriveUaePeppolParticipantId(tin);
  } catch {
    return null;
  }
}

function moneyString(value: Prisma.Decimal | number | string): string {
  return value instanceof Prisma.Decimal ? value.toString() : String(value);
}

function toDateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

async function sha256(value: string): Promise<string> {
  const crypto = await import("node:crypto");
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}
