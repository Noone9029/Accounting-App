import { Module } from "@nestjs/common";
import { AuditLogModule } from "../audit-log/audit-log.module";
import { PrismaModule } from "../prisma/prisma.module";
import { ZatcaController } from "./zatca.controller";
import { ZatcaService } from "./zatca.service";

@Module({
  imports: [PrismaModule, AuditLogModule],
  controllers: [ZatcaController],
  providers: [ZatcaService],
  exports: [ZatcaService],
})
export class ZatcaModule {}
