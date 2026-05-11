import { BadRequestException, NotImplementedException } from "@nestjs/common";
import { GUARDS_METADATA } from "@nestjs/common/constants";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "../auth/guards/organization-context.guard";
import { ZatcaSdkController } from "./zatca-sdk.controller";
import { ZatcaSdkService } from "./zatca-sdk.service";

describe("ZATCA SDK controller", () => {
  it("requires authentication and organization context", () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, ZatcaSdkController);

    expect(guards).toEqual(expect.arrayContaining([JwtAuthGuard, OrganizationContextGuard]));
  });
});

describe("ZATCA SDK service", () => {
  const xmlBase64 = Buffer.from("<Invoice><cbc:ID>INV-1</cbc:ID></Invoice>", "utf8").toString("base64");

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
    expect(result.commandPlan.warnings.join(" ")).toContain("Dry-run");
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

  it("local validation endpoint blocks when env is disabled", async () => {
    const service = new ZatcaSdkService({} as never);
    const previous = process.env.ZATCA_SDK_EXECUTION_ENABLED;
    delete process.env.ZATCA_SDK_EXECUTION_ENABLED;

    await expect(service.validateXmlLocal("org-1", { invoiceId: "invoice-1" })).rejects.toThrow(BadRequestException);
    if (previous === undefined) {
      delete process.env.ZATCA_SDK_EXECUTION_ENABLED;
    } else {
      process.env.ZATCA_SDK_EXECUTION_ENABLED = previous;
    }
  });

  it("local validation remains unimplemented when explicitly enabled", async () => {
    const service = new ZatcaSdkService({} as never);
    const previous = process.env.ZATCA_SDK_EXECUTION_ENABLED;
    process.env.ZATCA_SDK_EXECUTION_ENABLED = "true";

    await expect(service.validateXmlLocal("org-1", { invoiceId: "invoice-1" })).rejects.toThrow(NotImplementedException);
    if (previous === undefined) {
      delete process.env.ZATCA_SDK_EXECUTION_ENABLED;
    } else {
      process.env.ZATCA_SDK_EXECUTION_ENABLED = previous;
    }
  });
});
