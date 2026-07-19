interface OrganizationInviteTemplateInput {
  organizationName: string;
  roleName: string;
  acceptUrl: string;
  expiresInText: string;
}

interface PasswordResetTemplateInput {
  resetUrl: string;
  expiresInText: string;
}

interface TestEmailTemplateInput {
  provider: string;
}

interface InvoicePaymentPreviewTemplateInput {
  organizationName: string;
  customerName: string;
  documentNumber: string;
  amount: string;
  dueDate: string;
  paymentLinkUrl: string;
}

interface SalesInvoiceDeliveryTemplateInput {
  organizationName: string;
  customerDisplayName: string;
  invoiceNumber: string;
  currency: string;
  transactionTotal: string;
  transactionBalanceDue: string;
  dueDate?: string | null;
  message?: string;
}

interface SalesQuoteDeliveryTemplateInput {
  documentKind: "QUOTE" | "PROFORMA";
  organizationName: string;
  customerDisplayName: string;
  quoteNumber: string;
  currency: string;
  total: string;
  expiryDate?: string | null;
  message?: string;
}

interface CreditNoteDeliveryTemplateInput {
  organizationName: string;
  customerDisplayName: string;
  creditNoteNumber: string;
  currency: string;
  total: string;
  issueDate: string;
  sourceInvoiceNumber?: string | null;
  message?: string;
}

interface CustomerPaymentReceiptDeliveryTemplateInput {
  organizationName: string;
  customerDisplayName: string;
  paymentNumber: string;
  paymentDate: string;
  currency: string;
  amountReceived: string;
  reference?: string | null;
  message?: string;
}

interface CustomerStatementDeliveryTemplateInput {
  organizationName: string;
  customerDisplayName: string;
  periodFrom: string;
  periodTo: string;
  asOf: string;
  closingBalance?: string | null;
  currency?: string | null;
  message?: string;
}

interface PurchaseOrderDeliveryTemplateInput {
  organizationName: string;
  supplierDisplayName: string;
  purchaseOrderNumber: string;
  currency: string;
  total: string;
  orderDate: string;
  expectedDeliveryDate?: string | null;
  message?: string;
}

interface PurchaseDebitNoteDeliveryTemplateInput {
  organizationName: string;
  supplierDisplayName: string;
  debitNoteNumber: string;
  currency: string;
  transactionTotal: string;
  issueDate: string;
  originalBillNumber?: string | null;
  message?: string;
}

interface SupplierPaymentRemittanceDeliveryTemplateInput {
  organizationName: string;
  supplierDisplayName: string;
  paymentNumber: string;
  currency: string;
  transactionAmountPaid: string;
  paymentDate: string;
  safeDescription?: string | null;
  message?: string;
}

interface SupplierStatementDeliveryTemplateInput {
  organizationName: string;
  supplierDisplayName: string;
  periodLabel: string;
  asOf: string;
  currency?: string | null;
  closingBalance: string;
  message?: string;
}

export function buildOrganizationInviteEmail(input: OrganizationInviteTemplateInput) {
  const subject = `You're invited to ${input.organizationName} on LedgerByte`;
  const bodyText = [
    `You've been invited to join ${input.organizationName} on LedgerByte as ${input.roleName}.`,
    "",
    `Accept invitation: ${input.acceptUrl}`,
    "",
    `This invitation expires in ${input.expiresInText}.`,
    "",
    "LedgerByte",
  ].join("\n");

  return {
    subject,
    bodyText,
    bodyHtml: `<p>You've been invited to join <strong>${escapeHtml(input.organizationName)}</strong> on LedgerByte as ${escapeHtml(input.roleName)}.</p><p><a href="${escapeHtml(input.acceptUrl)}">Accept invitation</a></p><p>This invitation expires in ${escapeHtml(input.expiresInText)}.</p><p>LedgerByte</p>`,
  };
}

export function buildPasswordResetEmail(input: PasswordResetTemplateInput) {
  const subject = "Reset your LedgerByte password";
  const bodyText = [
    "A password reset was requested for your LedgerByte account.",
    "",
    `Reset password: ${input.resetUrl}`,
    "",
    `This link expires in ${input.expiresInText}.`,
    "",
    "If you did not request this, you can ignore this email.",
    "",
    "LedgerByte",
  ].join("\n");

  return {
    subject,
    bodyText,
    bodyHtml: `<p>A password reset was requested for your LedgerByte account.</p><p><a href="${escapeHtml(input.resetUrl)}">Reset password</a></p><p>This link expires in ${escapeHtml(input.expiresInText)}.</p><p>If you did not request this, you can ignore this email.</p><p>LedgerByte</p>`,
  };
}

export function buildTestEmail(input: TestEmailTemplateInput) {
  const subject = "LedgerByte test email";
  const bodyText = [
    "This is a LedgerByte test email.",
    "",
    `Provider: ${input.provider}`,
    "",
    "If you received this through a real SMTP mailbox, the configured provider is able to deliver messages.",
    "",
    "LedgerByte",
  ].join("\n");

  return {
    subject,
    bodyText,
    bodyHtml: `<p>This is a LedgerByte test email.</p><p>Provider: ${escapeHtml(input.provider)}</p><p>If you received this through a real SMTP mailbox, the configured provider is able to deliver messages.</p><p>LedgerByte</p>`,
  };
}

export function buildInvoiceEmailPreview(input: InvoicePaymentPreviewTemplateInput) {
  const subject = `Invoice ${input.documentNumber} from ${input.organizationName}`;
  const bodyText = [
    `Hello ${input.customerName},`,
    "",
    `${input.organizationName} has prepared invoice ${input.documentNumber} for ${input.amount}.`,
    `Due date: ${input.dueDate}.`,
    "",
    "This is a LedgerByte local preview. No real email was sent.",
    "",
    "LedgerByte",
  ].join("\n");

  return {
    subject,
    bodyText,
    bodyHtml: `<p>Hello ${escapeHtml(input.customerName)},</p><p>${escapeHtml(input.organizationName)} has prepared invoice <strong>${escapeHtml(input.documentNumber)}</strong> for ${escapeHtml(input.amount)}.</p><p>Due date: ${escapeHtml(input.dueDate)}.</p><p>This is a LedgerByte local preview. No real email was sent.</p><p>LedgerByte</p>`,
  };
}

export function buildSalesInvoiceDeliveryEmail(input: SalesInvoiceDeliveryTemplateInput) {
  const bodyText = input.message ?? [
    `Hello ${input.customerDisplayName},`,
    "",
    `Please find invoice ${input.invoiceNumber} attached.`,
    "",
    `Invoice total: ${input.currency} ${input.transactionTotal}`,
    `Balance due: ${input.currency} ${input.transactionBalanceDue}`,
    `Due date: ${input.dueDate || "Not specified"}`,
    "",
    "Regards,",
    input.organizationName,
  ].join("\n");

  return {
    subject: `Invoice ${input.invoiceNumber} from ${input.organizationName}`,
    bodyText,
    bodyHtml: bodyText
      .split("\n")
      .map((line) => `<p>${escapeHtml(line) || "&nbsp;"}</p>`)
      .join(""),
  };
}

export function buildSalesQuoteDeliveryEmail(input: SalesQuoteDeliveryTemplateInput) {
  const label = input.documentKind === "PROFORMA" ? "Proforma" : "Quote";
  const bodyText = input.message ?? [
    `Hello ${input.customerDisplayName},`,
    "",
    `Please find ${label.toLowerCase()} ${input.quoteNumber} attached.`,
    "",
    `${label} total: ${input.currency} ${input.total}`,
    `Valid until: ${input.expiryDate || "Not specified"}`,
    "",
    "Regards,",
    input.organizationName,
  ].join("\n");

  return {
    subject: `${label} ${input.quoteNumber} from ${input.organizationName}`,
    bodyText,
    bodyHtml: bodyToHtml(bodyText),
  };
}

export function buildCreditNoteDeliveryEmail(input: CreditNoteDeliveryTemplateInput) {
  const bodyText = input.message ?? [
    `Hello ${input.customerDisplayName},`,
    "",
    `Please find credit note ${input.creditNoteNumber} attached.`,
    "",
    `Credit-note total: ${input.currency} ${input.total}`,
    `Issue date: ${input.issueDate}`,
    ...(input.sourceInvoiceNumber ? [`Source invoice: ${input.sourceInvoiceNumber}`] : []),
    "",
    "Regards,",
    input.organizationName,
  ].join("\n");

  return {
    subject: `Credit note ${input.creditNoteNumber} from ${input.organizationName}`,
    bodyText,
    bodyHtml: bodyToHtml(bodyText),
  };
}

export function buildCustomerPaymentReceiptDeliveryEmail(input: CustomerPaymentReceiptDeliveryTemplateInput) {
  const bodyText = input.message ?? [
    `Hello ${input.customerDisplayName},`,
    "",
    `Please find payment receipt ${input.paymentNumber} attached.`,
    "",
    `Payment date: ${input.paymentDate}`,
    `Amount received: ${input.currency} ${input.amountReceived}`,
    ...(input.reference ? [`Reference: ${input.reference}`] : []),
    "",
    "Regards,",
    input.organizationName,
  ].join("\n");

  return {
    subject: `Payment receipt ${input.paymentNumber} from ${input.organizationName}`,
    bodyText,
    bodyHtml: bodyToHtml(bodyText),
  };
}

export function buildCustomerStatementDeliveryEmail(input: CustomerStatementDeliveryTemplateInput) {
  const periodLabel = `${input.periodFrom} to ${input.periodTo}`;
  const bodyText = input.message ?? [
    `Hello ${input.customerDisplayName},`,
    "",
    `Please find your customer statement for ${periodLabel} attached.`,
    `As of: ${input.asOf}`,
    ...(input.closingBalance != null ? [`Closing balance: ${input.currency ?? ""} ${input.closingBalance}`.trim()] : []),
    "",
    "Regards,",
    input.organizationName,
  ].join("\n");

  return {
    subject: `Customer statement from ${input.organizationName}, ${periodLabel}`,
    bodyText,
    bodyHtml: bodyToHtml(bodyText),
  };
}

export function buildPurchaseOrderDeliveryEmail(input: PurchaseOrderDeliveryTemplateInput) {
  const bodyText = input.message ?? [
    `Hello ${input.supplierDisplayName},`,
    "",
    `Please find purchase order ${input.purchaseOrderNumber} attached.`,
    "",
    `Order total: ${input.currency} ${input.total}`,
    `Order date: ${input.orderDate}`,
    `Expected delivery: ${input.expectedDeliveryDate || "Not specified"}`,
    "",
    "Regards,",
    input.organizationName,
  ].join("\n");

  return {
    subject: `Purchase order ${input.purchaseOrderNumber} from ${input.organizationName}`,
    bodyText,
    bodyHtml: bodyToHtml(bodyText),
  };
}

export function buildPurchaseDebitNoteDeliveryEmail(input: PurchaseDebitNoteDeliveryTemplateInput) {
  const bodyText = input.message ?? [
    `Hello ${input.supplierDisplayName},`,
    "",
    `Please find purchase debit note ${input.debitNoteNumber} attached.`,
    "",
    `Debit note total: ${input.currency} ${input.transactionTotal}`,
    `Issue date: ${input.issueDate}`,
    `Related bill: ${input.originalBillNumber || "Not specified"}`,
    "",
    "Regards,",
    input.organizationName,
  ].join("\n");

  return {
    subject: `Purchase debit note ${input.debitNoteNumber} from ${input.organizationName}`,
    bodyText,
    bodyHtml: bodyToHtml(bodyText),
  };
}

export function buildSupplierPaymentRemittanceDeliveryEmail(input: SupplierPaymentRemittanceDeliveryTemplateInput) {
  const bodyText = input.message ?? [
    `Hello ${input.supplierDisplayName},`,
    "",
    `Please find payment remittance ${input.paymentNumber} attached.`,
    "",
    `Payment amount: ${input.currency} ${input.transactionAmountPaid}`,
    `Payment date: ${input.paymentDate}`,
    `Reference: ${input.safeDescription || "Not specified"}`,
    "",
    "Regards,",
    input.organizationName,
  ].join("\n");

  return {
    subject: `Payment remittance ${input.paymentNumber} from ${input.organizationName}`,
    bodyText,
    bodyHtml: bodyToHtml(bodyText),
  };
}

export function buildSupplierStatementDeliveryEmail(input: SupplierStatementDeliveryTemplateInput) {
  const bodyText = input.message ?? [
    `Hello ${input.supplierDisplayName},`,
    "",
    "Please find your supplier statement attached.",
    "",
    `Statement period: ${input.periodLabel}`,
    `As of: ${input.asOf}`,
    `Closing balance: ${input.currency ?? ""} ${input.closingBalance}`.trim(),
    "",
    "Regards,",
    input.organizationName,
  ].join("\n");

  return {
    subject: `Supplier statement from ${input.organizationName}, ${input.periodLabel}`,
    bodyText,
    bodyHtml: bodyToHtml(bodyText),
  };
}

export function buildPaymentLinkEmailPreview(input: InvoicePaymentPreviewTemplateInput) {
  const subject = `Payment link for invoice ${input.documentNumber}`;
  const bodyText = [
    `Hello ${input.customerName},`,
    "",
    `A payment link is ready for invoice ${input.documentNumber}.`,
    `Amount: ${input.amount}.`,
    `Preview payment link: ${input.paymentLinkUrl}`,
    "",
    "This is a LedgerByte local preview. No real email was sent.",
    "",
    "LedgerByte",
  ].join("\n");

  return {
    subject,
    bodyText,
    bodyHtml: `<p>Hello ${escapeHtml(input.customerName)},</p><p>A payment link is ready for invoice <strong>${escapeHtml(input.documentNumber)}</strong>.</p><p>Amount: ${escapeHtml(input.amount)}.</p><p><a href="${escapeHtml(input.paymentLinkUrl)}">Preview payment link</a></p><p>This is a LedgerByte local preview. No real email was sent.</p><p>LedgerByte</p>`,
  };
}

export function buildPaymentReceiptEmailPreview(input: InvoicePaymentPreviewTemplateInput) {
  const subject = `Payment receipt for ${input.documentNumber}`;
  const bodyText = [
    `Hello ${input.customerName},`,
    "",
    `${input.organizationName} has recorded a payment for ${input.documentNumber}.`,
    `Amount received: ${input.amount}.`,
    "",
    "This is a LedgerByte local preview. No real email was sent.",
    "",
    "LedgerByte",
  ].join("\n");

  return {
    subject,
    bodyText,
    bodyHtml: `<p>Hello ${escapeHtml(input.customerName)},</p><p>${escapeHtml(input.organizationName)} has recorded a payment for ${escapeHtml(input.documentNumber)}.</p><p>Amount received: ${escapeHtml(input.amount)}.</p><p>This is a LedgerByte local preview. No real email was sent.</p><p>LedgerByte</p>`,
  };
}

export function buildFailedDeliveryNotificationPreview(input: InvoicePaymentPreviewTemplateInput) {
  const subject = `Delivery review needed for ${input.documentNumber}`;
  const bodyText = [
    `Invoice/payment email delivery needs review for ${input.documentNumber}.`,
    "",
    `Customer: ${input.customerName}.`,
    `Amount: ${input.amount}.`,
    "",
    "This is a LedgerByte local preview. No real email was sent.",
    "",
    "LedgerByte",
  ].join("\n");

  return {
    subject,
    bodyText,
    bodyHtml: `<p>Invoice/payment email delivery needs review for <strong>${escapeHtml(input.documentNumber)}</strong>.</p><p>Customer: ${escapeHtml(input.customerName)}.</p><p>Amount: ${escapeHtml(input.amount)}.</p><p>This is a LedgerByte local preview. No real email was sent.</p><p>LedgerByte</p>`,
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function bodyToHtml(bodyText: string): string {
  return bodyText
    .split("\n")
    .map((line) => `<p>${escapeHtml(line) || "&nbsp;"}</p>`)
    .join("");
}
