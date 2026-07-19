import { Module } from "@nestjs/common";
import { AuditLogModule } from "../audit-log/audit-log.module";
import { OrganizationDocumentSettingsModule } from "../document-settings/organization-document-settings.module";
import { EmailModule } from "../email/email.module";
import { GeneratedDocumentModule } from "../generated-documents/generated-document.module";
import { NumberSequenceModule } from "../number-sequences/number-sequence.module";
import { PrismaModule } from "../prisma/prisma.module";
import { PurchaseOrderController } from "./purchase-order.controller";
import { PurchaseOrderEmailDeliveryService } from "./purchase-order-email-delivery.service";
import { PurchaseOrderService } from "./purchase-order.service";

@Module({
  imports: [PrismaModule, AuditLogModule, NumberSequenceModule, OrganizationDocumentSettingsModule, GeneratedDocumentModule, EmailModule],
  controllers: [PurchaseOrderController],
  providers: [PurchaseOrderService, PurchaseOrderEmailDeliveryService],
  exports: [PurchaseOrderService],
})
export class PurchaseOrderModule {}
