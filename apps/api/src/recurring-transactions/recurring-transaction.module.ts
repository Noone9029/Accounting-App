import { Module } from "@nestjs/common";
import { AccountingModule } from "../accounting/accounting.module";
import { AuditLogModule } from "../audit-log/audit-log.module";
import { FiscalPeriodModule } from "../fiscal-periods/fiscal-period.module";
import { NumberSequenceModule } from "../number-sequences/number-sequence.module";
import { PrismaModule } from "../prisma/prisma.module";
import { PurchaseBillModule } from "../purchase-bills/purchase-bill.module";
import { SalesInvoiceModule } from "../sales-invoices/sales-invoice.module";
import {
  RecurringExpenseProposalAdapter,
  RecurringJournalAdapter,
  RecurringPurchaseBillAdapter,
  RecurringSalesInvoiceAdapter,
} from "./recurring-generation.adapters";
import {
  RECURRING_GENERATION_ADAPTERS,
  RecurringGenerationDispatcher,
} from "./recurring-generation.dispatcher";
import { RecurringRunService } from "./recurring-run.service";
import { RecurringTemplateService } from "./recurring-template.service";

@Module({
  imports: [
    PrismaModule,
    AuditLogModule,
    FiscalPeriodModule,
    NumberSequenceModule,
    SalesInvoiceModule,
    PurchaseBillModule,
    AccountingModule,
  ],
  providers: [
    RecurringTemplateService,
    RecurringRunService,
    RecurringSalesInvoiceAdapter,
    RecurringPurchaseBillAdapter,
    RecurringExpenseProposalAdapter,
    RecurringJournalAdapter,
    {
      provide: RECURRING_GENERATION_ADAPTERS,
      inject: [
        RecurringSalesInvoiceAdapter,
        RecurringPurchaseBillAdapter,
        RecurringExpenseProposalAdapter,
        RecurringJournalAdapter,
      ],
      useFactory: (
        sales: RecurringSalesInvoiceAdapter,
        purchase: RecurringPurchaseBillAdapter,
        expense: RecurringExpenseProposalAdapter,
        journal: RecurringJournalAdapter,
      ) => [sales, purchase, expense, journal],
    },
    RecurringGenerationDispatcher,
  ],
  exports: [RecurringTemplateService, RecurringRunService],
})
export class RecurringTransactionModule {}
