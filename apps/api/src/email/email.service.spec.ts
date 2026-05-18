import { EmailDeliveryStatus, EmailTemplateType } from "@prisma/client";
import { EmailService } from "./email.service";

describe("EmailService", () => {
  function makeService(options: { config?: Record<string, string | undefined>; provider?: Partial<ReturnType<typeof makeProvider>> } = {}) {
    const prisma = {
      emailOutbox: {
        create: jest.fn((args: { data: Record<string, unknown>; select: unknown }) => Promise.resolve({ id: "email-1", ...args.data })),
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn(),
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
        SMTP_PASSWORD: "smtp-password-secret",
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
    expect(serialized).not.toContain("smtp-password-secret");
    expect(serialized).not.toContain("api-key-secret");
    expect(serialized).not.toContain("SMTP_PASSWORD");
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
        SMTP_PASSWORD: "smtp-password-secret",
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
    expect(JSON.stringify(readiness)).not.toContain("smtp-password-secret");
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
        evidenceSummaryJson: { smtpPassword: "smtp-password-secret", token: "provider-token-secret" },
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
        SMTP_PASSWORD: "smtp-password-secret",
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
    expect(readiness.retryPolicyConfigured).toBe(false);
    expect(readiness.monitoringConfigured).toBe(false);
    expect(readiness.productionReady).toBe(false);
    expect(readiness.blockers).toEqual(
      expect.arrayContaining([
        "Non-production relay diagnostics must be completed before production email delivery is considered ready.",
        "Bounce webhook handling is not configured.",
        "Email retry policy is not configured.",
        "Email monitoring is not configured.",
      ]),
    );
    expect(provider.send).not.toHaveBeenCalled();
    expect(JSON.stringify(readiness)).not.toContain("smtp-password-secret");
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
        SMTP_PASSWORD: "smtp-password-secret",
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
    expect(JSON.stringify(result)).not.toContain("smtp-password-secret");
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
});
