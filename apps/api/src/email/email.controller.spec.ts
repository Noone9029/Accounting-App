import { PERMISSIONS } from "@ledgerbyte/shared";
import { REQUIRED_PERMISSIONS_KEY } from "../auth/decorators/require-permissions.decorator";
import { EmailController } from "./email.controller";

describe("EmailController permissions", () => {
  it("requires email outbox view permission", () => {
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, EmailController.prototype.readiness)).toEqual([
      PERMISSIONS.emailOutbox.view,
      PERMISSIONS.users.manage,
    ]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, EmailController.prototype.runDiagnostics)).toEqual([PERMISSIONS.users.manage]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, EmailController.prototype.diagnosticsPlan)).toEqual([PERMISSIONS.users.manage]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, EmailController.prototype.invoicePaymentReadiness)).toEqual([PERMISSIONS.users.manage]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, EmailController.prototype.invoicePaymentPreview)).toEqual([PERMISSIONS.users.manage]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, EmailController.prototype.invoicePaymentDeliveryBlocked)).toEqual([PERMISSIONS.users.manage]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, EmailController.prototype.listSenderDomainEvidence)).toEqual([PERMISSIONS.users.manage]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, EmailController.prototype.createSenderDomainEvidence)).toEqual([PERMISSIONS.users.manage]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, EmailController.prototype.verifySenderDomainEvidence)).toEqual([PERMISSIONS.users.manage]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, EmailController.prototype.revokeSenderDomainEvidence)).toEqual([PERMISSIONS.users.manage]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, EmailController.prototype.retryPlan)).toEqual([PERMISSIONS.users.manage]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, EmailController.prototype.retryProcess)).toEqual([PERMISSIONS.users.manage]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, (EmailController.prototype as any).retryWorkerPlan)).toEqual([PERMISSIONS.users.manage]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, (EmailController.prototype as any).retryWorkerRun)).toEqual([PERMISSIONS.users.manage]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, (EmailController.prototype as any).monitoringPlan)).toEqual([PERMISSIONS.users.manage]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, (EmailController.prototype as any).listMonitoringEvidence)).toEqual([PERMISSIONS.users.manage]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, (EmailController.prototype as any).createMonitoringEvidence)).toEqual([PERMISSIONS.users.manage]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, (EmailController.prototype as any).verifyMonitoringEvidence)).toEqual([PERMISSIONS.users.manage]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, (EmailController.prototype as any).revokeMonitoringEvidence)).toEqual([PERMISSIONS.users.manage]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, EmailController.prototype.providerEventsPlan)).toEqual([PERMISSIONS.users.manage]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, EmailController.prototype.receiveMockProviderEvent)).toEqual([PERMISSIONS.users.manage]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, EmailController.prototype.providerWebhookPlan)).toEqual([PERMISSIONS.users.manage]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, EmailController.prototype.receiveProviderWebhook)).toEqual([PERMISSIONS.users.manage]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, EmailController.prototype.listSuppressions)).toEqual([PERMISSIONS.users.manage]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, EmailController.prototype.createSuppression)).toEqual([PERMISSIONS.users.manage]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, EmailController.prototype.revokeSuppression)).toEqual([PERMISSIONS.users.manage]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, EmailController.prototype.sendTestEmail)).toEqual([PERMISSIONS.users.manage]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, (EmailController.prototype as any).createApGeneratedDocumentOutbox)).toEqual([
      PERMISSIONS.emailOutbox.view,
    ]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, EmailController.prototype.listOutbox)).toEqual([PERMISSIONS.emailOutbox.view]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, EmailController.prototype.getOutbox)).toEqual([PERMISSIONS.emailOutbox.view]);
  });
});
