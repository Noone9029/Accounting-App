import { Module } from "@nestjs/common";
import { AuditLogModule } from "../audit-log/audit-log.module";
import { NumberSequenceModule } from "../number-sequences/number-sequence.module";
import { PrismaModule } from "../prisma/prisma.module";
import { RecurringInvoiceController } from "./recurring-invoice.controller";
import { RecurringInvoiceService } from "./recurring-invoice.service";

@Module({
  imports: [PrismaModule, AuditLogModule, NumberSequenceModule],
  controllers: [RecurringInvoiceController],
  providers: [RecurringInvoiceService],
  exports: [RecurringInvoiceService],
})
export class RecurringInvoiceModule {}
