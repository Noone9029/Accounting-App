import { BadRequestException, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type { DocumentRenderSettings } from "@ledgerbyte/pdf-core";
import { AuditLogService } from "../audit-log/audit-log.service";
import { PrismaService } from "../prisma/prisma.service";
import { UpdateOrganizationDocumentSettingsDto } from "./dto/update-organization-document-settings.dto";

const allowedTemplates = new Set(["standard", "compact", "detailed"]);
const colorPattern = /^#[0-9a-fA-F]{6}$/;

@Injectable()
export class OrganizationDocumentSettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  getOrCreate(organizationId: string) {
    return this.prisma.organizationDocumentSettings.upsert({
      where: { organizationId },
      update: {},
      create: { organizationId },
    });
  }

  async update(organizationId: string, actorUserId: string, dto: UpdateOrganizationDocumentSettingsDto) {
    const data = this.toUpdateData(dto);
    const before = await this.getOrCreate(organizationId);

    const updated = await this.prisma.organizationDocumentSettings.update({
      where: { organizationId },
      data,
    });

    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action: "UPDATE",
      entityType: "OrganizationDocumentSettings",
      entityId: updated.id,
      before,
      after: updated,
    });

    return updated;
  }

  async invoiceRenderSettings(organizationId: string): Promise<DocumentRenderSettings> {
    const settings = await this.getOrCreate(organizationId);
    return this.toRenderSettings(settings, settings.invoiceTitle, settings.defaultInvoiceTemplate);
  }

  async receiptRenderSettings(organizationId: string): Promise<DocumentRenderSettings> {
    const settings = await this.getOrCreate(organizationId);
    return this.toRenderSettings(settings, settings.receiptTitle, settings.defaultReceiptTemplate);
  }

  async statementRenderSettings(organizationId: string): Promise<DocumentRenderSettings> {
    const settings = await this.getOrCreate(organizationId);
    return this.toRenderSettings(settings, settings.statementTitle, settings.defaultStatementTemplate);
  }

  private toUpdateData(dto: UpdateOrganizationDocumentSettingsDto): Prisma.OrganizationDocumentSettingsUpdateInput {
    const data: Prisma.OrganizationDocumentSettingsUpdateInput = {};

    if (dto.invoiceTitle !== undefined) {
      data.invoiceTitle = this.cleanRequiredText(dto.invoiceTitle, "Invoice title");
    }
    if (dto.receiptTitle !== undefined) {
      data.receiptTitle = this.cleanRequiredText(dto.receiptTitle, "Receipt title");
    }
    if (dto.statementTitle !== undefined) {
      data.statementTitle = this.cleanRequiredText(dto.statementTitle, "Statement title");
    }
    if (dto.footerText !== undefined) {
      data.footerText = this.cleanRequiredText(dto.footerText, "Footer text");
    }
    if (Object.prototype.hasOwnProperty.call(dto, "primaryColor")) {
      data.primaryColor = this.cleanColor(dto.primaryColor ?? null, "Primary color");
    }
    if (Object.prototype.hasOwnProperty.call(dto, "accentColor")) {
      data.accentColor = this.cleanColor(dto.accentColor ?? null, "Accent color");
    }
    if (dto.showTaxNumber !== undefined) {
      data.showTaxNumber = dto.showTaxNumber;
    }
    if (dto.showPaymentSummary !== undefined) {
      data.showPaymentSummary = dto.showPaymentSummary;
    }
    if (dto.showNotes !== undefined) {
      data.showNotes = dto.showNotes;
    }
    if (dto.showTerms !== undefined) {
      data.showTerms = dto.showTerms;
    }
    if (dto.defaultInvoiceTemplate !== undefined) {
      data.defaultInvoiceTemplate = this.cleanTemplate(dto.defaultInvoiceTemplate, "Invoice template");
    }
    if (dto.defaultReceiptTemplate !== undefined) {
      data.defaultReceiptTemplate = this.cleanTemplate(dto.defaultReceiptTemplate, "Receipt template");
    }
    if (dto.defaultStatementTemplate !== undefined) {
      data.defaultStatementTemplate = this.cleanTemplate(dto.defaultStatementTemplate, "Statement template");
    }

    return data;
  }

  private toRenderSettings(
    settings: {
      footerText: string;
      primaryColor: string | null;
      accentColor: string | null;
      showTaxNumber: boolean;
      showPaymentSummary: boolean;
      showNotes: boolean;
      showTerms: boolean;
    },
    title: string,
    template: string,
  ): DocumentRenderSettings {
    return {
      title,
      footerText: settings.footerText,
      primaryColor: settings.primaryColor,
      accentColor: settings.accentColor,
      showTaxNumber: settings.showTaxNumber,
      showPaymentSummary: settings.showPaymentSummary,
      showNotes: settings.showNotes,
      showTerms: settings.showTerms,
      template,
    };
  }

  private cleanRequiredText(value: string, label: string): string {
    const trimmed = value.trim();
    if (!trimmed) {
      throw new BadRequestException(`${label} cannot be blank.`);
    }
    return trimmed;
  }

  private cleanColor(value: string | null, label: string): string | null {
    const trimmed = value?.trim() ?? "";
    if (!trimmed) {
      return null;
    }
    if (!colorPattern.test(trimmed)) {
      throw new BadRequestException(`${label} must be a hex color like #111827.`);
    }
    return trimmed;
  }

  private cleanTemplate(value: string, label: string): string {
    const trimmed = value.trim();
    if (!allowedTemplates.has(trimmed)) {
      throw new BadRequestException(`${label} must be standard, compact, or detailed.`);
    }
    return trimmed;
  }
}
