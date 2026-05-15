import { Module } from "@nestjs/common";
import { AuditLogModule } from "../audit-log/audit-log.module";
import { NumberSequenceController } from "./number-sequence.controller";
import { NumberSequenceService } from "./number-sequence.service";

@Module({
  imports: [AuditLogModule],
  controllers: [NumberSequenceController],
  providers: [NumberSequenceService],
  exports: [NumberSequenceService],
})
export class NumberSequenceModule {}
