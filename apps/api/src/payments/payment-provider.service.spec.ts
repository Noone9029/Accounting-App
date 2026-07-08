import {
  InvoicePaymentLinkStatus,
  PaymentProviderConfigStatus,
  PaymentProviderEventStatus,
  PaymentProviderType,
  SalesInvoiceStatus,
} from "@prisma/client";
import { PaymentProviderService } from "./payment-provider.service";

describe("PaymentProviderService", () => {
  const invoice = {
    id: "11111111-1111-1111-1111-111111111111",
    invoiceNumber: "INV-1001",
    status: SalesInvoiceStatus.FINALIZED,
    total: "100.00",
    balanceDue: "100.00",
    currency: "AED",
  };

  function makeService(env: Record<string, string | undefined> = {}, providerConfig: Record<string, unknown> | null = null) {
    const prisma = {
      paymentProviderConfig: {
        findUnique: jest.fn().mockResolvedValue(providerConfig),
      },
      salesInvoice: {
        findFirst: jest.fn().mockResolvedValue(invoice),
      },
      invoicePaymentLink: {
        create: jest.fn((args: { data: Record<string, unknown> }) =>
          Promise.resolve({ id: "22222222-2222-2222-2222-222222222222", createdAt: new Date("2026-07-08T12:00:00.000Z"), ...args.data }),
        ),
      },
      paymentProviderEvent: {
        create: jest.fn((args: { data: Record<string, unknown> }) =>
          Promise.resolve({ id: "33333333-3333-3333-3333-333333333333", receivedAt: new Date("2026-07-08T12:00:00.000Z"), ...args.data }),
        ),
      },
    };
    const config = { get: jest.fn((key: string) => env[key]) };
    const audit = { log: jest.fn() };
    return { service: new PaymentProviderService(prisma as never, config as never, audit as never), prisma, config, audit };
  }

  it("reports Stripe readiness as disabled by default without returning secrets", async () => {
    const { service } = makeService();

    await expect(service.providerReadiness("org-1")).resolves.toMatchObject({
      provider: PaymentProviderType.STRIPE,
      readOnly: true,
      noPaymentInitiated: true,
      noSecretsReturned: true,
      providerConfigured: false,
      paymentLinksEnabled: false,
      productionReady: false,
      blockers: expect.arrayContaining(["Stripe provider config is not created.", "Stripe secret key is not configured."]),
    });
  });

  it("creates a blocked payment-link record when Stripe is not enabled", async () => {
    const { service, prisma } = makeService();

    const result = await service.createInvoicePaymentLink("org-1", "user-1", invoice.id, { note: " beta check " });

    expect(result).toMatchObject({
      status: InvoicePaymentLinkStatus.BLOCKED_PROVIDER_DISABLED,
      paymentUrl: null,
      noPaymentInitiated: true,
      providerConfigured: false,
    });
    expect(prisma.invoicePaymentLink.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          provider: PaymentProviderType.STRIPE,
          redactedMetadataJson: expect.objectContaining({
            note: "beta check",
            noPaymentInitiated: true,
          }),
        }),
      }),
    );
  });

  it("creates a mock payment link only when mock links are explicitly enabled", async () => {
    const { service } = makeService(
      {
        LEDGERBYTE_STRIPE_MOCK_LINKS_ENABLED: "true",
      },
      {
        id: "cfg-1",
        organizationId: "org-1",
        provider: PaymentProviderType.STRIPE,
        status: PaymentProviderConfigStatus.READY_FOR_NON_PRODUCTION_TEST,
        displayName: "Stripe test",
        publishableKeyLast4: null,
        webhookSecretLast4: null,
        metadataJson: null,
        createdAt: new Date("2026-07-08T12:00:00.000Z"),
        updatedAt: new Date("2026-07-08T12:00:00.000Z"),
      },
    );

    await expect(service.createInvoicePaymentLink("org-1", "user-1", invoice.id)).resolves.toMatchObject({
      status: InvoicePaymentLinkStatus.CREATED_MOCK,
      paymentUrl: `https://payments.example.invalid/ledgerbyte/mock/${invoice.id}`,
      noPaymentInitiated: true,
    });
  });

  it("rejects unsigned Stripe events and redacts provider secrets before persistence", async () => {
    const { service, prisma } = makeService({ LEDGERBYTE_STRIPE_WEBHOOK_SECRET: "whsec_test_secret" });

    const result = await service.receiveStripeProviderEvent("org-1", "bad-signature", {
      id: "evt_1",
      type: "checkout.session.completed",
      data: {
        object: {
          client_secret: "sk_test_should_not_persist",
          customer_email: "customer@example.com",
          nested: { authorization: "Bearer abc" },
        },
      },
    });

    expect(result).toMatchObject({
      status: PaymentProviderEventStatus.REJECTED_UNVERIFIED,
      signatureVerified: false,
      noPaymentInitiated: true,
      noSecretsReturned: true,
    });
    expect(prisma.paymentProviderEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          redactedPayloadJson: expect.objectContaining({
            data: {
              object: {
                client_secret: "[REDACTED]",
                customer_email: "customer@example.com",
                nested: { authorization: "[REDACTED]" },
              },
            },
          }),
        }),
      }),
    );
  });
});
