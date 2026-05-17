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

  it("exposes signed artifact storage probe handlers", () => {
    expect(typeof ZatcaController.prototype.signedArtifactStorageProbePlan).toBe("function");
    expect(typeof ZatcaController.prototype.runSignedArtifactStorageProbe).toBe("function");
  });

  it("exposes the signed artifact immutable storage policy plan handler", () => {
    expect(typeof ZatcaController.prototype.signedArtifactImmutableStoragePolicyPlan).toBe("function");
  });

  it("exposes signed artifact immutable storage policy approval handlers", () => {
    expect(typeof ZatcaController.prototype.createSignedArtifactStoragePolicyApproval).toBe("function");
    expect(typeof ZatcaController.prototype.listSignedArtifactStoragePolicyApprovals).toBe("function");
    expect(typeof ZatcaController.prototype.approveSignedArtifactStoragePolicyApproval).toBe("function");
    expect(typeof ZatcaController.prototype.revokeSignedArtifactStoragePolicyApproval).toBe("function");
  });

  it("exposes signed artifact storage control evidence handlers", () => {
    expect(typeof ZatcaController.prototype.createSignedArtifactStorageControlEvidence).toBe("function");
    expect(typeof ZatcaController.prototype.listSignedArtifactStorageControlEvidence).toBe("function");
    expect(typeof ZatcaController.prototype.signedArtifactStorageEvidenceCompleteness).toBe("function");
    expect(typeof ZatcaController.prototype.verifySignedArtifactStorageControlEvidence).toBe("function");
    expect(typeof ZatcaController.prototype.revokeSignedArtifactStorageControlEvidence).toBe("function");
  });

  it("exposes compliance CSID onboarding plan handlers", () => {
    expect(typeof ZatcaController.prototype.getEgsComplianceCsidRequestPlan).toBe("function");
    expect(typeof ZatcaController.prototype.getEgsComplianceCsidRequestDryRun).toBe("function");
  });
});
