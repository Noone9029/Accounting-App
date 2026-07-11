import { Global, Module } from "@nestjs/common";
import { AuditLogModule } from "../audit-log/audit-log.module";
import { FiscalPeriodModule } from "../fiscal-periods/fiscal-period.module";
import { NumberSequenceModule } from "../number-sequences/number-sequence.module";
import { BaseCurrencyPostingGuardService } from "./base-currency-posting-guard.service";
import { ForeignExchangeController } from "./foreign-exchange.controller";
import { ForeignExchangeService } from "./foreign-exchange.service";
import { DocumentFxContextService } from "./document-fx-context.service";
import { FxCarryingBalanceService } from "./fx-carrying-balance.service";
import { FxRevaluationService } from "./fx-revaluation.service";

@Global()
@Module({
  imports: [AuditLogModule, FiscalPeriodModule, NumberSequenceModule],
  controllers: [ForeignExchangeController],
  providers: [ForeignExchangeService, FxRevaluationService, FxCarryingBalanceService, BaseCurrencyPostingGuardService, DocumentFxContextService],
  exports: [ForeignExchangeService, FxRevaluationService, FxCarryingBalanceService, BaseCurrencyPostingGuardService, DocumentFxContextService],
})
export class ForeignExchangeModule {}
