import { BadRequestException, Inject, Injectable, NotFoundException, Optional } from "@nestjs/common";
import { DocumentType, GeneratedDocumentStatus, Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { AuditLogService } from "../audit-log/audit-log.service";
import { ObservabilityContextService } from "../observability/observability-context.service";
import { PrismaService } from "../prisma/prisma.service";
import { GeneratedDocumentQueryDto } from "./dto/generated-document-query.dto";
import {
  DatabaseGeneratedDocumentStorageAdapter,
  GeneratedDocumentStorageAdapter,
} from "./generated-document-storage";

const generatedDocumentSelect = {
  id: true,
  organizationId: true,
  documentType: true,
  sourceType: true,
  sourceId: true,
  documentNumber: true,
  filename: true,
  mimeType: true,
  storageProvider: true,
  storageKey: true,
  contentHash: true,
  sizeBytes: true,
  status: true,
  requestId: true,
  accountingContextJson: true,
  generatedById: true,
  generatedAt: true,
  createdAt: true,
} satisfies Prisma.GeneratedDocumentSelect;

export interface ArchivePdfInput {
  organizationId: string;
  documentType: DocumentType;
  sourceType: string;
  sourceId: string;
  documentNumber: string;
  filename: string;
  buffer: Buffer;
  generatedById?: string | null;
  accountingContext?: Prisma.InputJsonValue;
}

export interface ZatcaPdfA3ArchiveMetadataInput {
  metadataId?: string | null;
  invoiceUuid?: string | null;
  zatcaStatus?: string | null;
  icv?: number | null;
  invoiceHash?: string | null;
  xmlHash?: string | null;
  generatedAt?: Date | string | null;
  hasUnsignedXml?: boolean;
  hasQrPayload?: boolean;
  hasSignedXml?: boolean;
}

export interface ArchiveInvoicePdfInput extends ArchivePdfInput {
  zatca?: ZatcaPdfA3ArchiveMetadataInput | null;
}

export interface ZatcaPdfA3ArchiveBoundary {
  metadataOnly: true;
  safeMetadata: (Required<Pick<ZatcaPdfA3ArchiveMetadataInput, "hasUnsignedXml" | "hasQrPayload" | "hasSignedXml">> &
    Omit<ZatcaPdfA3ArchiveMetadataInput, "hasUnsignedXml" | "hasQrPayload" | "hasSignedXml">) | null;
  pdfA3Embedded: false;
  zatcaSubmitted: false;
  signedXmlPersisted: false;
  qrPayloadPersisted: false;
  productionCompliance: false;
  explicitArtifactCreationRequired: true;
  omittedBodies: {
    unsignedXmlBody: true;
    signedXmlBody: true;
    qrPayloadBody: true;
  };
  blockers: string[];
  warnings: string[];
}

@Injectable()
export class GeneratedDocumentService {
  private readonly generatedDocumentStorage: GeneratedDocumentStorageAdapter;

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly auditLogService?: AuditLogService,
    @Optional()
    @Inject(GeneratedDocumentStorageAdapter)
    generatedDocumentStorage?: GeneratedDocumentStorageAdapter,
    @Optional() private readonly observabilityContext?: ObservabilityContextService,
  ) {
    this.generatedDocumentStorage = generatedDocumentStorage ?? new DatabaseGeneratedDocumentStorageAdapter();
  }

  list(organizationId: string, query: GeneratedDocumentQueryDto) {
    return this.prisma.generatedDocument.findMany({
      where: {
        organizationId,
        documentType: query.documentType,
        sourceType: query.sourceType,
        sourceId: query.sourceId,
        status: query.status,
      },
      orderBy: { generatedAt: "desc" },
      select: generatedDocumentSelect,
    });
  }

  async get(organizationId: string, id: string) {
    const document = await this.prisma.generatedDocument.findFirst({
      where: { id, organizationId },
      select: generatedDocumentSelect,
    });

    if (!document) {
      throw new NotFoundException("Generated document not found.");
    }

    return document;
  }

  async download(organizationId: string, id: string, actorUserId?: string) {
    const document = await this.prisma.generatedDocument.findFirst({
      where: { id, organizationId },
      select: {
        id: true,
        organizationId: true,
        filename: true,
        mimeType: true,
        storageProvider: true,
        storageKey: true,
        contentBase64: true,
        contentHash: true,
        sizeBytes: true,
      },
    });

    if (!document) {
      throw new NotFoundException("Generated document not found.");
    }
    const buffer = await this.generatedDocumentStorage.readGeneratedDocumentContent({
      ...document,
      generatedDocumentId: document.id,
    });

    await this.auditLogService?.log({
      organizationId,
      actorUserId,
      action: "DOWNLOAD",
      entityType: "GeneratedDocument",
      entityId: document.id,
      after: {
        id: document.id,
        filename: document.filename,
        mimeType: document.mimeType,
        sizeBytes: document.sizeBytes,
        storageProvider: document.storageProvider,
      },
    });

    return {
      filename: document.filename,
      mimeType: document.mimeType,
      buffer,
    };
  }

  async readContentForWorker(organizationId: string, id: string) {
    const document = await this.prisma.generatedDocument.findFirst({
      where: { id, organizationId },
      select: {
        id: true,
        organizationId: true,
        sourceType: true,
        sourceId: true,
        filename: true,
        mimeType: true,
        storageProvider: true,
        storageKey: true,
        contentBase64: true,
        contentHash: true,
        sizeBytes: true,
      },
    });
    if (!document) {
      throw new NotFoundException("Generated document not found.");
    }
    const buffer = await this.generatedDocumentStorage.readGeneratedDocumentContent({
      ...document,
      generatedDocumentId: document.id,
    });
    return { ...document, buffer };
  }

  async archivePdf(input: ArchivePdfInput) {
    await this.assertSourceRecordBelongsToOrganization(input.organizationId, input.sourceType, input.sourceId);
    const generatedDocumentId = this.generatedDocumentStorage.getStorageBackendName() === "database" ? undefined : randomUUID();
    const storedContent = await this.generatedDocumentStorage.writeGeneratedDocumentContent({
      organizationId: input.organizationId,
      generatedDocumentId,
      filename: input.filename,
      mimeType: "application/pdf",
      buffer: input.buffer,
    });
    const document = await this.prisma.generatedDocument.create({
      data: {
        ...(generatedDocumentId ? { id: generatedDocumentId } : {}),
        organizationId: input.organizationId,
        documentType: input.documentType,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        documentNumber: input.documentNumber,
        filename: sanitizeFilename(input.filename),
        mimeType: "application/pdf",
        storageProvider: storedContent.storageProvider,
        storageKey: storedContent.storageKey,
        contentBase64: storedContent.contentBase64,
        contentHash: storedContent.contentHash,
        sizeBytes: storedContent.sizeBytes,
        status: GeneratedDocumentStatus.GENERATED,
        requestId: this.observabilityContext?.getRequestId(),
        accountingContextJson: input.accountingContext,
        generatedById: input.generatedById ?? null,
      },
      select: generatedDocumentSelect,
    });

    await this.auditLogService?.log({
      organizationId: input.organizationId,
      actorUserId: input.generatedById ?? undefined,
      action: "CREATE",
      entityType: "GeneratedDocument",
      entityId: document.id,
      after: document,
    });

    return document;
  }

  async archiveInvoicePdf(input: ArchiveInvoicePdfInput) {
    const document = await this.archivePdf(input);
    return {
      document,
      zatcaPdfA3Archive: buildZatcaPdfA3ArchiveBoundary(input.zatca ?? null),
    };
  }

  private async assertSourceRecordBelongsToOrganization(organizationId: string, sourceType: string, sourceId: string): Promise<void> {
    const delegateName = generatedDocumentSourceDelegates[sourceType];
    if (!delegateName) {
      return;
    }
    const delegate = (this.prisma as unknown as Record<string, { findFirst?: (args: unknown) => Promise<unknown> }>)[delegateName];
    if (typeof delegate?.findFirst !== "function") {
      return;
    }
    const found = await delegate.findFirst({
      where: { id: sourceId, organizationId },
      select: { id: true },
    });
    if (!found) {
      throw new BadRequestException("Source record was not found in this organization or is not supported for generated documents.");
    }
  }
}

const generatedDocumentSourceDelegates: Record<string, string> = {
  BankReconciliation: "bankReconciliation",
  CashExpense: "cashExpense",
  CreditNote: "creditNote",
  CustomerPayment: "customerPayment",
  CustomerRefund: "customerRefund",
  DeliveryNote: "deliveryNote",
  InventoryVarianceProposal: "inventoryVarianceProposal",
  PurchaseBill: "purchaseBill",
  PurchaseDebitNote: "purchaseDebitNote",
  PurchaseOrder: "purchaseOrder",
  PurchaseReceipt: "purchaseReceipt",
  SalesInvoice: "salesInvoice",
  SalesQuote: "salesQuote",
  SalesStockIssue: "salesStockIssue",
  SupplierPayment: "supplierPayment",
  SupplierRefund: "supplierRefund",
};

export function buildZatcaPdfA3ArchiveBoundary(metadata: ZatcaPdfA3ArchiveMetadataInput | null | undefined): ZatcaPdfA3ArchiveBoundary {
  const safeMetadata = metadata
    ? {
        metadataId: metadata.metadataId ?? null,
        invoiceUuid: metadata.invoiceUuid ?? null,
        zatcaStatus: metadata.zatcaStatus ?? null,
        icv: metadata.icv ?? null,
        invoiceHash: metadata.invoiceHash ?? null,
        xmlHash: metadata.xmlHash ?? null,
        generatedAt: metadata.generatedAt ?? null,
        hasUnsignedXml: metadata.hasUnsignedXml === true,
        hasQrPayload: metadata.hasQrPayload === true,
        hasSignedXml: metadata.hasSignedXml === true,
      }
    : null;

  return {
    metadataOnly: true,
    safeMetadata,
    pdfA3Embedded: false,
    zatcaSubmitted: false,
    signedXmlPersisted: false,
    qrPayloadPersisted: false,
    productionCompliance: false,
    explicitArtifactCreationRequired: true,
    omittedBodies: {
      unsignedXmlBody: true,
      signedXmlBody: true,
      qrPayloadBody: true,
    },
    blockers: [
      ...(safeMetadata ? [] : ["Generated ZATCA XML metadata is not attached to this invoice PDF archive."]),
      "PDF/A-3 embedding is not implemented.",
      "Signed XML artifact creation remains an explicit ZATCA workflow.",
      "ZATCA clearance/reporting submission is not performed by invoice PDF archive generation.",
    ],
    warnings: [
      "This boundary records safe invoice/ZATCA metadata only.",
      "No unsigned XML, signed XML, QR payload, certificate, private key, CSID token, or ZATCA response body is returned here.",
      "A normal invoice PDF archive must not be treated as a compliant PDF/A-3 invoice.",
    ],
  };
}

export function sanitizeFilename(value: string): string {
  const cleaned = value.trim().replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-");
  return cleaned || "document.pdf";
}
