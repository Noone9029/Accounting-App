import { Module } from "@nestjs/common";
import { AuditLogModule } from "../audit-log/audit-log.module";
import { PrismaModule } from "../prisma/prisma.module";
import { InvoicePaymentLinkController, PaymentProviderController } from "./payment-provider.controller";
import { PaymentProviderService } from "./payment-provider.service";

@Module({
  imports: [PrismaModule, AuditLogModule],
  controllers: [PaymentProviderController, InvoicePaymentLinkController],
  providers: [PaymentProviderService],
  exports: [PaymentProviderService],
})
export class PaymentProviderModule {}
