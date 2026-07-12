import { Module } from "@nestjs/common";
import { AccountingModule } from "../accounting/accounting.module";
import { AuditLogModule } from "../audit-log/audit-log.module";
import { CashExpenseModule } from "../cash-expenses/cash-expense.module";
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
import { RecurringExpenseProposalService } from "./recurring-expense-proposal.service";
import { RecurringTemplateService } from "./recurring-template.service";
import { RecurringReadinessService } from "./recurring-readiness.service";
import { RecurringTransactionController } from "./recurring-transaction.controller";
import { RecurringWorkerController } from "./recurring-worker.controller";

@Module({
  imports: [
    PrismaModule,
    AuditLogModule,
    FiscalPeriodModule,
    NumberSequenceModule,
    SalesInvoiceModule,
    PurchaseBillModule,
    AccountingModule,
    CashExpenseModule,
  ],
  providers: [
    RecurringTemplateService,
    RecurringRunService,
    RecurringExpenseProposalService,
    RecurringReadinessService,
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
  controllers: [RecurringTransactionController, RecurringWorkerController],
  exports: [RecurringTemplateService, RecurringRunService, RecurringExpenseProposalService, RecurringReadinessService],
})
export class RecurringTransactionModule {}
