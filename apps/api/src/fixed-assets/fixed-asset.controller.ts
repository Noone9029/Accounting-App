import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { PERMISSIONS } from "@ledgerbyte/shared";
import { CurrentOrganizationId } from "../auth/decorators/current-organization.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { RequirePermissions } from "../auth/decorators/require-permissions.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "../auth/guards/organization-context.guard";
import { PermissionGuard } from "../auth/guards/permission.guard";
import type { AuthenticatedUser } from "../auth/auth.types";
import { FixedAssetService } from "./fixed-asset.service";
import { BillLineCapitalizationDto, CreateFixedAssetCategoryDto, CreateFixedAssetDto, DepreciationRunPreviewDto, DisposalDto, ExpectedVersionDto, FixedAssetListQueryDto, ManualCapitalizationDto, ScheduleQueryDto, UpdateFixedAssetCategoryDto, UpdateFixedAssetDto } from "./dto/fixed-asset.dto";

@Controller("fixed-assets")
@UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionGuard)
export class FixedAssetController {
  constructor(private readonly service: FixedAssetService) {}

  @Get("categories") @RequirePermissions(PERMISSIONS.fixedAssets.read)
  categories(@CurrentOrganizationId() organizationId: string) { return this.service.listCategories(organizationId); }

  @Post("categories") @RequirePermissions(PERMISSIONS.fixedAssets.categoriesManage)
  createCategory(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Body() dto: CreateFixedAssetCategoryDto) { return this.service.createCategory(organizationId, user.id, dto); }

  @Get("categories/:id") @RequirePermissions(PERMISSIONS.fixedAssets.read)
  getCategory(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) { return this.service.getCategory(organizationId, id); }

  @Patch("categories/:id") @RequirePermissions(PERMISSIONS.fixedAssets.categoriesManage)
  updateCategory(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: UpdateFixedAssetCategoryDto) { return this.service.updateCategory(organizationId, user.id, id, dto); }

  @Post("categories/:id/archive") @RequirePermissions(PERMISSIONS.fixedAssets.categoriesManage)
  archiveCategory(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) { return this.service.archiveCategory(organizationId, user.id, id); }

  @Get() @RequirePermissions(PERMISSIONS.fixedAssets.read)
  list(@CurrentOrganizationId() organizationId: string, @Query() query: FixedAssetListQueryDto) { return this.service.list(organizationId, query); }

  @Post() @RequirePermissions(PERMISSIONS.fixedAssets.manage)
  create(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Body() dto: CreateFixedAssetDto) { return this.service.create(organizationId, user.id, dto); }

  @Get("capitalization-candidates") @RequirePermissions(PERMISSIONS.fixedAssets.capitalize)
  capitalizationCandidates(@CurrentOrganizationId() organizationId: string) { return this.service.capitalizationCandidates(organizationId); }

  @Post("from-bill-line") @RequirePermissions(PERMISSIONS.fixedAssets.capitalize)
  capitalizeFromBillLine(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Body() dto: BillLineCapitalizationDto) { return this.service.capitalizeFromBillLine(organizationId, user.id, dto); }

  @Get("depreciation-runs") @RequirePermissions(PERMISSIONS.fixedAssets.depreciationReview)
  depreciationRuns(@CurrentOrganizationId() organizationId: string) { return this.service.listDepreciationRuns(organizationId); }

  @Post("depreciation-runs/preview") @RequirePermissions(PERMISSIONS.fixedAssets.depreciationReview)
  previewDepreciation(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Body() dto: DepreciationRunPreviewDto) { return this.service.previewDepreciationRun(organizationId, user.id, dto); }

  @Get("depreciation-runs/:id") @RequirePermissions(PERMISSIONS.fixedAssets.depreciationReview)
  getDepreciationRun(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) { return this.service.getDepreciationRun(organizationId, id); }

  @Post("depreciation-runs/:id/review") @RequirePermissions(PERMISSIONS.fixedAssets.depreciationReview)
  reviewDepreciation(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: ExpectedVersionDto) { return this.service.reviewDepreciationRun(organizationId, user.id, id, dto); }

  @Post("depreciation-runs/:id/post") @RequirePermissions(PERMISSIONS.fixedAssets.depreciationPost)
  postDepreciation(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: ExpectedVersionDto) { return this.service.postDepreciationRun(organizationId, user.id, id, dto); }

  @Post("depreciation-runs/:id/reverse") @RequirePermissions(PERMISSIONS.fixedAssets.depreciationPost)
  reverseDepreciation(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: ExpectedVersionDto) { return this.service.reverseDepreciationRun(organizationId, user.id, id, dto); }

  @Get(":id") @RequirePermissions(PERMISSIONS.fixedAssets.read)
  get(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) { return this.service.get(organizationId, id); }

  @Patch(":id") @RequirePermissions(PERMISSIONS.fixedAssets.manage)
  update(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: UpdateFixedAssetDto) { return this.service.update(organizationId, user.id, id, dto); }

  @Post(":id/review") @RequirePermissions(PERMISSIONS.fixedAssets.manage)
  review(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) { return this.service.review(organizationId, user.id, id); }

  @Post(":id/capitalize") @RequirePermissions(PERMISSIONS.fixedAssets.capitalize)
  capitalize(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: ManualCapitalizationDto) { return this.service.capitalizeManual(organizationId, user.id, id, dto); }

  @Get(":id/schedule") @RequirePermissions(PERMISSIONS.fixedAssets.read)
  schedule(@CurrentOrganizationId() organizationId: string, @Param("id") id: string, @Query() query: ScheduleQueryDto) { return this.service.schedule(organizationId, id, query); }

  @Get(":id/movements") @RequirePermissions(PERMISSIONS.fixedAssets.read)
  movements(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) { return this.service.movements(organizationId, id); }

  @Post(":id/dispose") @RequirePermissions(PERMISSIONS.fixedAssets.dispose)
  dispose(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: DisposalDto) { return this.service.dispose(organizationId, user.id, id, dto); }

  @Post(":id/write-off") @RequirePermissions(PERMISSIONS.fixedAssets.dispose)
  writeOff(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: DisposalDto) { return this.service.writeOff(organizationId, user.id, id, dto); }

  @Post(":id/reverse-disposal") @RequirePermissions(PERMISSIONS.fixedAssets.dispose)
  reverseDisposal(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) { return this.service.reverseDisposal(organizationId, user.id, id); }
}
