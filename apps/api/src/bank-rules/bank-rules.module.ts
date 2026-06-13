import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { BankStatementModule } from "../bank-statements/bank-statement.module";
import { BankRuleStatementTransactionController, BankRulesController } from "./bank-rules.controller";
import { BankRulesService } from "./bank-rules.service";

@Module({
  imports: [PrismaModule, BankStatementModule],
  controllers: [BankRulesController, BankRuleStatementTransactionController],
  providers: [BankRulesService],
  exports: [BankRulesService],
})
export class BankRulesModule {}
