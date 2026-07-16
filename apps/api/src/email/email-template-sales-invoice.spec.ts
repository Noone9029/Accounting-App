import { buildSalesInvoiceDeliveryEmail } from "./email-templates";

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
});
