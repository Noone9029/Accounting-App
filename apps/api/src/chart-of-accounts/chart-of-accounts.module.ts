import { Module } from "@nestjs/common";
import { AuditLogModule } from "../audit-log/audit-log.module";
import { ChartOfAccountsController } from "./chart-of-accounts.controller";
import { ChartOfAccountsService } from "./chart-of-accounts.service";

@Module({
  imports: [AuditLogModule],
  controllers: [ChartOfAccountsController],
  providers: [ChartOfAccountsService],
})
export class ChartOfAccountsModule {}
