import { Module } from "@nestjs/common";
import { AuditLogModule } from "../audit-log/audit-log.module";
import { GeneratedDocumentModule } from "../generated-documents/generated-document.module";
import { OrganizationDocumentSettingsModule } from "../document-settings/organization-document-settings.module";
import { InventoryModule } from "../inventory/inventory.module";
import { PurchaseMatchingModule } from "../purchase-matching/purchase-matching.module";
import { ContactLedgerService } from "./contact-ledger.service";
import { ContactController } from "./contact.controller";
import { ContactService } from "./contact.service";
import { CustomerStatementEmailDeliveryService } from "./customer-statement-email-delivery.service";
import { SupplierStatementEmailDeliveryService } from "./supplier-statement-email-delivery.service";
import { SupplierApDashboardService } from "./supplier-ap-dashboard.service";

@Module({
  imports: [AuditLogModule, OrganizationDocumentSettingsModule, GeneratedDocumentModule, PurchaseMatchingModule, InventoryModule],
  controllers: [ContactController],
  providers: [ContactService, ContactLedgerService, SupplierApDashboardService, CustomerStatementEmailDeliveryService, SupplierStatementEmailDeliveryService],
})
export class ContactModule {}
