import { Body, Controller, Get, Headers, Param, Post, UseGuards } from "@nestjs/common";
import { PERMISSIONS } from "@ledgerbyte/shared";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { AuthenticatedUser } from "../auth/auth.types";
import { CurrentOrganizationId } from "../auth/decorators/current-organization.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { RequirePermissions } from "../auth/decorators/require-permissions.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "../auth/guards/organization-context.guard";
import { PermissionGuard } from "../auth/guards/permission.guard";
import { CreateInvoicePaymentLinkDto } from "./dto/create-invoice-payment-link.dto";
import { ReceiveStripeProviderEventDto } from "./dto/receive-stripe-provider-event.dto";
import { PaymentProviderService } from "./payment-provider.service";

@Controller("payments")
@UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionGuard)
@ApiTags("Payments")
@ApiBearerAuth()
export class PaymentProviderController {
  constructor(private readonly paymentProviderService: PaymentProviderService) {}

  @Get("provider-readiness")
  @RequirePermissions(PERMISSIONS.payments.providerReadinessView)
  @ApiOperation({ summary: "Check payment provider readiness and beta blockers" })
  providerReadiness(@CurrentOrganizationId() organizationId: string) {
    return this.paymentProviderService.providerReadiness(organizationId);
  }

  @Post("provider-events/stripe")
  @RequirePermissions(PERMISSIONS.payments.providerEventsManage)
  @ApiOperation({ summary: "Receive a Stripe provider event with signature verification required" })
  receiveStripeProviderEvent(
    @CurrentOrganizationId() organizationId: string,
    @Headers("stripe-signature") signature: string | undefined,
    @Body() dto: ReceiveStripeProviderEventDto,
  ) {
    return this.paymentProviderService.receiveStripeProviderEvent(organizationId, signature, dto);
  }
}

@Controller("sales-invoices")
@UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionGuard)
@ApiTags("Payments")
@ApiBearerAuth()
export class InvoicePaymentLinkController {
  constructor(private readonly paymentProviderService: PaymentProviderService) {}

  @Post(":id/payment-link")
  @RequirePermissions(PERMISSIONS.payments.paymentLinksCreate)
  @ApiOperation({ summary: "Create or stage a payment link for a finalized sales invoice" })
  createPaymentLink(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: CreateInvoicePaymentLinkDto = {},
  ) {
    return this.paymentProviderService.createInvoicePaymentLink(organizationId, user.id, id, dto);
  }
}
