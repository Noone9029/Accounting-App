import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { PERMISSIONS } from "@ledgerbyte/shared";
import type { AuthenticatedUser } from "../auth/auth.types";
import { CurrentOrganizationId } from "../auth/decorators/current-organization.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { RequirePermissions } from "../auth/decorators/require-permissions.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "../auth/guards/organization-context.guard";
import { PermissionGuard } from "../auth/guards/permission.guard";
import {
  CreatePurchaseMatchingReviewDto,
  PurchaseMatchingReviewTransitionDto,
  UpdatePurchaseMatchingReviewDto,
} from "./dto/purchase-matching-review.dto";
import { PurchaseMatchingService } from "./purchase-matching.service";

@Controller("purchase-matching")
@UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionGuard)
export class PurchaseMatchingController {
  constructor(private readonly purchaseMatchingService: PurchaseMatchingService) {}

  @Get("exceptions")
  @RequirePermissions(PERMISSIONS.purchaseOrders.view, PERMISSIONS.purchaseBills.view, PERMISSIONS.purchaseReceiving.view)
  purchaseMatchingExceptions(
    @CurrentOrganizationId() organizationId: string,
    @Query() query: Record<string, string | string[] | undefined>,
  ) {
    return this.purchaseMatchingService.listExceptions(organizationId, query);
  }

  @Get("reviews")
  @RequirePermissions(PERMISSIONS.purchaseOrders.view, PERMISSIONS.purchaseBills.view, PERMISSIONS.purchaseReceiving.view)
  listReviews(@CurrentOrganizationId() organizationId: string, @Query() query: Record<string, string | string[] | undefined>) {
    return this.purchaseMatchingService.listReviews(organizationId, query);
  }

  @Post("reviews")
  @RequirePermissions(PERMISSIONS.purchaseOrders.update, PERMISSIONS.purchaseBills.update, PERMISSIONS.purchaseReceiving.create)
  createReview(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreatePurchaseMatchingReviewDto,
  ) {
    return this.purchaseMatchingService.createReview(organizationId, user.id, dto);
  }

  @Get("reviews/:id")
  @RequirePermissions(PERMISSIONS.purchaseOrders.view, PERMISSIONS.purchaseBills.view, PERMISSIONS.purchaseReceiving.view)
  getReview(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.purchaseMatchingService.getReview(organizationId, id);
  }

  @Patch("reviews/:id")
  @RequirePermissions(PERMISSIONS.purchaseOrders.update, PERMISSIONS.purchaseBills.update, PERMISSIONS.purchaseReceiving.create)
  updateReview(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: UpdatePurchaseMatchingReviewDto,
  ) {
    return this.purchaseMatchingService.updateReview(organizationId, user.id, id, dto);
  }

  @Post("reviews/:id/start")
  @RequirePermissions(PERMISSIONS.purchaseOrders.update, PERMISSIONS.purchaseBills.update, PERMISSIONS.purchaseReceiving.create)
  startReview(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.purchaseMatchingService.startReview(organizationId, user.id, id);
  }

  @Post("reviews/:id/mark-waiting-for-supplier")
  @RequirePermissions(PERMISSIONS.purchaseOrders.update, PERMISSIONS.purchaseBills.update, PERMISSIONS.purchaseReceiving.create)
  markWaitingForSupplier(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: PurchaseMatchingReviewTransitionDto = {},
  ) {
    return this.purchaseMatchingService.markWaitingForSupplier(organizationId, user.id, id, dto);
  }

  @Post("reviews/:id/mark-timing-difference")
  @RequirePermissions(PERMISSIONS.purchaseOrders.update, PERMISSIONS.purchaseBills.update, PERMISSIONS.purchaseReceiving.create)
  markTimingDifference(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: PurchaseMatchingReviewTransitionDto = {},
  ) {
    return this.purchaseMatchingService.markTimingDifference(organizationId, user.id, id, dto);
  }

  @Post("reviews/:id/mark-needs-variance-review")
  @RequirePermissions(PERMISSIONS.purchaseOrders.update, PERMISSIONS.purchaseBills.update, PERMISSIONS.purchaseReceiving.create)
  markNeedsVarianceReview(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: PurchaseMatchingReviewTransitionDto = {},
  ) {
    return this.purchaseMatchingService.markNeedsVarianceReview(organizationId, user.id, id, dto);
  }

  @Post("reviews/:id/mark-needs-return-review")
  @RequirePermissions(PERMISSIONS.purchaseOrders.update, PERMISSIONS.purchaseBills.update, PERMISSIONS.purchaseReceiving.create)
  markNeedsReturnReview(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: PurchaseMatchingReviewTransitionDto = {},
  ) {
    return this.purchaseMatchingService.markNeedsReturnReview(organizationId, user.id, id, dto);
  }

  @Post("reviews/:id/resolve")
  @RequirePermissions(PERMISSIONS.purchaseOrders.update, PERMISSIONS.purchaseBills.update, PERMISSIONS.purchaseReceiving.create)
  resolveReview(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: PurchaseMatchingReviewTransitionDto = {},
  ) {
    return this.purchaseMatchingService.resolveReview(organizationId, user.id, id, dto);
  }

  @Post("reviews/:id/cancel")
  @RequirePermissions(PERMISSIONS.purchaseOrders.update, PERMISSIONS.purchaseBills.update, PERMISSIONS.purchaseReceiving.create)
  cancelReview(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: PurchaseMatchingReviewTransitionDto = {},
  ) {
    return this.purchaseMatchingService.cancelReview(organizationId, user.id, id, dto);
  }

  @Get("purchase-orders/:id")
  @RequirePermissions(PERMISSIONS.purchaseOrders.view)
  purchaseOrderMatching(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.purchaseMatchingService.forPurchaseOrder(organizationId, id);
  }

  @Get("purchase-bills/:id")
  @RequirePermissions(PERMISSIONS.purchaseBills.view)
  purchaseBillMatching(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.purchaseMatchingService.forPurchaseBill(organizationId, id);
  }

  @Get("purchase-receipts/:id")
  @RequirePermissions(PERMISSIONS.purchaseReceiving.view)
  purchaseReceiptMatching(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.purchaseMatchingService.forPurchaseReceipt(organizationId, id);
  }
}
