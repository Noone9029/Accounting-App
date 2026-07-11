import { DocumentType, GeneratedDocumentStatus } from "@prisma/client";
import { buildZatcaPdfA3ArchiveBoundary, GeneratedDocumentService, sanitizeFilename } from "./generated-document.service";
import { FakeLocalGeneratedDocumentObjectStorageAdapter } from "./generated-document-storage";

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
      salesInvoice: { findFirst: jest.fn().mockResolvedValue({ id: "invoice-1" }) },
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
    expect(prisma.generatedDocument.create.mock.calls[0]![0].data).not.toHaveProperty("id");
    expect(prisma.salesInvoice.findFirst).toHaveBeenCalledWith({
      where: { id: "invoice-1", organizationId: "org-1" },
      select: { id: true },
    });
    expect(auditLogService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-1",
        actorUserId: "user-1",
        action: "CREATE",
        entityType: "GeneratedDocument",
      }),
    );
  });

  it("blocks generated-document archiving for a supported source record outside the organization", async () => {
    const prisma = {
      generatedDocument: {
        create: jest.fn(),
      },
      salesInvoice: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    const service = new GeneratedDocumentService(prisma as never);

    await expect(
      service.archivePdf({
        organizationId: "org-2",
        documentType: DocumentType.SALES_INVOICE,
        sourceType: "SalesInvoice",
        sourceId: "invoice-1",
        documentNumber: "INV-000001",
        filename: "invoice-INV-000001.pdf",
        buffer: Buffer.from("%PDF archive"),
        generatedById: "user-2",
      }),
    ).rejects.toThrow("Source record was not found in this organization or is not supported for generated documents.");

    expect(prisma.salesInvoice.findFirst).toHaveBeenCalledWith({
      where: { id: "invoice-1", organizationId: "org-2" },
      select: { id: true },
    });
    expect(prisma.generatedDocument.create).not.toHaveBeenCalled();
  });

  it("persists redacted accounting identity for archived report evidence", async () => {
    const prisma = {
      generatedDocument: { create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: "doc-report", ...data })) },
    };
    const service = new GeneratedDocumentService(prisma as never);
    const accountingContext = {
      reportKind: "general-ledger", baseCurrency: "AED", amountBasis: "BASE_CURRENCY", transactionCurrency: "USD",
      rateScope: { snapshotIds: ["rate-1"], sources: ["MANUAL"] }, revaluationScope: { runIds: [], lineIds: [], statuses: [] },
    };

    await service.archivePdf({
      organizationId: "org-1", documentType: DocumentType.REPORT_GENERAL_LEDGER, sourceType: "AccountingReport",
      sourceId: "general-ledger?baseCurrency=AED&transactionCurrency=USD", documentNumber: "general-ledger-2026-07-31",
      filename: "general-ledger-2026-07-31.pdf", buffer: Buffer.from("%PDF report"), accountingContext,
    });

    expect(prisma.generatedDocument.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ accountingContextJson: accountingContext }),
    }));
    expect(JSON.stringify(prisma.generatedDocument.create.mock.calls[0]![0].data.accountingContextJson)).not.toMatch(/token|secret|authorization|cookie/i);
  });

  it("archives and downloads generated PDFs through the local object adapter with tenant-scoped keys", async () => {
    let storedDocument: Record<string, unknown> | null = null;
    const prisma = {
      generatedDocument: {
        create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
          storedDocument = {
            ...data,
            generatedAt: new Date("2026-07-05T00:00:00.000Z"),
            createdAt: new Date("2026-07-05T00:00:00.000Z"),
          };
          return storedDocument;
        }),
        findFirst: jest.fn(async ({ where }: { where: { id: string; organizationId: string } }) => {
          if (!storedDocument || storedDocument.id !== where.id || storedDocument.organizationId !== where.organizationId) {
            return null;
          }
          return storedDocument;
        }),
      },
      salesInvoice: { findFirst: jest.fn().mockResolvedValue({ id: "invoice-1" }) },
    };
    const auditLogService = { log: jest.fn().mockResolvedValue(undefined) };
    const objectStorage = new FakeLocalGeneratedDocumentObjectStorageAdapter();
    const service = new GeneratedDocumentService(prisma as never, auditLogService as never, objectStorage);
    const buffer = Buffer.from("%PDF object archive");

    const document = await service.archivePdf({
      organizationId: "org-1",
      documentType: DocumentType.SALES_INVOICE,
      sourceType: "SalesInvoice",
      sourceId: "invoice-1",
      documentNumber: "INV-000001",
      filename: "invoice-INV-000001.pdf",
      buffer,
      generatedById: "user-1",
    });

    expect(document).toMatchObject({
      organizationId: "org-1",
      storageProvider: "local-test-object",
      contentBase64: null,
      contentHash: expect.any(String),
      sizeBytes: buffer.byteLength,
    });
    expect(document.id).toEqual(expect.any(String));
    expect(String(document.storageKey)).toMatch(
      /^org\/org-1\/generated-documents\/[0-9a-f-]{36}\/invoice-INV-000001\.pdf$/,
    );
    expect(prisma.generatedDocument.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          id: document.id,
          organizationId: "org-1",
          storageProvider: "local-test-object",
          storageKey: document.storageKey,
          contentBase64: null,
        }),
      }),
    );

    auditLogService.log.mockClear();

    await expect(service.download("org-1", String(document.id), "user-1")).resolves.toMatchObject({
      filename: "invoice-INV-000001.pdf",
      mimeType: "application/pdf",
      buffer,
    });
    expect(auditLogService.log).toHaveBeenCalledWith({
      organizationId: "org-1",
      actorUserId: "user-1",
      action: "DOWNLOAD",
      entityType: "GeneratedDocument",
      entityId: document.id,
      after: {
        id: document.id,
        filename: "invoice-INV-000001.pdf",
        mimeType: "application/pdf",
        sizeBytes: buffer.byteLength,
        storageProvider: "local-test-object",
      },
    });
    expect(JSON.stringify(auditLogService.log.mock.calls[0][0])).not.toContain("contentBase64");

    auditLogService.log.mockClear();
    await expect(service.download("org-2", String(document.id))).rejects.toThrow("Generated document not found.");
    expect(auditLogService.log).not.toHaveBeenCalled();
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
      salesInvoice: { findFirst: jest.fn().mockResolvedValue({ id: "invoice-1" }) },
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
          storageProvider: "database",
          storageKey: null,
          contentBase64: Buffer.from("%PDF file").toString("base64"),
          contentHash: "hash",
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
    expect(prisma.generatedDocument.findFirst.mock.calls[0][0].select).toEqual(
      expect.objectContaining({
        storageProvider: true,
        storageKey: true,
        contentBase64: true,
        contentHash: true,
      }),
    );
  });

  it("does not return generated document metadata or content for guessed cross-tenant ids", async () => {
    const prisma = {
      generatedDocument: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    };
    const service = new GeneratedDocumentService(prisma as never);

    await expect(service.get("org-2", "doc-1")).rejects.toThrow("Generated document not found.");
    await expect(service.download("org-2", "doc-1")).rejects.toThrow("Generated document not found.");

    expect(prisma.generatedDocument.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "doc-1", organizationId: "org-2" } }),
    );
    expect(prisma.generatedDocument.findFirst.mock.calls[0][0].select).not.toHaveProperty("contentBase64");
    expect(prisma.generatedDocument.findFirst.mock.calls[1][0].select).toHaveProperty("contentBase64");
  });

  it("sanitizes filenames", () => {
    expect(sanitizeFilename("invoice INV/000001.pdf")).toBe("invoice-INV-000001.pdf");
  });
});
