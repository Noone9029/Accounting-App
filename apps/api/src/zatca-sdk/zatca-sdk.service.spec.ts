import { BadRequestException } from "@nestjs/common";
import { GUARDS_METADATA } from "@nestjs/common/constants";
import { PERMISSIONS } from "@ledgerbyte/shared";
import { REQUIRED_PERMISSIONS_KEY } from "../auth/decorators/require-permissions.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "../auth/guards/organization-context.guard";
import { ZatcaSdkController } from "./zatca-sdk.controller";
import { extractZatcaSdkValidationMessages, sanitizeZatcaSdkOutput, ZatcaSdkService } from "./zatca-sdk.service";

describe("ZATCA SDK controller", () => {
  it("requires authentication and organization context", () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, ZatcaSdkController);

    expect(guards).toEqual(expect.arrayContaining([JwtAuthGuard, OrganizationContextGuard]));
  });

  it("allows run-check or manage permission for local SDK validation endpoints", () => {
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, ZatcaSdkController.prototype.validateXmlLocal)).toEqual([
      PERMISSIONS.zatca.runChecks,
      PERMISSIONS.zatca.manage,
    ]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, ZatcaSdkController.prototype.validateReferenceFixture)).toEqual([
      PERMISSIONS.zatca.runChecks,
      PERMISSIONS.zatca.manage,
    ]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, ZatcaSdkController.prototype.validateInvoiceXmlLocal)).toEqual([
      PERMISSIONS.zatca.runChecks,
      PERMISSIONS.zatca.manage,
    ]);
  });
});

describe("ZATCA SDK service", () => {
  const xmlBase64 = Buffer.from("<Invoice><cbc:ID>INV-1</cbc:ID></Invoice>", "utf8").toString("base64");

  afterEach(() => {
    delete process.env.ZATCA_SDK_EXECUTION_ENABLED;
    delete process.env.ZATCA_SDK_JAR_PATH;
    delete process.env.ZATCA_SDK_CONFIG_DIR;
    delete process.env.ZATCA_SDK_WORK_DIR;
    delete process.env.ZATCA_SDK_JAVA_BIN;
    delete process.env.ZATCA_SDK_TIMEOUT_MS;
  });

  it("readiness reports execution disabled by default without exposing secrets", () => {
    process.env.ZATCA_SDK_JAR_PATH = "C:\\secret\\sdk.jar";
    process.env.ZATCA_SDK_CONFIG_DIR = "C:\\secret\\Configuration";

    const service = new ZatcaSdkService({} as never);
    const readiness = service.getReadiness();

    expect(readiness.enabled).toBe(false);
    expect(readiness.canRunLocalValidation).toBe(false);
    expect(readiness.blockingReasons.join(" ")).toContain("disabled");
    expect(JSON.stringify(readiness)).not.toContain("C:\\secret");
    expect(JSON.stringify(readiness)).not.toContain("PRIVATE KEY");
  });

  it("dry-run refuses missing XML", async () => {
    const service = new ZatcaSdkService({ zatcaInvoiceMetadata: { findFirst: jest.fn().mockResolvedValue(null) } } as never);

    await expect(service.buildValidationDryRun("org-1", { mode: "dry-run", invoiceId: "invoice-1" })).rejects.toThrow(BadRequestException);
  });

  it("dry-run creates a command plan without executing", async () => {
    const prisma = {
      zatcaInvoiceMetadata: { findFirst: jest.fn().mockResolvedValue({ xmlBase64 }) },
    };
    const service = new ZatcaSdkService(prisma as never);

    const result = await service.buildValidationDryRun("org-1", { mode: "dry-run", invoiceId: "invoice-1" });

    expect(prisma.zatcaInvoiceMetadata.findFirst).toHaveBeenCalledWith({ where: { organizationId: "org-1", invoiceId: "invoice-1" }, select: { xmlBase64: true } });
    expect(result).toMatchObject({ dryRun: true, localOnly: true, officialSdkValidation: false, xmlSource: "invoice" });
    expect(result.temporaryXmlFilePath).toContain("invoice-1.xml");
    expect(result.commandPlan.warnings.join(" ")).toContain("argument-array");
    expect(JSON.stringify(result)).not.toContain("PRIVATE KEY");
  });

  it("dry-run accepts request XML payloads", async () => {
    const service = new ZatcaSdkService({} as never);

    const result = await service.buildValidationDryRun("org-1", { mode: "dry-run", xmlBase64 });

    expect(result.xmlSource).toBe("request");
    expect(result.temporaryXmlFilePath).toContain("request-xml.xml");
  });

  it("dry-run requires explicit dry-run mode", async () => {
    const service = new ZatcaSdkService({} as never);

    await expect(service.buildValidationDryRun("org-1", { xmlBase64 })).rejects.toThrow("mode=dry-run");
  });

  it("local validation returns disabled response when env is disabled", async () => {
    const service = new ZatcaSdkService({} as never);

    const result = await service.validateXmlLocal("org-1", { xml: "<Invoice/>" });

    expect(result).toMatchObject({
      success: false,
      disabled: true,
      localOnly: true,
      officialValidationAttempted: false,
      sdkExitCode: null,
    });
    expect(result.blockingReasons.join(" ")).toContain("disabled");
  });

  it("rejects XML above the local SDK validation size limit", async () => {
    const service = new ZatcaSdkService({} as never);
    process.env.ZATCA_SDK_EXECUTION_ENABLED = "true";

    await expect(service.validateXmlLocal("org-1", { xml: `<Invoice>${"x".repeat(2 * 1024 * 1024)}</Invoice>` })).rejects.toThrow(
      BadRequestException,
    );
  });

  it("rejects fixture path traversal before any SDK execution", async () => {
    const service = new ZatcaSdkService({} as never);

    await expect(service.validateReferenceFixtureLocal("org-1", { fixturePath: "../.env" })).rejects.toThrow(BadRequestException);
  });

  it("returns a disabled official fixture validation response by default", async () => {
    const service = new ZatcaSdkService({} as never);

    const result = await service.validateReferenceFixtureLocal("org-1", {
      fixturePath: "reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Standard/Invoice/Standard_Invoice.xml",
    });

    expect(result).toMatchObject({
      success: false,
      disabled: true,
      localOnly: true,
      officialValidationAttempted: false,
      sdkExitCode: null,
      xmlSource: "fixture",
    });
    expect(result.blockingReasons.join(" ")).toContain("disabled");
    expect(JSON.stringify(result)).not.toContain("PRIVATE KEY");
  });

  it("sanitizes SDK output before returning it", () => {
    const output = sanitizeZatcaSdkOutput(
      [
        "password=super-secret",
        "tokenHash=abc123",
        "-----BEGIN PRIVATE KEY-----abc-----END PRIVATE KEY-----",
        "contentBase64=PGZpbGU+",
        "Authorization: Bearer raw",
      ].join("\n"),
    );

    expect(output).not.toContain("super-secret");
    expect(output).not.toContain("abc123");
    expect(output).not.toContain("PRIVATE KEY-----abc");
    expect(output).not.toContain("PGZpbGU+");
    expect(output).not.toContain("Bearer raw");
    expect(output).toContain("[REDACTED]");
  });

  it("extracts pass, warning, and rule messages from SDK output", () => {
    const messages = extractZatcaSdkValidationMessages(
      [
        "INFO startup line",
        "PASS: XSD validation passed",
        "WARNING: BR-KSA-33 should be reviewed",
        "NOT PASS: SCHEMATRON validation failed",
        "password=should-not-leak",
      ].join("\n"),
    );

    expect(messages).toEqual([
      "PASS: XSD validation passed",
      "WARNING: BR-KSA-33 should be reviewed",
      "NOT PASS: SCHEMATRON validation failed",
    ]);
    expect(messages.join(" ")).not.toContain("should-not-leak");
  });

  it("invoice SDK validation uses generated XML without mutating invoice metadata", async () => {
    const prisma = {
      zatcaInvoiceMetadata: {
        findFirst: jest.fn().mockResolvedValue({ xmlBase64, zatcaStatus: "XML_GENERATED" }),
        update: jest.fn(),
      },
    };
    const service = new ZatcaSdkService(prisma as never);

    const result = await service.validateInvoiceXmlLocal("org-1", "invoice-1");

    expect(prisma.zatcaInvoiceMetadata.findFirst).toHaveBeenCalledWith({ where: { organizationId: "org-1", invoiceId: "invoice-1" }, select: { xmlBase64: true } });
    expect(prisma.zatcaInvoiceMetadata.update).not.toHaveBeenCalled();
    expect(result).toMatchObject({ localOnly: true, officialValidationAttempted: false, disabled: true });
  });
});
