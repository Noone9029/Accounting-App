import { GUARDS_METADATA } from "@nestjs/common/constants";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "../auth/guards/organization-context.guard";
import { ZatcaController } from "./zatca.controller";

describe("ZATCA controller", () => {
  it("requires authentication and organization context for checklist/readiness endpoints", () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, ZatcaController);

    expect(guards).toEqual(expect.arrayContaining([JwtAuthGuard, OrganizationContextGuard]));
  });

  it("exposes the local signing dry-run handler", () => {
    expect(typeof ZatcaController.prototype.invoiceLocalSigningDryRun).toBe("function");
  });

  it("exposes the signed XML promotion plan handler", () => {
    expect(typeof ZatcaController.prototype.invoiceSignedXmlPromotionPlan).toBe("function");
  });

  it("exposes the signed artifact storage plan handler", () => {
    expect(typeof ZatcaController.prototype.invoiceSignedArtifactStoragePlan).toBe("function");
  });

  it("exposes signed artifact draft handlers", () => {
    expect(typeof ZatcaController.prototype.createInvoiceZatcaSignedArtifactDraft).toBe("function");
    expect(typeof ZatcaController.prototype.listInvoiceZatcaSignedArtifactDrafts).toBe("function");
  });
});
