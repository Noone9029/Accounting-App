import { EmailDeliveryTargetType, EmailTemplateType } from "@prisma/client";
import { IsIn, IsOptional, IsUUID } from "class-validator";

const INVOICE_PAYMENT_EMAIL_TEMPLATES = [
  EmailTemplateType.SALES_INVOICE,
  EmailTemplateType.INVOICE_PAYMENT_LINK,
  EmailTemplateType.PAYMENT_RECEIPT,
  EmailTemplateType.FAILED_DELIVERY_NOTIFICATION,
];

const INVOICE_PAYMENT_EMAIL_TARGET_TYPES = [
  EmailDeliveryTargetType.SALES_INVOICE,
  EmailDeliveryTargetType.INVOICE_PAYMENT_LINK,
  EmailDeliveryTargetType.CUSTOMER_PAYMENT,
  EmailDeliveryTargetType.SYSTEM_NOTIFICATION,
];

export class InvoicePaymentEmailPreviewDto {
  @IsIn(INVOICE_PAYMENT_EMAIL_TEMPLATES)
  templateType!: EmailTemplateType;

  @IsIn(INVOICE_PAYMENT_EMAIL_TARGET_TYPES)
  targetType!: EmailDeliveryTargetType;

  @IsOptional()
  @IsUUID()
  targetId?: string;
}
