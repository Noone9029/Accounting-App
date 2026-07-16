import { EmailDeliveryStatus, EmailTemplateType, PrismaClient } from "@prisma/client";
import { EmailRetryWorkerService } from "./email-retry-worker.service";

const runLocalDatabaseIntegration = process.env.LEDGERBYTE_RUN_LOCAL_DB_INTEGRATION === "true";

(runLocalDatabaseIntegration ? describe : describe.skip)("EmailRetryWorkerService local PostgreSQL integration", () => {
  const prisma = new PrismaClient();
  const organizationId = process.env.LEDGERBYTE_LOCAL_INTEGRATION_ORGANIZATION_ID ?? "";
  let deliveryId: string;

  beforeAll(async () => {
    if (!organizationId) throw new Error("Set LEDGERBYTE_LOCAL_INTEGRATION_ORGANIZATION_ID to a disposable local organization.");
    await prisma.$connect();
    const created = await prisma.emailOutbox.create({
      data: {
        organizationId,
        toEmail: "local-worker@example.test",
        fromEmail: "no-reply@ledgerbyte.local",
        subject: "Local worker race",
        templateType: EmailTemplateType.TEST_EMAIL,
        bodyText: "Local worker race test",
        status: EmailDeliveryStatus.QUEUED,
        provider: "mock",
        sourceType: "LocalWorkerIntegration",
        sourceId: "local-worker-race",
        maxAttempts: 3,
      },
      select: { id: true },
    });
    deliveryId = created.id;
  });

  afterAll(async () => {
    if (deliveryId) await prisma.emailOutbox.deleteMany({ where: { id: deliveryId, organizationId } });
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
    const documentDelivery = { readAttachmentForWorker: jest.fn() };
    const workerA = new EmailRetryWorkerService(prisma as never, provider as never, documentDelivery as never, config as never);
    const workerB = new EmailRetryWorkerService(prisma as never, provider as never, documentDelivery as never, config as never);

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
