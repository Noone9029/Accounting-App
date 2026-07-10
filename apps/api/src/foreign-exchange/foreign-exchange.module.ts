import { Global, Module } from "@nestjs/common";
import { AuditLogModule } from "../audit-log/audit-log.module";
import { BaseCurrencyPostingGuardService } from "./base-currency-posting-guard.service";
import { ForeignExchangeController } from "./foreign-exchange.controller";
import { ForeignExchangeService } from "./foreign-exchange.service";

@Global()
@Module({
  imports: [AuditLogModule],
  controllers: [ForeignExchangeController],
  providers: [ForeignExchangeService, BaseCurrencyPostingGuardService],
  exports: [ForeignExchangeService, BaseCurrencyPostingGuardService],
})
export class ForeignExchangeModule {}
