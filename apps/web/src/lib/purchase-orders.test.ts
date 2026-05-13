import { calculateInvoicePreview } from "./money";
import { PERMISSIONS } from "./permissions";
import {
  canApprovePurchaseOrder,
  canClosePurchaseOrder,
  canConvertPurchaseOrderToBill,
  canEditPurchaseOrder,
  canMarkPurchaseOrderSent,
  canShowPurchaseOrderAction,
  canVoidPurchaseOrder,
  purchaseOrderStatusLabel,
} from "./purchase-orders";

describe("purchase order helpers", () => {
  it("maps lifecycle states to allowed operations", () => {
    expect(canEditPurchaseOrder("DRAFT")).toBe(true);
    expect(canEditPurchaseOrder("APPROVED")).toBe(false);
    expect(canApprovePurchaseOrder("DRAFT")).toBe(true);
    expect(canMarkPurchaseOrderSent("APPROVED")).toBe(true);
    expect(canConvertPurchaseOrderToBill("SENT")).toBe(true);
    expect(canClosePurchaseOrder("SENT")).toBe(true);
    expect(canVoidPurchaseOrder("BILLED")).toBe(false);
  });

  it("formats status labels", () => {
    expect(purchaseOrderStatusLabel("PARTIALLY_BILLED")).toBe("Partially Billed");
  });

  it("checks action visibility against permissions", () => {
    const subject = { role: { permissions: [PERMISSIONS.purchaseOrders.view, PERMISSIONS.purchaseOrders.convertToBill] } };

    expect(canShowPurchaseOrderAction(subject, "convert", "APPROVED")).toBe(true);
    expect(canShowPurchaseOrderAction(subject, "void", "APPROVED")).toBe(false);
  });

  it("previews purchase order totals using invoice math", () => {
    const preview = calculateInvoicePreview([{ quantity: "2.0000", unitPrice: "100.0000", discountRate: "10.0000", taxRate: "15.0000" }]);

    expect(preview).toMatchObject({
      subtotal: "200.0000",
      discountTotal: "20.0000",
      taxableTotal: "180.0000",
      taxTotal: "27.0000",
      total: "207.0000",
    });
  });
});
