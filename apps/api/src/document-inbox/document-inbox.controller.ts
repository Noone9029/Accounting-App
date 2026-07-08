import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { PERMISSIONS } from "@ledgerbyte/shared";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { AuthenticatedUser } from "../auth/auth.types";
import { CurrentOrganizationId } from "../auth/decorators/current-organization.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { RequirePermissions } from "../auth/decorators/require-permissions.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "../auth/guards/organization-context.guard";
import { PermissionGuard } from "../auth/guards/permission.guard";
import { CreateDocumentInboxItemDto } from "./dto/create-document-inbox-item.dto";
import { DocumentInboxQueryDto } from "./dto/document-inbox-query.dto";
import { ReviewDocumentInboxItemDto } from "./dto/review-document-inbox-item.dto";
import { RunDocumentExtractionDto } from "./dto/run-document-extraction.dto";
import { DocumentInboxService } from "./document-inbox.service";

@Controller("document-inbox")
@UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionGuard)
@ApiTags("Document inbox")
@ApiBearerAuth()
export class DocumentInboxController {
  constructor(private readonly documentInboxService: DocumentInboxService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.documentInbox.view)
  @ApiOperation({ summary: "List document inbox items requiring accountant review" })
  list(@CurrentOrganizationId() organizationId: string, @Query() query: DocumentInboxQueryDto) {
    return this.documentInboxService.list(organizationId, query);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.documentInbox.upload)
  @ApiOperation({ summary: "Create a document inbox item from an immutable attachment" })
  create(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Body() dto: CreateDocumentInboxItemDto) {
    return this.documentInboxService.create(organizationId, user.id, dto);
  }

  @Get(":id")
  @RequirePermissions(PERMISSIONS.documentInbox.view)
  @ApiOperation({ summary: "Get one document inbox item and its extraction/review history" })
  get(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.documentInboxService.get(organizationId, id);
  }

  @Post(":id/extract")
  @RequirePermissions(PERMISSIONS.documentInbox.review)
  @ApiOperation({ summary: "Run the configured extraction provider for a document inbox item" })
  extract(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: RunDocumentExtractionDto = {}) {
    return this.documentInboxService.extract(organizationId, user.id, id, dto);
  }

  @Post(":id/review")
  @RequirePermissions(PERMISSIONS.documentInbox.review)
  @ApiOperation({ summary: "Record an accountant review decision for extracted document data" })
  review(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: ReviewDocumentInboxItemDto) {
    return this.documentInboxService.review(organizationId, user.id, id, dto);
  }
}
