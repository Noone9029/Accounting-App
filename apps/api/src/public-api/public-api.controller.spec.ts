import { REQUIRED_PERMISSIONS_KEY } from "../auth/decorators/require-permissions.decorator";
import { PublicApiController } from "./public-api.controller";
import { PERMISSIONS } from "@ledgerbyte/shared";

describe("PublicApiController", () => {
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

  it("delegates versioned readiness and pagination proof behavior", () => {
    const service = {
      readiness: jest.fn(() => ({ version: "v1", publicUnauthenticatedAccess: false })),
      paginated: jest.fn(() => ({ items: [], meta: { page: 1, pageSize: 25 } })),
      idempotencyProof: jest.fn(),
    };
    const controller = new PublicApiController(service as never);

    expect(controller.readiness()).toEqual({ version: "v1", publicUnauthenticatedAccess: false });
    expect(controller.paginationProof("1", "2")).toEqual({ items: [], meta: { page: 1, pageSize: 25 } });
    expect(service.paginated).toHaveBeenCalledWith(expect.any(Array), 1, 2);
  });
});
