import { Module } from "@nestjs/common";
import { AuditLogModule } from "../audit-log/audit-log.module";
import { OrganizationMemberController } from "./organization-member.controller";
import { OrganizationMemberService } from "./organization-member.service";

@Module({
  imports: [AuditLogModule],
  controllers: [OrganizationMemberController],
  providers: [OrganizationMemberService],
})
export class OrganizationMemberModule {}
