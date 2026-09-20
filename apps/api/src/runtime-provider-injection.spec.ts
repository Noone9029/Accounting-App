import "reflect-metadata";
import type { Provider } from "@nestjs/common";
import { MODULE_METADATA } from "@nestjs/common/constants";
import { Test } from "@nestjs/testing";
import { BillingModule } from "./billing/billing.module";
import { FakeBillingProvider } from "./billing/fake-billing.provider";
import { DocumentDeliveryService } from "./email/document-delivery.service";
import { EMAIL_PROVIDER } from "./email/email-provider";
import { MockEmailProvider } from "./email/mock-email.provider";
import { PrismaService } from "./prisma/prisma.service";

describe("runtime provider injection", () => {
  it("constructs the actual BillingModule fake-provider registration without an Object dependency", async () => {
    const providers: Provider[] = Reflect.getMetadata(MODULE_METADATA.PROVIDERS, BillingModule);
    const registration = providers.find((provider) => provider === FakeBillingProvider
      || (typeof provider === "object" && "provide" in provider && provider.provide === FakeBillingProvider));
    if (!registration) throw new Error("BillingModule must register its fake billing provider.");

    const module = await Test.createTestingModule({ providers: [registration] }).compile();
    try {
      expect(module.get(FakeBillingProvider).readiness()).toMatchObject({
        provider: "FAKE", networkEnabled: false, status: "READY_FOR_LOCAL_PROOF",
      });
    } finally {
      await module.close();
    }
  });

  it("constructs document delivery from the EMAIL_PROVIDER token with optional services absent", async () => {
    const module = await Test.createTestingModule({
      providers: [
        DocumentDeliveryService,
        { provide: PrismaService, useValue: {} },
        { provide: EMAIL_PROVIDER, useValue: new MockEmailProvider() },
      ],
    }).compile();
    try {
      expect(module.get(DocumentDeliveryService)).toBeInstanceOf(DocumentDeliveryService);
    } finally {
      await module.close();
    }
  });
});
