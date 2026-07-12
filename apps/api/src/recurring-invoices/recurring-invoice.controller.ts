import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { PERMISSIONS } from "@ledgerbyte/shared";
import type { AuthenticatedUser } from "../auth/auth.types";
import { CurrentOrganizationId } from "../auth/decorators/current-organization.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { RequirePermissions } from "../auth/decorators/require-permissions.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "../auth/guards/organization-context.guard";
import { PermissionGuard } from "../auth/guards/permission.guard";
import { CreateRecurringInvoiceDto } from "./dto/create-recurring-invoice.dto";
import { UpdateRecurringInvoiceDto } from "./dto/update-recurring-invoice.dto";
import { RecurringInvoiceCompatibilityService } from "./recurring-invoice-compatibility.service";

@Controller("recurring-invoices")
@UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionGuard)
export class RecurringInvoiceController {
  constructor(private readonly recurringInvoiceService: RecurringInvoiceCompatibilityService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.salesInvoices.view)
  list(
    @CurrentOrganizationId() organizationId: string,
    @Query("status") status?: string,
    @Query("customerId") customerId?: string,
    @Query("frequency") frequency?: string,
  ) {
    return this.recurringInvoiceService.list(organizationId, { status, customerId, frequency });
  }

  @Get("next-number")
  @RequirePermissions(PERMISSIONS.salesInvoices.create)
  nextNumberPreview(@CurrentOrganizationId() organizationId: string) {
    return this.recurringInvoiceService.nextNumberPreview(organizationId);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.salesInvoices.create)
  create(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateRecurringInvoiceDto,
  ) {
    return this.recurringInvoiceService.create(organizationId, user.id, dto);
  }

  @Get(":id")
  @RequirePermissions(PERMISSIONS.salesInvoices.view)
  get(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.recurringInvoiceService.get(organizationId, id);
  }

  @Get(":id/preview")
  @RequirePermissions(PERMISSIONS.salesInvoices.view)
  preview(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.recurringInvoiceService.preview(organizationId, id);
  }

  @Patch(":id")
  @RequirePermissions(PERMISSIONS.salesInvoices.update)
  update(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: UpdateRecurringInvoiceDto,
  ) {
    return this.recurringInvoiceService.update(organizationId, user.id, id, dto);
  }

  @Post(":id/activate")
  @RequirePermissions(PERMISSIONS.salesInvoices.update)
  activate(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.recurringInvoiceService.activate(organizationId, user.id, id);
  }

  @Post(":id/pause")
  @RequirePermissions(PERMISSIONS.salesInvoices.update)
  pause(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.recurringInvoiceService.pause(organizationId, user.id, id);
  }

  @Post(":id/resume")
  @RequirePermissions(PERMISSIONS.salesInvoices.update)
  resume(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.recurringInvoiceService.resume(organizationId, user.id, id);
  }

  @Post(":id/end")
  @RequirePermissions(PERMISSIONS.salesInvoices.update)
  end(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.recurringInvoiceService.end(organizationId, user.id, id);
  }

  @Post(":id/cancel")
  @RequirePermissions(PERMISSIONS.salesInvoices.update)
  cancel(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.recurringInvoiceService.cancel(organizationId, user.id, id);
  }

  @Post(":id/generate-now")
  @RequirePermissions(PERMISSIONS.salesInvoices.create)
  generateNow(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.recurringInvoiceService.generateNow(organizationId, user.id, id);
  }
}
