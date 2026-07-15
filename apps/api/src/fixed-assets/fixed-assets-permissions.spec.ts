import { PERMISSIONS } from "@ledgerbyte/shared";

describe("fixed asset permissions", () => {
  it("exposes granular permissions for register, capitalization, depreciation, disposal, and reports", () => {
    expect(PERMISSIONS.fixedAssets).toEqual({
      read: "fixedAssets.read",
      manage: "fixedAssets.manage",
      categoriesManage: "fixedAssets.categories.manage",
      capitalize: "fixedAssets.capitalize",
      depreciationReview: "fixedAssets.depreciation.review",
      depreciationPost: "fixedAssets.depreciation.post",
      dispose: "fixedAssets.dispose",
      reports: "fixedAssets.reports",
    });
  });
});
