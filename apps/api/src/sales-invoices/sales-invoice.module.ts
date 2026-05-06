import { Module } from "@nestjs/common";
import { AccountingModule } from "../accounting/accounting.module";
import { AuditLogModule } from "../audit-log/audit-log.module";
import { NumberSequenceModule } from "../number-sequences/number-sequence.module";
import { PrismaModule } from "../prisma/prisma.module";
import { SalesInvoiceController } from "./sales-invoice.controller";
import { SalesInvoiceService } from "./sales-invoice.service";

@Module({
  imports: [PrismaModule, AuditLogModule, NumberSequenceModule, AccountingModule],
  controllers: [SalesInvoiceController],
  providers: [SalesInvoiceService],
})
export class SalesInvoiceModule {}
