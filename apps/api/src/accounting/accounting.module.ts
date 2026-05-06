import { Module } from "@nestjs/common";
import { AuditLogModule } from "../audit-log/audit-log.module";
import { NumberSequenceModule } from "../number-sequences/number-sequence.module";
import { AccountingController } from "./accounting.controller";
import { AccountingService } from "./accounting.service";

@Module({
  imports: [AuditLogModule, NumberSequenceModule],
  controllers: [AccountingController],
  providers: [AccountingService],
})
export class AccountingModule {}
