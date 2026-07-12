import { Body, Controller, Get, Headers, Post, Query, UseGuards } from "@nestjs/common";
import { PERMISSIONS } from "@ledgerbyte/shared";
import { CurrentOrganizationId } from "../auth/decorators/current-organization.decorator";
import { RequirePermissions } from "../auth/decorators/require-permissions.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "../auth/guards/organization-context.guard";
import { PermissionGuard } from "../auth/guards/permission.guard";
import { PublicFxRateQueryDto } from "./dto/public-fx-read.dto";
import { PublicApiService } from "./public-api.service";

@Controller("public-api/v1")
@UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionGuard)
export class PublicApiController {
  constructor(private readonly publicApiService: PublicApiService) {}

  @Get("readiness")
  @RequirePermissions(PERMISSIONS.auditLogs.manageRetention)
  readiness() {
    return this.publicApiService.readiness();
  }

  @Get("currencies")
  @RequirePermissions(PERMISSIONS.currencies.read)
  currencies(@CurrentOrganizationId() organizationId: string) {
    return this.publicApiService.currencies(organizationId);
  }

  @Get("fx-rates")
  @RequirePermissions(PERMISSIONS.fxRates.read)
  fxRates(@CurrentOrganizationId() organizationId: string, @Query() query: PublicFxRateQueryDto) {
    return this.publicApiService.fxRates(organizationId, query);
  }

  @Get("pagination-proof")
  @RequirePermissions(PERMISSIONS.auditLogs.manageRetention)
  paginationProof(@Query("page") page?: string, @Query("pageSize") pageSize?: string) {
    return this.publicApiService.paginated(
      [
        { id: "api-convention-versioning", label: "Versioned base path", status: "Internal Only" },
        { id: "api-convention-pagination", label: "Pagination response shape", status: "Ready for Local Proof" },
        { id: "api-convention-idempotency", label: "Idempotency-Key proof", status: "Ready for Local Proof" },
      ],
      page ? Number(page) : undefined,
      pageSize ? Number(pageSize) : undefined,
    );
  }

  @Post("idempotency-proof")
  @RequirePermissions(PERMISSIONS.auditLogs.manageRetention)
  idempotencyProof(
    @CurrentOrganizationId() organizationId: string,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Body() body: unknown,
  ) {
    return this.publicApiService.idempotencyProof(organizationId, idempotencyKey, body);
  }
}
