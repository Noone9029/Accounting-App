import { BadRequestException, Injectable, NotFoundException, Optional } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  AttachmentStatus,
  DocumentExtractionProviderType,
  DocumentExtractionStatus,
  DocumentInboxSourceType,
  DocumentInboxStatus,
  DocumentReviewDecisionType,
  Prisma,
} from "@prisma/client";
import { AUDIT_ENTITY_TYPES, AUDIT_EVENTS } from "../audit-log/audit-events";
import { AuditLogService } from "../audit-log/audit-log.service";
import { PrismaService } from "../prisma/prisma.service";
import { CreateDocumentInboxItemDto } from "./dto/create-document-inbox-item.dto";
import { DocumentInboxQueryDto } from "./dto/document-inbox-query.dto";
import { ReviewDocumentInboxItemDto } from "./dto/review-document-inbox-item.dto";
import { RunDocumentExtractionDto } from "./dto/run-document-extraction.dto";
import { MockDocumentExtractionProvider } from "./document-extraction-provider";

const documentInboxSelect = {
  id: true,
  organizationId: true,
  attachmentId: true,
  sourceType: true,
  status: true,
  title: true,
  supplierName: true,
  documentDate: true,
  currency: true,
  totalAmount: true,
  taxAmount: true,
  notes: true,
  createdById: true,
  reviewedById: true,
  reviewedAt: true,
  createdAt: true,
  updatedAt: true,
  attachment: {
    select: {
      id: true,
      filename: true,
      originalFilename: true,
      mimeType: true,
      sizeBytes: true,
      status: true,
    },
  },
  extractionResults: {
    orderBy: { createdAt: "desc" as const },
    take: 3,
    select: {
      id: true,
      provider: true,
      status: true,
      confidence: true,
      extractedJson: true,
      redactedRawJson: true,
      blockers: true,
      createdAt: true,
    },
  },
  reviewDecisions: {
    orderBy: { reviewedAt: "desc" as const },
    take: 3,
    select: {
      id: true,
      decisionType: true,
      targetType: true,
      targetId: true,
      reviewerNote: true,
      reviewedById: true,
      reviewedAt: true,
    },
  },
} satisfies Prisma.DocumentInboxItemSelect;

type DocumentInboxItemRecord = Prisma.DocumentInboxItemGetPayload<{ select: typeof documentInboxSelect }>;

@Injectable()
export class DocumentInboxService {
  private readonly mockProvider = new MockDocumentExtractionProvider();

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @Optional() private readonly auditLogService?: AuditLogService,
  ) {}

  list(organizationId: string, query: DocumentInboxQueryDto = {}) {
    return this.prisma.documentInboxItem.findMany({
      where: {
        organizationId,
        status: query.status,
        sourceType: query.sourceType,
      },
      orderBy: { createdAt: "desc" },
      select: documentInboxSelect,
    });
  }

  async get(organizationId: string, id: string) {
    const item = await this.prisma.documentInboxItem.findFirst({
      where: { id, organizationId },
      select: documentInboxSelect,
    });
    if (!item) {
      throw new NotFoundException("Document inbox item not found.");
    }
    return this.response(item);
  }

  async create(organizationId: string, actorUserId: string, dto: CreateDocumentInboxItemDto) {
    const attachment = await this.prisma.attachment.findFirst({
      where: { id: dto.attachmentId, organizationId, status: AttachmentStatus.ACTIVE },
      select: { id: true, filename: true, originalFilename: true, mimeType: true, sizeBytes: true },
    });
    if (!attachment) {
      throw new BadRequestException("A live attachment in this organization is required for document inbox intake.");
    }

    const created = await this.prisma.documentInboxItem.create({
      data: {
        organizationId,
        attachmentId: attachment.id,
        sourceType: dto.sourceType ?? DocumentInboxSourceType.BILL,
        title: cleanRequired(dto.title, "Document inbox title is required."),
        notes: cleanOptional(dto.notes),
        createdById: actorUserId,
      },
      select: documentInboxSelect,
    });

    await this.auditLogService?.log({
      organizationId,
      actorUserId,
      action: AUDIT_EVENTS.DOCUMENT_INBOX_ITEM_CREATED,
      entityType: AUDIT_ENTITY_TYPES.DOCUMENT_INBOX_ITEM,
      entityId: created.id,
      after: this.response(created),
    });

    return this.response(created);
  }

  async extract(organizationId: string, actorUserId: string, id: string, dto: RunDocumentExtractionDto = {}) {
    const item = await this.getForMutation(organizationId, id);
    const provider = this.configuredProvider();

    if (provider === DocumentExtractionProviderType.NONE) {
      const extraction = await this.prisma.documentExtractionResult.create({
        data: {
          organizationId,
          documentInboxItemId: id,
          provider,
          status: DocumentExtractionStatus.SKIPPED_DISABLED,
          blockers: ["Document extraction provider is not configured. Review required."],
          createdById: actorUserId,
          redactedRawJson: { provider: "none", noDocumentScanned: true },
        },
      });
      const updated = await this.prisma.documentInboxItem.update({
        where: { id },
        data: { status: DocumentInboxStatus.EXTRACTION_DISABLED },
        select: documentInboxSelect,
      });
      await this.auditExtraction(organizationId, actorUserId, extraction.id, extraction);
      return {
        ...this.response(updated),
        extraction,
        noDocumentScanned: true,
        reviewRequired: true,
      };
    }

    if (provider !== DocumentExtractionProviderType.MOCK) {
      const extraction = await this.prisma.documentExtractionResult.create({
        data: {
          organizationId,
          documentInboxItemId: id,
          provider,
          status: DocumentExtractionStatus.FAILED,
          blockers: ["Configured extraction provider is a placeholder and is blocked until a real adapter is approved."],
          createdById: actorUserId,
          redactedRawJson: { provider, noDocumentScanned: true },
        },
      });
      const updated = await this.prisma.documentInboxItem.update({
        where: { id },
        data: { status: DocumentInboxStatus.EXTRACTION_FAILED },
        select: documentInboxSelect,
      });
      await this.auditExtraction(organizationId, actorUserId, extraction.id, extraction);
      return {
        ...this.response(updated),
        extraction,
        noDocumentScanned: true,
        reviewRequired: true,
      };
    }

    const normalized = await this.mockProvider.extract({
      title: item.title,
      filename: item.attachment.filename,
      dto,
    });
    const extraction = await this.prisma.documentExtractionResult.create({
      data: {
        organizationId,
        documentInboxItemId: id,
        provider,
        status: DocumentExtractionStatus.EXTRACTED_MOCK,
        confidence: normalized.confidence,
        extractedJson: normalized.extracted as Prisma.InputJsonObject,
        redactedRawJson: normalized.redactedRaw as Prisma.InputJsonObject,
        blockers: ["Mock extraction only. Review required before posting or draft creation."],
        createdById: actorUserId,
      },
    });

    const updated = await this.prisma.documentInboxItem.update({
      where: { id },
      data: {
        status: DocumentInboxStatus.REVIEW_REQUIRED,
        supplierName: normalized.extracted.supplierName,
        documentDate: normalized.extracted.documentDate ? new Date(normalized.extracted.documentDate) : null,
        currency: normalized.extracted.currency,
        totalAmount: normalized.extracted.totalAmount,
        taxAmount: normalized.extracted.taxAmount,
      },
      select: documentInboxSelect,
    });
    await this.auditExtraction(organizationId, actorUserId, extraction.id, extraction);
    return {
      ...this.response(updated),
      extraction,
      noDocumentScanned: false,
      reviewRequired: true,
    };
  }

  async review(organizationId: string, actorUserId: string, id: string, dto: ReviewDocumentInboxItemDto) {
    await this.getForMutation(organizationId, id);
    const decisionType = dto.decisionType;
    const targetType = targetTypeForDecision(decisionType);
    const nextStatus = decisionType === DocumentReviewDecisionType.REJECT ? DocumentInboxStatus.REJECTED : DocumentInboxStatus.REVIEWED;

    const decision = await this.prisma.documentReviewDecision.create({
      data: {
        organizationId,
        documentInboxItemId: id,
        decisionType,
        targetType,
        reviewerNote: cleanOptional(dto.reviewerNote),
        reviewedById: actorUserId,
      },
    });

    const updated = await this.prisma.documentInboxItem.update({
      where: { id },
      data: {
        status: nextStatus,
        reviewedById: actorUserId,
        reviewedAt: new Date(),
      },
      select: documentInboxSelect,
    });

    await this.auditLogService?.log({
      organizationId,
      actorUserId,
      action: AUDIT_EVENTS.DOCUMENT_INBOX_REVIEWED,
      entityType: AUDIT_ENTITY_TYPES.DOCUMENT_REVIEW_DECISION,
      entityId: decision.id,
      after: {
        decision,
        targetCreationDeferred: targetType !== null,
      },
    });

    return {
      ...this.response(updated),
      decision,
      targetCreationDeferred: targetType !== null,
      reviewRequired: false,
    };
  }

  private async getForMutation(organizationId: string, id: string) {
    const item = await this.prisma.documentInboxItem.findFirst({
      where: { id, organizationId },
      select: documentInboxSelect,
    });
    if (!item) {
      throw new NotFoundException("Document inbox item not found.");
    }
    return item;
  }

  private configuredProvider(): DocumentExtractionProviderType {
    const value = this.config.get<string>("LEDGERBYTE_DOCUMENT_EXTRACTION_PROVIDER")?.trim().toUpperCase() || "NONE";
    if (value === "MOCK") {
      return DocumentExtractionProviderType.MOCK;
    }
    if (value === "FUTURE_PROVIDER") {
      return DocumentExtractionProviderType.FUTURE_PROVIDER;
    }
    return DocumentExtractionProviderType.NONE;
  }

  private response(item: DocumentInboxItemRecord) {
    return {
      ...item,
      reviewRequired: item.status === DocumentInboxStatus.REVIEW_REQUIRED || item.status === DocumentInboxStatus.EXTRACTION_DISABLED || item.status === DocumentInboxStatus.EXTRACTION_FAILED,
      providerConfigured: this.configuredProvider() !== DocumentExtractionProviderType.NONE,
      provider: this.configuredProvider(),
      conservativeCopy: "Extraction is beta readiness only. Review required before posting.",
    };
  }

  private auditExtraction(organizationId: string, actorUserId: string, entityId: string, after: unknown) {
    return this.auditLogService?.log({
      organizationId,
      actorUserId,
      action: AUDIT_EVENTS.DOCUMENT_INBOX_EXTRACTION_RUN,
      entityType: AUDIT_ENTITY_TYPES.DOCUMENT_EXTRACTION_RESULT,
      entityId,
      after,
    });
  }
}

function targetTypeForDecision(decisionType: DocumentReviewDecisionType): string | null {
  if (decisionType === DocumentReviewDecisionType.CREATE_DRAFT_PURCHASE_BILL) {
    return "PurchaseBill";
  }
  if (decisionType === DocumentReviewDecisionType.CREATE_DRAFT_CASH_EXPENSE) {
    return "CashExpense";
  }
  return null;
}

function cleanRequired(value: string, message: string) {
  const cleaned = value.trim();
  if (!cleaned) {
    throw new BadRequestException(message);
  }
  return cleaned;
}

function cleanOptional(value?: string | null) {
  const cleaned = value?.trim();
  return cleaned || null;
}
