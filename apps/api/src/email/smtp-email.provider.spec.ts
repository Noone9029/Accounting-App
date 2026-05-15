import { EmailDeliveryStatus, EmailTemplateType } from "@prisma/client";
import nodemailer from "nodemailer";
import { SmtpEmailProvider } from "./smtp-email.provider";

jest.mock("nodemailer", () => ({
  createTransport: jest.fn(),
}));

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

  it("reports complete smtp config as real-send ready without exposing secrets", () => {
    const provider = makeProvider({
      EMAIL_PROVIDER: "smtp",
      SMTP_HOST: "smtp.example.test",
      SMTP_PORT: "587",
      SMTP_USER: "user",
      SMTP_PASSWORD: "secret-value",
      SMTP_SECURE: "true",
    });
    const readiness = provider.readiness();

    expect(readiness).toMatchObject({
      provider: "smtp",
      ready: true,
      realSendingEnabled: true,
      mockMode: false,
      smtp: {
        hostConfigured: true,
        portConfigured: true,
        userConfigured: true,
        passwordConfigured: true,
        secure: true,
      },
    });
    expect(readiness.blockingReasons).toEqual([]);
    expect(JSON.stringify(readiness)).not.toContain("secret-value");
  });

  it("sends SMTP email through nodemailer when explicitly enabled", async () => {
    const sendMail = jest.fn().mockResolvedValue({ messageId: "smtp-message-1" });
    jest.mocked(nodemailer.createTransport).mockReturnValue({ sendMail } as never);
    const provider = makeProvider({
      EMAIL_PROVIDER: "smtp",
      SMTP_HOST: "smtp.example.test",
      SMTP_PORT: "587",
      SMTP_USER: "user",
      SMTP_PASSWORD: "secret",
      SMTP_SECURE: "true",
    });

    await expect(
      provider.send({
        toEmail: "user@example.com",
        fromEmail: "no-reply@example.com",
        subject: "Test",
        templateType: EmailTemplateType.PASSWORD_RESET,
        bodyText: "Hello",
        bodyHtml: "<p>Hello</p>",
      }),
    ).resolves.toMatchObject({
      provider: "smtp",
      status: EmailDeliveryStatus.SENT_PROVIDER,
      providerMessageId: "smtp-message-1",
      errorMessage: null,
    });

    expect(nodemailer.createTransport).toHaveBeenCalledWith({
      host: "smtp.example.test",
      port: 587,
      secure: true,
      auth: { user: "user", pass: "secret" },
    });
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "no-reply@example.com",
        to: "user@example.com",
        subject: "Test",
        text: "Hello",
        html: "<p>Hello</p>",
      }),
    );
  });

  it("stores safe failure details when SMTP send fails", async () => {
    const sendMail = jest.fn().mockRejectedValue(new Error("bad secret"));
    jest.mocked(nodemailer.createTransport).mockReturnValue({ sendMail } as never);
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
      errorMessage: "SMTP delivery failed. Check provider credentials and SMTP availability.",
    });

    const result = await provider.send({
      toEmail: "user@example.com",
      fromEmail: "no-reply@example.com",
      subject: "Test",
      templateType: EmailTemplateType.PASSWORD_RESET,
      bodyText: "Hello",
    });
    expect(result.errorMessage).not.toContain("secret");
  });
});
