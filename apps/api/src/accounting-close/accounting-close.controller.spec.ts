import { PERMISSIONS } from "@ledgerbyte/shared";
import { REQUIRED_PERMISSIONS_KEY } from "../auth/decorators/require-permissions.decorator";
import { AccountingCloseController } from "./accounting-close.controller";

describe("AccountingCloseController permissions", () => {
  it("reserves returning a reviewed cycle to an authorized reviewer", () => {
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, AccountingCloseController.prototype.returnCycleToPreparer)).toEqual([
      PERMISSIONS.accountingClose.review,
    ]);
  });

  it("forwards the required Idempotency-Key header for terminal close mutations", () => {
    const closeCycle = jest.fn();
    const lockCycle = jest.fn();
    const controller = new AccountingCloseController({ closeCycle, lockCycle } as never);
    const user = { id: "user-1" } as never;

    controller.closeCycle("org-1", user, "cycle-1", "close-cycle-0001", { expectedVersion: 7 });
    controller.lockCycle("org-1", user, "cycle-1", "lock-cycle-0001", { expectedVersion: 8 });

    expect(closeCycle).toHaveBeenCalledWith("org-1", "user-1", "cycle-1", 7, "close-cycle-0001");
    expect(lockCycle).toHaveBeenCalledWith("org-1", "user-1", "cycle-1", 8, "lock-cycle-0001");
  });

  it("reserves bounded task assignee lookup to close managers", () => {
    const listAssignableMembers = jest.fn();
    const controller = new AccountingCloseController({ listAssignableMembers } as never);

    controller.listAssignableMembers("org-1", "cycle-1", { query: "review", page: 1, pageSize: 25 });

    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, AccountingCloseController.prototype.listAssignableMembers)).toEqual([
      PERMISSIONS.accountingClose.manage,
    ]);
    expect(listAssignableMembers).toHaveBeenCalledWith("org-1", "cycle-1", "review", 1, 25);
  });

  it("reserves the single-user demo policy to organization updaters", () => {
    const updateSignoffPolicy = jest.fn();
    const controller = new AccountingCloseController({ updateSignoffPolicy } as never);
    const user = { id: "user-1" } as never;

    controller.updateSignoffPolicy("org-1", user, { accountingCloseSingleUserDemoSignoffEnabled: true });

    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, AccountingCloseController.prototype.updateSignoffPolicy)).toEqual([
      PERMISSIONS.organization.update,
    ]);
    expect(updateSignoffPolicy).toHaveBeenCalledWith("org-1", "user-1", true);
  });

  it("streams the existing safe close-evidence manifest as a PDF attachment", async () => {
    const manifest = { cycle: { id: "cycle-1" } };
    const exportCycleEvidence = jest.fn().mockResolvedValue(manifest);
    const exportCycleEvidencePdf = jest.fn().mockResolvedValue({
      filename: "accounting-close-evidence-cycle-1.pdf",
      content: Buffer.from("%PDF-safe-close-evidence"),
    });
    const controller = new AccountingCloseController({ exportCycleEvidence, exportCycleEvidencePdf } as never);
    const setHeader = jest.fn();
    const response = { setHeader } as never;

    await expect(controller.exportCycleEvidence("org-1", "cycle-1", { format: "pdf" } as never, response)).resolves.toEqual(Buffer.from("%PDF-safe-close-evidence"));

    expect(exportCycleEvidence).toHaveBeenCalledWith("org-1", "cycle-1");
    expect(exportCycleEvidencePdf).toHaveBeenCalledWith(manifest);
    expect(setHeader).toHaveBeenCalledWith("content-type", "application/pdf");
    expect(setHeader).toHaveBeenCalledWith("content-disposition", 'attachment; filename="accounting-close-evidence-cycle-1.pdf"');
  });
});
