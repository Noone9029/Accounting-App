import { validate } from "class-validator";
import { CreateSalesInvoiceEmailDeliveryDto } from "../sales-invoices/dto/create-sales-invoice-email-delivery.dto";

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
});
