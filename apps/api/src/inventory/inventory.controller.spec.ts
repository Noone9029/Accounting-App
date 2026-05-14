import { PERMISSIONS } from "@ledgerbyte/shared";
import { REQUIRED_PERMISSIONS_KEY } from "../auth/decorators/require-permissions.decorator";
import { InventoryController } from "./inventory.controller";
import { InventoryVarianceProposalController } from "./inventory-variance-proposal.controller";

describe("InventoryController permissions", () => {
  it("requires inventory view permission for settings", () => {
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, InventoryController.prototype.settings)).toEqual([
      PERMISSIONS.inventory.view,
    ]);
  });

  it("requires inventory manage permission for settings updates", () => {
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, InventoryController.prototype.updateSettings)).toEqual([
      PERMISSIONS.inventory.manage,
    ]);
  });

  it("requires inventory permissions for accounting settings", () => {
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, InventoryController.prototype.accountingSettings)).toEqual([
      PERMISSIONS.inventory.view,
    ]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, InventoryController.prototype.updateAccountingSettings)).toEqual([
      PERMISSIONS.inventory.manage,
    ]);
  });

  it("requires inventory view permission for purchase receipt posting readiness", () => {
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, InventoryController.prototype.purchaseReceiptPostingReadiness)).toEqual([
      PERMISSIONS.inventory.view,
    ]);
  });

  it("requires inventory view permission for balances", () => {
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, InventoryController.prototype.balances)).toEqual([
      PERMISSIONS.inventory.view,
    ]);
  });

  it("requires inventory view permission for inventory reports", () => {
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, InventoryController.prototype.stockValuationReport)).toEqual([
      PERMISSIONS.inventory.view,
    ]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, InventoryController.prototype.movementSummaryReport)).toEqual([
      PERMISSIONS.inventory.view,
    ]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, InventoryController.prototype.lowStockReport)).toEqual([
      PERMISSIONS.inventory.view,
    ]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, InventoryController.prototype.clearingReconciliationReport)).toEqual([
      PERMISSIONS.inventory.view,
    ]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, InventoryController.prototype.clearingVarianceReport)).toEqual([
      PERMISSIONS.inventory.view,
    ]);
  });

  it("requires variance proposal permissions for proposal workflow", () => {
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, InventoryVarianceProposalController.prototype.list)).toEqual([
      PERMISSIONS.inventory.varianceProposalsView,
    ]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, InventoryVarianceProposalController.prototype.get)).toEqual([
      PERMISSIONS.inventory.varianceProposalsView,
    ]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, InventoryVarianceProposalController.prototype.events)).toEqual([
      PERMISSIONS.inventory.varianceProposalsView,
    ]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, InventoryVarianceProposalController.prototype.createManual)).toEqual([
      PERMISSIONS.inventory.varianceProposalsCreate,
    ]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, InventoryVarianceProposalController.prototype.createFromClearingVariance)).toEqual([
      PERMISSIONS.inventory.varianceProposalsCreate,
    ]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, InventoryVarianceProposalController.prototype.accountingPreview)).toEqual([
      PERMISSIONS.inventory.varianceProposalsView,
    ]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, InventoryVarianceProposalController.prototype.submit)).toEqual([
      PERMISSIONS.inventory.varianceProposalsCreate,
    ]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, InventoryVarianceProposalController.prototype.approve)).toEqual([
      PERMISSIONS.inventory.varianceProposalsApprove,
    ]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, InventoryVarianceProposalController.prototype.post)).toEqual([
      PERMISSIONS.inventory.varianceProposalsPost,
    ]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, InventoryVarianceProposalController.prototype.reverse)).toEqual([
      PERMISSIONS.inventory.varianceProposalsReverse,
    ]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, InventoryVarianceProposalController.prototype.void)).toEqual([
      PERMISSIONS.inventory.varianceProposalsVoid,
    ]);
  });
});
