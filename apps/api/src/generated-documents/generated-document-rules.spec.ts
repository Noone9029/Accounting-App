import { DocumentType, GeneratedDocumentStatus } from "@prisma/client";
import { GeneratedDocumentService, sanitizeFilename } from "./generated-document.service";

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
    const service = new GeneratedDocumentService(prisma as never);
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
