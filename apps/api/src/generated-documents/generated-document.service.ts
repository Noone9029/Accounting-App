import { Injectable, NotFoundException, Optional } from "@nestjs/common";
import { createHash } from "node:crypto";
import { DocumentType, GeneratedDocumentStatus, Prisma } from "@prisma/client";
import { AuditLogService } from "../audit-log/audit-log.service";
import { PrismaService } from "../prisma/prisma.service";
import { GeneratedDocumentQueryDto } from "./dto/generated-document-query.dto";

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
}

@Injectable()
export class GeneratedDocumentService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly auditLogService?: AuditLogService,
  ) {}

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

  async download(organizationId: string, id: string) {
    const document = await this.prisma.generatedDocument.findFirst({
      where: { id, organizationId },
      select: {
        id: true,
        filename: true,
        mimeType: true,
        contentBase64: true,
      },
    });

    if (!document?.contentBase64) {
      throw new NotFoundException("Generated document not found.");
    }

    return {
      filename: document.filename,
      mimeType: document.mimeType,
      buffer: Buffer.from(document.contentBase64, "base64"),
    };
  }

  async archivePdf(input: ArchivePdfInput) {
    const document = await this.prisma.generatedDocument.create({
      data: {
        organizationId: input.organizationId,
        documentType: input.documentType,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        documentNumber: input.documentNumber,
        filename: sanitizeFilename(input.filename),
        mimeType: "application/pdf",
        storageProvider: "database",
        contentBase64: input.buffer.toString("base64"),
        contentHash: createHash("sha256").update(input.buffer).digest("hex"),
        sizeBytes: input.buffer.byteLength,
        status: GeneratedDocumentStatus.GENERATED,
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
}

export function sanitizeFilename(value: string): string {
  const cleaned = value.trim().replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-");
  return cleaned || "document.pdf";
}
