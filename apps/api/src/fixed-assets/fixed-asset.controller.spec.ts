import { PERMISSIONS } from "@ledgerbyte/shared";
import { REQUIRED_PERMISSIONS_KEY } from "../auth/decorators/require-permissions.decorator";
import { FixedAssetController } from "./fixed-asset.controller";
import { FixedAssetReportsController } from "./fixed-asset-reports.controller";

describe("fixed-asset controller permission contracts", () => {
  const required = (prototype: object, method: string) => Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, (prototype as any)[method] as object);

  it("protects read, lifecycle, and posting actions with distinct permissions", () => {
    expect(required(FixedAssetController.prototype, "list")).toEqual([PERMISSIONS.fixedAssets.read]);
    expect(required(FixedAssetController.prototype, "create")).toEqual([PERMISSIONS.fixedAssets.manage]);
    expect(required(FixedAssetController.prototype, "capitalize")).toEqual([PERMISSIONS.fixedAssets.capitalize]);
    expect(required(FixedAssetController.prototype, "reviewDepreciation")).toEqual([PERMISSIONS.fixedAssets.depreciationReview]);
    expect(required(FixedAssetController.prototype, "postDepreciation")).toEqual([PERMISSIONS.fixedAssets.depreciationPost]);
    expect(required(FixedAssetController.prototype, "dispose")).toEqual([PERMISSIONS.fixedAssets.dispose]);
    expect(required(FixedAssetController.prototype, "reviewDisposal")).toEqual([PERMISSIONS.fixedAssets.dispose]);
  });

  it("protects category administration and fixed-asset reports", () => {
    expect(required(FixedAssetController.prototype, "createCategory")).toEqual([PERMISSIONS.fixedAssets.categoriesManage]);
    expect(required(FixedAssetController.prototype, "archiveCategory")).toEqual([PERMISSIONS.fixedAssets.categoriesManage]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, FixedAssetReportsController)).toEqual([PERMISSIONS.fixedAssets.reports]);
  });
});
