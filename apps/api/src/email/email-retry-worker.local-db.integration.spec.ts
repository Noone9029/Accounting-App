import { ContactType, DocumentType, EmailDeliveryStatus, EmailTemplateType, PrismaClient } from "@prisma/client";
import { createHash, randomUUID } from "node:crypto";
import { DocumentDeliveryService } from "./document-delivery.service";
import { EmailRetryWorkerService } from "./email-retry-worker.service";
import { GeneratedDocumentService } from "../generated-documents/generated-document.service";

const runLocalDatabaseIntegration = process.env.LEDGERBYTE_RUN_LOCAL_DB_INTEGRATION === "true";

(runLocalDatabaseIntegration ? describe : describe.skip)("EmailRetryWorkerService local PostgreSQL integration", () => {
  const prisma = new PrismaClient();
  const marker = `SME-DOCUMENT-DELIVERY-03-RACE-${Date.now()}-${randomUUID().slice(0, 8)}`;
  let organizationId = "";
  let deliveryId = "";
  let generatedDocumentId = "";
  let contactId = "";
  const statementContent = Buffer.from("%PDF local supplier statement");
  const statementContentHash = createHash("sha256").update(statementContent).digest("hex");
  let statementSourceId = "";

  beforeAll(async () => {
    assertLocalDatabaseUrl();
    await prisma.$connect();
    const organization = await prisma.organization.create({
      data: { name: marker, countryCode: "SA", baseCurrency: "SAR", timezone: "Asia/Riyadh" },
      select: { id: true },
    });
    organizationId = organization.id;

    const contact = await prisma.contact.create({
      data: { organizationId, type: ContactType.SUPPLIER, name: `${marker} Supplier`, email: "local-worker-supplier@example.test" },
      select: { id: true },
    });
    contactId = contact.id;
    statementSourceId = `supplier-statement:${contactId}?baseCurrency=SAR&from=2026-07-01&to=2026-07-31`;

    const generatedDocument = await prisma.generatedDocument.create({
      data: {
        organizationId,
        documentType: DocumentType.SUPPLIER_STATEMENT,
        sourceType: "SupplierStatement",
        sourceId: statementSourceId,
        documentNumber: `Supplier Statement ${marker} Supplier (2026-07-01 to 2026-07-31)`,
        filename: "supplier-statement-local-worker.pdf",
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
        toEmail: "local-worker-supplier@example.test",
        fromEmail: "no-reply@ledgerbyte.local",
        subject: "Supplier statement local worker race",
        templateType: EmailTemplateType.SUPPLIER_STATEMENT,
        bodyText: "Supplier statement local worker race test",
        status: EmailDeliveryStatus.QUEUED,
        provider: "mock",
        sourceType: "SupplierStatement",
        sourceId: statementSourceId,
        sourceNumber: `Supplier Statement ${marker} Supplier (2026-07-01 to 2026-07-31)`,
        documentType: DocumentType.SUPPLIER_STATEMENT,
        sourceContextJson: { from: "2026-07-01", to: "2026-07-31", asOf: "2026-07-31" },
        generatedDocumentId,
        attachmentFilename: "supplier-statement-local-worker.pdf",
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
    if (organizationId) {
      await prisma.emailOutbox.deleteMany({ where: { organizationId } });
      await prisma.generatedDocument.deleteMany({ where: { organizationId } });
      await prisma.contact.deleteMany({ where: { organizationId } });
      await prisma.organization.deleteMany({ where: { id: organizationId } });

      const [remainingOutbox, remainingDocuments, remainingContacts, remainingOrganizations] = await Promise.all([
        prisma.emailOutbox.count({ where: { id: deliveryId, organizationId } }),
        prisma.generatedDocument.count({ where: { id: generatedDocumentId, organizationId } }),
        prisma.contact.count({ where: { id: contactId, organizationId } }),
        prisma.organization.count({ where: { id: organizationId } }),
      ]);
      expect({ remainingOutbox, remainingDocuments, remainingContacts, remainingOrganizations }).toEqual({
        remainingOutbox: 0,
        remainingDocuments: 0,
        remainingContacts: 0,
        remainingOrganizations: 0,
      });
      console.log("SUPPLIER_STATEMENT_RACE_CLEANUP", JSON.stringify({ remainingOutbox, remainingDocuments, remainingContacts, remainingOrganizations }));
    }
    await prisma.$disconnect();
  });

  it("allows only one concurrent worker claim to send and update the supplier statement row", async () => {
    const provider = {
      provider: "mock",
      isMock: true,
      readiness: () => ({ provider: "mock", ready: true, mockMode: true, realSendingEnabled: false, blockingReasons: [], warnings: [] }),
      send: jest.fn().mockResolvedValue({ provider: "mock", status: EmailDeliveryStatus.SENT_MOCK, providerMessageId: "local-mock-1", sentAt: new Date() }),
    };
    const config = { get: jest.fn().mockReturnValue(undefined) };
    const finalUpdates: Array<{ where: Record<string, unknown>; data: Record<string, unknown> }> = [];
    const claimTokens = new Set<string>();
    const emailOutbox = prisma.emailOutbox as any;
    const originalUpdateMany = emailOutbox.updateMany.bind(emailOutbox);
    emailOutbox.updateMany = async (args: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
      if (typeof args.data.retryLockedBy === "string") claimTokens.add(args.data.retryLockedBy);
      if (args.data.status !== undefined) finalUpdates.push(args);
      return originalUpdateMany(args);
    };
    const documentDelivery = new DocumentDeliveryService(prisma as never, provider as never, undefined, new GeneratedDocumentService(prisma as never), config as never);
    const workerA = new EmailRetryWorkerService(prisma as never, provider as never, documentDelivery, config as never);
    const workerB = new EmailRetryWorkerService(prisma as never, provider as never, documentDelivery, config as never);

    try {
      const [first, second] = await Promise.all([
        workerA.process(organizationId, "worker-a", 1),
        workerB.process(organizationId, "worker-b", 1),
      ]);
      const finalRow = await prisma.emailOutbox.findUnique({
        where: { id: deliveryId },
        select: { status: true, attemptCount: true, retryLockedAt: true, retryLockedBy: true },
      });

      expect(first.claimCount + second.claimCount).toBe(1);
      expect(finalUpdates).toHaveLength(1);
      const finalUpdate = finalUpdates[0];
      if (!finalUpdate) throw new Error("Expected one final outbox update.");
      expect(finalUpdate.where).toEqual(expect.objectContaining({ id: deliveryId, organizationId, retryLockedBy: expect.any(String) }));
      const winningToken = finalUpdate.where.retryLockedBy;
      expect(claimTokens).toContain(winningToken);
      expect(provider.send).toHaveBeenCalledTimes(1);
      const sendInput = (provider.send as jest.Mock).mock.calls[0][0] as { attachments?: Array<{ filename: string; mimeType: string; content: Buffer; contentHash: string }> };
      expect(sendInput.attachments).toHaveLength(1);
      const attachment = sendInput.attachments?.[0];
      if (!attachment) throw new Error("Expected one PDF attachment.");
      expect(attachment).toMatchObject({ filename: "supplier-statement-local-worker.pdf", mimeType: "application/pdf", contentHash: statementContentHash });
      expect(attachment.content).toEqual(statementContent);
      expect(finalRow).toMatchObject({ status: EmailDeliveryStatus.SENT_MOCK, attemptCount: 1, retryLockedAt: null, retryLockedBy: null });
      console.log("SUPPLIER_STATEMENT_RACE_PROOF", JSON.stringify({ claimWinners: first.claimCount + second.claimCount, providerSends: provider.send.mock.calls.length, attachments: sendInput.attachments?.length ?? 0, finalUpdates: finalUpdates.length, winningToken }));
    } finally {
      emailOutbox.updateMany = originalUpdateMany;
    }
  });
});

function assertLocalDatabaseUrl(): void {
  const raw = process.env.DATABASE_URL?.trim() ?? "";
  if (!raw) throw new Error("Set DATABASE_URL to the disposable local PostgreSQL URL.");
  const parsed = new URL(raw);
  if (!/^localhost$|^127\.0\.0\.1$|^::1$/.test(parsed.hostname)) {
    throw new Error("The local PostgreSQL proof refuses non-local DATABASE_URL targets.");
  }
}
