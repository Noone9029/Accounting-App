import { Body, Controller, Get, Optional, Param, Patch, Post, Query, Req, Res, StreamableFile, UseGuards } from "@nestjs/common";
import { PERMISSIONS, hasPermission } from "@ledgerbyte/shared";
import type { Response } from "express";
import type { AuthenticatedRequest, AuthenticatedUser } from "../auth/auth.types";
import { CurrentOrganizationId } from "../auth/decorators/current-organization.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { RequirePermissions } from "../auth/decorators/require-permissions.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "../auth/guards/organization-context.guard";
import { PermissionGuard } from "../auth/guards/permission.guard";
import { ContactLedgerService } from "./contact-ledger.service";
import { CustomerStatementEmailDeliveryService } from "./customer-statement-email-delivery.service";
import { SupplierStatementEmailDeliveryService } from "./supplier-statement-email-delivery.service";
import { ContactService } from "./contact.service";
import { CreateContactDto } from "./dto/create-contact.dto";
import { CreateCustomerStatementEmailDeliveryDto } from "./dto/create-customer-statement-email-delivery.dto";
import { CreateSupplierStatementEmailDeliveryDto } from "./dto/create-supplier-statement-email-delivery.dto";
import { UpdateContactDto } from "./dto/update-contact.dto";
import { SupplierApDashboardService, type SupplierApDashboardPermissionContext } from "./supplier-ap-dashboard.service";

const SUPPLIER_AP_DASHBOARD_READ_PERMISSIONS = [
  PERMISSIONS.contacts.view,
  PERMISSIONS.purchaseBills.view,
  PERMISSIONS.purchaseOrders.view,
  PERMISSIONS.purchaseReceiving.view,
  PERMISSIONS.inventory.view,
  PERMISSIONS.supplierPayments.view,
  PERMISSIONS.purchaseDebitNotes.view,
  PERMISSIONS.supplierRefunds.view,
];

@Controller("contacts")
@UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionGuard)
export class ContactController {
  constructor(
    private readonly contactService: ContactService,
    private readonly contactLedgerService: ContactLedgerService,
    private readonly supplierApDashboardService: SupplierApDashboardService,
    @Optional() private readonly customerStatementEmailDeliveryService?: CustomerStatementEmailDeliveryService,
    @Optional() private readonly supplierStatementEmailDeliveryService?: SupplierStatementEmailDeliveryService,
  ) {}

  @Get()
  @RequirePermissions(PERMISSIONS.contacts.view)
  list(@CurrentOrganizationId() organizationId: string) {
    return this.contactService.list(organizationId);
  }

  @Get("customers")
  @RequirePermissions(PERMISSIONS.contacts.view)
  customers(@CurrentOrganizationId() organizationId: string) {
    return this.contactService.listCustomers(organizationId);
  }

  @Get("customers/:id")
  @RequirePermissions(PERMISSIONS.contacts.view)
  customer(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.contactService.getCustomer(organizationId, id);
  }

  @Get("suppliers")
  @RequirePermissions(PERMISSIONS.contacts.view)
  suppliers(@CurrentOrganizationId() organizationId: string) {
    return this.contactService.listSuppliers(organizationId);
  }

  @Get("suppliers/ap-dashboard")
  @RequirePermissions(...SUPPLIER_AP_DASHBOARD_READ_PERMISSIONS)
  supplierApDashboard(@CurrentOrganizationId() organizationId: string, @Req() request: AuthenticatedRequest) {
    return this.supplierApDashboardService.dashboard(organizationId, this.supplierApDashboardPermissions(request));
  }

  @Get("suppliers/:id/ap-summary")
  @RequirePermissions(...SUPPLIER_AP_DASHBOARD_READ_PERMISSIONS)
  supplierApSummary(@CurrentOrganizationId() organizationId: string, @Param("id") id: string, @Req() request: AuthenticatedRequest) {
    return this.supplierApDashboardService.supplierSummary(organizationId, id, this.supplierApDashboardPermissions(request));
  }

  @Get("suppliers/:id")
  @RequirePermissions(PERMISSIONS.contacts.view)
  supplier(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.contactService.getSupplier(organizationId, id);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.contacts.manage)
  create(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Body() dto: CreateContactDto) {
    return this.contactService.create(organizationId, user.id, dto);
  }

  @Get(":id/ledger")
  @RequirePermissions(PERMISSIONS.contacts.view)
  ledger(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.contactLedgerService.ledger(organizationId, id);
  }

  @Get(":id/statement")
  @RequirePermissions(PERMISSIONS.contacts.view)
  statement(
    @CurrentOrganizationId() organizationId: string,
    @Param("id") id: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
  ) {
    return this.contactLedgerService.statement(organizationId, id, from, to);
  }

  @Get(":id/statement-pdf-data")
  @RequirePermissions(PERMISSIONS.contacts.view)
  statementPdfData(
    @CurrentOrganizationId() organizationId: string,
    @Param("id") id: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
  ) {
    return this.contactLedgerService.statementPdfData(organizationId, id, from, to);
  }

  @Post(":id/email-deliveries")
  @RequirePermissions(PERMISSIONS.contacts.sendCustomerStatements)
  emailDelivery(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: CreateCustomerStatementEmailDeliveryDto,
  ) {
    return this.customerStatementEmailDeliveryService!.queue(organizationId, user.id, id, dto);
  }

  @Get(":id/email-deliveries")
  @RequirePermissions(PERMISSIONS.contacts.view)
  emailDeliveryHistory(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.customerStatementEmailDeliveryService!.history(organizationId, id);
  }

  @Post(":id/supplier-statement-email-deliveries")
  @RequirePermissions(PERMISSIONS.contacts.sendSupplierStatements)
  supplierStatementEmailDelivery(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: CreateSupplierStatementEmailDeliveryDto,
  ) {
    return this.supplierStatementEmailDeliveryService!.queue(organizationId, user.id, id, dto);
  }

  @Get(":id/supplier-statement-email-deliveries")
  @RequirePermissions(PERMISSIONS.contacts.view)
  supplierStatementEmailDeliveryHistory(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.supplierStatementEmailDeliveryService!.history(organizationId, id);
  }

  @Get(":id/statement.pdf")
  @RequirePermissions(PERMISSIONS.contacts.view)
  async statementPdf(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Query("from") from: string | undefined,
    @Query("to") to: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { buffer, filename } = await this.contactLedgerService.statementPdf(organizationId, user.id, id, from, to);
    response.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(buffer.byteLength),
    });
    return new StreamableFile(buffer);
  }

  @Post(":id/generate-statement-pdf")
  @RequirePermissions(PERMISSIONS.contacts.view)
  generateStatementPdf(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
  ) {
    return this.contactLedgerService.generateStatementPdf(organizationId, user.id, id, from, to);
  }

  @Get(":id/supplier-ledger")
  @RequirePermissions(PERMISSIONS.contacts.view)
  supplierLedger(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.contactLedgerService.supplierLedger(organizationId, id);
  }

  @Get(":id/supplier-statement")
  @RequirePermissions(PERMISSIONS.contacts.view)
  supplierStatement(
    @CurrentOrganizationId() organizationId: string,
    @Param("id") id: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
  ) {
    return this.contactLedgerService.supplierStatement(organizationId, id, from, to);
  }

  @Get(":id/supplier-statement-pdf-data")
  @RequirePermissions(PERMISSIONS.contacts.view)
  supplierStatementPdfData(
    @CurrentOrganizationId() organizationId: string,
    @Param("id") id: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
  ) {
    return this.contactLedgerService.supplierStatementPdfData(organizationId, id, from, to);
  }

  @Get(":id/supplier-statement.pdf")
  @RequirePermissions(PERMISSIONS.contacts.view)
  async supplierStatementPdf(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Query("from") from: string | undefined,
    @Query("to") to: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { buffer, filename } = await this.contactLedgerService.supplierStatementPdf(organizationId, user.id, id, from, to);
    response.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(buffer.byteLength),
    });
    return new StreamableFile(buffer);
  }

  @Get(":id")
  @RequirePermissions(PERMISSIONS.contacts.view)
  get(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.contactService.get(organizationId, id);
  }

  @Patch(":id")
  @RequirePermissions(PERMISSIONS.contacts.manage)
  update(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: UpdateContactDto,
  ) {
    return this.contactService.update(organizationId, user.id, id, dto);
  }

  private supplierApDashboardPermissions(request: AuthenticatedRequest): SupplierApDashboardPermissionContext {
    const permissions = request.membership?.role.permissions;
    const canViewPurchaseBills = hasPermission(permissions, PERMISSIONS.purchaseBills.view);
    const canViewPurchaseOrders = hasPermission(permissions, PERMISSIONS.purchaseOrders.view);
    const canViewPurchaseReceiving = hasPermission(permissions, PERMISSIONS.purchaseReceiving.view);

    return {
      canViewSuppliers: hasPermission(permissions, PERMISSIONS.contacts.view),
      canViewPurchaseBills,
      canViewPurchaseOrders,
      canViewPurchaseReceiving,
      canViewPurchaseMatching: canViewPurchaseBills || canViewPurchaseOrders || canViewPurchaseReceiving,
      canViewInventoryValuation: hasPermission(permissions, PERMISSIONS.inventory.view),
      canViewSupplierPayments: hasPermission(permissions, PERMISSIONS.supplierPayments.view),
      canViewPurchaseDebitNotes: hasPermission(permissions, PERMISSIONS.purchaseDebitNotes.view),
      canViewSupplierRefunds: hasPermission(permissions, PERMISSIONS.supplierRefunds.view),
    };
  }
}
