export type PublicSalesDocumentType = "sales-invoice" | "sales-quote";

export interface PublicSalesDocumentParty {
  displayName: string;
  taxNumber?: string | null;
}

export interface PublicSalesDocumentTotals {
  subtotal: string;
  discountTotal: string;
  taxableTotal: string;
  taxTotal: string;
  total: string;
  balanceDue?: string;
}

export interface PublicSalesDocumentLine {
  itemName?: string | null;
  description: string;
  quantity: string;
  unitPrice: string;
  discountRate: string;
  taxRateName?: string | null;
  taxableAmount: string;
  taxAmount: string;
  lineTotal: string;
}

export interface PublicSalesDocumentViewInput {
  documentType: PublicSalesDocumentType;
  documentNumber: string;
  status: string;
  issueDate: string;
  dueOrExpiryDate?: string | null;
  currency: string;
  seller: PublicSalesDocumentParty;
  customer: PublicSalesDocumentParty;
  totals: PublicSalesDocumentTotals;
  lines: PublicSalesDocumentLine[];
  notes?: string | null;
  terms?: string | null;
}

export interface PublicSalesDocumentActionBoundary {
  documentMutationEnabled: false;
  paymentCollectionEnabled: false;
  quoteAcceptanceEnabled: false;
  emailSendingEnabled: false;
  generatedDocumentMutationEnabled: false;
  providerCallEnabled: false;
  complianceSubmissionEnabled: false;
}

export interface PublicSalesDocumentView {
  documentType: PublicSalesDocumentType;
  title: "Sales Invoice" | "Sales Quote";
  documentNumber: string;
  status: string;
  issueDate: string;
  dueOrExpiryDate?: string | null;
  currency: string;
  seller: PublicSalesDocumentParty;
  customer: PublicSalesDocumentParty;
  totals: PublicSalesDocumentTotals;
  lines: PublicSalesDocumentLine[];
  notes?: string | null;
  terms?: string | null;
  actionBoundary: PublicSalesDocumentActionBoundary;
}

export const PUBLIC_SALES_DOCUMENT_ACTION_BOUNDARY: PublicSalesDocumentActionBoundary = {
  documentMutationEnabled: false,
  paymentCollectionEnabled: false,
  quoteAcceptanceEnabled: false,
  emailSendingEnabled: false,
  generatedDocumentMutationEnabled: false,
  providerCallEnabled: false,
  complianceSubmissionEnabled: false,
};

const publicSalesDocumentTitles: Record<PublicSalesDocumentType, PublicSalesDocumentView["title"]> = {
  "sales-invoice": "Sales Invoice",
  "sales-quote": "Sales Quote",
};

export function buildPublicSalesDocumentView(input: PublicSalesDocumentViewInput): PublicSalesDocumentView {
  const title = publicSalesDocumentTitles[input.documentType];
  if (!title) {
    throw new Error(`Unsupported public sales document type: ${input.documentType}.`);
  }

  if (input.lines.length === 0) {
    throw new Error("Public sales document views require at least one line.");
  }

  return {
    documentType: input.documentType,
    title,
    documentNumber: input.documentNumber,
    status: input.status,
    issueDate: input.issueDate,
    dueOrExpiryDate: input.dueOrExpiryDate,
    currency: input.currency,
    seller: { ...input.seller },
    customer: { ...input.customer },
    totals: { ...input.totals },
    lines: input.lines.map((line) => ({ ...line })),
    notes: input.notes,
    terms: input.terms,
    actionBoundary: PUBLIC_SALES_DOCUMENT_ACTION_BOUNDARY,
  };
}
