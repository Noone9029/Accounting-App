import { Module } from "@nestjs/common";
import { AuditLogModule } from "../audit-log/audit-log.module";
import { ProjectController } from "./project.controller";
import { ProjectService } from "./project.service";

@Module({
  imports: [AuditLogModule],
  controllers: [ProjectController],
  providers: [ProjectService],
})
export class ProjectModule {}
