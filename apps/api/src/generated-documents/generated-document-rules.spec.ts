import { DocumentType, GeneratedDocumentStatus } from "@prisma/client";
import { buildZatcaPdfA3ArchiveBoundary, GeneratedDocumentService, sanitizeFilename } from "./generated-document.service";

describe("generated document rules", () => {
  it("archives PDF content as metadata plus base64 content", async () => {
    const prisma = {
      generatedDocument: {
        create: jest.fn().mockResolvedValue({
          id: "doc-1",
          documentType: DocumentType.SALES_INVOICE,
          sourceType: "SalesInvoice",
          sourceId: "invoice-1",
          documentNumber: "INV-000001",
          filename: "invoice-INV-000001.pdf",
          mimeType: "application/pdf",
          contentHash: "hash",
          sizeBytes: 12,
          status: GeneratedDocumentStatus.GENERATED,
        }),
      },
    };
    const auditLogService = { log: jest.fn().mockResolvedValue(undefined) };
    const service = new GeneratedDocumentService(prisma as never, auditLogService as never);
    const buffer = Buffer.from("%PDF archive");

    await expect(
      service.archivePdf({
        organizationId: "org-1",
        documentType: DocumentType.SALES_INVOICE,
        sourceType: "SalesInvoice",
        sourceId: "invoice-1",
        documentNumber: "INV-000001",
        filename: "invoice-INV-000001.pdf",
        buffer,
        generatedById: "user-1",
      }),
    ).resolves.toMatchObject({ filename: "invoice-INV-000001.pdf" });

    expect(prisma.generatedDocument.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: "org-1",
          contentBase64: buffer.toString("base64"),
          contentHash: expect.any(String),
          sizeBytes: buffer.byteLength,
          status: GeneratedDocumentStatus.GENERATED,
        }),
      }),
    );
    expect(auditLogService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-1",
        actorUserId: "user-1",
        action: "CREATE",
        entityType: "GeneratedDocument",
      }),
    );
  });

  it("archives invoice PDFs through a metadata-only ZATCA PDF/A-3 boundary", async () => {
    const prisma = {
      generatedDocument: {
        create: jest.fn().mockResolvedValue({
          id: "doc-1",
          documentType: DocumentType.SALES_INVOICE,
          sourceType: "SalesInvoice",
          sourceId: "invoice-1",
          documentNumber: "INV-000001",
          filename: "invoice-INV-000001.pdf",
          mimeType: "application/pdf",
          contentHash: "hash",
          sizeBytes: 12,
          status: GeneratedDocumentStatus.GENERATED,
        }),
      },
    };
    const auditLogService = { log: jest.fn().mockResolvedValue(undefined) };
    const service = new GeneratedDocumentService(prisma as never, auditLogService as never);
    const buffer = Buffer.from("%PDF archive");

    const result = await service.archiveInvoicePdf({
      organizationId: "org-1",
      documentType: DocumentType.SALES_INVOICE,
      sourceType: "SalesInvoice",
      sourceId: "invoice-1",
      documentNumber: "INV-000001",
      filename: "invoice-INV-000001.pdf",
      buffer,
      generatedById: "user-1",
      zatca: {
        metadataId: "metadata-1",
        invoiceUuid: "8e6000cf-1a98-4174-b3e7-b5d5954bc10d",
        zatcaStatus: "XML_GENERATED",
        icv: 17,
        invoiceHash: "invoice-hash",
        xmlHash: "xml-hash",
        generatedAt: new Date("2026-05-25T00:00:00.000Z"),
        hasUnsignedXml: true,
        hasQrPayload: true,
        hasSignedXml: false,
        xmlBase64: "SECRET XML BODY",
        qrCodeBase64: "QR PAYLOAD",
      } as never,
    });

    expect(result).toMatchObject({
      document: { id: "doc-1" },
      zatcaPdfA3Archive: {
        metadataOnly: true,
        pdfA3Embedded: false,
        zatcaSubmitted: false,
        signedXmlPersisted: false,
        qrPayloadPersisted: false,
        explicitArtifactCreationRequired: true,
        safeMetadata: {
          metadataId: "metadata-1",
          invoiceUuid: "8e6000cf-1a98-4174-b3e7-b5d5954bc10d",
          zatcaStatus: "XML_GENERATED",
          hasUnsignedXml: true,
          hasQrPayload: true,
          hasSignedXml: false,
        },
      },
    });
    const createData = prisma.generatedDocument.create.mock.calls[0]![0].data;
    expect(createData).toEqual(
      expect.objectContaining({
        documentType: DocumentType.SALES_INVOICE,
        sourceType: "SalesInvoice",
        sourceId: "invoice-1",
        mimeType: "application/pdf",
        storageProvider: "database",
      }),
    );
    expect(createData).not.toHaveProperty("zatca");
    expect(createData).not.toHaveProperty("xmlBase64");
    expect(createData).not.toHaveProperty("qrCodeBase64");
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain("SECRET XML BODY");
    expect(serialized).not.toContain("QR PAYLOAD");
    expect(serialized).not.toContain("<Invoice");
  });

  it("builds a blocked ZATCA PDF/A-3 archive boundary without artifact metadata", () => {
    expect(buildZatcaPdfA3ArchiveBoundary(null)).toMatchObject({
      metadataOnly: true,
      safeMetadata: null,
      pdfA3Embedded: false,
      zatcaSubmitted: false,
      explicitArtifactCreationRequired: true,
      blockers: expect.arrayContaining([
        "Generated ZATCA XML metadata is not attached to this invoice PDF archive.",
        "PDF/A-3 embedding is not implemented.",
      ]),
    });
  });

  it("scopes metadata and downloads by organization", async () => {
    const prisma = {
      generatedDocument: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue({
          filename: "invoice.pdf",
          mimeType: "application/pdf",
          contentBase64: Buffer.from("%PDF file").toString("base64"),
        }),
      },
    };
    const service = new GeneratedDocumentService(prisma as never);

    await service.list("org-1", { documentType: DocumentType.SALES_INVOICE });
    expect(prisma.generatedDocument.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ organizationId: "org-1" }) }));

    await expect(service.download("org-1", "doc-1")).resolves.toMatchObject({
      filename: "invoice.pdf",
      mimeType: "application/pdf",
      buffer: expect.any(Buffer),
    });
    expect(prisma.generatedDocument.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "doc-1", organizationId: "org-1" } }));
  });

  it("sanitizes filenames", () => {
    expect(sanitizeFilename("invoice INV/000001.pdf")).toBe("invoice-INV-000001.pdf");
  });
});
