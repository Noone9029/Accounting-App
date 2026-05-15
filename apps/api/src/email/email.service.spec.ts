import { EmailDeliveryStatus, EmailTemplateType } from "@prisma/client";
import { EmailService } from "./email.service";

describe("EmailService", () => {
  function makeService() {
    const prisma = {
      emailOutbox: {
        create: jest.fn((args: { data: Record<string, unknown>; select: unknown }) => Promise.resolve({ id: "email-1", ...args.data })),
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn(),
      },
    };
    const config = { get: jest.fn((key: string) => (key === "EMAIL_FROM" ? "noreply@example.test" : undefined)) };
    const provider = {
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
          secure: false,
        },
        mockMode: true,
        realSendingEnabled: false,
      }),
    };
    return { service: new EmailService(prisma as never, config as never, provider), prisma, provider };
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

  it("returns provider readiness without secrets", () => {
    const { service } = makeService();

    expect(service.readiness()).toEqual(
      expect.objectContaining({
        provider: "mock",
        ready: true,
        fromEmail: "noreply@example.test",
        realSendingEnabled: false,
      }),
    );
    expect(JSON.stringify(service.readiness())).not.toContain("SMTP_PASSWORD");
  });
});
