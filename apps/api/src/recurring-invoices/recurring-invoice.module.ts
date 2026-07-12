import { Module } from "@nestjs/common";
import { AuditLogModule } from "../audit-log/audit-log.module";
import { NumberSequenceModule } from "../number-sequences/number-sequence.module";
import { RecurringTransactionModule } from "../recurring-transactions/recurring-transaction.module";
import { PrismaModule } from "../prisma/prisma.module";
import { RecurringInvoiceController } from "./recurring-invoice.controller";
import { RecurringInvoiceService } from "./recurring-invoice.service";
import { RecurringInvoiceCompatibilityService } from "./recurring-invoice-compatibility.service";

@Module({
  imports: [PrismaModule, AuditLogModule, NumberSequenceModule, RecurringTransactionModule],
  controllers: [RecurringInvoiceController],
  providers: [RecurringInvoiceService, RecurringInvoiceCompatibilityService],
  exports: [RecurringInvoiceService, RecurringInvoiceCompatibilityService],
})
export class RecurringInvoiceModule {}
