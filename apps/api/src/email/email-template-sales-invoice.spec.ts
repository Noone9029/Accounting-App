import {
  buildCreditNoteDeliveryEmail,
  buildCustomerPaymentReceiptDeliveryEmail,
  buildCustomerStatementDeliveryEmail,
  buildSalesInvoiceDeliveryEmail,
  buildSalesQuoteDeliveryEmail,
} from "./email-templates";

describe("sales invoice delivery template", () => {
  const input = {
    organizationName: "Example Trading",
    customerDisplayName: "Acme & Sons",
    invoiceNumber: "INV-00042",
    currency: "SAR",
    transactionTotal: "1,250.00",
    transactionBalanceDue: "900.00",
    dueDate: "2026-07-31",
  };

  it("builds the approved default subject and plain-text body", () => {
    expect(buildSalesInvoiceDeliveryEmail(input)).toMatchObject({
      subject: "Invoice INV-00042 from Example Trading",
      bodyText: expect.stringContaining("Balance due: SAR 900.00"),
    });
    expect(buildSalesInvoiceDeliveryEmail(input).bodyText).toContain("Please find invoice INV-00042 attached.");
  });

  it("escapes dynamic HTML and preserves a supplied message", () => {
    const result = buildSalesInvoiceDeliveryEmail({ ...input, message: "Please review <urgent> & confirm." });

    expect(result.bodyText).toBe("Please review <urgent> & confirm.");
    expect(result.bodyHtml).toContain("Please review &lt;urgent&gt; &amp; confirm.");
    expect(result.bodyHtml).not.toContain("<urgent>");
    expect(result.bodyHtml).not.toContain("internal");
  });

  it("builds escaped quote and proforma templates with distinct labels", () => {
    const quoteInput = {
      documentKind: "QUOTE",
      organizationName: "Example <Trading>",
      customerDisplayName: "Acme & Sons",
      quoteNumber: "QUO-00042",
      currency: "SAR",
      total: "1,250.00",
      expiryDate: null,
    } as const;
    const quote = buildSalesQuoteDeliveryEmail(quoteInput);
    const proforma = buildSalesQuoteDeliveryEmail({ ...quoteInput, documentKind: "PROFORMA" });

    expect(quote.subject).toBe("Quote QUO-00042 from Example <Trading>");
    expect(proforma.subject).toBe("Proforma QUO-00042 from Example <Trading>");
    expect(quote.bodyText).toContain("Valid until: Not specified");
    expect(quote.bodyHtml).toContain("Example &lt;Trading&gt;");
  });

  it("builds credit-note, payment-receipt, and statement templates without unsafe claims", () => {
    const creditNote = buildCreditNoteDeliveryEmail({
      organizationName: "Example Trading",
      customerDisplayName: "Acme",
      creditNoteNumber: "CN-00042",
      currency: "SAR",
      total: "100.00",
      issueDate: "2026-07-16",
      sourceInvoiceNumber: "INV-00042",
    });
    const payment = buildCustomerPaymentReceiptDeliveryEmail({
      organizationName: "Example Trading",
      customerDisplayName: "Acme",
      paymentNumber: "PAY-00042",
      paymentDate: "2026-07-16",
      currency: "SAR",
      amountReceived: "100.00",
      reference: "REF-42",
    });
    const statement = buildCustomerStatementDeliveryEmail({
      organizationName: "Example Trading",
      customerDisplayName: "Acme",
      periodFrom: "2026-01-01",
      periodTo: "2026-06-30",
      asOf: "2026-06-30",
      closingBalance: "100.00",
      currency: "SAR",
    });

    expect(creditNote.bodyText).toContain("Source invoice: INV-00042");
    expect(payment.bodyText).toContain("Reference: REF-42");
    expect(statement.bodyText).toContain("As of: 2026-06-30");
    expect(`${creditNote.bodyText}\n${payment.bodyText}\n${statement.bodyText}`).not.toMatch(/allocate|refund|reconcile|settled|cleared funds|delivered/i);
  });
});
