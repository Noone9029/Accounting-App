import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { PERMISSIONS } from "@ledgerbyte/shared";
import type { AuthenticatedUser } from "../auth/auth.types";
import { CurrentOrganizationId } from "../auth/decorators/current-organization.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { RequirePermissions } from "../auth/decorators/require-permissions.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "../auth/guards/organization-context.guard";
import { PermissionGuard } from "../auth/guards/permission.guard";
import { CollectionService } from "./collection.service";
import { CreateCollectionActivityDto } from "./dto/create-collection-activity.dto";
import { CreateCollectionCaseDto } from "./dto/create-collection-case.dto";
import { UpdateCollectionCaseDto } from "./dto/update-collection-case.dto";

@Controller("collections")
@UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionGuard)
export class CollectionController {
  constructor(private readonly collectionService: CollectionService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.salesInvoices.view)
  list(
    @CurrentOrganizationId() organizationId: string,
    @Query("status") status?: string,
    @Query("priority") priority?: string,
    @Query("customerId") customerId?: string,
    @Query("invoiceId") invoiceId?: string,
    @Query("overdue") overdue?: string,
    @Query("dueToday") dueToday?: string,
    @Query("disputed") disputed?: string,
    @Query("promisedToPay") promisedToPay?: string,
  ) {
    return this.collectionService.list(organizationId, { status, priority, customerId, invoiceId, overdue, dueToday, disputed, promisedToPay });
  }

  @Get("summary")
  @RequirePermissions(PERMISSIONS.salesInvoices.view)
  summary(@CurrentOrganizationId() organizationId: string) {
    return this.collectionService.summary(organizationId);
  }

  @Get("next-number")
  @RequirePermissions(PERMISSIONS.salesInvoices.create)
  nextNumberPreview(@CurrentOrganizationId() organizationId: string) {
    return this.collectionService.nextNumberPreview(organizationId);
  }

  @Get("customer/:customerId")
  @RequirePermissions(PERMISSIONS.salesInvoices.view)
  byCustomer(@CurrentOrganizationId() organizationId: string, @Param("customerId") customerId: string) {
    return this.collectionService.byCustomer(organizationId, customerId);
  }

  @Get("invoice/:invoiceId")
  @RequirePermissions(PERMISSIONS.salesInvoices.view)
  byInvoice(@CurrentOrganizationId() organizationId: string, @Param("invoiceId") invoiceId: string) {
    return this.collectionService.byInvoice(organizationId, invoiceId);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.salesInvoices.create)
  create(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Body() dto: CreateCollectionCaseDto) {
    return this.collectionService.create(organizationId, user.id, dto);
  }

  @Get(":id")
  @RequirePermissions(PERMISSIONS.salesInvoices.view)
  get(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.collectionService.get(organizationId, id);
  }

  @Patch(":id")
  @RequirePermissions(PERMISSIONS.salesInvoices.update)
  update(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: UpdateCollectionCaseDto) {
    return this.collectionService.update(organizationId, user.id, id, dto);
  }

  @Post(":id/start")
  @RequirePermissions(PERMISSIONS.salesInvoices.update)
  start(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.collectionService.start(organizationId, user.id, id);
  }

  @Post(":id/mark-promised")
  @RequirePermissions(PERMISSIONS.salesInvoices.update)
  markPromised(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: UpdateCollectionCaseDto) {
    return this.collectionService.markPromised(organizationId, user.id, id, dto);
  }

  @Post(":id/mark-disputed")
  @RequirePermissions(PERMISSIONS.salesInvoices.update)
  markDisputed(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: UpdateCollectionCaseDto) {
    return this.collectionService.markDisputed(organizationId, user.id, id, dto);
  }

  @Post(":id/hold")
  @RequirePermissions(PERMISSIONS.salesInvoices.update)
  hold(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: UpdateCollectionCaseDto) {
    return this.collectionService.hold(organizationId, user.id, id, dto);
  }

  @Post(":id/close")
  @RequirePermissions(PERMISSIONS.salesInvoices.update)
  close(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: UpdateCollectionCaseDto) {
    return this.collectionService.close(organizationId, user.id, id, dto);
  }

  @Post(":id/cancel")
  @RequirePermissions(PERMISSIONS.salesInvoices.update)
  cancel(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: UpdateCollectionCaseDto) {
    return this.collectionService.cancel(organizationId, user.id, id, dto);
  }

  @Post(":id/activities")
  @RequirePermissions(PERMISSIONS.salesInvoices.update)
  addActivity(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: CreateCollectionActivityDto) {
    return this.collectionService.addActivity(organizationId, user.id, id, dto);
  }
}
