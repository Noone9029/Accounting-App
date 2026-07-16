import {
  buildPurchaseDebitNoteDeliveryEmail,
  buildPurchaseOrderDeliveryEmail,
  buildSupplierPaymentRemittanceDeliveryEmail,
  buildSupplierStatementDeliveryEmail,
} from "./email-templates";

describe("supplier document delivery templates", () => {
  it("builds an escaped purchase-order message with the approved fields", () => {
    const result = buildPurchaseOrderDeliveryEmail({
      organizationName: "Example <Trading>",
      supplierDisplayName: "Acme & Sons",
      purchaseOrderNumber: "PO-00042",
      currency: "SAR",
      total: "1,250.00",
      orderDate: "2026-07-16",
      expectedDeliveryDate: null,
    });

    expect(result.subject).toBe("Purchase order PO-00042 from Example <Trading>");
    expect(result.bodyText).toContain("Expected delivery: Not specified");
    expect(result.bodyHtml).toContain("Example &lt;Trading&gt;");
    expect(result.bodyHtml).toContain("Acme &amp; Sons");
    expect(result.bodyText).not.toMatch(/accepted|received|billed|paid/i);
  });

  it("builds a debit-note message without allocation or refund claims", () => {
    const result = buildPurchaseDebitNoteDeliveryEmail({
      organizationName: "Example Trading",
      supplierDisplayName: "Acme",
      debitNoteNumber: "DN-00042",
      currency: "SAR",
      transactionTotal: "100.00",
      issueDate: "2026-07-16",
      originalBillNumber: null,
    });

    expect(result.subject).toBe("Purchase debit note DN-00042 from Example Trading");
    expect(result.bodyText).toContain("Related bill: Not specified");
    expect(result.bodyText).not.toMatch(/allocate|refund|settlement/i);
  });

  it("uses remittance terminology and avoids provider or settlement claims", () => {
    const result = buildSupplierPaymentRemittanceDeliveryEmail({
      organizationName: "Example Trading",
      supplierDisplayName: "Acme",
      paymentNumber: "PAY-00042",
      currency: "SAR",
      transactionAmountPaid: "100.00",
      paymentDate: "2026-07-16",
      safeDescription: "Invoice batch 42",
    });

    expect(result.subject).toBe("Payment remittance PAY-00042 from Example Trading");
    expect(result.bodyText).toContain("Please find payment remittance PAY-00042 attached.");
    expect(result.bodyText).not.toMatch(/cleared funds|bank settlement|reconciliation|provider confirmation|payment initiation/i);
  });

  it("consumes the authoritative supplier statement result and escapes dynamic values", () => {
    const result = buildSupplierStatementDeliveryEmail({
      organizationName: "Example <Trading>",
      supplierDisplayName: "Acme & Sons",
      periodLabel: "2026-01-01 to 2026-06-30",
      asOf: "2026-06-30",
      currency: "SAR",
      closingBalance: "100.00",
    });

    expect(result.subject).toBe("Supplier statement from Example <Trading>, 2026-01-01 to 2026-06-30");
    expect(result.bodyText).toContain("Closing balance: SAR 100.00");
    expect(result.bodyHtml).toContain("Example &lt;Trading&gt;");
    expect(result.bodyHtml).toContain("Acme &amp; Sons");
  });
});
