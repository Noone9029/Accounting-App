import { Module } from "@nestjs/common";
import { AuditLogModule } from "../audit-log/audit-log.module";
import { RoleController } from "./role.controller";
import { RoleService } from "./role.service";

@Module({
  imports: [AuditLogModule],
  controllers: [RoleController],
  providers: [RoleService],
})
export class RoleModule {}
