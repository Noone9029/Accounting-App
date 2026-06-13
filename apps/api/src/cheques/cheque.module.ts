import { Module } from "@nestjs/common";
import { AuditLogModule } from "../audit-log/audit-log.module";
import { PrismaModule } from "../prisma/prisma.module";
import { ChequeController } from "./cheque.controller";
import { ChequeService } from "./cheque.service";

@Module({
  imports: [PrismaModule, AuditLogModule],
  controllers: [ChequeController],
  providers: [ChequeService],
  exports: [ChequeService],
})
export class ChequeModule {}
