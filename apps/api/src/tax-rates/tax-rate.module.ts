import { Module } from "@nestjs/common";
import { AuditLogModule } from "../audit-log/audit-log.module";
import { TaxRateController } from "./tax-rate.controller";
import { TaxRateService } from "./tax-rate.service";

@Module({
  imports: [AuditLogModule],
  controllers: [TaxRateController],
  providers: [TaxRateService],
})
export class TaxRateModule {}
