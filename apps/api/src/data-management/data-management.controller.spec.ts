import { PERMISSIONS } from "@ledgerbyte/shared";
import { REQUIRED_PERMISSIONS_KEY } from "../auth/decorators/require-permissions.decorator";
import { DataManagementController } from "./data-management.controller";

describe("DataManagementController permissions", () => {
  it("requires export permission for the export manifest endpoint", () => {
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, DataManagementController.prototype.exportManifest)).toEqual([
      PERMISSIONS.reports.export,
    ]);
  });

  it("delegates export manifest requests to the data management service", async () => {
    const exportManifest = jest.fn().mockResolvedValue({ status: "PLAN_ONLY" });
    const controller = new DataManagementController({ exportManifest } as never);

    await expect(controller.exportManifest("org-1")).resolves.toEqual({ status: "PLAN_ONLY" });
    expect(exportManifest).toHaveBeenCalledWith("org-1");
  });
});
