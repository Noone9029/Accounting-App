import { validate } from "class-validator";
import { CreateSalesInvoiceEmailDeliveryDto } from "../sales-invoices/dto/create-sales-invoice-email-delivery.dto";
import { CreateSupplierDocumentEmailDeliveryDto } from "./dto/create-supplier-document-email-delivery.dto";

describe("sales invoice delivery DTO", () => {
  it("requires a bounded idempotency key and rejects unsafe subject input", async () => {
    const dto = Object.assign(new CreateSalesInvoiceEmailDeliveryDto(), {
      idempotencyKey: "short",
      subject: "unsafe\nsubject",
      message: "message",
    });

    const errors = await validate(dto);
    const messages = errors.flatMap((error) => Object.values(error.constraints ?? {}));
    expect(messages).toContain("idempotencyKey must be longer than or equal to 16 characters");
    expect(messages).toEqual(expect.arrayContaining([expect.stringContaining("subject must match") ]));
  });

  it("allows the recipient override to be omitted", async () => {
    const dto = Object.assign(new CreateSalesInvoiceEmailDeliveryDto(), {
      idempotencyKey: "client-key-123456",
    });

    expect(await validate(dto)).toHaveLength(0);
  });

  it("validates the common supplier-document DTO with the same bounded delivery contract", async () => {
    const dto = Object.assign(new CreateSupplierDocumentEmailDeliveryDto(), {
      recipientEmail: "supplier@example.test",
      subject: "Supplier document",
      message: "Please review the attached PDF.",
      idempotencyKey: "supplier-document-123456",
    });

    expect(await validate(dto)).toHaveLength(0);
  });

  it("rejects unsafe supplier recipients and idempotency keys", async () => {
    const dto = Object.assign(new CreateSupplierDocumentEmailDeliveryDto(), {
      recipientEmail: "not-an-email",
      idempotencyKey: "unsafe key with spaces",
    });

    const errors = await validate(dto);
    expect(errors.map((error) => error.property)).toEqual(expect.arrayContaining(["recipientEmail", "idempotencyKey"]));
  });
});
