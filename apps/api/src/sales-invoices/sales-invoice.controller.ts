import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { AuthenticatedUser } from "../auth/auth.types";
import { CurrentOrganizationId } from "../auth/decorators/current-organization.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "../auth/guards/organization-context.guard";
import { CreateSalesInvoiceDto } from "./dto/create-sales-invoice.dto";
import { UpdateSalesInvoiceDto } from "./dto/update-sales-invoice.dto";
import { SalesInvoiceService } from "./sales-invoice.service";

@Controller("sales-invoices")
@UseGuards(JwtAuthGuard, OrganizationContextGuard)
export class SalesInvoiceController {
  constructor(private readonly salesInvoiceService: SalesInvoiceService) {}

  @Get()
  list(@CurrentOrganizationId() organizationId: string) {
    return this.salesInvoiceService.list(organizationId);
  }

  @Get("open")
  open(@CurrentOrganizationId() organizationId: string, @Query("customerId") customerId?: string) {
    return this.salesInvoiceService.open(organizationId, customerId);
  }

  @Post()
  create(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateSalesInvoiceDto,
  ) {
    return this.salesInvoiceService.create(organizationId, user.id, dto);
  }

  @Get(":id")
  get(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.salesInvoiceService.get(organizationId, id);
  }

  @Patch(":id")
  update(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: UpdateSalesInvoiceDto,
  ) {
    return this.salesInvoiceService.update(organizationId, user.id, id, dto);
  }

  @Post(":id/finalize")
  finalize(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.salesInvoiceService.finalize(organizationId, user.id, id);
  }

  @Post(":id/void")
  void(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.salesInvoiceService.void(organizationId, user.id, id);
  }

  @Delete(":id")
  remove(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.salesInvoiceService.remove(organizationId, user.id, id);
  }
}
