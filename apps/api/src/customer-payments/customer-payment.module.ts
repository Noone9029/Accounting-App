import { Module } from "@nestjs/common";
import { AuditLogModule } from "../audit-log/audit-log.module";
import { NumberSequenceModule } from "../number-sequences/number-sequence.module";
import { PrismaModule } from "../prisma/prisma.module";
import { CustomerPaymentController } from "./customer-payment.controller";
import { CustomerPaymentService } from "./customer-payment.service";

@Module({
  imports: [PrismaModule, AuditLogModule, NumberSequenceModule],
  controllers: [CustomerPaymentController],
  providers: [CustomerPaymentService],
})
export class CustomerPaymentModule {}
