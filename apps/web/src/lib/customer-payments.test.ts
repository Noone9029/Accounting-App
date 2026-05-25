import {
  applyCustomerPaymentUnappliedAllocation,
  canReverseCustomerPaymentUnappliedAllocation,
  customerPaymentAllocationState,
  customerPaymentAllocationStateBadgeClass,
  customerPaymentAllocationStateLabel,
  customerPaymentApplyUnappliedPath,
  customerPaymentActiveUnappliedAppliedAmount,
  customerPaymentApplyMaximumAmount,
  customerPaymentGenerateReceiptPdfPath,
  customerPaymentDirectAllocatedAmount,
  customerPaymentReceiptDataPath,
  customerPaymentReceiptPdfDataPath,
  customerPaymentReceiptPdfPath,
  customerPaymentReverseUnappliedAllocationPath,
  customerPaymentStatusBadgeClass,
  customerPaymentStatusLabel,
  customerPaymentUnappliedAllocationsPath,
  customerPaymentUnappliedAllocationStatusBadgeClass,
  customerPaymentUnappliedAllocationStatusLabel,
  downloadCustomerPaymentReceiptPdf,
  generateCustomerPaymentReceiptPdf,
  getCustomerPaymentReceiptData,
  getCustomerPaymentReceiptPdfData,
  reverseCustomerPaymentUnappliedAllocation,
  salesInvoiceCustomerPaymentUnappliedAllocationsPath,
  validateCustomerPaymentUnappliedAllocation,
} from "./customer-payments";
import { apiRequest } from "./api";
import { downloadPdf } from "./pdf-download";

jest.mock("./api", () => ({
  apiRequest: jest.fn(),
}));

jest.mock("./pdf-download", () => ({
  downloadPdf: jest.fn(),
}));

const apiRequestMock = apiRequest as jest.MockedFunction<typeof apiRequest>;
const downloadPdfMock = downloadPdf as jest.MockedFunction<typeof downloadPdf>;

describe("customer payment helpers", () => {
  beforeEach(() => {
    apiRequestMock.mockReset();
    downloadPdfMock.mockReset();
  });

  it("builds unapplied allocation URLs safely", () => {
    expect(customerPaymentUnappliedAllocationsPath("pay 1")).toBe("/customer-payments/pay%201/unapplied-allocations");
    expect(customerPaymentApplyUnappliedPath("pay 1")).toBe("/customer-payments/pay%201/apply-unapplied");
    expect(customerPaymentReverseUnappliedAllocationPath("pay 1", "allocation 1")).toBe(
      "/customer-payments/pay%201/unapplied-allocations/allocation%201/reverse",
    );
    expect(salesInvoiceCustomerPaymentUnappliedAllocationsPath("inv 1")).toBe(
      "/sales-invoices/inv%201/customer-payment-unapplied-allocations",
    );
    expect(customerPaymentReceiptDataPath("pay 1")).toBe("/customer-payments/pay%201/receipt-data");
    expect(customerPaymentReceiptPdfDataPath("pay 1")).toBe("/customer-payments/pay%201/receipt-pdf-data");
    expect(customerPaymentReceiptPdfPath("pay 1")).toBe("/customer-payments/pay%201/receipt.pdf");
    expect(customerPaymentGenerateReceiptPdfPath("pay 1")).toBe("/customer-payments/pay%201/generate-receipt-pdf");
  });

  it("labels unapplied payment allocation reversal state", () => {
    expect(customerPaymentUnappliedAllocationStatusLabel({ reversedAt: null })).toBe("Active");
    expect(customerPaymentUnappliedAllocationStatusLabel({ reversedAt: "2026-05-12T00:00:00.000Z" })).toBe("Reversed");
    expect(customerPaymentUnappliedAllocationStatusBadgeClass({ reversedAt: null })).toContain("emerald");
    expect(customerPaymentUnappliedAllocationStatusBadgeClass({ reversedAt: "2026-05-12T00:00:00.000Z" })).toContain("slate");
    expect(canReverseCustomerPaymentUnappliedAllocation({ reversedAt: null })).toBe(true);
    expect(canReverseCustomerPaymentUnappliedAllocation({ reversedAt: "2026-05-12T00:00:00.000Z" })).toBe(false);
  });

  it("labels customer payment status and allocation state", () => {
    expect(customerPaymentStatusLabel("POSTED")).toBe("Posted");
    expect(customerPaymentStatusLabel("VOIDED")).toBe("Voided");
    expect(customerPaymentStatusBadgeClass("POSTED")).toContain("emerald");
    expect(customerPaymentStatusBadgeClass("VOIDED")).toContain("rose");

    expect(
      customerPaymentAllocationState({
        unappliedAmount: "0.0000",
        allocations: [{ amountApplied: "100.0000" }],
        unappliedAllocations: [],
      }),
    ).toBe("FULLY_APPLIED");
    expect(
      customerPaymentAllocationState({
        unappliedAmount: "25.0000",
        allocations: [{ amountApplied: "75.0000" }],
        unappliedAllocations: [],
      }),
    ).toBe("PARTIALLY_UNAPPLIED");
    expect(
      customerPaymentAllocationState({
        unappliedAmount: "100.0000",
        allocations: [],
        unappliedAllocations: [],
      }),
    ).toBe("NO_ALLOCATIONS");
    expect(customerPaymentAllocationStateLabel("FULLY_APPLIED")).toBe("Fully applied");
    expect(customerPaymentAllocationStateLabel("PARTIALLY_UNAPPLIED")).toBe("Partially unapplied");
    expect(customerPaymentAllocationStateBadgeClass("NO_ALLOCATIONS")).toContain("slate");
  });

  it("derives allocation state from amount-only customer payment rows", () => {
    expect(customerPaymentAllocationState({ status: "POSTED", amountReceived: "100.0000", unappliedAmount: "0.0000" })).toBe("FULLY_APPLIED");
    expect(customerPaymentAllocationState({ status: "POSTED", amountReceived: "100.0000", unappliedAmount: "25.0000" })).toBe("PARTIALLY_UNAPPLIED");
    expect(customerPaymentAllocationState({ status: "POSTED", amountReceived: "100.0000", unappliedAmount: "100.0000" })).toBe("NO_ALLOCATIONS");
    expect(customerPaymentAllocationState({ status: "DRAFT", amountReceived: "100.0000", unappliedAmount: "0.0000" })).toBe("NO_ALLOCATIONS");
  });

  it("calculates active applied amount from unreversed unapplied allocations", () => {
    expect(
      customerPaymentActiveUnappliedAppliedAmount([
        { amountApplied: "10.0000", reversedAt: null },
        { amountApplied: "5.0000", reversedAt: "2026-05-12T00:00:00.000Z" },
        { amountApplied: "2.5000", reversedAt: null },
      ]),
    ).toBe("12.5000");
  });

  it("calculates direct invoice allocation amount", () => {
    expect(customerPaymentDirectAllocatedAmount([{ amountApplied: "60.0000" }, { amountApplied: "40.5000" }])).toBe("100.5000");
    expect(customerPaymentDirectAllocatedAmount(undefined)).toBe("0.0000");
  });

  it("caps unapplied payment application by payment credit and invoice balance", () => {
    expect(customerPaymentApplyMaximumAmount("75.0000", "40.0000")).toBe("40.0000");
    expect(customerPaymentApplyMaximumAmount("25.0000", "40.0000")).toBe("25.0000");
    expect(customerPaymentApplyMaximumAmount("25.0000", undefined)).toBe("25.0000");
    expect(customerPaymentApplyMaximumAmount("-5.0000", "40.0000")).toBe("0.0000");
  });

  it("validates unapplied payment allocation amounts", () => {
    expect(validateCustomerPaymentUnappliedAllocation("0.0000", "100.0000", "100.0000")).toContain("greater than zero");
    expect(validateCustomerPaymentUnappliedAllocation("120.0000", "100.0000", "200.0000")).toContain("payment unapplied");
    expect(validateCustomerPaymentUnappliedAllocation("120.0000", "200.0000", "100.0000")).toContain("balance due");
    expect(validateCustomerPaymentUnappliedAllocation("50.0000", "100.0000", "80.0000")).toBeNull();
  });

  it("posts unapplied payment applications through the customer payment API route", async () => {
    const response = { id: "payment-1", unappliedAmount: "60.0000" };
    apiRequestMock.mockResolvedValueOnce(response);

    await expect(
      applyCustomerPaymentUnappliedAllocation("payment 1", {
        invoiceId: "invoice-1",
        amountApplied: "40.0000",
      }),
    ).resolves.toBe(response);

    expect(apiRequestMock).toHaveBeenCalledWith("/customer-payments/payment%201/apply-unapplied", {
      method: "POST",
      body: {
        invoiceId: "invoice-1",
        amountApplied: "40.0000",
      },
    });
  });

  it("posts unapplied payment allocation reversals through the customer payment API route", async () => {
    const response = { id: "payment-1", unappliedAmount: "100.0000" };
    apiRequestMock.mockResolvedValueOnce(response);

    await expect(
      reverseCustomerPaymentUnappliedAllocation("payment 1", "allocation 1", {
        reason: "Wrong invoice",
      }),
    ).resolves.toBe(response);

    expect(apiRequestMock).toHaveBeenCalledWith("/customer-payments/payment%201/unapplied-allocations/allocation%201/reverse", {
      method: "POST",
      body: {
        reason: "Wrong invoice",
      },
    });
  });

  it("omits blank reversal reasons from the unapplied allocation reverse request", async () => {
    const response = { id: "payment-1", unappliedAmount: "100.0000" };
    apiRequestMock.mockResolvedValueOnce(response);

    await expect(reverseCustomerPaymentUnappliedAllocation("payment-1", "allocation-1", { reason: "   " })).resolves.toBe(response);

    expect(apiRequestMock).toHaveBeenCalledWith("/customer-payments/payment-1/unapplied-allocations/allocation-1/reverse", {
      method: "POST",
      body: {},
    });
  });

  it("fetches customer payment receipt data through explicit receipt endpoints", async () => {
    const receiptData = { receiptNumber: "CP-001", amountReceived: "115.0000" };
    const receiptPdfData = {
      payment: {
        id: "payment-1",
        paymentNumber: "CP-001",
      },
      generatedAt: "2026-05-25T00:00:00.000Z",
    };
    apiRequestMock.mockResolvedValueOnce(receiptData).mockResolvedValueOnce(receiptPdfData);

    await expect(getCustomerPaymentReceiptData("payment 1")).resolves.toBe(receiptData);
    await expect(getCustomerPaymentReceiptPdfData("payment 1")).resolves.toBe(receiptPdfData);

    expect(apiRequestMock).toHaveBeenNthCalledWith(1, "/customer-payments/payment%201/receipt-data");
    expect(apiRequestMock).toHaveBeenNthCalledWith(2, "/customer-payments/payment%201/receipt-pdf-data");
  });

  it("posts explicit customer payment receipt PDF generation through the archive route", async () => {
    const generatedDocument = { id: "document-1", filename: "receipt-CP-001.pdf" };
    apiRequestMock.mockResolvedValueOnce(generatedDocument);

    await expect(generateCustomerPaymentReceiptPdf("payment 1")).resolves.toBe(generatedDocument);

    expect(apiRequestMock).toHaveBeenCalledWith("/customer-payments/payment%201/generate-receipt-pdf", {
      method: "POST",
    });
  });

  it("downloads customer payment receipt PDFs through the explicit PDF endpoint", async () => {
    downloadPdfMock.mockResolvedValueOnce(undefined);

    await expect(downloadCustomerPaymentReceiptPdf("payment 1", "receipt-CP-001.pdf")).resolves.toBeUndefined();

    expect(downloadPdfMock).toHaveBeenCalledWith("/customer-payments/payment%201/receipt.pdf", "receipt-CP-001.pdf");
  });

  it("propagates API errors from unapplied allocation client calls", async () => {
    const error = new Error("Amount applied cannot exceed the payment unapplied amount.");
    apiRequestMock.mockRejectedValueOnce(error);

    await expect(
      applyCustomerPaymentUnappliedAllocation("payment-1", {
        invoiceId: "invoice-1",
        amountApplied: "120.0000",
      }),
    ).rejects.toThrow("Amount applied cannot exceed the payment unapplied amount.");
  });
});
