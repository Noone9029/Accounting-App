import { PERMISSIONS } from "@ledgerbyte/shared";
import { REQUIRED_PERMISSIONS_KEY } from "../auth/decorators/require-permissions.decorator";
import { SalesInvoiceController } from "./sales-invoice.controller";

describe("SalesInvoiceController workflow summary", () => {
  it("requires sales invoice view permission for workflow summary access", () => {
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, SalesInvoiceController.prototype.workflowSummary)).toEqual([
      PERMISSIONS.salesInvoices.view,
    ]);
  });

  it("routes workflow summary requests to the read-only invoice workflow service", async () => {
    const salesInvoiceService = {
      workflowSummary: jest.fn().mockResolvedValue({ document: { id: "invoice-1" }, availableActions: ["generatePdf"] }),
    };
    const controller = new SalesInvoiceController(salesInvoiceService as never, {} as never);

    await expect(controller.workflowSummary("org-1", "invoice-1")).resolves.toMatchObject({
      document: { id: "invoice-1" },
      availableActions: ["generatePdf"],
    });
    expect(salesInvoiceService.workflowSummary).toHaveBeenCalledWith("org-1", "invoice-1");
  });
});
