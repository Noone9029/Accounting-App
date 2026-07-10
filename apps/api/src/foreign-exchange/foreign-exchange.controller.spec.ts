import { GUARDS_METADATA, PATH_METADATA } from "@nestjs/common/constants";
import { PERMISSIONS } from "@ledgerbyte/shared";
import { REQUIRED_PERMISSIONS_KEY } from "../auth/decorators/require-permissions.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "../auth/guards/organization-context.guard";
import { PermissionGuard } from "../auth/guards/permission.guard";
import { ForeignExchangeController } from "./foreign-exchange.controller";

describe("ForeignExchangeController", () => {
  it("uses the fx route and tenant authentication guards", () => {
    expect(Reflect.getMetadata(PATH_METADATA, ForeignExchangeController)).toBe("fx");
    expect(Reflect.getMetadata(GUARDS_METADATA, ForeignExchangeController)).toEqual([
      JwtAuthGuard,
      OrganizationContextGuard,
      PermissionGuard,
    ]);
  });

  it.each(["currencies", "getAccountConfiguration", "readiness"] as const)("requires currencies.read for %s", (method) => {
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, ForeignExchangeController.prototype[method])).toEqual([
      PERMISSIONS.currencies.read,
    ]);
  });

  it("requires fxRates.read for rate listing", () => {
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, ForeignExchangeController.prototype.listRates)).toEqual([
      PERMISSIONS.fxRates.read,
    ]);
  });

  it("requires fxRates.manage for manual rate capture", () => {
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, ForeignExchangeController.prototype.createRate)).toEqual([
      PERMISSIONS.fxRates.manage,
    ]);
  });

  it("requires currencies.manage for FX account configuration", () => {
    expect(
      Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, ForeignExchangeController.prototype.updateAccountConfiguration),
    ).toEqual([
      PERMISSIONS.currencies.manage,
    ]);
  });
});
