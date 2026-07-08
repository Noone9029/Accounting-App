import {
  AttachmentStatus,
  DocumentExtractionProviderType,
  DocumentExtractionStatus,
  DocumentInboxSourceType,
  DocumentInboxStatus,
  DocumentReviewDecisionType,
} from "@prisma/client";
import { DocumentInboxService } from "./document-inbox.service";

describe("DocumentInboxService", () => {
  const attachment = {
    id: "11111111-1111-1111-1111-111111111111",
    filename: "receipt.pdf",
    originalFilename: "receipt.pdf",
    mimeType: "application/pdf",
    sizeBytes: 1234,
    status: AttachmentStatus.ACTIVE,
  };

  const item = {
    id: "22222222-2222-2222-2222-222222222222",
    organizationId: "org-1",
    attachmentId: attachment.id,
    sourceType: DocumentInboxSourceType.BILL,
    status: DocumentInboxStatus.UPLOADED,
    title: "Supplier receipt",
    supplierName: null,
    documentDate: null,
    currency: null,
    totalAmount: null,
    taxAmount: null,
    notes: null,
    createdById: "user-1",
    reviewedById: null,
    reviewedAt: null,
    createdAt: new Date("2026-07-08T12:00:00.000Z"),
    updatedAt: new Date("2026-07-08T12:00:00.000Z"),
    attachment,
    extractionResults: [],
    reviewDecisions: [],
  };

  function makeService(provider = "NONE") {
    const prisma = {
      attachment: {
        findFirst: jest.fn().mockResolvedValue(attachment),
      },
      documentInboxItem: {
        findMany: jest.fn().mockResolvedValue([item]),
        findFirst: jest.fn().mockResolvedValue(item),
        create: jest.fn((args: { data: Record<string, unknown> }) => Promise.resolve({ ...item, ...args.data })),
        update: jest.fn((args: { data: Record<string, unknown> }) => Promise.resolve({ ...item, ...args.data })),
      },
      documentExtractionResult: {
        create: jest.fn((args: { data: Record<string, unknown> }) =>
          Promise.resolve({ id: "33333333-3333-3333-3333-333333333333", createdAt: new Date("2026-07-08T12:01:00.000Z"), ...args.data }),
        ),
      },
      documentReviewDecision: {
        create: jest.fn((args: { data: Record<string, unknown> }) =>
          Promise.resolve({ id: "44444444-4444-4444-4444-444444444444", reviewedAt: new Date("2026-07-08T12:02:00.000Z"), ...args.data }),
        ),
      },
    };
    const config = { get: jest.fn((key: string) => (key === "LEDGERBYTE_DOCUMENT_EXTRACTION_PROVIDER" ? provider : undefined)) };
    const audit = { log: jest.fn() };
    return { service: new DocumentInboxService(prisma as never, config as never, audit as never), prisma, config, audit };
  }

  it("creates a document inbox item from an active tenant-scoped attachment", async () => {
    const { service, prisma, audit } = makeService();

    await expect(
      service.create("org-1", "user-1", {
        attachmentId: attachment.id,
        sourceType: DocumentInboxSourceType.RECEIPT,
        title: " Receipt review ",
      }),
    ).resolves.toMatchObject({
      id: item.id,
      sourceType: DocumentInboxSourceType.RECEIPT,
      title: "Receipt review",
      reviewRequired: false,
    });

    expect(prisma.attachment.findFirst).toHaveBeenCalledWith({
      where: { id: attachment.id, organizationId: "org-1", status: AttachmentStatus.ACTIVE },
      select: { id: true, filename: true, originalFilename: true, mimeType: true, sizeBytes: true },
    });
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: "DOCUMENT_INBOX_ITEM_CREATED" }));
  });

  it("records disabled extraction without pretending a document was scanned", async () => {
    const { service, prisma } = makeService("NONE");

    const result = await service.extract("org-1", "user-1", item.id);

    expect(result).toMatchObject({
      noDocumentScanned: true,
      reviewRequired: true,
      status: DocumentInboxStatus.EXTRACTION_DISABLED,
    });
    expect(prisma.documentExtractionResult.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          provider: DocumentExtractionProviderType.NONE,
          status: DocumentExtractionStatus.SKIPPED_DISABLED,
          redactedRawJson: { provider: "none", noDocumentScanned: true },
        }),
      }),
    );
  });

  it("runs mock extraction and leaves the item review-required", async () => {
    const { service, prisma } = makeService("MOCK");

    const result = await service.extract("org-1", "user-1", item.id, {
      supplierName: "Demo Supplier",
      currency: "aed",
      totalAmount: 210,
      taxAmount: 10,
      confidence: 0.91,
    });

    expect(result).toMatchObject({
      noDocumentScanned: false,
      reviewRequired: true,
      status: DocumentInboxStatus.REVIEW_REQUIRED,
      supplierName: "Demo Supplier",
      currency: "AED",
    });
    expect(prisma.documentExtractionResult.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          provider: DocumentExtractionProviderType.MOCK,
          status: DocumentExtractionStatus.EXTRACTED_MOCK,
          confidence: 0.91,
          blockers: ["Mock extraction only. Review required before posting or draft creation."],
        }),
      }),
    );
  });

  it("records draft-target review decisions without silently creating accounting records", async () => {
    const { service, prisma } = makeService("MOCK");

    const result = await service.review("org-1", "user-1", item.id, {
      decisionType: DocumentReviewDecisionType.CREATE_DRAFT_PURCHASE_BILL,
      reviewerNote: " create draft after supplier mapping ",
    });

    expect(result).toMatchObject({
      status: DocumentInboxStatus.REVIEWED,
      targetCreationDeferred: true,
      reviewRequired: false,
    });
    expect(prisma.documentReviewDecision.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          decisionType: DocumentReviewDecisionType.CREATE_DRAFT_PURCHASE_BILL,
          targetType: "PurchaseBill",
          reviewerNote: "create draft after supplier mapping",
        }),
      }),
    );
  });
});
