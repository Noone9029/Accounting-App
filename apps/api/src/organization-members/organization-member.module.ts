import { Module } from "@nestjs/common";
import { AuditLogModule } from "../audit-log/audit-log.module";
import { BillingModule } from "../billing/billing.module";
import { OrganizationMemberController } from "./organization-member.controller";
import { OrganizationMemberService } from "./organization-member.service";

@Module({
  imports: [AuditLogModule, BillingModule],
  controllers: [OrganizationMemberController],
  providers: [OrganizationMemberService],
})
export class OrganizationMemberModule {}
