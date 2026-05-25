import { RequestMethod } from "@nestjs/common";
import { METHOD_METADATA, PATH_METADATA } from "@nestjs/common/constants";
import { PERMISSIONS } from "@ledgerbyte/shared";
import { validate } from "class-validator";
import { REQUIRED_PERMISSIONS_KEY } from "../auth/decorators/require-permissions.decorator";
import { CustomerPaymentController } from "./customer-payment.controller";
import { ApplyUnappliedPaymentDto } from "./dto/apply-unapplied-payment.dto";

const validInvoiceId = "11111111-1111-4111-8111-111111111111";

describe("CustomerPaymentController unapplied allocation routes", () => {
  it("maps apply and reverse unapplied allocation routes to POST endpoints", () => {
    expect(Reflect.getMetadata(PATH_METADATA, CustomerPaymentController)).toBe("customer-payments");
    expect(Reflect.getMetadata(PATH_METADATA, CustomerPaymentController.prototype.applyUnapplied)).toBe(":id/apply-unapplied");
    expect(Reflect.getMetadata(METHOD_METADATA, CustomerPaymentController.prototype.applyUnapplied)).toBe(RequestMethod.POST);
    expect(Reflect.getMetadata(PATH_METADATA, CustomerPaymentController.prototype.reverseUnappliedAllocation)).toBe(
      ":id/unapplied-allocations/:allocationId/reverse",
    );
    expect(Reflect.getMetadata(METHOD_METADATA, CustomerPaymentController.prototype.reverseUnappliedAllocation)).toBe(RequestMethod.POST);
  });

  it("requires customer payment apply-unapplied permission for applying unapplied payment credit", () => {
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, CustomerPaymentController.prototype.applyUnapplied)).toEqual([
      PERMISSIONS.customerPayments.applyUnapplied,
    ]);
  });

  it("requires customer payment reverse-unapplied permission for reversing unapplied payment allocation", () => {
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, CustomerPaymentController.prototype.reverseUnappliedAllocation)).toEqual([
      PERMISSIONS.customerPayments.reverseUnappliedAllocation,
    ]);
  });

  it("requires customer payment receipt PDF generation permission for explicit receipt PDF output", () => {
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, CustomerPaymentController.prototype.receiptPdf)).toEqual([
      PERMISSIONS.customerPayments.receiptPdfGenerate,
    ]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, CustomerPaymentController.prototype.generateReceiptPdf)).toEqual([
      PERMISSIONS.customerPayments.receiptPdfGenerate,
    ]);
  });

  it("requires customer payment void permission for payment voiding", () => {
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, CustomerPaymentController.prototype.void)).toEqual([PERMISSIONS.customerPayments.void]);
  });

  it("calls the applyUnapplied service path with organization, actor, payment id, and dto", async () => {
    const service = makeCustomerPaymentServiceMock();
    const controller = new CustomerPaymentController(service as never);
    const dto = { invoiceId: validInvoiceId, amountApplied: "40.0000" };

    await expect(controller.applyUnapplied("org-1", { id: "user-1" } as never, "payment-1", dto)).resolves.toEqual({
      id: "payment-1",
    });

    expect(service.applyUnapplied).toHaveBeenCalledWith("org-1", "user-1", "payment-1", dto);
  });

  it("calls the reverseUnappliedAllocation service path with organization, actor, payment id, allocation id, and dto", async () => {
    const service = makeCustomerPaymentServiceMock();
    const controller = new CustomerPaymentController(service as never);
    const dto = { reason: "Corrected matching" };

    await expect(
      controller.reverseUnappliedAllocation("org-1", { id: "user-1" } as never, "payment-1", "allocation-1", dto),
    ).resolves.toEqual({ id: "payment-1" });

    expect(service.reverseUnappliedAllocation).toHaveBeenCalledWith("org-1", "user-1", "payment-1", "allocation-1", dto);
  });
});

describe("ApplyUnappliedPaymentDto validation", () => {
  it("accepts a valid invoice id and positive decimal amount", async () => {
    await expect(validateApplyDto({ invoiceId: validInvoiceId, amountApplied: "40.0000" })).resolves.toHaveLength(0);
  });

  it("rejects missing invoiceId", async () => {
    await expect(validateApplyDto({ amountApplied: "40.0000" })).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ property: "invoiceId" })]),
    );
  });

  it.each(["0", "0.0000", "-1.0000"])("rejects non-positive amountApplied value %s", async (amountApplied) => {
    await expect(validateApplyDto({ invoiceId: validInvoiceId, amountApplied })).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ property: "amountApplied" })]),
    );
  });

  it.each(["abc", "1.00000", "1,000.0000"])("rejects malformed amountApplied value %s", async (amountApplied) => {
    await expect(validateApplyDto({ invoiceId: validInvoiceId, amountApplied })).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ property: "amountApplied" })]),
    );
  });
});

function makeCustomerPaymentServiceMock() {
  return {
    applyUnapplied: jest.fn().mockResolvedValue({ id: "payment-1" }),
    reverseUnappliedAllocation: jest.fn().mockResolvedValue({ id: "payment-1" }),
  };
}

function validateApplyDto(values: Partial<ApplyUnappliedPaymentDto>) {
  return validate(Object.assign(new ApplyUnappliedPaymentDto(), values));
}
