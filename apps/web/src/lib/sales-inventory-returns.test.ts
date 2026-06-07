import {
  canPostSalesInventoryReturnMovement,
  salesInventoryReturnMovementStatusLabel,
  salesInventoryReturnSourceHref,
  salesInventoryReturnSourceLabel,
  salesInventoryReturnStatusBadgeClass,
  salesInventoryReturnStatusLabel,
} from "./sales-inventory-returns";
import type { SalesInventoryReturn, SalesInventoryReturnInventoryMovementPreview } from "./types";

describe("sales inventory return helpers", () => {
  it("labels lifecycle statuses and safe sources", () => {
    expect(salesInventoryReturnStatusLabel("DRAFT")).toBe("Draft");
    expect(salesInventoryReturnStatusLabel("RECEIVED")).toBe("Received");
    expect(salesInventoryReturnStatusBadgeClass("CANCELLED")).toContain("rose");
    expect(salesInventoryReturnSourceLabel(salesReturnFixture({ sourceSalesStockIssue: { id: "ssi-1", issueNumber: "SSI-000001", status: "POSTED" } }))).toBe(
      "Stock issue SSI-000001",
    );
    expect(salesInventoryReturnSourceHref(salesReturnFixture({ sourceDeliveryNote: { id: "dn-1", deliveryNoteNumber: "DN-000001", status: "DELIVERED" } }))).toBe(
      "/sales/delivery-notes/dn-1",
    );
  });

  it("labels movement status and gates explicit stock-in posting", () => {
    expect(salesInventoryReturnMovementStatusLabel(salesReturnFixture())).toBe("Not posted");
    expect(salesInventoryReturnMovementStatusLabel(salesReturnFixture({ inventoryReturnMovementStatus: "POSTED", inventoryReturnPostedAt: "2026-06-06T12:00:00.000Z" }))).toBe("Posted");

    expect(canPostSalesInventoryReturnMovement(previewFixture({ canPost: true }), true)).toBe(true);
    expect(canPostSalesInventoryReturnMovement(previewFixture({ canPost: true }), false)).toBe(false);
    expect(canPostSalesInventoryReturnMovement(previewFixture({ alreadyPosted: true, inventoryMovementStatus: "POSTED" }), true)).toBe(false);
  });
});

function salesReturnFixture(overrides: Partial<SalesInventoryReturn> = {}): SalesInventoryReturn {
  return {
    id: "sir-1",
    organizationId: "org-1",
    customerId: "customer-1",
    salesReturnNumber: "SRN-000001",
    status: "APPROVED",
    returnDate: "2026-06-06T00:00:00.000Z",
    reason: null,
    reference: null,
    sourceSalesInvoiceId: null,
    sourceCreditNoteId: null,
    sourceDeliveryNoteId: null,
    sourceSalesStockIssueId: null,
    notes: null,
    createdByUserId: null,
    approvedByUserId: null,
    inventoryReturnPostedByUserId: null,
    approvedAt: null,
    receivedAt: null,
    cancelledAt: null,
    voidedAt: null,
    inventoryReturnPostedAt: null,
    createdAt: "2026-06-06T00:00:00.000Z",
    updatedAt: "2026-06-06T00:00:00.000Z",
    sourceSalesInvoice: null,
    sourceCreditNote: null,
    sourceDeliveryNote: null,
    sourceSalesStockIssue: null,
    lines: [],
    ...overrides,
  };
}

function previewFixture(overrides: Partial<SalesInventoryReturnInventoryMovementPreview> = {}): SalesInventoryReturnInventoryMovementPreview {
  return {
    readOnly: true,
    previewOnly: true,
    noPostingEffect: true,
    noAccountingEffect: true,
    noArEffect: true,
    noVatEffect: true,
    noZatcaEffect: true,
    sourceType: "SalesInventoryReturn",
    sourceSalesInventoryReturn: { id: "sir-1", salesReturnNumber: "SRN-000001", status: "APPROVED" },
    inventoryMovementStatus: "NOT_POSTED",
    canPost: false,
    alreadyPosted: false,
    reversalSupported: false,
    postedAt: null,
    movementIds: [],
    blockingReasons: [],
    warnings: [],
    safeHelperText: "Safe helper",
    lines: [],
    ...overrides,
  };
}
