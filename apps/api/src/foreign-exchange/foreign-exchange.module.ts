import { Module } from "@nestjs/common";
import { AuditLogModule } from "../audit-log/audit-log.module";
import { ForeignExchangeController } from "./foreign-exchange.controller";
import { ForeignExchangeService } from "./foreign-exchange.service";

@Module({
  imports: [AuditLogModule],
  controllers: [ForeignExchangeController],
  providers: [ForeignExchangeService],
  exports: [ForeignExchangeService],
})
export class ForeignExchangeModule {}
