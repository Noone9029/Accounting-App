import { GUARDS_METADATA, PATH_METADATA } from "@nestjs/common/constants";
import { REQUIRED_PERMISSIONS_KEY } from "../auth/decorators/require-permissions.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "../auth/guards/organization-context.guard";
import { PermissionGuard } from "../auth/guards/permission.guard";
import { PublicApiController } from "./public-api.controller";
import { PERMISSIONS } from "@ledgerbyte/shared";

describe("PublicApiController", () => {
  it("requires JWT, organization context, and permission guards", () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, PublicApiController)).toEqual([
      JwtAuthGuard,
      OrganizationContextGuard,
      PermissionGuard,
    ]);
  });

  it("keeps public API v1 readiness and proof routes admin-gated", () => {
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, PublicApiController.prototype.readiness)).toEqual([
      PERMISSIONS.auditLogs.manageRetention,
    ]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, PublicApiController.prototype.paginationProof)).toEqual([
      PERMISSIONS.auditLogs.manageRetention,
    ]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, PublicApiController.prototype.idempotencyProof)).toEqual([
      PERMISSIONS.auditLogs.manageRetention,
    ]);
  });

  it("exposes authenticated read-only currency and FX-rate routes with exact permissions", () => {
    expect(Reflect.getMetadata(PATH_METADATA, PublicApiController.prototype.currencies)).toBe("currencies");
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, PublicApiController.prototype.currencies)).toEqual([
      PERMISSIONS.currencies.read,
    ]);
    expect(Reflect.getMetadata(PATH_METADATA, PublicApiController.prototype.fxRates)).toBe("fx-rates");
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, PublicApiController.prototype.fxRates)).toEqual([
      PERMISSIONS.fxRates.read,
    ]);
  });

  it("delegates versioned readiness and pagination proof behavior", () => {
    const service = {
      readiness: jest.fn(() => ({ version: "v1", publicUnauthenticatedAccess: false })),
      paginated: jest.fn(() => ({ items: [], meta: { page: 1, pageSize: 25 } })),
      idempotencyProof: jest.fn(),
      currencies: jest.fn(() => ({ baseCurrency: "AED", items: [], liveRateProviderEnabled: false })),
      fxRates: jest.fn(() => ({ items: [], meta: { page: 2, pageSize: 10 } })),
    };
    const controller = new PublicApiController(service as never);

    expect(controller.readiness()).toEqual({ version: "v1", publicUnauthenticatedAccess: false });
    expect(controller.paginationProof("1", "2")).toEqual({ items: [], meta: { page: 1, pageSize: 25 } });
    expect(service.paginated).toHaveBeenCalledWith(expect.any(Array), 1, 2);

    expect(controller.currencies("org-1")).toEqual({
      baseCurrency: "AED",
      items: [],
      liveRateProviderEnabled: false,
    });
    expect(service.currencies).toHaveBeenCalledWith("org-1");

    const query = { page: 2, pageSize: 10, transactionCurrency: "USD", rateDate: "2026-07-10" };
    expect(controller.fxRates("org-1", query)).toEqual({ items: [], meta: { page: 2, pageSize: 10 } });
    expect(service.fxRates).toHaveBeenCalledWith("org-1", query);
  });
});
