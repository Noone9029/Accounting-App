import type { UaePintAeDocumentInput } from "./types";

export function standardUaePintAeTaxInvoiceFixture(): UaePintAeDocumentInput {
  return {
    kind: "invoice",
    documentType: "tax-invoice",
    documentNumber: "INV-0001",
    issueDate: "2026-06-16",
    invoiceTypeCode: "380",
    currency: "AED",
    paymentDueDate: "2026-07-16",
    supplier: {
      legalName: "LedgerByte FZ LLC",
      peppolParticipantId: "02351234567890",
      tin: "1234567890",
      trn: "100000000000003",
      addressLine1: "Business Bay",
      city: "Dubai",
      emirate: "Dubai",
      countryCode: "AE",
    },
    buyer: {
      legalName: "Buyer LLC",
      peppolParticipantId: "02352234567890",
      tin: "2234567890",
      trn: "200000000000003",
      addressLine1: "Al Reem Island",
      city: "Abu Dhabi",
      emirate: "Abu Dhabi",
      countryCode: "AE",
    },
    lines: [
      {
        id: "1",
        description: "Bookkeeping services",
        quantity: "1",
        unitCode: "EA",
        unitPrice: "1000",
        taxableAmount: "1000",
        taxAmount: "50",
        lineTotal: "1050",
        taxCategory: "S",
      },
    ],
    subtotal: "1000",
    taxTotal: "50",
    total: "1050",
  };
}

export function standardUaePintAeTaxCreditNoteFixture(): UaePintAeDocumentInput {
  return {
    ...standardUaePintAeTaxInvoiceFixture(),
    kind: "credit-note",
    documentType: "tax-credit-note",
    documentNumber: "CN-0001",
    issueDate: "2026-06-17",
    invoiceTypeCode: "381",
    creditNoteReason: "Billing adjustment",
    originalInvoiceNumber: "INV-0001",
  };
}
