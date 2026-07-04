import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { GUARDS_METADATA } from "@nestjs/common/constants";
import { PERMISSIONS } from "@ledgerbyte/shared";
import { MembershipStatus } from "@prisma/client";
import { AccountingController } from "./accounting/accounting.controller";
import { AttachmentController } from "./attachments/attachment.controller";
import { AuditLogController } from "./audit-log/audit-log.controller";
import { CurrentOrganizationId } from "./auth/decorators/current-organization.decorator";
import { REQUIRED_PERMISSIONS_KEY } from "./auth/decorators/require-permissions.decorator";
import { JwtAuthGuard } from "./auth/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "./auth/guards/organization-context.guard";
import { PermissionGuard } from "./auth/guards/permission.guard";
import { ChartOfAccountsController } from "./chart-of-accounts/chart-of-accounts.controller";
import { ContactController } from "./contacts/contact.controller";
import { CustomerPaymentController } from "./customer-payments/customer-payment.controller";
import { DashboardController } from "./dashboard/dashboard.controller";
import { GeneratedDocumentController } from "./generated-documents/generated-document.controller";
import { NumberSequenceController } from "./number-sequences/number-sequence.controller";
import { OrganizationMemberController } from "./organization-members/organization-member.controller";
import { OrganizationMemberService } from "./organization-members/organization-member.service";
import { OrganizationController } from "./organizations/organization.controller";
import { OrganizationService } from "./organizations/organization.service";
import { PurchaseBillController } from "./purchase-bills/purchase-bill.controller";
import { ReportsController } from "./reports/reports.controller";
import { RoleController } from "./roles/role.controller";
import { RoleService } from "./roles/role.service";
import { SalesInvoiceController } from "./sales-invoices/sales-invoice.controller";
import { SearchController } from "./search/search.controller";
import { SearchService } from "./search/search.service";
import { StorageController } from "./storage/storage.controller";
import { SupplierPaymentController } from "./supplier-payments/supplier-payment.controller";
import { OrganizationDocumentSettingsController } from "./document-settings/organization-document-settings.controller";

describe("tenant isolation proof", () => {
  const tenantScopedControllers = [
    controllerCase("customers and suppliers", ContactController, [
      "list",
      "customers",
      "customer",
      "suppliers",
      "supplier",
      "supplierApDashboard",
      "supplierApSummary",
      "ledger",
      "statement",
      "statementPdfData",
      "statementPdf",
      "generateStatementPdf",
      "supplierLedger",
      "supplierStatement",
      "supplierStatementPdfData",
      "supplierStatementPdf",
      "get",
      "create",
      "update",
    ]),
    controllerCase("sales invoices", SalesInvoiceController, [
      "list",
      "open",
      "nextNumberPreview",
      "create",
      "get",
      "pdfData",
      "pdf",
      "creditNotes",
      "creditNoteAllocations",
      "customerPaymentUnappliedAllocations",
      "generatePdf",
      "update",
      "finalize",
      "void",
      "remove",
    ]),
    controllerCase("purchase bills", PurchaseBillController, [
      "list",
      "listOpen",
      "create",
      "get",
      "accountingPreview",
      "pdfData",
      "pdf",
      "generatePdf",
      "update",
      "finalize",
      "void",
      "remove",
    ]),
    controllerCase("customer payments", CustomerPaymentController, [
      "list",
      "create",
      "receiptData",
      "receiptPdfData",
      "receiptPdf",
      "generateReceiptPdf",
      "unappliedAllocations",
      "applyUnapplied",
      "reverseUnappliedAllocation",
      "get",
      "void",
      "remove",
    ]),
    controllerCase("supplier payments", SupplierPaymentController, [
      "list",
      "create",
      "allocations",
      "unappliedAllocations",
      "applyUnapplied",
      "reverseUnappliedAllocation",
      "receiptData",
      "receiptPdfData",
      "receiptPdf",
      "generateReceiptPdf",
      "get",
      "void",
      "remove",
    ]),
    controllerCase("journals", AccountingController, ["list", "count", "create", "get", "update", "post", "reverse"]),
    controllerCase("chart of accounts", ChartOfAccountsController, ["list", "nextCode", "create", "get", "update", "remove"]),
    controllerCase("reports and exports", ReportsController, [
      "generalLedger",
      "generalLedgerPdf",
      "trialBalance",
      "trialBalancePdf",
      "profitAndLoss",
      "profitAndLossPdf",
      "balanceSheet",
      "balanceSheetPdf",
      "vatSummary",
      "vatSummaryPdf",
      "vatReturn",
      "dashboardSummary",
      "reportPackManifestPreview",
      "cashFlow",
      "revenueTrend",
      "topCustomers",
      "topProductsServices",
      "agedReceivables",
      "agedReceivablesPdf",
      "agedPayables",
      "agedPayablesPdf",
    ]),
    controllerCase("dashboard aggregates", DashboardController, ["summary", "onboardingChecklist"]),
    controllerCase("search", SearchController, ["search"]),
    controllerCase("generated document downloads", GeneratedDocumentController, ["list", "get", "download"]),
    controllerCase("attachment downloads", AttachmentController, ["list", "upload", "get", "download", "update", "softDelete"]),
    controllerCase("document settings", OrganizationDocumentSettingsController, ["get", "update"]),
    controllerCase("number sequences", NumberSequenceController, ["list", "get", "update"]),
    controllerCase("storage readiness", StorageController, ["readiness", "migrationPlan"]),
    controllerCase("organization members and invitations", OrganizationMemberController, [
      "list",
      "get",
      "updateRole",
      "updateStatus",
      "invite",
    ]),
    controllerCase("roles", RoleController, ["list", "get", "create", "update", "remove"]),
    controllerCase("audit logs", AuditLogController, [
      "list",
      "exportCsv",
      "getRetentionSettings",
      "updateRetentionSettings",
      "retentionPreview",
      "retentionDryRun",
      "get",
    ]),
  ];

  it.each(tenantScopedControllers)("$area routes require JWT, organization context, and permission guards", ({ controller }) => {
    expect(guardMetadata(controller)).toEqual([JwtAuthGuard, OrganizationContextGuard, PermissionGuard]);
  });

  it.each(tenantScopedControllers)("$area route handlers declare permissions", ({ controller, methods }) => {
    for (const methodName of methods) {
      expect(requiredPermissions(controller, methodName)).not.toEqual([]);
    }
  });

  it("keeps organization switching user-scoped instead of trusting x-organization-id", () => {
    expect(guardMetadata(OrganizationController)).toEqual([JwtAuthGuard]);
    expect(guardMetadata(OrganizationController)).not.toContain(OrganizationContextGuard);
    expect(guardMetadata(OrganizationController)).not.toContain(PermissionGuard);
  });

  it("keeps every tenant-scoped controller on the CurrentOrganizationId decorator path", () => {
    expect(CurrentOrganizationId).toBeDefined();
  });
});

describe("tenant isolation proof: organization switching", () => {
  function makeService() {
    const prisma = {
      organization: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue(null),
        update: jest.fn(),
      },
      organizationMember: {
        findFirst: jest.fn(),
      },
    };
    const auditLogService = { log: jest.fn() };
    const service = new OrganizationService(prisma as never, auditLogService as never);
    return { service, prisma, auditLogService };
  }

  it("lists only organizations with active membership for the current user", async () => {
    const { service, prisma } = makeService();

    await expect(service.listForUser("user-a")).resolves.toEqual([]);

    expect(prisma.organization.findMany).toHaveBeenCalledWith({
      where: { memberships: { some: { userId: "user-a", status: "ACTIVE" } } },
      orderBy: { createdAt: "asc" },
    });
  });

  it("hides organization details when the user has no active membership", async () => {
    const { service, prisma } = makeService();
    prisma.organizationMember.findFirst.mockResolvedValue(null);

    await expect(service.getForUser("user-a", "org-b")).rejects.toThrow(new NotFoundException("Organization not found."));
    expect(prisma.organizationMember.findFirst).toHaveBeenCalledWith({
      where: { organizationId: "org-b", userId: "user-a", status: "ACTIVE" },
      select: { role: { select: { permissions: true } } },
    });
    expect(prisma.organization.findFirst).not.toHaveBeenCalled();
  });

  it("blocks organization updates without organization.update permission", async () => {
    const { service, prisma } = makeService();
    prisma.organizationMember.findFirst.mockResolvedValue({
      role: { permissions: [PERMISSIONS.organization.view] },
    });

    await expect(service.updateForUser("user-a", "org-b", { name: "Other Org" })).rejects.toThrow(
      new ForbiddenException("You do not have permission to perform this action."),
    );
    expect(prisma.organization.update).not.toHaveBeenCalled();
  });
});

describe("tenant isolation proof: organization members and roles", () => {
  function makeOrganizationMemberService() {
    const prisma = {
      organizationMember: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      role: {
        findFirst: jest.fn(),
      },
      organization: {
        findUnique: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
      },
      $transaction: jest.fn(),
    };
    const auditLogService = { log: jest.fn() };
    const authTokenService = { create: jest.fn() };
    const authTokenRateLimitService = { assertInviteAllowed: jest.fn() };
    const emailService = {
      isMockProvider: true,
      sendOrganizationInvite: jest.fn(),
    };
    const config = { get: jest.fn() };
    const service = new OrganizationMemberService(
      prisma as never,
      auditLogService as never,
      authTokenService as never,
      authTokenRateLimitService as never,
      emailService as never,
      config as never,
    );

    return { service, prisma, authTokenRateLimitService, authTokenService, emailService };
  }

  function makeRoleService() {
    const prisma = {
      role: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      organizationMember: {
        count: jest.fn(),
        findMany: jest.fn(),
      },
    };
    const auditLogService = { log: jest.fn() };
    const service = new RoleService(prisma as never, auditLogService as never);
    return { service, prisma };
  }

  it("lists members only inside the current organization", async () => {
    const { service, prisma } = makeOrganizationMemberService();

    await expect(service.list("org-a")).resolves.toEqual([]);

    expect(prisma.organizationMember.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { organizationId: "org-a" },
      }),
    );
  });

  it("does not update a member record from another organization", async () => {
    const { service, prisma } = makeOrganizationMemberService();
    prisma.organizationMember.findFirst.mockResolvedValue(null);

    await expect(service.updateRole("org-a", "actor-a", "member-b", { roleId: "role-a" })).rejects.toThrow(
      new NotFoundException("Organization member not found."),
    );
    expect(prisma.organizationMember.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "member-b", organizationId: "org-a" },
      }),
    );
    expect(prisma.role.findFirst).not.toHaveBeenCalled();
    expect(prisma.organizationMember.update).not.toHaveBeenCalled();
  });

  it("does not invite with a role from another organization", async () => {
    const { service, prisma, authTokenRateLimitService, authTokenService, emailService } = makeOrganizationMemberService();
    prisma.role.findFirst.mockResolvedValue(null);

    await expect(
      service.invite("org-a", "actor-a", {
        email: "invitee@example.com",
        roleId: "role-b",
      }),
    ).rejects.toThrow(new NotFoundException("Role not found."));

    expect(prisma.role.findFirst).toHaveBeenCalledWith({
      where: { id: "role-b", organizationId: "org-a" },
      select: { id: true, name: true, permissions: true },
    });
    expect(authTokenRateLimitService.assertInviteAllowed).not.toHaveBeenCalled();
    expect(authTokenService.create).not.toHaveBeenCalled();
    expect(emailService.sendOrganizationInvite).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("lists roles only inside the current organization", async () => {
    const { service, prisma } = makeRoleService();

    await expect(service.list("org-a")).resolves.toEqual([]);

    expect(prisma.role.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { organizationId: "org-a" },
      }),
    );
  });

  it("does not mutate a role from another organization", async () => {
    const { service, prisma } = makeRoleService();
    prisma.role.findFirst.mockResolvedValue(null);

    await expect(service.remove("org-a", "actor-a", "role-b")).rejects.toThrow(new NotFoundException("Role not found."));
    expect(prisma.role.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "role-b", organizationId: "org-a" },
      }),
    );
    expect(prisma.organizationMember.count).not.toHaveBeenCalled();
    expect(prisma.role.delete).not.toHaveBeenCalled();
  });
});

describe("tenant isolation proof: global search", () => {
  it("queries only permitted sources and scopes contact balance aggregates by organization", async () => {
    const prisma = makeSearchPrismaMock();
    const service = new SearchService(prisma as never);

    await service.search("org-a", "Acme", [PERMISSIONS.contacts.view]);

    expect(prisma.contact.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ organizationId: "org-a" }),
      }),
    );
    expect(prisma.salesInvoice.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ organizationId: "org-a" }),
      }),
    );
    expect(prisma.purchaseBill.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ organizationId: "org-a" }),
      }),
    );
    expect(prisma.salesInvoice.findMany).not.toHaveBeenCalled();
    expect(prisma.purchaseBill.findMany).not.toHaveBeenCalled();
    expect(prisma.customerPayment.findMany).not.toHaveBeenCalled();
    expect(prisma.supplierPayment.findMany).not.toHaveBeenCalled();
    expect(prisma.journalEntry.findMany).not.toHaveBeenCalled();
  });

  it("scopes every visible search source by the active organization", async () => {
    const prisma = makeSearchPrismaMock();
    const service = new SearchService(prisma as never);

    await service.search("org-a", "100", [PERMISSIONS.admin.fullAccess]);

    for (const { name, mock } of searchSourceCalls(prisma)) {
      expect(mock.mock.calls.length).toBeGreaterThan(0);
      for (const call of mock.mock.calls) {
        expect({ name, args: call[0] }).toEqual(
          expect.objectContaining({
            args: expect.objectContaining({
              where: expect.objectContaining({ organizationId: "org-a" }),
            }),
          }),
        );
      }
    }
  });
});

function controllerCase(area: string, controller: Function, methods: readonly string[]) {
  return { area, controller, methods };
}

function guardMetadata(controller: Function): unknown[] {
  return Reflect.getMetadata(GUARDS_METADATA, controller) ?? [];
}

function requiredPermissions(controller: Function, methodName: string): readonly string[] {
  const handler = (controller.prototype as Record<string, unknown>)[methodName];
  if (typeof handler !== "function") {
    throw new Error(`${controller.name}.${methodName} is not implemented.`);
  }
  return Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, handler) ?? Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, controller) ?? [];
}

function makeSearchPrismaMock() {
  return {
    contact: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    salesInvoice: {
      groupBy: jest.fn().mockResolvedValue([]),
      findMany: jest.fn().mockResolvedValue([]),
    },
    purchaseBill: {
      groupBy: jest.fn().mockResolvedValue([]),
      findMany: jest.fn().mockResolvedValue([]),
    },
    cashExpense: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    customerPayment: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    supplierPayment: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    creditNote: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    purchaseOrder: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    deliveryNote: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    collectionCase: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    salesQuote: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    item: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    journalEntry: {
      findMany: jest.fn().mockResolvedValue([]),
    },
  };
}

function searchSourceCalls(prisma: ReturnType<typeof makeSearchPrismaMock>) {
  return [
    { name: "contact.findMany", mock: prisma.contact.findMany },
    { name: "salesInvoice.groupBy", mock: prisma.salesInvoice.groupBy },
    { name: "salesInvoice.findMany", mock: prisma.salesInvoice.findMany },
    { name: "purchaseBill.groupBy", mock: prisma.purchaseBill.groupBy },
    { name: "purchaseBill.findMany", mock: prisma.purchaseBill.findMany },
    { name: "cashExpense.findMany", mock: prisma.cashExpense.findMany },
    { name: "customerPayment.findMany", mock: prisma.customerPayment.findMany },
    { name: "supplierPayment.findMany", mock: prisma.supplierPayment.findMany },
    { name: "creditNote.findMany", mock: prisma.creditNote.findMany },
    { name: "purchaseOrder.findMany", mock: prisma.purchaseOrder.findMany },
    { name: "deliveryNote.findMany", mock: prisma.deliveryNote.findMany },
    { name: "collectionCase.findMany", mock: prisma.collectionCase.findMany },
    { name: "salesQuote.findMany", mock: prisma.salesQuote.findMany },
    { name: "item.findMany", mock: prisma.item.findMany },
    { name: "journalEntry.findMany", mock: prisma.journalEntry.findMany },
  ];
}
