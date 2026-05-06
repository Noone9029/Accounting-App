import { Body, Controller, Delete, Get, Param, Post, UseGuards } from "@nestjs/common";
import { AuthenticatedUser } from "../auth/auth.types";
import { CurrentOrganizationId } from "../auth/decorators/current-organization.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "../auth/guards/organization-context.guard";
import { CustomerPaymentService } from "./customer-payment.service";
import { CreateCustomerPaymentDto } from "./dto/create-customer-payment.dto";

@Controller("customer-payments")
@UseGuards(JwtAuthGuard, OrganizationContextGuard)
export class CustomerPaymentController {
  constructor(private readonly customerPaymentService: CustomerPaymentService) {}

  @Get()
  list(@CurrentOrganizationId() organizationId: string) {
    return this.customerPaymentService.list(organizationId);
  }

  @Post()
  create(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCustomerPaymentDto,
  ) {
    return this.customerPaymentService.create(organizationId, user.id, dto);
  }

  @Get(":id")
  get(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.customerPaymentService.get(organizationId, id);
  }

  @Post(":id/void")
  void(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.customerPaymentService.void(organizationId, user.id, id);
  }

  @Delete(":id")
  remove(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.customerPaymentService.remove(organizationId, user.id, id);
  }
}
