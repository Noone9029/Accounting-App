import { EmailDeliveryStatus, EmailTemplateType } from "@prisma/client";
import nodemailer from "nodemailer";
import { MockEmailProvider } from "./mock-email.provider";
import { SmtpEmailProvider } from "./smtp-email.provider";

jest.mock("nodemailer", () => ({
  createTransport: jest.fn(),
}));

describe("email provider attachment contract", () => {
  const attachment = {
    filename: "invoice-INV-00042.pdf",
    mimeType: "application/pdf",
    content: Buffer.from("pdf-fixture"),
    contentHash: "hash-fixture",
  };

  it("keeps mock delivery local while accepting an attachment", async () => {
    const provider = new MockEmailProvider();

    await expect(
      provider.send({
        toEmail: "customer@example.test",
        fromEmail: "no-reply@example.test",
        subject: "Invoice INV-00042",
        templateType: EmailTemplateType.SALES_INVOICE,
        bodyText: "Invoice attached.",
        attachments: [attachment],
      }),
    ).resolves.toMatchObject({ provider: "mock", status: EmailDeliveryStatus.SENT_MOCK });
  });

  it("maps the attachment to Nodemailer without changing existing message fields", async () => {
    const sendMail = jest.fn().mockResolvedValue({ messageId: "smtp-message-1" });
    jest.mocked(nodemailer.createTransport).mockReturnValue({ sendMail } as never);
    const config = {
      get: jest.fn((key: string) =>
        ({
          EMAIL_PROVIDER: "smtp",
          SMTP_HOST: "smtp.example.test",
          SMTP_PORT: "587",
          SMTP_USER: "user",
          SMTP_PASSWORD: "secret",
          SMTP_SECURE: "true",
        })[key],
      ),
    };
    const provider = new SmtpEmailProvider(config as never);

    await expect(
      provider.send({
        toEmail: "customer@example.test",
        fromEmail: "no-reply@example.test",
        subject: "Invoice INV-00042",
        templateType: EmailTemplateType.SALES_INVOICE,
        bodyText: "Invoice attached.",
        attachments: [attachment],
      }),
    ).resolves.toMatchObject({ status: EmailDeliveryStatus.SENT_PROVIDER });

    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "no-reply@example.test",
        to: "customer@example.test",
        subject: "Invoice INV-00042",
        text: "Invoice attached.",
        attachments: [{ filename: attachment.filename, contentType: attachment.mimeType, content: attachment.content }],
      }),
    );
  });
});
