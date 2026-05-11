import { GUARDS_METADATA } from "@nestjs/common/constants";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "../auth/guards/organization-context.guard";
import { ZatcaController } from "./zatca.controller";

describe("ZATCA controller", () => {
  it("requires authentication and organization context for checklist/readiness endpoints", () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, ZatcaController);

    expect(guards).toEqual(expect.arrayContaining([JwtAuthGuard, OrganizationContextGuard]));
  });
});
