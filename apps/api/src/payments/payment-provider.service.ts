import { BadRequestException, Injectable, NotFoundException, Optional } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  InvoicePaymentLinkStatus,
  PaymentProviderConfigStatus,
  PaymentProviderEventStatus,
  PaymentProviderType,
  Prisma,
  SalesInvoiceStatus,
} from "@prisma/client";
import { AUDIT_ENTITY_TYPES, AUDIT_EVENTS } from "../audit-log/audit-events";
import { AuditLogService } from "../audit-log/audit-log.service";
import { ObservabilityContextService } from "../observability/observability-context.service";
import { redactForDiagnostics } from "../observability/redaction";
import { PrismaService } from "../prisma/prisma.service";
import { CreateInvoicePaymentLinkDto } from "./dto/create-invoice-payment-link.dto";
import { ReceiveStripeProviderEventDto } from "./dto/receive-stripe-provider-event.dto";

const paymentProviderConfigSelect = {
  id: true,
  organizationId: true,
  provider: true,
  status: true,
  displayName: true,
  publishableKeyLast4: true,
  webhookSecretLast4: true,
  metadataJson: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.PaymentProviderConfigSelect;

@Injectable()
export class PaymentProviderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @Optional() private readonly auditLogService?: AuditLogService,
    @Optional() private readonly observabilityContext?: ObservabilityContextService,
  ) {}

  async providerReadiness(organizationId: string) {
    const stripeConfig = await this.prisma.paymentProviderConfig.findUnique({
      where: { organizationId_provider: { organizationId, provider: PaymentProviderType.STRIPE } },
      select: paymentProviderConfigSelect,
    });
    const secretKeyConfigured = Boolean(this.config.get<string>("LEDGERBYTE_STRIPE_SECRET_KEY")?.trim());
    const webhookSecretConfigured = Boolean(this.config.get<string>("LEDGERBYTE_STRIPE_WEBHOOK_SECRET")?.trim());
    const paymentLinksEnabled = this.booleanConfig("LEDGERBYTE_STRIPE_PAYMENT_LINKS_ENABLED");
    const mockLinksEnabled = this.booleanConfig("LEDGERBYTE_STRIPE_MOCK_LINKS_ENABLED");
    const providerConfigured = stripeConfig?.status === PaymentProviderConfigStatus.ENABLED && secretKeyConfigured;
    const readyForNonProductionTest = stripeConfig?.status === PaymentProviderConfigStatus.READY_FOR_NON_PRODUCTION_TEST || mockLinksEnabled;

    return {
      provider: PaymentProviderType.STRIPE,
      readOnly: true,
      noPaymentInitiated: true,
      noSecretsReturned: true,
      providerConfigured,
      paymentLinksEnabled,
      mockLinksEnabled,
      readyForNonProductionTest,
      webhookSecretConfigured,
      config: stripeConfig,
      productionReady: providerConfigured && paymentLinksEnabled && webhookSecretConfigured,
      blockers: stripeReadinessBlockers({ stripeConfig, secretKeyConfigured, webhookSecretConfigured, paymentLinksEnabled }),
      warnings: [
        "Stripe payment links are beta readiness only until provider keys, webhook signing, accounting posting, and reconciliation evidence are approved.",
        "This endpoint never returns Stripe secret keys or webhook secrets.",
      ],
    };
  }

  async createInvoicePaymentLink(organizationId: string, actorUserId: string, salesInvoiceId: string, dto: CreateInvoicePaymentLinkDto = {}) {
    const provider = dto.provider ?? PaymentProviderType.STRIPE;
    if (provider !== PaymentProviderType.STRIPE) {
      throw new BadRequestException("Only Stripe payment-link readiness is supported in this beta groundwork.");
    }
    const invoice = await this.prisma.salesInvoice.findFirst({
      where: { id: salesInvoiceId, organizationId },
      select: { id: true, invoiceNumber: true, status: true, total: true, balanceDue: true, currency: true },
    });
    if (!invoice) {
      throw new NotFoundException("Sales invoice not found.");
    }

    const readiness = await this.providerReadiness(organizationId);
    const paymentLinkData = this.paymentLinkData(readiness, invoice);
    const created = await this.prisma.invoicePaymentLink.create({
      data: {
        organizationId,
        salesInvoiceId,
        provider,
        status: paymentLinkData.status,
        paymentUrl: paymentLinkData.paymentUrl,
        externalReference: paymentLinkData.externalReference,
        redactedMetadataJson: {
          invoiceNumber: invoice.invoiceNumber,
          currency: invoice.currency,
          note: cleanOptional(dto.note),
          noPaymentInitiated: true,
          blockers: readiness.blockers,
        },
        createdById: actorUserId,
      },
    });

    await this.auditLogService?.log({
      organizationId,
      actorUserId,
      action: AUDIT_EVENTS.INVOICE_PAYMENT_LINK_CREATED,
      entityType: AUDIT_ENTITY_TYPES.INVOICE_PAYMENT_LINK,
      entityId: created.id,
      after: created,
    });

    return {
      ...created,
      noPaymentInitiated: true,
      providerConfigured: readiness.providerConfigured,
      blockers: readiness.blockers,
    };
  }

  async receiveStripeProviderEvent(organizationId: string, signature: string | undefined, dto: ReceiveStripeProviderEventDto) {
    const webhookSecret = this.config.get<string>("LEDGERBYTE_STRIPE_WEBHOOK_SECRET")?.trim();
    const signatureVerified = Boolean(webhookSecret && signature && signature === webhookSecret);
    const status = signatureVerified ? PaymentProviderEventStatus.ACCEPTED_VERIFIED : PaymentProviderEventStatus.REJECTED_UNVERIFIED;
    const event = await this.prisma.paymentProviderEvent.create({
      data: {
        organizationId,
        provider: PaymentProviderType.STRIPE,
        status,
        eventType: cleanRequired(dto.type, "Stripe event type is required."),
        externalEventId: cleanOptional(dto.id),
        signatureVerified,
        requestId: this.observabilityContext?.getRequestId(),
        redactedPayloadJson: redactForDiagnostics(dto) as Prisma.InputJsonObject,
      },
    });

    await this.auditLogService?.log({
      organizationId,
      action: AUDIT_EVENTS.PAYMENT_PROVIDER_EVENT_RECEIVED,
      entityType: AUDIT_ENTITY_TYPES.PAYMENT_PROVIDER_EVENT,
      entityId: event.id,
      after: event,
    });

    return {
      ...event,
      noPaymentInitiated: true,
      noSecretsReturned: true,
    };
  }

  private paymentLinkData(
    readiness: Awaited<ReturnType<PaymentProviderService["providerReadiness"]>>,
    invoice: { id: string; invoiceNumber: string; status: SalesInvoiceStatus; balanceDue: Prisma.Decimal | string | number; currency: string },
  ) {
    if (invoice.status !== SalesInvoiceStatus.FINALIZED) {
      return {
        status: InvoicePaymentLinkStatus.BLOCKED_PROVIDER_DISABLED,
        paymentUrl: null,
        externalReference: null,
      };
    }
    if (readiness.mockLinksEnabled) {
      return {
        status: InvoicePaymentLinkStatus.CREATED_MOCK,
        paymentUrl: `https://payments.example.invalid/ledgerbyte/mock/${invoice.id}`,
        externalReference: `mock_${invoice.invoiceNumber}`,
      };
    }
    if (readiness.readyForNonProductionTest) {
      return {
        status: InvoicePaymentLinkStatus.READY_FOR_NON_PRODUCTION_TEST,
        paymentUrl: null,
        externalReference: null,
      };
    }
    return {
      status: InvoicePaymentLinkStatus.BLOCKED_PROVIDER_DISABLED,
      paymentUrl: null,
      externalReference: null,
    };
  }

  private booleanConfig(key: string) {
    return this.config.get<string>(key)?.trim().toLowerCase() === "true";
  }
}

function stripeReadinessBlockers(input: {
  stripeConfig: { status: PaymentProviderConfigStatus } | null;
  secretKeyConfigured: boolean;
  webhookSecretConfigured: boolean;
  paymentLinksEnabled: boolean;
}) {
  const blockers: string[] = [];
  if (!input.stripeConfig) {
    blockers.push("Stripe provider config is not created.");
  } else if (input.stripeConfig.status !== PaymentProviderConfigStatus.ENABLED) {
    blockers.push(`Stripe provider status is ${input.stripeConfig.status}.`);
  }
  if (!input.secretKeyConfigured) {
    blockers.push("Stripe secret key is not configured.");
  }
  if (!input.webhookSecretConfigured) {
    blockers.push("Stripe webhook secret is not configured.");
  }
  if (!input.paymentLinksEnabled) {
    blockers.push("Stripe payment-link creation is disabled by default.");
  }
  return blockers;
}

function cleanRequired(value: string | undefined, message: string) {
  const cleaned = value?.trim();
  if (!cleaned) {
    throw new BadRequestException(message);
  }
  return cleaned;
}

function cleanOptional(value?: string | null) {
  const cleaned = value?.trim();
  return cleaned || null;
}
