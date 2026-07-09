import {
  DocumentType,
  EmailDeliveryEventStatus,
  EmailDeliveryStatus,
  EmailDeliveryTargetType,
  EmailTemplateType,
  GeneratedDocumentStatus,
} from "@prisma/client";
import { PERMISSIONS } from "@ledgerbyte/shared";
import { EmailService } from "./email.service";

describe("EmailService", () => {
  function makeService(options: { config?: Record<string, string | undefined>; provider?: Partial<ReturnType<typeof makeProvider>> } = {}) {
    const prisma = {
      emailOutbox: {
        create: jest.fn((args: { data: Record<string, unknown>; select: unknown }) => Promise.resolve({ id: "email-1", ...args.data })),
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
        update: jest.fn((args: { data: Record<string, unknown>; where: Record<string, unknown>; select: unknown }) =>
          Promise.resolve({ id: args.where.id, ...args.data }),
        ),
      },
      emailSenderDomainEvidence: {
        create: jest.fn((args: { data: Record<string, unknown>; select: unknown }) =>
          Promise.resolve({ id: "evidence-1", status: "DRAFT", productionReadyContribution: false, createdAt: new Date(), updatedAt: new Date(), ...args.data }),
        ),
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn(),
        update: jest.fn((args: { data: Record<string, unknown>; where: Record<string, unknown>; select: unknown }) =>
          Promise.resolve({ id: args.where.id, status: "VERIFIED", productionReadyContribution: true, createdAt: new Date(), updatedAt: new Date(), ...args.data }),
        ),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      emailProviderEvent: {
        create: jest.fn((args: { data: Record<string, unknown>; select: unknown }) =>
          Promise.resolve({ id: "event-1", createdAt: new Date("2026-05-15T00:00:00.000Z"), receivedAt: new Date("2026-05-15T00:00:00.000Z"), ...args.data }),
        ),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
      emailDeliveryEvent: {
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn((args: { data: Record<string, unknown>; select: unknown }) =>
          Promise.resolve({ id: "delivery-event-1", createdAt: new Date("2026-05-15T00:00:00.000Z"), ...args.data }),
        ),
      },
      emailSuppression: {
        create: jest.fn((args: { data: Record<string, unknown>; select: unknown }) =>
          Promise.resolve({ id: "suppression-1", active: true, createdAt: new Date("2026-05-15T00:00:00.000Z"), updatedAt: new Date("2026-05-15T00:00:00.000Z"), ...args.data }),
        ),
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue(null),
        count: jest.fn().mockResolvedValue(0),
        update: jest.fn((args: { data: Record<string, unknown>; where: Record<string, unknown>; select: unknown }) =>
          Promise.resolve({ id: args.where.id, active: false, updatedAt: new Date("2026-05-15T00:00:00.000Z"), ...args.data }),
        ),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      emailDeliveryMonitoringEvidence: {
        create: jest.fn((args: { data: Record<string, unknown>; select: unknown }) =>
          Promise.resolve({
            id: "monitoring-evidence-1",
            status: "DRAFT",
            productionReadyContribution: false,
            createdAt: new Date("2026-05-15T00:00:00.000Z"),
            updatedAt: new Date("2026-05-15T00:00:00.000Z"),
            ...args.data,
          }),
        ),
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn(),
        update: jest.fn((args: { data: Record<string, unknown>; where: Record<string, unknown>; select: unknown }) =>
          Promise.resolve({
            id: args.where.id,
            status: "VERIFIED",
            productionReadyContribution: true,
            createdAt: new Date("2026-05-15T00:00:00.000Z"),
            updatedAt: new Date("2026-05-15T00:00:00.000Z"),
            ...args.data,
          }),
        ),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      generatedDocument: {
        findFirst: jest.fn(),
      },
      purchaseOrder: {
        findFirst: jest.fn(),
      },
      purchaseBill: {
        findFirst: jest.fn(),
      },
      supplierPayment: {
        findFirst: jest.fn(),
      },
      supplierRefund: {
        findFirst: jest.fn(),
      },
      purchaseDebitNote: {
        findFirst: jest.fn(),
      },
      cashExpense: {
        findFirst: jest.fn(),
      },
    };
    const audit = { log: jest.fn().mockResolvedValue({ id: "audit-1" }) };
    const configValues: Record<string, string | undefined> = { EMAIL_FROM: "noreply@example.test", ...options.config };
    const config = { get: jest.fn((key: string) => configValues[key]) };
    const provider = {
      ...makeProvider(),
      ...options.provider,
    };
    return { service: new EmailService(prisma as never, config as never, provider, audit as never), prisma, provider, audit };
  }

  function makeProvider() {
    return {
      provider: "mock",
      isMock: true,
      send: jest.fn().mockResolvedValue({ provider: "mock", status: EmailDeliveryStatus.SENT_MOCK, sentAt: new Date("2026-05-15T00:00:00.000Z") }),
      readiness: jest.fn().mockReturnValue({
        provider: "mock",
        ready: true,
        blockingReasons: [],
        warnings: ["Mock email provider is active. No real email will be sent."],
        smtp: {
          hostConfigured: false,
          portConfigured: false,
          userConfigured: false,
          passwordConfigured: false,
          secureModeConfigured: false,
          secure: false,
        },
        mockMode: true,
        realSendingEnabled: false,
      }),
    };
  }

  it("stores organization invite emails in the outbox", async () => {
    const { service, prisma, provider } = makeService();

    await service.sendOrganizationInvite({
      organizationId: "org-1",
      toEmail: "invite@example.com",
      organizationName: "Demo Org",
      roleName: "Viewer",
      acceptUrl: "http://web.test/invite/accept?token=mock",
    });

    expect(provider.send).toHaveBeenCalledWith(expect.objectContaining({ templateType: EmailTemplateType.ORGANIZATION_INVITE }));
    expect(prisma.emailOutbox.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: "org-1",
          toEmail: "invite@example.com",
          fromEmail: "noreply@example.test",
          status: EmailDeliveryStatus.SENT_MOCK,
          provider: "mock",
        }),
      }),
    );
  });

  it("stores test-send emails through the active provider", async () => {
    const { service, prisma, provider } = makeService();

    await service.sendTestEmail({
      organizationId: "org-1",
      toEmail: "ops@example.com",
    });

    expect(provider.send).toHaveBeenCalledWith(
      expect.objectContaining({
        templateType: EmailTemplateType.TEST_EMAIL,
        toEmail: "ops@example.com",
        fromEmail: "noreply@example.test",
      }),
    );
    expect(prisma.emailOutbox.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: "org-1",
          toEmail: "ops@example.com",
          templateType: EmailTemplateType.TEST_EMAIL,
          status: EmailDeliveryStatus.SENT_MOCK,
          provider: "mock",
        }),
      }),
    );
  });

  it("tenant-scopes outbox list and detail", async () => {
    const { service, prisma } = makeService();
    prisma.emailOutbox.findFirst.mockResolvedValue({ id: "email-1", organizationId: "org-1" });

    await service.list("org-1");
    await service.get("org-1", "email-1");

    expect(prisma.emailOutbox.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { organizationId: "org-1" } }));
    expect(prisma.emailOutbox.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "email-1", organizationId: "org-1" } }));
  });

  it("returns provider readiness without secrets", async () => {
    const { service } = makeService({
      config: {
        EMAIL_REPLY_TO: "support@example.test",
        SMTP_HOST: "smtp.internal.example",
        SMTP_USER: "smtp-user-secret",
        SMTP_PASSWORD: "xpw",
        API_KEY: "api-key-secret",
      },
    });

    const readiness = await service.readiness("org-1");

    expect(readiness).toEqual(
      expect.objectContaining({
        provider: "mock",
        ready: true,
        localOnly: true,
        noCustomerEmailSent: true,
        readOnly: true,
        noMutation: true,
        providerConfigured: true,
        fromAddressConfigured: true,
        replyToConfigured: true,
        smtpHostConfigured: false,
        smtpPortConfigured: false,
        smtpSecureModeConfigured: false,
        credentialsConfigured: false,
        productionReady: false,
        fromEmail: "noreply@example.test",
        realSendingEnabled: false,
      }),
    );
    expect(readiness.redactionGuarantees.length).toBeGreaterThan(0);
    const serialized = JSON.stringify(readiness);
    expect(serialized).not.toContain("smtp.internal.example");
    expect(serialized).not.toContain("smtp-user-secret");
    expect(serialized).not.toContain("xpw");
    expect(serialized).not.toContain("api-key-secret");
    expect(serialized).not.toContain("SMTP_PASSWORD");
  });

  it("keeps invoice/payment email delivery disabled by default", async () => {
    const { service, prisma, provider } = makeService();

    const readiness = await service.invoicePaymentReadiness("org-1");

    expect(readiness).toEqual(
      expect.objectContaining({
        providerState: "NONE",
        status: "Disabled",
        sendEnabled: false,
        actualSendBlocked: true,
        noProviderCalls: true,
        noCredentialsStored: true,
        noCustomerEmailSent: true,
        previewEnabled: false,
      }),
    );
    expect(readiness.supportedTemplates.map((template) => template.templateType)).toEqual(
      expect.arrayContaining([
        EmailTemplateType.SALES_INVOICE,
        EmailTemplateType.INVOICE_PAYMENT_LINK,
        EmailTemplateType.PAYMENT_RECEIPT,
        EmailTemplateType.FAILED_DELIVERY_NOTIFICATION,
      ]),
    );
    expect(provider.send).not.toHaveBeenCalled();
    expect(prisma.emailDeliveryEvent.create).not.toHaveBeenCalled();
  });

  it("renders local invoice/payment previews with fake data and requestId in the delivery event", async () => {
    const { service, prisma, provider, audit } = makeService({
      config: {
        LEDGERBYTE_INVOICE_PAYMENT_EMAIL_PROVIDER: "MOCK_EMAIL",
      },
    });

    const preview = await service.previewInvoicePaymentEmail(
      "org-1",
      "user-1",
      {
        templateType: EmailTemplateType.INVOICE_PAYMENT_LINK,
        targetType: EmailDeliveryTargetType.INVOICE_PAYMENT_LINK,
        targetId: "11111111-1111-4111-8111-111111111111",
      },
      "req_email_preview_1",
    );

    expect(preview).toEqual(
      expect.objectContaining({
        localOnly: true,
        noEmailSent: true,
        providerCalled: false,
        fakeDataOnly: true,
        redactedRecipient: "p***@example.test",
        requestId: "req_email_preview_1",
      }),
    );
    expect(preview.preview.subject).toContain("Payment link");
    expect(JSON.stringify(preview)).not.toContain("customer@example.com");
    expect(provider.send).not.toHaveBeenCalled();
    expect(prisma.emailDeliveryEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: "org-1",
          status: EmailDeliveryEventStatus.PREVIEWED,
          templateType: EmailTemplateType.INVOICE_PAYMENT_LINK,
          targetType: EmailDeliveryTargetType.INVOICE_PAYMENT_LINK,
          targetId: "11111111-1111-4111-8111-111111111111",
          redactedRecipient: "p***@example.test",
          providerState: "MOCK_EMAIL",
          requestId: "req_email_preview_1",
        }),
      }),
    );
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: "EMAIL_DELIVERY_PREVIEWED" }));
  });

  it("blocks invoice/payment delivery attempts without provider calls", async () => {
    const { service, prisma, provider, audit } = makeService({
      config: {
        LEDGERBYTE_INVOICE_PAYMENT_EMAIL_PROVIDER: "FUTURE_SMTP_OR_PROVIDER",
      },
    });

    const result = await service.blockInvoicePaymentDelivery(
      "org-1",
      "user-1",
      {
        templateType: EmailTemplateType.SALES_INVOICE,
        targetType: EmailDeliveryTargetType.SALES_INVOICE,
      },
      "req_email_block_1",
    );

    expect(result).toEqual(
      expect.objectContaining({
        status: "BLOCKED",
        actualSendBlocked: true,
        noEmailSent: true,
        providerCalled: false,
        noProviderCalls: true,
        noCustomerEmailSent: true,
        requestId: "req_email_block_1",
      }),
    );
    expect(provider.send).not.toHaveBeenCalled();
    expect(prisma.emailOutbox.create).not.toHaveBeenCalled();
    expect(prisma.emailDeliveryEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: EmailDeliveryEventStatus.BLOCKED,
          templateType: EmailTemplateType.SALES_INVOICE,
          targetType: EmailDeliveryTargetType.SALES_INVOICE,
          redactedRecipient: "p***@example.test",
          providerState: "FUTURE_SMTP_OR_PROVIDER",
          requestId: "req_email_block_1",
        }),
      }),
    );
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: "EMAIL_DELIVERY_BLOCKED" }));
  });

  it("rejects invoice/payment previews unless local mock mode is explicitly configured", async () => {
    const { service, prisma, provider } = makeService();

    await expect(
      service.previewInvoicePaymentEmail("org-1", "user-1", {
        templateType: EmailTemplateType.SALES_INVOICE,
        targetType: EmailDeliveryTargetType.SALES_INVOICE,
      }),
    ).rejects.toThrow("MOCK_EMAIL");

    expect(provider.send).not.toHaveBeenCalled();
    expect(prisma.emailDeliveryEvent.create).not.toHaveBeenCalled();
  });

  it("returns production SMTP readiness blockers without sending email", async () => {
    const provider = makeProvider();
    provider.readiness.mockReturnValue({
      provider: "smtp",
      ready: false,
      blockingReasons: ["SMTP host is required when SMTP delivery is enabled."],
      warnings: [],
      smtp: {
        hostConfigured: false,
        portConfigured: true,
        userConfigured: true,
        passwordConfigured: true,
        secure: false,
        secureModeConfigured: true,
      },
      mockMode: false,
      realSendingEnabled: false,
    });
    const { service, prisma } = makeService({
      config: {
        EMAIL_PROVIDER: "smtp",
        EMAIL_FROM: "",
        SMTP_USER: "smtp-user-secret",
        SMTP_PASSWORD: "xpw",
        SMTP_SECURE: "false",
      },
      provider,
    });

    const readiness = await service.readiness("org-1");

    expect(readiness.productionReady).toBe(false);
    expect(readiness.noCustomerEmailSent).toBe(true);
    expect(readiness.blockers).toEqual(
      expect.arrayContaining([
        "SMTP host is required when SMTP delivery is enabled.",
        "Email from address must be configured for production delivery.",
        "Email reply-to address should be configured for production support workflows.",
      ]),
    );
    expect(provider.send).not.toHaveBeenCalled();
    expect(prisma.emailOutbox.create).not.toHaveBeenCalled();
    expect(JSON.stringify(readiness)).not.toContain("xpw");
  });

  it("reports missing sender-domain evidence without sending email", async () => {
    const { service, prisma, provider } = makeService();

    const readiness = await service.readiness("org-1");

    expect(readiness.senderDomain).toEqual(
      expect.objectContaining({
        fromDomain: "example.test",
        replyToDomain: null,
        evidenceRequired: true,
        requiredEvidenceTypes: ["SPF", "DKIM", "DMARC"],
        verifiedEvidenceTypes: [],
        missingEvidenceTypes: ["SPF", "DKIM", "DMARC"],
        evidenceStatus: "BLOCKED",
        productionReadyContribution: false,
      }),
    );
    expect(readiness.productionReady).toBe(false);
    expect(readiness.blockers).toEqual(expect.arrayContaining(["Sender domain SPF/DKIM/DMARC evidence is required before production email delivery."]));
    expect(provider.send).not.toHaveBeenCalled();
    expect(prisma.emailOutbox.create).not.toHaveBeenCalled();
    expect(prisma.emailSenderDomainEvidence.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { organizationId: "org-1" } }));
  });

  it("creates sender-domain evidence as metadata only and audits it", async () => {
    const { service, prisma, provider, audit } = makeService();

    await service.createSenderDomainEvidence("org-1", "user-1", {
      domain: "Example.Test",
      evidenceType: "SPF",
      provider: "mailtrap",
      evidenceSummaryJson: { recordObserved: true, reviewedBy: "ops" },
      note: "Manual non-production relay evidence.",
    });

    expect(prisma.emailSenderDomainEvidence.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: "org-1",
          createdById: "user-1",
          domain: "example.test",
          evidenceType: "SPF",
          provider: "mailtrap",
          status: "DRAFT",
          productionReadyContribution: false,
        }),
      }),
    );
    expect(provider.send).not.toHaveBeenCalled();
    expect(prisma.emailOutbox.create).not.toHaveBeenCalled();
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: "EMAIL_SENDER_DOMAIN_EVIDENCE_CREATED" }));
  });

  it("rejects sender-domain evidence that contains private keys or provider secrets", async () => {
    const { service, prisma } = makeService();

    await expect(
      service.createSenderDomainEvidence("org-1", "user-1", {
        domain: "example.test",
        evidenceType: "DKIM",
        evidenceSummaryJson: { dkimPrivateKey: "-----BEGIN PRIVATE KEY-----\nsecret\n-----END PRIVATE KEY-----" },
      }),
    ).rejects.toThrow("Email sender-domain evidence must not contain secrets.");

    await expect(
      service.createSenderDomainEvidence("org-1", "user-1", {
        domain: "example.test",
        evidenceType: "PROVIDER_VERIFICATION",
        evidenceSummaryJson: { apiKey: "sk_test_secret" },
      }),
    ).rejects.toThrow("Email sender-domain evidence must not contain secrets.");

    await expect(
      service.createSenderDomainEvidence("org-1", "user-1", {
        domain: "example.test",
        evidenceType: "PROVIDER_VERIFICATION",
        evidenceSummaryJson: { smtpPassword: "xpw", token: "xtok" },
      }),
    ).rejects.toThrow("Email sender-domain evidence must not contain secrets.");

    expect(prisma.emailSenderDomainEvidence.create).not.toHaveBeenCalled();
  });

  it("uses verified SPF/DKIM/DMARC evidence for sender-domain review but keeps production readiness blocked by relay gaps", async () => {
    const { service, prisma, provider } = makeService({
      config: {
        EMAIL_PROVIDER: "smtp",
        EMAIL_FROM: "no-reply@example.test",
        EMAIL_REPLY_TO: "support@example.test",
        SMTP_HOST: "smtp.example.test",
        SMTP_PORT: "587",
        SMTP_USER: "smtp-user-secret",
        SMTP_PASSWORD: "xpw",
        SMTP_SECURE: "true",
      },
      provider: {
        provider: "smtp",
        isMock: false,
        readiness: jest.fn().mockReturnValue({
          provider: "smtp",
          ready: true,
          blockingReasons: [],
          warnings: [],
          smtp: {
            hostConfigured: true,
            portConfigured: true,
            userConfigured: true,
            passwordConfigured: true,
            secureModeConfigured: true,
            secure: true,
          },
          mockMode: false,
          realSendingEnabled: true,
        }),
      },
    });
    prisma.emailSenderDomainEvidence.findMany.mockResolvedValue([
      { id: "spf-1", organizationId: "org-1", domain: "example.test", status: "VERIFIED", evidenceType: "SPF", productionReadyContribution: true },
      { id: "dkim-1", organizationId: "org-1", domain: "example.test", status: "VERIFIED", evidenceType: "DKIM", productionReadyContribution: true },
      { id: "dmarc-1", organizationId: "org-1", domain: "example.test", status: "VERIFIED", evidenceType: "DMARC", productionReadyContribution: true },
    ]);

    const readiness = await service.readiness("org-1");

    expect(readiness.senderDomain).toEqual(
      expect.objectContaining({
        evidenceStatus: "READY_FOR_REVIEW",
        verifiedEvidenceTypes: ["SPF", "DKIM", "DMARC"],
        missingEvidenceTypes: [],
        productionReadyContribution: true,
      }),
    );
    expect(readiness.relayDiagnosticsRequired).toBe(true);
    expect(readiness.relayDiagnosticsStatus).toBe("SKIPPED_DISABLED");
    expect(readiness.bounceWebhookConfigured).toBe(false);
    expect(readiness.retryPolicyConfigured).toBe(true);
    expect(readiness.retryProcessorEnabled).toBe(false);
    expect(readiness.monitoringConfigured).toBe(false);
    expect(readiness.productionReady).toBe(false);
    expect(readiness.blockers).toEqual(
      expect.arrayContaining([
        "Non-production relay diagnostics must be completed before production email delivery is considered ready.",
        "Bounce webhook handling is not configured.",
        "Email retry processor is disabled by default.",
        "Provider event ingestion is mock-only and unsigned.",
        "Email monitoring is not configured.",
      ]),
    );
    expect(provider.send).not.toHaveBeenCalled();
    expect(JSON.stringify(readiness)).not.toContain("xpw");
  });

  it("builds a retry plan without sending email or mutating outbox", async () => {
    const { service, prisma, provider } = makeService();
    prisma.emailOutbox.count
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(1);

    const plan = await service.retryPlan("org-1");

    expect(plan).toEqual(
      expect.objectContaining({
        readOnly: true,
        noMutation: true,
        noCustomerEmailSent: true,
        executionEnabled: false,
        retryWorkerConfigured: false,
        pendingCount: 2,
        failedRetryableCount: 1,
        blockedCount: 3,
        nextAttemptCount: 1,
        productionReadyContribution: false,
      }),
    );
    expect(provider.send).not.toHaveBeenCalled();
    expect(prisma.emailOutbox.create).not.toHaveBeenCalled();
    expect(prisma.emailOutbox.update).not.toHaveBeenCalled();
  });

  it("builds a scheduled retry worker plan without sending email or mutating data", async () => {
    const { service, prisma, provider } = makeService();
    prisma.emailOutbox.count
      .mockResolvedValueOnce(4)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(1);
    prisma.emailSuppression.count.mockResolvedValue(5);

    const plan = await (service as any).retryWorkerPlan("org-1");

    expect(plan).toEqual(
      expect.objectContaining({
        readOnly: true,
        noMutation: true,
        noCustomerEmailSent: true,
        workerConfigured: false,
        workerEnabled: false,
        schedulerProvider: "NONE",
        retryProcessorEnabled: false,
        pendingCount: 4,
        dueRetryCount: 2,
        suppressedCount: 1,
        activeSuppressionCount: 5,
        productionReadyContribution: false,
      }),
    );
    expect(plan.recommendedSchedule).toContain("5 minutes");
    expect(provider.send).not.toHaveBeenCalled();
    expect(prisma.emailOutbox.create).not.toHaveBeenCalled();
    expect(prisma.emailOutbox.update).not.toHaveBeenCalled();
  });

  it("skips retry worker runs by default without sending or mutating", async () => {
    const { service, prisma, provider } = makeService();

    const result = await (service as any).retryWorkerRun("org-1", "user-1", { limit: 5 });

    expect(result).toEqual(
      expect.objectContaining({
        status: "SKIPPED_DISABLED",
        executionEnabled: false,
        executionAttempted: false,
        noEmailSent: true,
        noCustomerEmailSent: true,
        noMutation: true,
      }),
    );
    expect(provider.send).not.toHaveBeenCalled();
    expect(prisma.emailOutbox.update).not.toHaveBeenCalled();
  });

  it("runs retry worker through the retry processor gate and respects suppressions when explicitly enabled", async () => {
    const { service, prisma, provider } = makeService({
      config: {
        LEDGERBYTE_EMAIL_RETRY_WORKER_ENABLED: "true",
        LEDGERBYTE_EMAIL_RETRY_PROCESSOR_ENABLED: "true",
      },
    });
    prisma.emailSuppression.findFirst.mockResolvedValue({
      id: "suppression-1",
      organizationId: "org-1",
      emailMasked: "c***@example.com",
      active: true,
    });
    prisma.emailOutbox.findMany.mockResolvedValue([
      {
        id: "email-retry-1",
        organizationId: "org-1",
        toEmail: "customer@example.com",
        fromEmail: "noreply@example.test",
        subject: "Password reset",
        templateType: EmailTemplateType.PASSWORD_RESET,
        bodyText: "Reset body",
        bodyHtml: null,
        status: EmailDeliveryStatus.FAILED,
        provider: "smtp",
        attemptCount: 1,
        maxAttempts: 3,
        nextAttemptAt: null,
        bouncedAt: null,
        complainedAt: null,
      },
    ]);

    const result = await (service as any).retryWorkerRun("org-1", "user-1", { limit: 1 });

    expect(result).toEqual(
      expect.objectContaining({
        status: "ATTEMPTED",
        executionEnabled: true,
        executionAttempted: true,
        noOutboxRecordCreated: true,
        noCustomerEmailSentByDefault: true,
        suppressedCount: 1,
      }),
    );
    expect(provider.send).not.toHaveBeenCalled();
    expect(prisma.emailOutbox.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "email-retry-1" },
        data: expect.objectContaining({ providerEventStatus: "SUPPRESSED" }),
      }),
    );
  });

  it("builds a monitoring plan with missing evidence and false readiness", async () => {
    const { service, prisma, provider } = makeService();

    const plan = await (service as any).monitoringPlan("org-1");

    expect(plan).toEqual(
      expect.objectContaining({
        readOnly: true,
        noMutation: true,
        monitoringConfigured: false,
        alertingConfigured: false,
        retryThroughputMonitoringConfigured: false,
        bounceAlertThresholdConfigured: false,
        complaintAlertThresholdConfigured: false,
        suppressionTrendMonitoringConfigured: false,
        providerWebhookHealthMonitoringConfigured: false,
        productionReadyContribution: false,
        evidenceStatus: "BLOCKED",
      }),
    );
    expect(plan.missingEvidenceTypes).toEqual(
      expect.arrayContaining(["RETRY_WORKER", "BOUNCE_ALERTS", "COMPLAINT_ALERTS", "SUPPRESSION_TRENDS", "DELIVERY_DASHBOARD", "PROVIDER_WEBHOOK_HEALTH"]),
    );
    expect(provider.send).not.toHaveBeenCalled();
    expect(prisma.emailDeliveryMonitoringEvidence.create).not.toHaveBeenCalled();
  });

  it("stores monitoring evidence as metadata only and rejects secrets or customer recipients", async () => {
    const { service, prisma, provider, audit } = makeService();

    await expect(
      (service as any).createMonitoringEvidence("org-1", "user-1", {
        evidenceType: "BOUNCE_ALERTS",
        evidenceSummaryJson: { webhookSecret: "webhook-secret-value" },
      }),
    ).rejects.toThrow("Email delivery monitoring evidence must not contain secrets or customer email content.");

    await expect(
      (service as any).createMonitoringEvidence("org-1", "user-1", {
        evidenceType: "SUPPRESSION_TRENDS",
        evidenceSummaryJson: { recipients: ["customer@example.com"] },
      }),
    ).rejects.toThrow("Email delivery monitoring evidence must not contain secrets or customer email content.");

    const created = await (service as any).createMonitoringEvidence("org-1", "user-1", {
      evidenceType: "RETRY_WORKER",
      provider: "internal",
      evidenceSummaryJson: { dashboard: "Retry throughput panel reviewed", sampleWindow: "24h" },
      note: "Metadata-only monitoring evidence.",
    });

    expect(created).toEqual(expect.objectContaining({ metadataOnly: true, noEmailSent: true, evidence: expect.objectContaining({ evidenceType: "RETRY_WORKER" }) }));
    expect(prisma.emailDeliveryMonitoringEvidence.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: "org-1",
          createdById: "user-1",
          evidenceType: "RETRY_WORKER",
          status: "DRAFT",
          productionReadyContribution: false,
        }),
      }),
    );
    expect(provider.send).not.toHaveBeenCalled();
    expect(prisma.emailOutbox.update).not.toHaveBeenCalled();
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: "EMAIL_DELIVERY_MONITORING_EVIDENCE_CREATED" }));
  });

  it("uses verified monitoring evidence for monitoring status without making production email ready alone", async () => {
    const { service, prisma } = makeService();
    prisma.emailDeliveryMonitoringEvidence.findMany.mockResolvedValue([
      { evidenceType: "RETRY_WORKER", status: "VERIFIED", productionReadyContribution: true },
      { evidenceType: "BOUNCE_ALERTS", status: "VERIFIED", productionReadyContribution: true },
      { evidenceType: "COMPLAINT_ALERTS", status: "VERIFIED", productionReadyContribution: true },
      { evidenceType: "SUPPRESSION_TRENDS", status: "VERIFIED", productionReadyContribution: true },
      { evidenceType: "DELIVERY_DASHBOARD", status: "VERIFIED", productionReadyContribution: true },
      { evidenceType: "PROVIDER_WEBHOOK_HEALTH", status: "VERIFIED", productionReadyContribution: true },
    ]);

    const plan = await (service as any).monitoringPlan("org-1");
    const readiness = await service.readiness("org-1");

    expect(plan).toEqual(
      expect.objectContaining({
        evidenceStatus: "READY_FOR_REVIEW",
        monitoringConfigured: true,
        alertingConfigured: true,
        productionReadyContribution: true,
        missingEvidenceTypes: [],
      }),
    );
    expect(readiness).toEqual(
      expect.objectContaining({
        monitoringEvidenceStatus: "READY_FOR_REVIEW",
        retryThroughputMonitoringConfigured: true,
        suppressionTrendMonitoringConfigured: true,
        providerWebhookHealthMonitoringConfigured: true,
        bounceAlertThresholdConfigured: true,
        complaintAlertThresholdConfigured: true,
        productionReady: false,
      }),
    );
  });

  it("skips retry processing by default without sending or mutating", async () => {
    const { service, prisma, provider } = makeService();

    const result = await service.retryProcess("org-1", "user-1", { limit: 5 });

    expect(result).toEqual(
      expect.objectContaining({
        status: "SKIPPED_DISABLED",
        executionEnabled: false,
        executionAttempted: false,
        noEmailSent: true,
        noCustomerEmailSent: true,
        noMutation: true,
      }),
    );
    expect(provider.send).not.toHaveBeenCalled();
    expect(prisma.emailOutbox.update).not.toHaveBeenCalled();
  });

  it("processes retryable outbox records when enabled and redacts provider errors", async () => {
    const { service, prisma, provider, audit } = makeService({
      config: {
        LEDGERBYTE_EMAIL_RETRY_PROCESSOR_ENABLED: "true",
      },
    });
    prisma.emailOutbox.findMany.mockResolvedValue([
      {
        id: "email-retry-1",
        organizationId: "org-1",
        toEmail: "customer@example.com",
        fromEmail: "noreply@example.test",
        subject: "Password reset",
        templateType: EmailTemplateType.PASSWORD_RESET,
        bodyText: "Reset body",
        bodyHtml: null,
        status: EmailDeliveryStatus.FAILED,
        provider: "smtp",
        attemptCount: 1,
        maxAttempts: 3,
        nextAttemptAt: null,
        bouncedAt: null,
        complainedAt: null,
      },
    ]);
    provider.send.mockResolvedValue({
      provider: "smtp",
      status: EmailDeliveryStatus.FAILED,
      errorMessage: "password=xpw Authorization: Bearer abc123",
      providerMessageId: "smtp-message-2",
      sentAt: null,
    });

    const result = await service.retryProcess("org-1", "user-1", { limit: 5 });

    expect(provider.send).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-1",
        toEmail: "customer@example.com",
        templateType: EmailTemplateType.PASSWORD_RESET,
        bodyText: "Reset body",
      }),
    );
    expect(prisma.emailOutbox.create).not.toHaveBeenCalled();
    expect(prisma.emailOutbox.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "email-retry-1" },
        data: expect.objectContaining({
          attemptCount: 2,
          lastErrorRedacted: expect.not.stringContaining("xpw"),
          errorMessage: expect.not.stringContaining("Bearer abc123"),
          retryLockedAt: null,
          retryLockedBy: null,
        }),
      }),
    );
    expect(result).toEqual(expect.objectContaining({ status: "ATTEMPTED", attemptedCount: 1, sentCount: 0, failedCount: 1 }));
    expect(JSON.stringify(result)).not.toContain("xpw");
    expect(JSON.stringify(result)).not.toContain("Bearer abc123");
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: "EMAIL_RETRY_ATTEMPTED" }));
  });

  it("does not retry records that reached max attempts", async () => {
    const { service, prisma, provider } = makeService({
      config: {
        LEDGERBYTE_EMAIL_RETRY_PROCESSOR_ENABLED: "true",
      },
    });
    prisma.emailOutbox.findMany.mockResolvedValue([
      {
        id: "email-retry-1",
        organizationId: "org-1",
        attemptCount: 3,
        maxAttempts: 3,
        nextAttemptAt: null,
        bouncedAt: null,
        complainedAt: null,
      },
    ]);

    const result = await service.retryProcess("org-1", "user-1", { limit: 5 });

    expect(result).toEqual(expect.objectContaining({ status: "ATTEMPTED", attemptedCount: 0, blockedCount: 1 }));
    expect(provider.send).not.toHaveBeenCalled();
    expect(prisma.emailOutbox.update).not.toHaveBeenCalled();
  });

  it("rejects mock provider events that include secrets or customer message content", async () => {
    const { service, prisma } = makeService();

    await expect(
      service.receiveMockProviderEvent("org-1", "user-1", {
        provider: "mailtrap",
        eventType: "BOUNCED",
        providerMessageId: "provider-message-1",
        payloadSummaryJson: { authorization: "Bearer provider-token" },
      }),
    ).rejects.toThrow("Email provider event payload must not contain secrets or customer email content.");

    await expect(
      service.receiveMockProviderEvent("org-1", "user-1", {
        provider: "mailtrap",
        eventType: "BOUNCED",
        payloadSummaryJson: { bodyText: "Customer message body" },
      }),
    ).rejects.toThrow("Email provider event payload must not contain secrets or customer email content.");

    expect(prisma.emailProviderEvent.create).not.toHaveBeenCalled();
  });

  it("stores unsigned mock provider events without making production monitoring ready", async () => {
    const { service, prisma, provider, audit } = makeService();
    prisma.emailOutbox.findFirst.mockResolvedValue({ id: "email-1", organizationId: "org-1" });

    const event = await service.receiveMockProviderEvent("org-1", "user-1", {
      provider: "mailtrap",
      eventType: "BOUNCED",
      providerMessageId: "provider-message-secret",
      emailOutboxId: "email-1",
      payloadSummaryJson: { event: "bounced", reason: "mailbox unavailable" },
    });

    expect(event).toEqual(
      expect.objectContaining({
        metadataOnly: true,
        noEmailSent: true,
        noCustomerEmail: true,
        noOutboxRecordCreated: true,
        signatureVerified: false,
        productionReadyContribution: false,
      }),
    );
    expect(prisma.emailProviderEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: "org-1",
          emailOutboxId: "email-1",
          eventType: "BOUNCED",
          providerMessageIdRedacted: "present",
          signatureVerified: false,
          productionReadyContribution: false,
        }),
      }),
    );
    expect(prisma.emailOutbox.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "email-1" },
        data: expect.objectContaining({
          providerEventStatus: "BOUNCED",
          bouncedAt: expect.any(Date),
        }),
      }),
    );
    expect(provider.send).not.toHaveBeenCalled();
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: "EMAIL_PROVIDER_EVENT_RECEIVED" }));
  });

  it("builds a signed webhook plan without mutating data or exposing secrets", async () => {
    const { service, prisma, provider } = makeService({
      config: {
        EMAIL_PROVIDER_WEBHOOK_VERIFICATION_ENABLED: "true",
        EMAIL_PROVIDER_WEBHOOK_SECRET: "webhook-secret-value",
        EMAIL_PROVIDER_WEBHOOK_ALLOWED_PROVIDERS: "mailtrap",
      },
    });

    const plan = await (service as any).providerWebhookPlan("org-1");

    expect(plan).toEqual(
      expect.objectContaining({
        readOnly: true,
        noMutation: true,
        noCustomerEmailSent: true,
        webhookVerificationEnabled: true,
        webhookSecretConfigured: true,
        allowedProvidersConfigured: true,
        productionReadyContribution: false,
      }),
    );
    expect(JSON.stringify(plan)).not.toContain("webhook-secret-value");
    expect(provider.send).not.toHaveBeenCalled();
    expect(prisma.emailProviderEvent.create).not.toHaveBeenCalled();
    expect(prisma.emailSuppression.create).not.toHaveBeenCalled();
  });

  it("rejects unsigned and invalid signed provider webhooks without persistence", async () => {
    const disabled = makeService();

    await expect(
      (disabled.service as any).receiveSignedProviderWebhook("org-1", "user-1", {
        provider: "mailtrap",
        eventType: "BOUNCED",
        recipientEmail: "customer@example.com",
        payloadSummaryJson: { event: "bounced" },
      }),
    ).resolves.toEqual(expect.objectContaining({ status: "REJECTED_UNVERIFIED", noEmailSent: true, noMutation: true }));
    expect(disabled.prisma.emailProviderEvent.create).not.toHaveBeenCalled();
    expect(disabled.prisma.emailSuppression.create).not.toHaveBeenCalled();

    const enabled = makeService({
      config: {
        EMAIL_PROVIDER_WEBHOOK_VERIFICATION_ENABLED: "true",
        EMAIL_PROVIDER_WEBHOOK_SECRET: "webhook-secret-value",
        EMAIL_PROVIDER_WEBHOOK_ALLOWED_PROVIDERS: "mailtrap",
      },
    });

    await expect(
      (enabled.service as any).receiveSignedProviderWebhook("org-1", "user-1", {
        provider: "mailtrap",
        eventType: "BOUNCED",
        recipientEmail: "customer@example.com",
        signature: "invalid",
        payloadSummaryJson: { event: "bounced" },
      }),
    ).rejects.toThrow("Email provider webhook signature is invalid.");
    expect(enabled.prisma.emailProviderEvent.create).not.toHaveBeenCalled();
    expect(enabled.prisma.emailSuppression.create).not.toHaveBeenCalled();
  });

  it("stores verified webhook events as redacted metadata and creates bounce suppressions", async () => {
    const { service, prisma, provider, audit } = makeService({
      config: {
        EMAIL_PROVIDER_WEBHOOK_VERIFICATION_ENABLED: "true",
        EMAIL_PROVIDER_WEBHOOK_SECRET: "webhook-secret-value",
        EMAIL_PROVIDER_WEBHOOK_ALLOWED_PROVIDERS: "mailtrap",
      },
    });
    prisma.emailOutbox.findFirst.mockResolvedValue({ id: "email-1", organizationId: "org-1", toEmail: "customer@example.com" });
    const dto = {
      provider: "mailtrap",
      eventType: "BOUNCED",
      providerMessageId: "provider-message-1",
      emailOutboxId: "email-1",
      recipientEmail: "customer@example.com",
      payloadSummaryJson: { event: "bounced", reason: "mailbox unavailable" },
    };
    const signature = (service as any).buildProviderWebhookTestSignature(dto);

    const result = await (service as any).receiveSignedProviderWebhook("org-1", "user-1", { ...dto, signature });

    expect(result).toEqual(
      expect.objectContaining({
        metadataOnly: true,
        noEmailSent: true,
        noCustomerEmail: true,
        signatureVerified: true,
        productionReadyContribution: true,
        suppression: expect.objectContaining({
          emailMasked: "c***@example.com",
          active: true,
        }),
      }),
    );
    expect(prisma.emailProviderEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: "org-1",
          eventType: "BOUNCED",
          providerMessageIdRedacted: "present",
          signatureVerified: true,
          productionReadyContribution: true,
        }),
      }),
    );
    expect(prisma.emailSuppression.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: "org-1",
          emailMasked: "c***@example.com",
          reason: "BOUNCE",
          active: true,
        }),
      }),
    );
    expect(JSON.stringify(result)).not.toContain("customer@example.com");
    expect(JSON.stringify(result)).not.toContain("webhook-secret-value");
    expect(provider.send).not.toHaveBeenCalled();
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: "EMAIL_PROVIDER_EVENT_RECEIVED" }));
  });

  it("stores manual suppressions as masked/hash metadata and revokes them", async () => {
    const { service, prisma, audit } = makeService();
    prisma.emailSuppression.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({
      id: "suppression-1",
      organizationId: "org-1",
      emailHash: "hash",
      emailMasked: "c***@example.com",
      reason: "MANUAL",
      sourceProvider: null,
      providerEventId: null,
      active: true,
      createdById: "user-1",
      revokedById: null,
      revokedAt: null,
      note: "Do not contact",
      createdAt: new Date("2026-05-15T00:00:00.000Z"),
      updatedAt: new Date("2026-05-15T00:00:00.000Z"),
    });

    const created = await (service as any).createSuppression("org-1", "user-1", {
      email: "customer@example.com",
      reason: "MANUAL",
      note: "Do not contact",
    });
    const revoked = await (service as any).revokeSuppression("org-1", "user-1", "suppression-1", { note: "reviewed" });

    expect(created).toEqual(
      expect.objectContaining({
        metadataOnly: true,
        noEmailSent: true,
        suppression: expect.objectContaining({
          emailMasked: "c***@example.com",
          emailHash: expect.any(String),
        }),
      }),
    );
    expect(prisma.emailSuppression.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.not.objectContaining({ email: "customer@example.com" }),
      }),
    );
    expect(revoked).toEqual(expect.objectContaining({ suppression: expect.objectContaining({ active: false, revokedById: "user-1" }) }));
    expect(JSON.stringify(created)).not.toContain("customer@example.com");
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: "EMAIL_SUPPRESSION_CREATED" }));
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: "EMAIL_SUPPRESSION_REVOKED" }));
  });

  it("blocks suppressed sends and retries without calling the provider", async () => {
    const { service, prisma, provider } = makeService({
      config: {
        LEDGERBYTE_EMAIL_RETRY_PROCESSOR_ENABLED: "true",
      },
    });
    prisma.emailSuppression.findFirst.mockResolvedValue({
      id: "suppression-1",
      organizationId: "org-1",
      emailMasked: "c***@example.com",
      active: true,
    });
    prisma.emailOutbox.findMany.mockResolvedValue([
      {
        id: "email-retry-1",
        organizationId: "org-1",
        toEmail: "customer@example.com",
        fromEmail: "noreply@example.test",
        subject: "Password reset",
        templateType: EmailTemplateType.PASSWORD_RESET,
        bodyText: "Reset body",
        bodyHtml: null,
        status: EmailDeliveryStatus.FAILED,
        provider: "smtp",
        attemptCount: 1,
        maxAttempts: 3,
        nextAttemptAt: null,
        bouncedAt: null,
        complainedAt: null,
      },
    ]);

    const sendResult = await service.sendTestEmail({ organizationId: "org-1", toEmail: "customer@example.com" });
    const retryResult = await service.retryProcess("org-1", "user-1", { limit: 5 });

    expect(provider.send).not.toHaveBeenCalled();
    expect(sendResult).toEqual(expect.objectContaining({ status: EmailDeliveryStatus.FAILED, providerEventStatus: "SUPPRESSED" }));
    expect(retryResult).toEqual(expect.objectContaining({ attemptedCount: 0, suppressedCount: 1, blockedCount: 1 }));
    expect(prisma.emailOutbox.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "email-retry-1" },
        data: expect.objectContaining({
          providerEventStatus: "SUPPRESSED",
          retryLockedAt: null,
          retryLockedBy: null,
        }),
      }),
    );
  });

  it("includes webhook, suppression, and monitoring blockers in readiness", async () => {
    const { service, prisma } = makeService();
    prisma.emailSuppression.count.mockResolvedValue(2);

    const readiness = await service.readiness("org-1");

    expect(readiness).toEqual(
      expect.objectContaining({
        suppressionListConfigured: true,
        activeSuppressionCount: 2,
        webhookVerificationEnabled: false,
        webhookSecretConfigured: false,
        providerWebhookSignatureVerified: false,
        monitoringConfigured: false,
        alertingConfigured: false,
        productionReady: false,
      }),
    );
    expect(readiness.blockers).toEqual(
      expect.arrayContaining([
        "Signed provider webhook verification is disabled by default.",
        "No verified signed provider webhook event has been captured.",
        "Email alerting is not configured.",
      ]),
    );
  });

  it("includes retry, bounce, and monitoring blockers in readiness", async () => {
    const { service } = makeService();

    const readiness = await service.readiness("org-1");

    expect(readiness).toEqual(
      expect.objectContaining({
        retryPolicyConfigured: true,
        retryProcessorEnabled: false,
        retryPendingCount: 0,
        retryBlockedCount: 0,
        bounceWebhookConfigured: false,
        bounceWebhookSignatureVerified: false,
        providerEventIngestionReady: false,
        monitoringConfigured: false,
        productionReady: false,
      }),
    );
    expect(readiness.blockers).toEqual(
      expect.arrayContaining([
        "Email retry processor is disabled by default.",
        "Bounce webhook handling is not configured.",
        "Provider event ingestion is mock-only and unsigned.",
        "Email monitoring is not configured.",
      ]),
    );
  });

  it("skips diagnostics by default without sending or mutating", async () => {
    const { service, provider, prisma } = makeService();

    await expect(service.runDiagnostics({ organizationId: "org-1" })).resolves.toEqual(
      expect.objectContaining({
        executionEnabled: false,
        executionAttempted: false,
        noEmailSent: true,
        noCustomerEmailSent: true,
        noMutation: true,
        status: "SKIPPED_DISABLED",
        plan: expect.objectContaining({
          executionEnabled: false,
          noCustomerEmailSentByDefault: true,
          noMutationByDefault: true,
          productionReady: false,
        }),
      }),
    );
    expect(provider.send).not.toHaveBeenCalled();
    expect(prisma.emailOutbox.create).not.toHaveBeenCalled();
  });

  it("rejects unsafe diagnostics recipients when execution is enabled", async () => {
    const { service, provider } = makeService({
      config: {
        LEDGERBYTE_EMAIL_DIAGNOSTICS_SEND_ENABLED: "true",
        LEDGERBYTE_EMAIL_DIAGNOSTICS_ALLOWED_RECIPIENTS: "ops@example.test",
      },
    });

    await expect(service.runDiagnostics({ organizationId: "org-1", toEmail: "customer@example.com" })).rejects.toThrow(
      "Diagnostic recipient is not allowed.",
    );
    expect(provider.send).not.toHaveBeenCalled();
  });

  it("runs diagnostics against an allowed recipient with a safe summary only", async () => {
    const { service, provider, prisma } = makeService({
      config: {
        LEDGERBYTE_EMAIL_DIAGNOSTICS_SEND_ENABLED: "true",
        LEDGERBYTE_EMAIL_DIAGNOSTICS_ALLOWED_RECIPIENTS: "ops@example.test",
        SMTP_PASSWORD: "xpw",
      },
    });

    const result = await service.runDiagnostics({ organizationId: "org-1", toEmail: "ops@example.test" });

    expect(provider.send).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-1",
        toEmail: "ops@example.test",
        subject: expect.stringContaining("diagnostic"),
        bodyText: expect.not.stringContaining("customer"),
      }),
    );
    expect(prisma.emailOutbox.create).not.toHaveBeenCalled();
    expect(result).toEqual(
      expect.objectContaining({
        executionEnabled: true,
        executionAttempted: true,
        noCustomerEmailSent: true,
        noMutation: true,
        status: "ATTEMPTED",
        plan: expect.objectContaining({
          executionEnabled: true,
          wouldSendToRedactedRecipient: expect.any(String),
          noCustomerEmailSentByDefault: true,
          noMutationByDefault: true,
          productionReady: false,
        }),
        delivery: expect.objectContaining({
          provider: "mock",
          status: EmailDeliveryStatus.SENT_MOCK,
        }),
      }),
    );
    expect(JSON.stringify(result)).not.toContain("xpw");
    expect(JSON.stringify(result)).not.toContain("ops@example.test");
  });

  it("builds a diagnostics plan without sending email or mutating outbox", () => {
    const { service, prisma, provider } = makeService({
      config: {
        LEDGERBYTE_EMAIL_DIAGNOSTICS_SEND_ENABLED: "true",
        LEDGERBYTE_EMAIL_DIAGNOSTICS_ALLOWED_RECIPIENTS: "ops@example.test",
      },
    });

    const plan = service.diagnosticsPlan("ops@example.test");

    expect(plan).toEqual(
      expect.objectContaining({
        executionEnabled: true,
        allowedRecipientsConfigured: true,
        allowedDomainsConfigured: true,
        provider: "mock",
        smtpConfigured: false,
        wouldSendToRedactedRecipient: expect.any(String),
        noCustomerEmailSentByDefault: true,
        noMutationByDefault: true,
        productionReady: false,
      }),
    );
    expect(JSON.stringify(plan)).not.toContain("ops@example.test");
    expect(provider.send).not.toHaveBeenCalled();
    expect(prisma.emailOutbox.create).not.toHaveBeenCalled();
  });

  it("creates local AP generated-document outbox metadata without calling the provider", async () => {
    const { service, prisma, provider, audit } = makeService();
    prisma.generatedDocument.findFirst.mockResolvedValue({
      id: "doc-1",
      organizationId: "org-1",
      documentType: DocumentType.PURCHASE_BILL,
      sourceType: "PurchaseBill",
      sourceId: "bill-1",
      documentNumber: "BILL-000001",
      filename: "purchase-bill-BILL-000001.pdf",
      mimeType: "application/pdf",
      contentHash: "hash-1",
      sizeBytes: 1234,
      status: GeneratedDocumentStatus.GENERATED,
    });
    prisma.purchaseBill.findFirst.mockResolvedValue({
      id: "bill-1",
      billNumber: "BILL-000001",
      supplier: { email: "supplier@example.test" },
    });

    const result = await service.createApGeneratedDocumentOutbox({
      organizationId: "org-1",
      actorUserId: "user-1",
      generatedDocumentId: "doc-1",
      dto: {},
      permissions: [PERMISSIONS.emailOutbox.view, PERMISSIONS.generatedDocuments.download, PERMISSIONS.purchaseBills.view],
    });

    expect(provider.send).not.toHaveBeenCalled();
    expect(prisma.emailOutbox.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: "org-1",
          toEmail: "supplier@example.test",
          templateType: EmailTemplateType.AP_GENERATED_DOCUMENT,
          status: EmailDeliveryStatus.SENT_MOCK,
          provider: "mock-no-send",
          providerMessageId: null,
          attemptCount: 0,
          maxAttempts: 0,
          nextAttemptAt: null,
          generatedDocumentId: "doc-1",
          sourceType: "PurchaseBill",
          sourceId: "bill-1",
          attachmentFilename: "purchase-bill-BILL-000001.pdf",
          attachmentMimeType: "application/pdf",
          attachmentSizeBytes: 1234,
          attachmentContentHash: "hash-1",
        }),
      }),
    );
    expect(result).toMatchObject({
      localOnly: true,
      noEmailSent: true,
      providerCalled: false,
      provider: "mock-no-send",
      emailOutbox: expect.objectContaining({
        templateType: EmailTemplateType.AP_GENERATED_DOCUMENT,
        generatedDocumentId: "doc-1",
      }),
    });
    expect(JSON.stringify(result)).not.toContain("bodyText");
    expect(JSON.stringify(result)).not.toContain("bodyHtml");
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "CREATE",
        entityType: "EmailOutbox",
        entityId: "email-1",
      }),
    );
  });

  it("rejects AP generated-document email without generated-document download permission", async () => {
    const { service, prisma, provider } = makeService();
    prisma.generatedDocument.findFirst.mockResolvedValue({
      id: "doc-1",
      organizationId: "org-1",
      documentType: DocumentType.PURCHASE_BILL,
      sourceType: "PurchaseBill",
      sourceId: "bill-1",
      documentNumber: "BILL-000001",
      filename: "purchase-bill-BILL-000001.pdf",
      mimeType: "application/pdf",
      contentHash: "hash-1",
      sizeBytes: 1234,
      status: GeneratedDocumentStatus.GENERATED,
    });

    await expect(
      service.createApGeneratedDocumentOutbox({
        organizationId: "org-1",
        actorUserId: "user-1",
        generatedDocumentId: "doc-1",
        dto: {},
        permissions: [PERMISSIONS.emailOutbox.view, PERMISSIONS.purchaseBills.view],
      }),
    ).rejects.toThrow("You do not have permission to create AP generated-document email outbox metadata.");

    expect(provider.send).not.toHaveBeenCalled();
    expect(prisma.emailOutbox.create).not.toHaveBeenCalled();
  });

  it("rejects unsupported generated-document source pairs", async () => {
    const { service, prisma } = makeService();
    prisma.generatedDocument.findFirst.mockResolvedValue({
      id: "doc-1",
      organizationId: "org-1",
      documentType: DocumentType.SALES_INVOICE,
      sourceType: "SalesInvoice",
      sourceId: "invoice-1",
      documentNumber: "INV-000001",
      filename: "invoice.pdf",
      mimeType: "application/pdf",
      contentHash: "hash-1",
      sizeBytes: 1234,
      status: GeneratedDocumentStatus.GENERATED,
    });

    await expect(
      service.createApGeneratedDocumentOutbox({
        organizationId: "org-1",
        actorUserId: "user-1",
        generatedDocumentId: "doc-1",
        dto: {},
        permissions: [PERMISSIONS.emailOutbox.view, PERMISSIONS.generatedDocuments.download, PERMISSIONS.salesInvoices.view],
      }),
    ).rejects.toThrow("Generated document is not supported for AP email outbox.");

    expect(prisma.emailOutbox.create).not.toHaveBeenCalled();
  });

  it("requires a valid AP generated-document email recipient", async () => {
    const { service, prisma } = makeService();
    prisma.generatedDocument.findFirst.mockResolvedValue({
      id: "doc-1",
      organizationId: "org-1",
      documentType: DocumentType.CASH_EXPENSE,
      sourceType: "CashExpense",
      sourceId: "expense-1",
      documentNumber: "EXP-000001",
      filename: "cash-expense-EXP-000001.pdf",
      mimeType: "application/pdf",
      contentHash: "hash-1",
      sizeBytes: 1234,
      status: GeneratedDocumentStatus.GENERATED,
    });
    prisma.cashExpense.findFirst.mockResolvedValue({
      id: "expense-1",
      expenseNumber: "EXP-000001",
      contact: { email: null },
    });

    await expect(
      service.createApGeneratedDocumentOutbox({
        organizationId: "org-1",
        actorUserId: "user-1",
        generatedDocumentId: "doc-1",
        dto: {},
        permissions: [PERMISSIONS.emailOutbox.view, PERMISSIONS.generatedDocuments.download, PERMISSIONS.cashExpenses.view],
      }),
    ).rejects.toThrow("AP generated document email requires a recipient email.");

    expect(prisma.emailOutbox.create).not.toHaveBeenCalled();
  });
});
