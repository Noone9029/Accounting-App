import { Module } from "@nestjs/common";
import { AuditLogModule } from "../audit-log/audit-log.module";
import { CostCenterController } from "./cost-center.controller";
import { CostCenterService } from "./cost-center.service";

@Module({
  imports: [AuditLogModule],
  controllers: [CostCenterController],
  providers: [CostCenterService],
})
export class CostCenterModule {}
