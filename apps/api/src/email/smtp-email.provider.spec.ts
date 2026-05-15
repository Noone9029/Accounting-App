import { EmailDeliveryStatus, EmailTemplateType } from "@prisma/client";
import { SmtpEmailProvider } from "./smtp-email.provider";

describe("SmtpEmailProvider", () => {
  function makeProvider(values: Record<string, string | undefined>) {
    const config = { get: jest.fn((key: string) => values[key]) };
    return new SmtpEmailProvider(config as never);
  }

  it("reports smtp-disabled as ready but non-sending", () => {
    const provider = makeProvider({ EMAIL_PROVIDER: "smtp-disabled", SMTP_SECURE: "false" });

    expect(provider.readiness()).toMatchObject({
      provider: "smtp-disabled",
      ready: true,
      mockMode: false,
      realSendingEnabled: false,
      smtp: { passwordConfigured: false },
    });
  });

  it("reports missing smtp config without exposing secrets", () => {
    const provider = makeProvider({ EMAIL_PROVIDER: "smtp", SMTP_USER: "user", SMTP_PASSWORD: "secret-value" });
    const readiness = provider.readiness();

    expect(readiness.ready).toBe(false);
    expect(readiness.smtp.passwordConfigured).toBe(true);
    expect(readiness.blockingReasons).toEqual(expect.arrayContaining(["SMTP_HOST is required when EMAIL_PROVIDER=smtp."]));
    expect(JSON.stringify(readiness)).not.toContain("secret-value");
  });

  it("does not send real SMTP email", async () => {
    const provider = makeProvider({ EMAIL_PROVIDER: "smtp", SMTP_HOST: "smtp.example.test", SMTP_PORT: "587", SMTP_USER: "user", SMTP_PASSWORD: "secret" });

    await expect(
      provider.send({
        toEmail: "user@example.com",
        fromEmail: "no-reply@example.com",
        subject: "Test",
        templateType: EmailTemplateType.PASSWORD_RESET,
        bodyText: "Hello",
      }),
    ).resolves.toMatchObject({
      provider: "smtp",
      status: EmailDeliveryStatus.FAILED,
      providerMessageId: null,
    });
  });
});
