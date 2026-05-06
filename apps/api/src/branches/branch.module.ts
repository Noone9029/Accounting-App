import { Module } from "@nestjs/common";
import { AuditLogModule } from "../audit-log/audit-log.module";
import { BranchController } from "./branch.controller";
import { BranchService } from "./branch.service";

@Module({
  imports: [AuditLogModule],
  controllers: [BranchController],
  providers: [BranchService],
})
export class BranchModule {}
