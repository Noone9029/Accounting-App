import { Inject, Injectable } from "@nestjs/common";
import { Prisma, RecurringTransactionType } from "@prisma/client";

export interface RecurringGenerationContext {
  organizationId: string;
  runId: string;
  templateId: string;
  templateVersion: number;
  scheduledFor: Date;
  scheduledLocalDate: Date;
  actorUserId: string | null;
  requestId: string | null;
  template: unknown;
}

export interface RecurringGeneratedTarget {
  generatedEntityType: "SALES_INVOICE" | "PURCHASE_BILL" | "MANUAL_JOURNAL" | "EXPENSE_PROPOSAL";
  generatedEntityId: string;
  link:
    | { generatedSalesInvoiceId: string }
    | { generatedPurchaseBillId: string }
    | { generatedJournalEntryId: string }
    | { generatedExpenseProposalId: string };
}

export interface RecurringGenerationAdapter {
  readonly transactionType: RecurringTransactionType;
  generate(context: RecurringGenerationContext, tx: Prisma.TransactionClient): Promise<RecurringGeneratedTarget>;
}

export const RECURRING_GENERATION_ADAPTERS = "RECURRING_GENERATION_ADAPTERS";

@Injectable()
export class RecurringGenerationDispatcher {
  private readonly byType: ReadonlyMap<RecurringTransactionType, RecurringGenerationAdapter>;

  constructor(@Inject(RECURRING_GENERATION_ADAPTERS) adapters: RecurringGenerationAdapter[]) {
    this.byType = new Map(adapters.map((adapter) => [adapter.transactionType, adapter]));
  }

  generate(transactionType: RecurringTransactionType, context: RecurringGenerationContext, tx: Prisma.TransactionClient) {
    const adapter = this.byType.get(transactionType);
    if (!adapter) throw new Error(`No recurring generation adapter is registered for ${transactionType}.`);
    return adapter.generate(context, tx);
  }
}
