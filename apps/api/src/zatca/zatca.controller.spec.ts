import { GUARDS_METADATA } from "@nestjs/common/constants";
import { PERMISSIONS } from "@ledgerbyte/shared";
import { REQUIRED_PERMISSIONS_KEY } from "../auth/decorators/require-permissions.decorator";
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
    expect(typeof ZatcaController.prototype.getEgsSandboxCsidRequestSchemaPlan).toBe("function");
    expect(typeof ZatcaController.prototype.getEgsComplianceCsidRequestDryRun).toBe("function");
  });

  it("exposes the compliance CSID custody plan handler", () => {
    expect(typeof ZatcaController.prototype.getEgsComplianceCsidCustodyPlan).toBe("function");
    expect(typeof ZatcaController.prototype.getComplianceCsidCustodyProviderReadiness).toBe("function");
    expect(typeof ZatcaController.prototype.getComplianceCsidCustodyProviderConfigurationPlan).toBe("function");
  });

  it("exposes compliance CSID custody record handlers", () => {
    expect(typeof ZatcaController.prototype.listComplianceCsidCustodyRecords).toBe("function");
    expect(typeof ZatcaController.prototype.createComplianceCsidCustodyRecord).toBe("function");
    expect(typeof ZatcaController.prototype.revokeComplianceCsidCustodyRecord).toBe("function");
  });

  it("requires specific ZATCA invoice action permissions", () => {
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, ZatcaController.prototype.generateInvoiceCompliance)).toEqual([
      PERMISSIONS.zatca.generateXml,
    ]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, ZatcaController.prototype.submitInvoiceComplianceCheck)).toEqual([
      PERMISSIONS.zatca.runChecks,
    ]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, ZatcaController.prototype.invoiceLocalSigningDryRun)).toEqual([
      PERMISSIONS.zatca.signingDryRun,
    ]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, ZatcaController.prototype.invoiceLocalSignedXmlValidationDryRun)).toEqual([
      PERMISSIONS.zatca.signingDryRun,
    ]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, ZatcaController.prototype.requestInvoiceClearance)).toEqual([
      PERMISSIONS.zatca.submit,
    ]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, ZatcaController.prototype.requestInvoiceReporting)).toEqual([
      PERMISSIONS.zatca.submit,
    ]);
  });
});
