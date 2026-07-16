import { ContactType, DocumentType, EmailDeliveryStatus, EmailTemplateType, PrismaClient } from "@prisma/client";
import { createHash } from "node:crypto";
import { DocumentDeliveryService } from "./document-delivery.service";
import { EmailRetryWorkerService } from "./email-retry-worker.service";
import { GeneratedDocumentService } from "../generated-documents/generated-document.service";

const runLocalDatabaseIntegration = process.env.LEDGERBYTE_RUN_LOCAL_DB_INTEGRATION === "true";

(runLocalDatabaseIntegration ? describe : describe.skip)("EmailRetryWorkerService local PostgreSQL integration", () => {
  const prisma = new PrismaClient();
  const organizationId = process.env.LEDGERBYTE_LOCAL_INTEGRATION_ORGANIZATION_ID ?? "";
  let deliveryId: string;
  let generatedDocumentId: string;
  let contactId: string;
  const statementContent = Buffer.from("%PDF local customer statement");
  const statementContentHash = createHash("sha256").update(statementContent).digest("hex");
  let statementSourceId: string;

  beforeAll(async () => {
    if (!organizationId) throw new Error("Set LEDGERBYTE_LOCAL_INTEGRATION_ORGANIZATION_ID to a disposable local organization.");
    await prisma.$connect();
    const contact = await prisma.contact.create({
      data: { organizationId, type: ContactType.CUSTOMER, name: "Local Worker Customer", email: "local-worker-customer@example.test" },
      select: { id: true },
    });
    contactId = contact.id;
    statementSourceId = `customer-statement:${contactId}?from=2026-07-01&to=2026-07-31`;
    const generatedDocument = await prisma.generatedDocument.create({
      data: {
        organizationId,
        documentType: DocumentType.CUSTOMER_STATEMENT,
        sourceType: "CustomerStatement",
        sourceId: statementSourceId,
        documentNumber: "Statement Local Worker Customer (2026-07-01 to 2026-07-31)",
        filename: "statement-local-worker.pdf",
        mimeType: "application/pdf",
        contentBase64: statementContent.toString("base64"),
        contentHash: statementContentHash,
        sizeBytes: statementContent.byteLength,
      },
      select: { id: true },
    });
    generatedDocumentId = generatedDocument.id;
    const created = await prisma.emailOutbox.create({
      data: {
        organizationId,
        toEmail: "local-worker@example.test",
        fromEmail: "no-reply@ledgerbyte.local",
        subject: "Local worker race",
        templateType: EmailTemplateType.CUSTOMER_STATEMENT,
        bodyText: "Local worker race test",
        status: EmailDeliveryStatus.QUEUED,
        provider: "mock",
        sourceType: "CustomerStatement",
        sourceId: statementSourceId,
        sourceNumber: "Statement Local Worker Customer (2026-07-01 to 2026-07-31)",
        documentType: DocumentType.CUSTOMER_STATEMENT,
        sourceContextJson: { from: "2026-07-01", to: "2026-07-31", asOf: "2026-07-31" },
        generatedDocumentId,
        attachmentFilename: "statement-local-worker.pdf",
        attachmentMimeType: "application/pdf",
        attachmentSizeBytes: statementContent.byteLength,
        attachmentContentHash: statementContentHash,
        maxAttempts: 3,
      },
      select: { id: true },
    });
    deliveryId = created.id;
  });

  afterAll(async () => {
    if (deliveryId) await prisma.emailOutbox.deleteMany({ where: { id: deliveryId, organizationId } });
    if (generatedDocumentId) await prisma.generatedDocument.deleteMany({ where: { id: generatedDocumentId, organizationId } });
    if (contactId) await prisma.contact.deleteMany({ where: { id: contactId, organizationId } });
    await prisma.$disconnect();
  });

  it("allows only one concurrent worker claim to send and update the row", async () => {
    const provider = {
      provider: "mock",
      isMock: true,
      readiness: () => ({ provider: "mock", ready: true, mockMode: true, realSendingEnabled: false, blockingReasons: [], warnings: [] }),
      send: jest.fn().mockResolvedValue({ provider: "mock", status: EmailDeliveryStatus.SENT_MOCK, providerMessageId: "local-mock-1", sentAt: new Date() }),
    };
    const config = { get: jest.fn().mockReturnValue(undefined) };
    const documentDelivery = new DocumentDeliveryService(prisma as never, provider as never, undefined, new GeneratedDocumentService(prisma as never), config as never);
    const workerA = new EmailRetryWorkerService(prisma as never, provider as never, documentDelivery, config as never);
    const workerB = new EmailRetryWorkerService(prisma as never, provider as never, documentDelivery, config as never);

    const [first, second] = await Promise.all([
      workerA.process(organizationId, "worker-a", 1),
      workerB.process(organizationId, "worker-b", 1),
    ]);
    const finalRow = await prisma.emailOutbox.findUnique({ where: { id: deliveryId }, select: { status: true, attemptCount: true, retryLockedAt: true, retryLockedBy: true } });

    expect(provider.send).toHaveBeenCalledTimes(1);
    expect(first.claimCount + second.claimCount).toBe(1);
    expect(finalRow).toMatchObject({ status: EmailDeliveryStatus.SENT_MOCK, attemptCount: 1, retryLockedAt: null, retryLockedBy: null });
  });
});
