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

export function commercialUaePintAeInvoiceFixture(): UaePintAeDocumentInput {
  return {
    ...standardUaePintAeTaxInvoiceFixture(),
    documentType: "commercial-invoice",
    documentNumber: "COM-0001",
    invoiceTypeCode: "",
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

export function exportReceiverNotRegisteredUaePintAeInvoiceFixture(): UaePintAeDocumentInput {
  return predefinedEndpointFixture("EXP-0001", "export-receiver-not-registered", ["exports"]);
}

export function deemedSupplyUaePintAeInvoiceFixture(): UaePintAeDocumentInput {
  return predefinedEndpointFixture("DSM-0001", "deemed-supply", ["deemed-supply"]);
}

export function buyerNotSubjectUaePintAeInvoiceFixture(): UaePintAeDocumentInput {
  return predefinedEndpointFixture("BNS-0001", "buyer-not-subject", []);
}

export function multiLineUaePintAeTaxInvoiceFixture(): UaePintAeDocumentInput {
  return {
    ...standardUaePintAeTaxInvoiceFixture(),
    documentNumber: "INV-0002",
    lines: [
      ...standardUaePintAeTaxInvoiceFixture().lines,
      {
        id: "2",
        description: "VAT readiness review",
        quantity: "2",
        unitCode: "EA",
        unitPrice: "125",
        taxableAmount: "250",
        taxAmount: "12.50",
        lineTotal: "262.50",
        taxCategory: "S",
      },
    ],
    subtotal: "1250",
    taxTotal: "62.50",
    total: "1312.50",
  };
}

export function missingBuyerEndpointUaePintAeInvoiceFixture(): UaePintAeDocumentInput {
  return {
    ...standardUaePintAeTaxInvoiceFixture(),
    documentNumber: "NEG-BUYER-ENDPOINT",
    buyer: {
      ...standardUaePintAeTaxInvoiceFixture().buyer,
      endpointId: "",
      peppolParticipantId: "",
      tin: null,
    },
  };
}

export function invalidTinTrnUaePintAeInvoiceFixture(): UaePintAeDocumentInput {
  return {
    ...standardUaePintAeTaxInvoiceFixture(),
    documentNumber: "NEG-TAX-ID",
    supplier: {
      ...standardUaePintAeTaxInvoiceFixture().supplier,
      tin: "123",
      trn: "100",
    },
  };
}

export function creditNoteMissingReasonUaePintAeFixture(): UaePintAeDocumentInput {
  return {
    ...standardUaePintAeTaxCreditNoteFixture(),
    documentNumber: "NEG-CN-REASON",
    creditNoteReason: "",
  };
}

export function creditNoteMissingOriginalReferenceUaePintAeFixture(): UaePintAeDocumentInput {
  return {
    ...standardUaePintAeTaxCreditNoteFixture(),
    documentNumber: "NEG-CN-REFERENCE",
    originalInvoiceNumber: "",
  };
}

export function unsupportedLegacyTransactionFlagUaePintAeFixture(): UaePintAeDocumentInput {
  return {
    ...standardUaePintAeTaxInvoiceFixture(),
    documentNumber: "NEG-LEGACY-FLAG",
    transactionTypeFlags: ["self-billing"],
  };
}

function predefinedEndpointFixture(
  documentNumber: string,
  predefinedEndpointScenario: NonNullable<UaePintAeDocumentInput["predefinedEndpointScenario"]>,
  transactionTypeFlags: NonNullable<UaePintAeDocumentInput["transactionTypeFlags"]>,
): UaePintAeDocumentInput {
  return {
    ...standardUaePintAeTaxInvoiceFixture(),
    documentNumber,
    buyer: {
      ...standardUaePintAeTaxInvoiceFixture().buyer,
      endpointId: "",
      peppolParticipantId: "",
      tin: null,
      trn: null,
    },
    predefinedEndpointScenario,
    transactionTypeFlags,
  };
}
