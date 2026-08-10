import { Injectable } from "@nestjs/common";
import { PERMISSIONS, type Permission } from "@ledgerbyte/shared";
import { PrismaService } from "../prisma/prisma.service";

export type ExportManifestScopeKey =
  | "organizationProfile"
  | "accounts"
  | "contacts"
  | "items"
  | "taxRates"
  | "numberSequences"
  | "generatedDocuments"
  | "auditLogs";

export type ExportManifestCounts = Record<ExportManifestScopeKey, number>;

interface ExportManifestScopeDefinition {
  key: ExportManifestScopeKey;
  label: string;
  permission: Permission;
  exportFormat: "json";
  includes: string[];
  excludes: string[];
}

const EXPORT_MANIFEST_VERSION = "2026-06-20.openbooks-adoption.export-manifest.v1";

const EXPORT_SCOPE_DEFINITIONS: ExportManifestScopeDefinition[] = [
  {
    key: "organizationProfile",
    label: "Organization profile",
    permission: PERMISSIONS.organization.view,
    exportFormat: "json",
    includes: ["organization identity", "local profile metadata"],
    excludes: ["secrets", "authentication credentials", "provider tokens"],
  },
  {
    key: "accounts",
    label: "Chart of accounts",
    permission: PERMISSIONS.accounts.view,
    exportFormat: "json",
    includes: ["account code", "name", "type", "posting flags"],
    excludes: ["journal-line balances", "period close proof"],
  },
  {
    key: "contacts",
    label: "Contacts",
    permission: PERMISSIONS.contacts.view,
    exportFormat: "json",
    includes: ["customer and supplier profile metadata"],
    excludes: ["email delivery credentials", "external provider identifiers"],
  },
  {
    key: "items",
    label: "Products and services",
    permission: PERMISSIONS.items.view,
    exportFormat: "json",
    includes: ["item profile", "SKU", "sales and purchase defaults"],
    excludes: ["inventory valuation proof", "stock movement history"],
  },
  {
    key: "taxRates",
    label: "Tax rates",
    permission: PERMISSIONS.taxRates.view,
    exportFormat: "json",
    includes: ["tax rate name", "rate", "scope", "category"],
    excludes: ["tax authority submission artifacts", "provider validation results"],
  },
  {
    key: "numberSequences",
    label: "Numbering sequences",
    permission: PERMISSIONS.numberSequences.view,
    exportFormat: "json",
    includes: ["scope", "prefix", "padding", "next number metadata"],
    excludes: ["reservation locks", "future number guarantees"],
  },
  {
    key: "generatedDocuments",
    label: "Generated document metadata",
    permission: PERMISSIONS.generatedDocuments.view,
    exportFormat: "json",
    includes: ["document type", "source reference", "filename", "status", "hash and size metadata"],
    excludes: ["PDF/base64 content", "object storage payloads", "signed URLs"],
  },
  {
    key: "auditLogs",
    label: "Audit log metadata",
    permission: PERMISSIONS.auditLogs.view,
    exportFormat: "json",
    includes: ["action", "entity type", "entity id", "created timestamp"],
    excludes: ["retention changes", "legal archive certification", "external SIEM forwarding"],
  },
];

@Injectable()
export class DataManagementService {
  constructor(private readonly prisma: PrismaService) {}

  async exportManifest(organizationId: string) {
    const counts = await this.exportManifestCounts(organizationId);
    return buildExportManifest(organizationId, counts);
  }

  private async exportManifestCounts(organizationId: string): Promise<ExportManifestCounts> {
    const [
      organizationProfile,
      accounts,
      contacts,
      items,
      taxRates,
      numberSequences,
      generatedDocuments,
      auditLogs,
    ] = await Promise.all([
      this.prisma.organization.count({ where: { id: organizationId } }),
      this.prisma.account.count({ where: { organizationId } }),
      this.prisma.contact.count({ where: { organizationId } }),
      this.prisma.item.count({ where: { organizationId } }),
      this.prisma.taxRate.count({ where: { organizationId } }),
      this.prisma.numberSequence.count({ where: { organizationId } }),
      this.prisma.generatedDocument.count({ where: { organizationId } }),
      this.prisma.auditLog.count({ where: { organizationId } }),
    ]);

    return {
      organizationProfile,
      accounts,
      contacts,
      items,
      taxRates,
      numberSequences,
      generatedDocuments,
      auditLogs,
    };
  }
}

export function buildExportManifest(organizationId: string, counts: ExportManifestCounts) {
  return {
    manifestVersion: EXPORT_MANIFEST_VERSION,
    generatedAt: new Date(),
    organizationId,
    status: "PLAN_ONLY",
    mode: "METADATA_MANIFEST_ONLY",
    exportNotStarted: true,
    scopes: EXPORT_SCOPE_DEFINITIONS.map((scope) => ({
      ...scope,
      state: "PLANNED",
      recordCount: counts[scope.key],
      requiresPermission: scope.permission,
    })),
    blockedActions: [
      { action: "downloadFullArchive", reason: "Full tenant archive download is not implemented in this planning slice." },
      { action: "importData", reason: "Import remains design-only until schema mapping, validation, and audit requirements are approved." },
      { action: "backupRestore", reason: "Backup and restore proof remains separate from this metadata manifest." },
      { action: "providerSync", reason: "No storage, email, compliance, or external provider mutations are performed." },
    ],
    notes: [
      "This export manifest is read-only planning metadata and does not export tenant data.",
      "This endpoint does not perform backup, restore, import, provider sync, file generation, signed URL creation, email sending, or compliance submission.",
      "Generated document scope reports metadata only; document bytes and object-storage payloads remain excluded.",
    ],
  };
}
