import { Module } from "@nestjs/common";
import { AuditLogModule } from "../audit-log/audit-log.module";
import { FiscalPeriodModule } from "../fiscal-periods/fiscal-period.module";
import { NumberSequenceModule } from "../number-sequences/number-sequence.module";
import { FixedAssetController } from "./fixed-asset.controller";
import { FixedAssetService } from "./fixed-asset.service";
import { FixedAssetReportsController } from "./fixed-asset-reports.controller";
import { FixedAssetReportsService } from "./fixed-asset-reports.service";

@Module({
  imports: [AuditLogModule, FiscalPeriodModule, NumberSequenceModule],
  controllers: [FixedAssetController, FixedAssetReportsController],
  providers: [FixedAssetService, FixedAssetReportsService],
  exports: [FixedAssetService],
})
export class FixedAssetModule {}
