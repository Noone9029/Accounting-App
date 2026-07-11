import { BadRequestException, NotFoundException, type INestApplication } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import { JwtService } from "@nestjs/jwt";
import { PERMISSIONS } from "@ledgerbyte/shared";
import { AttachmentController } from "./attachments/attachment.controller";
import { AttachmentService } from "./attachments/attachment.service";
import { AccountingController } from "./accounting/accounting.controller";
import { AccountingService } from "./accounting/accounting.service";
import { AuditLogController } from "./audit-log/audit-log.controller";
import { AuditLogService } from "./audit-log/audit-log.service";
import { AuthController } from "./auth/auth.controller";
import { AuthService } from "./auth/auth.service";
import { AuthSessionService } from "./auth/auth-session.service";
import { JwtAuthGuard } from "./auth/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "./auth/guards/organization-context.guard";
import { PermissionGuard } from "./auth/guards/permission.guard";
import { LoginThrottleService } from "./auth/login-throttle.service";
import { readJwtSecret } from "./auth/jwt-secret";
import { configureApp } from "./app-bootstrap";
import { ContactController } from "./contacts/contact.controller";
import { ContactLedgerService } from "./contacts/contact-ledger.service";
import { ContactService } from "./contacts/contact.service";
import { SupplierApDashboardService } from "./contacts/supplier-ap-dashboard.service";
import { CustomerPaymentController } from "./customer-payments/customer-payment.controller";
import { CustomerPaymentService } from "./customer-payments/customer-payment.service";
import { GeneratedDocumentController } from "./generated-documents/generated-document.controller";
import { GeneratedDocumentService } from "./generated-documents/generated-document.service";
import { OrganizationMemberController } from "./organization-members/organization-member.controller";
import { OrganizationMemberService } from "./organization-members/organization-member.service";
import { OrganizationController } from "./organizations/organization.controller";
import { OrganizationService } from "./organizations/organization.service";
import { ObservabilityContextService } from "./observability/observability-context.service";
import { PrismaService } from "./prisma/prisma.service";
import { PurchaseBillController } from "./purchase-bills/purchase-bill.controller";
import { PurchaseBillService } from "./purchase-bills/purchase-bill.service";
import { ReportsController } from "./reports/reports.controller";
import { ReportsService } from "./reports/reports.service";
import { SalesInvoiceController } from "./sales-invoices/sales-invoice.controller";
import { SalesInvoiceService } from "./sales-invoices/sales-invoice.service";
import { CreditNoteService } from "./credit-notes/credit-note.service";
import { ForeignExchangeController } from "./foreign-exchange/foreign-exchange.controller";
import { ForeignExchangeService } from "./foreign-exchange/foreign-exchange.service";
import { FxRevaluationService } from "./foreign-exchange/fx-revaluation.service";
import { SearchController } from "./search/search.controller";
import { SearchService } from "./search/search.service";

const ids = {
  userA: "00000000-0000-4000-8000-0000000000a1",
  userB: "00000000-0000-4000-8000-0000000000b1",
  orgA: "10000000-0000-4000-8000-000000000001",
  orgB: "20000000-0000-4000-8000-000000000001",
  roleA: "10000000-0000-4000-8000-0000000000aa",
  roleB: "20000000-0000-4000-8000-0000000000bb",
  memberA: "10000000-0000-4000-8000-0000000000ab",
  memberB: "20000000-0000-4000-8000-0000000000ba",
  customerA: "10000000-0000-4000-8000-000000000101",
  customerB: "20000000-0000-4000-8000-000000000101",
  supplierA: "10000000-0000-4000-8000-000000000102",
  supplierB: "20000000-0000-4000-8000-000000000102",
  itemA: "10000000-0000-4000-8000-000000000201",
  itemB: "20000000-0000-4000-8000-000000000201",
  accountA: "10000000-0000-4000-8000-000000000301",
  accountB: "20000000-0000-4000-8000-000000000301",
  invoiceA: "10000000-0000-4000-8000-000000000401",
  invoiceB: "20000000-0000-4000-8000-000000000401",
  billA: "10000000-0000-4000-8000-000000000501",
  billB: "20000000-0000-4000-8000-000000000501",
  paymentA: "10000000-0000-4000-8000-000000000601",
  paymentB: "20000000-0000-4000-8000-000000000601",
  journalA: "10000000-0000-4000-8000-000000000701",
  journalB: "20000000-0000-4000-8000-000000000701",
  generatedDocumentA: "10000000-0000-4000-8000-000000000801",
  generatedDocumentB: "20000000-0000-4000-8000-000000000801",
  attachmentA: "10000000-0000-4000-8000-000000000901",
  attachmentB: "20000000-0000-4000-8000-000000000901",
  auditA: "10000000-0000-4000-8000-000000001001",
  auditB: "20000000-0000-4000-8000-000000001001",
  rateA: "10000000-0000-4000-8000-000000001101",
  rateB: "20000000-0000-4000-8000-000000001101",
  revaluationA: "10000000-0000-4000-8000-000000001201",
  revaluationB: "20000000-0000-4000-8000-000000001201",
};

const markerA = "TENANT-A-HTTP-PROOF";
const markerB = "TENANT-B-HTTP-PROOF";

type SessionCookies = {
  cookieHeader: string;
  csrfToken: string;
};

describe("tenant isolation HTTP integration", () => {
  let app: INestApplication;
  let baseUrl: string;
  let tenantStore: TenantStore;
  let sessionA: SessionCookies;
  let sessionB: SessionCookies;

  beforeAll(async () => {
    tenantStore = makeTenantStore();
    const config = makeConfig();
    const jwtService = new JwtService();
    const authSessionService = makeAuthSessionService();

    const moduleRef = await Test.createTestingModule({
      controllers: [
        AuthController,
        OrganizationController,
        ContactController,
        SalesInvoiceController,
        PurchaseBillController,
        CustomerPaymentController,
        AccountingController,
        ReportsController,
        GeneratedDocumentController,
        AttachmentController,
        OrganizationMemberController,
        AuditLogController,
        SearchController,
        ForeignExchangeController,
      ],
      providers: [
        JwtAuthGuard,
        OrganizationContextGuard,
        PermissionGuard,
        ObservabilityContextService,
        { provide: ConfigService, useValue: config },
        { provide: JwtService, useValue: jwtService },
        { provide: AuthSessionService, useValue: authSessionService },
        { provide: PrismaService, useValue: makePrismaService(tenantStore) },
        { provide: AuthService, useValue: makeAuthService(jwtService, config, authSessionService) },
        { provide: LoginThrottleService, useValue: makeLoginThrottleService() },
        { provide: OrganizationService, useValue: makeOrganizationService(tenantStore) },
        { provide: ContactService, useValue: makeContactService(tenantStore) },
        { provide: ContactLedgerService, useValue: {} },
        { provide: SupplierApDashboardService, useValue: {} },
        { provide: SalesInvoiceService, useValue: makeSalesInvoiceService(tenantStore) },
        { provide: CreditNoteService, useValue: {} },
        { provide: PurchaseBillService, useValue: makePurchaseBillService(tenantStore) },
        { provide: CustomerPaymentService, useValue: makeCustomerPaymentService(tenantStore) },
        { provide: AccountingService, useValue: makeAccountingService(tenantStore) },
        { provide: ReportsService, useValue: makeReportsService() },
        { provide: GeneratedDocumentService, useValue: makeGeneratedDocumentService(tenantStore) },
        { provide: AttachmentService, useValue: makeAttachmentService(tenantStore) },
        { provide: OrganizationMemberService, useValue: makeOrganizationMemberService(tenantStore) },
        { provide: AuditLogService, useValue: makeAuditLogService(tenantStore) },
        { provide: SearchService, useValue: makeSearchService(tenantStore) },
        { provide: ForeignExchangeService, useValue: makeForeignExchangeService(tenantStore) },
        { provide: FxRevaluationService, useValue: makeFxRevaluationService(tenantStore) },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    await app.listen(0);
    baseUrl = getBaseUrl(app);

    sessionA = await login("tenant-a@example.test");
    sessionB = await login("tenant-b@example.test");
  });

  afterAll(async () => {
    await app.close();
  });

  it("authenticates through httpOnly cookie auth and preserves the readable CSRF cookie for unsafe requests", async () => {
    expect(sessionA.cookieHeader).toContain("ledgerbyte_auth=");
    expect(sessionA.cookieHeader).toContain("ledgerbyte_csrf=");
    expect(sessionA.csrfToken).toBeTruthy();

    const response = await request("/organizations", { session: sessionA });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(JSON.stringify(body)).toContain(markerA);
    expect(JSON.stringify(body)).not.toContain(markerB);
  });

  it("rejects organization switching by refusing another tenant's x-organization-id", async () => {
    const blockedByGuard = await request("/contacts", { session: sessionA, organizationId: ids.orgB });
    expect(blockedByGuard.status).toBe(403);

    const hiddenOrganization = await request(`/organizations/${ids.orgB}`, { session: sessionA });
    const body = await hiddenOrganization.json();

    expect(hiddenOrganization.status).toBe(404);
    expect(JSON.stringify(body)).not.toContain(markerB);
  });

  it("keeps FX rate reads and account configuration writes inside the active tenant", async () => {
    const rates = await request("/fx/rates", { session: sessionA, organizationId: ids.orgA });
    const ratesText = await rates.text();
    expect(rates.status).toBe(200);
    expect(ratesText).toContain(markerA);
    expect(ratesText).not.toContain(markerB);

    const ownedRate = await request(`/fx/rates/${ids.rateA}`, { session: sessionA, organizationId: ids.orgA });
    expect(ownedRate.status).toBe(200);
    expect(await ownedRate.text()).toContain(markerA);

    const foreignRate = await request(`/fx/rates/${ids.rateB}`, { session: sessionA, organizationId: ids.orgA });
    expect(foreignRate.status).toBe(404);

    const blockedByGuard = await request("/fx/rates", { session: sessionA, organizationId: ids.orgB });
    expect(blockedByGuard.status).toBe(403);

    const foreignAccount = await request("/fx/account-configuration", {
      method: "PUT",
      session: sessionA,
      organizationId: ids.orgA,
      body: {
        realizedGainAccountId: ids.accountB,
        realizedLossAccountId: null,
        unrealizedGainAccountId: null,
        unrealizedLossAccountId: null,
      },
    });
    expect(foreignAccount.status).toBe(400);
    expect(tenantStore.fxConfigUpdates).toBe(0);
  });

  it("keeps FX revaluation workspace reads inside the active tenant", async () => {
    const revaluations = await request("/fx/revaluations", { session: sessionA, organizationId: ids.orgA });
    const revaluationsText = await revaluations.text();
    expect(revaluations.status).toBe(200);
    expect(revaluationsText).toContain(markerA);
    expect(revaluationsText).not.toContain(markerB);

    const ownedRevaluation = await request(`/fx/revaluations/${ids.revaluationA}`, {
      session: sessionA,
      organizationId: ids.orgA,
    });
    expect(ownedRevaluation.status).toBe(200);
    expect(await ownedRevaluation.text()).toContain(markerA);

    const foreignRevaluation = await request(`/fx/revaluations/${ids.revaluationB}`, {
      session: sessionA,
      organizationId: ids.orgA,
    });
    expect(foreignRevaluation.status).toBe(404);
  });

  it("keeps customer and supplier HTTP reads, writes, and search scoped to the active organization", async () => {
    const customers = await request("/contacts/customers", { session: sessionA, organizationId: ids.orgA });
    expect(await customers.text()).toContain(markerA);

    const otherCustomer = await request(`/contacts/customers/${ids.customerB}`, { session: sessionA, organizationId: ids.orgA });
    expect(otherCustomer.status).toBe(404);

    const otherCustomerUpdate = await request(`/contacts/${ids.customerB}`, {
      method: "PATCH",
      session: sessionA,
      organizationId: ids.orgA,
      body: { name: "attempted cross-tenant update" },
    });
    expect(otherCustomerUpdate.status).toBe(404);
    expect(tenantStore.contacts.get(ids.customerB)?.name).toContain(markerB);

    const otherSupplier = await request(`/contacts/suppliers/${ids.supplierB}`, { session: sessionA, organizationId: ids.orgA });
    expect(otherSupplier.status).toBe(404);

    const search = await request(`/search?query=${encodeURIComponent(markerB)}`, { session: sessionA, organizationId: ids.orgA });
    const searchBody = (await search.json()) as { results: unknown[] };
    expect(search.status).toBe(200);
    expect(JSON.stringify(searchBody.results)).not.toContain(markerB);
  });

  it("rejects cross-tenant invoice reads, writes, deletes, downloads, and foreign parent IDs", async () => {
    await expectStatus("GET", `/sales-invoices/${ids.invoiceB}`, 404);
    await expectStatus("PATCH", `/sales-invoices/${ids.invoiceB}`, 404, { notes: "attempted update" });
    await expectStatus("DELETE", `/sales-invoices/${ids.invoiceB}`, 404);
    await expectStatus("GET", `/sales-invoices/${ids.invoiceB}/pdf`, 404);

    const createWithForeignCustomer = await request("/sales-invoices", {
      method: "POST",
      session: sessionA,
      organizationId: ids.orgA,
      body: {
        customerId: ids.customerB,
        issueDate: "2026-07-05",
        currency: "SAR",
        lines: [{ itemId: ids.itemB, accountId: ids.accountA, quantity: "1", unitPrice: "10.00" }],
      },
    });
    expect(createWithForeignCustomer.status).toBe(400);
    expect(tenantStore.createdInvoices).toBe(0);
  });

  it("rejects cross-tenant bill reads, writes, deletes, downloads, and foreign supplier/account IDs", async () => {
    await expectStatus("GET", `/purchase-bills/${ids.billB}`, 404);
    await expectStatus("PATCH", `/purchase-bills/${ids.billB}`, 404, { notes: "attempted update" });
    await expectStatus("DELETE", `/purchase-bills/${ids.billB}`, 404);
    await expectStatus("GET", `/purchase-bills/${ids.billB}/pdf`, 404);

    const createWithForeignSupplier = await request("/purchase-bills", {
      method: "POST",
      session: sessionA,
      organizationId: ids.orgA,
      body: {
        supplierId: ids.supplierB,
        billDate: "2026-07-05",
        currency: "SAR",
        lines: [{ accountId: ids.accountB, quantity: "1", unitPrice: "10.00" }],
      },
    });
    expect(createWithForeignSupplier.status).toBe(400);
    expect(tenantStore.createdBills).toBe(0);
  });

  it("rejects cross-tenant payment reads and allocations to another tenant's invoice", async () => {
    await expectStatus("GET", `/customer-payments/${ids.paymentB}`, 404);

    const createWithForeignInvoice = await request("/customer-payments", {
      method: "POST",
      session: sessionA,
      organizationId: ids.orgA,
      body: {
        customerId: ids.customerA,
        paymentDate: "2026-07-05",
        currency: "SAR",
        amountReceived: "10.00",
        accountId: ids.accountA,
        allocations: [{ invoiceId: ids.invoiceB, amountApplied: "10.00" }],
      },
    });
    expect(createWithForeignInvoice.status).toBe(400);

    const applyToForeignInvoice = await request(`/customer-payments/${ids.paymentA}/apply-unapplied`, {
      method: "POST",
      session: sessionA,
      organizationId: ids.orgA,
      body: { invoiceId: ids.invoiceB, amountApplied: "1.00" },
    });
    expect(applyToForeignInvoice.status).toBe(400);
    expect(tenantStore.createdPayments).toBe(0);
  });

  it("rejects cross-tenant journal reads, updates, posts, and foreign account IDs", async () => {
    await expectStatus("GET", `/journal-entries/${ids.journalB}`, 404);
    await expectStatus("PATCH", `/journal-entries/${ids.journalB}`, 404, { description: "attempted update" });
    await expectStatus("POST", `/journal-entries/${ids.journalB}/post`, 404);

    const createWithForeignAccount = await request("/journal-entries", {
      method: "POST",
      session: sessionA,
      organizationId: ids.orgA,
      body: {
        entryDate: "2026-07-05T00:00:00.000Z",
        description: "attempted cross-tenant journal",
        currency: "SAR",
        lines: [
          { accountId: ids.accountA, debit: "10.00", credit: "0.00", currency: "SAR" },
          { accountId: ids.accountB, debit: "0.00", credit: "10.00", currency: "SAR" },
        ],
      },
    });
    expect(createWithForeignAccount.status).toBe(400);
    expect(tenantStore.createdJournals).toBe(0);
  });

  it("keeps reports, CSV exports, and PDF downloads scoped to the active organization", async () => {
    const report = await request("/reports/trial-balance", { session: sessionA, organizationId: ids.orgA });
    const reportBody = await report.text();
    expect(report.status).toBe(200);
    expect(reportBody).toContain(markerA);
    expect(reportBody).not.toContain(markerB);

    const csv = await request("/reports/trial-balance?format=csv", { session: sessionA, organizationId: ids.orgA });
    const csvBody = await csv.text();
    expect(csv.status).toBe(200);
    expect(csvBody).toContain(markerA);
    expect(csvBody).not.toContain(markerB);

    const pdf = await request("/reports/trial-balance/pdf", { session: sessionA, organizationId: ids.orgA });
    const pdfBody = await pdf.text();
    expect(pdf.status).toBe(200);
    expect(pdfBody).toContain(markerA);
    expect(pdfBody).not.toContain(markerB);
  });

  it("rejects cross-tenant generated document and attachment reads/downloads", async () => {
    await expectStatus("GET", `/generated-documents/${ids.generatedDocumentB}`, 404);
    await expectStatus("GET", `/generated-documents/${ids.generatedDocumentB}/download`, 404);
    await expectStatus("GET", `/attachments/${ids.attachmentB}`, 404);
    await expectStatus("GET", `/attachments/${ids.attachmentB}/download`, 404);
    await expectStatus("DELETE", `/attachments/${ids.attachmentB}`, 404);
  });

  it("keeps invitations and member management scoped to the active organization", async () => {
    const members = await request("/organization-members", { session: sessionA, organizationId: ids.orgA });
    const membersBody = await members.text();
    expect(members.status).toBe(200);
    expect(membersBody).toContain(markerA);
    expect(membersBody).not.toContain(markerB);

    const manageOtherTenantMember = await request(`/organization-members/${ids.memberB}/status`, {
      method: "PATCH",
      session: sessionA,
      organizationId: ids.orgA,
      body: { status: "SUSPENDED" },
    });
    expect(manageOtherTenantMember.status).toBe(404);

    const inviteIntoOtherTenantHeader = await request("/organization-members/invite", {
      method: "POST",
      session: sessionA,
      organizationId: ids.orgB,
      body: { email: "invitee@example.com", roleId: ids.roleB },
    });
    expect(inviteIntoOtherTenantHeader.status).toBe(403);

    const inviteWithForeignRole = await request("/organization-members/invite", {
      method: "POST",
      session: sessionA,
      organizationId: ids.orgA,
      body: { email: "invitee@example.com", roleId: ids.roleB },
    });
    expect(inviteWithForeignRole.status).toBe(404);
    expect(tenantStore.createdInvites).toBe(0);
  });

  it("keeps audit log reads and exports scoped to the active organization", async () => {
    const auditLogs = await request("/audit-logs", { session: sessionA, organizationId: ids.orgA });
    const auditBody = await auditLogs.text();
    expect(auditLogs.status).toBe(200);
    expect(auditBody).toContain(markerA);
    expect(auditBody).not.toContain(markerB);

    await expectStatus("GET", `/audit-logs/${ids.auditB}`, 404);

    const auditExport = await request("/audit-logs/export.csv", { session: sessionA, organizationId: ids.orgA });
    const exportBody = await auditExport.text();
    expect(auditExport.status).toBe(200);
    expect(exportBody).toContain(markerA);
    expect(exportBody).not.toContain(markerB);
  });

  async function login(email: string): Promise<SessionCookies> {
    const syntheticPassword = ["tenant", "proof", "pass"].join("-");
    const response = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password: syntheticPassword }),
    });
    expect(response.status).toBe(201);
    return readSessionCookies(response);
  }

  async function expectStatus(method: string, path: string, status: number, body?: unknown): Promise<void> {
    const response = await request(path, { method, session: sessionA, organizationId: ids.orgA, body });
    expect(response.status).toBe(status);
    const responseBody = await response.text();
    expect(responseBody).not.toContain(markerB);
  }

  function request(
    path: string,
    options: {
      method?: string;
      session: SessionCookies;
      organizationId?: string;
      body?: unknown;
    },
  ): Promise<Response> {
    const method = options.method ?? "GET";
    const headers: Record<string, string> = {
      cookie: options.session.cookieHeader,
    };
    if (options.organizationId) {
      headers["x-organization-id"] = options.organizationId;
    }
    if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
      headers["x-csrf-token"] = options.session.csrfToken;
    }
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
    }

    return fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  }
});

type TenantRecord = {
  id: string;
  organizationId: string;
};

type TenantStore = ReturnType<typeof makeTenantStore>;

function makeTenantStore() {
  return {
    users: new Map([
      ["tenant-a@example.test", { id: ids.userA, email: "tenant-a@example.test", marker: markerA }],
      ["tenant-b@example.test", { id: ids.userB, email: "tenant-b@example.test", marker: markerB }],
    ]),
    memberships: new Map([
      [ids.memberA, { id: ids.memberA, userId: ids.userA, organizationId: ids.orgA, roleId: ids.roleA, marker: markerA }],
      [ids.memberB, { id: ids.memberB, userId: ids.userB, organizationId: ids.orgB, roleId: ids.roleB, marker: markerB }],
    ]),
    organizations: new Map([
      [ids.orgA, { id: ids.orgA, organizationId: ids.orgA, name: `${markerA} Organization` }],
      [ids.orgB, { id: ids.orgB, organizationId: ids.orgB, name: `${markerB} Organization` }],
    ]),
    roles: new Map([
      [ids.roleA, { id: ids.roleA, organizationId: ids.orgA, name: `${markerA} Owner` }],
      [ids.roleB, { id: ids.roleB, organizationId: ids.orgB, name: `${markerB} Owner` }],
    ]),
    contacts: new Map([
      [ids.customerA, { id: ids.customerA, organizationId: ids.orgA, name: `${markerA} Customer`, type: "CUSTOMER" }],
      [ids.customerB, { id: ids.customerB, organizationId: ids.orgB, name: `${markerB} Customer`, type: "CUSTOMER" }],
      [ids.supplierA, { id: ids.supplierA, organizationId: ids.orgA, name: `${markerA} Supplier`, type: "SUPPLIER" }],
      [ids.supplierB, { id: ids.supplierB, organizationId: ids.orgB, name: `${markerB} Supplier`, type: "SUPPLIER" }],
    ]),
    items: new Map([
      [ids.itemA, { id: ids.itemA, organizationId: ids.orgA, name: `${markerA} Item` }],
      [ids.itemB, { id: ids.itemB, organizationId: ids.orgB, name: `${markerB} Item` }],
    ]),
    accounts: new Map([
      [ids.accountA, { id: ids.accountA, organizationId: ids.orgA, name: `${markerA} Account` }],
      [ids.accountB, { id: ids.accountB, organizationId: ids.orgB, name: `${markerB} Account` }],
    ]),
    invoices: new Map([
      [ids.invoiceA, { id: ids.invoiceA, organizationId: ids.orgA, invoiceNumber: `${markerA}-INV`, customerId: ids.customerA }],
      [ids.invoiceB, { id: ids.invoiceB, organizationId: ids.orgB, invoiceNumber: `${markerB}-INV`, customerId: ids.customerB }],
    ]),
    bills: new Map([
      [ids.billA, { id: ids.billA, organizationId: ids.orgA, billNumber: `${markerA}-BILL`, supplierId: ids.supplierA }],
      [ids.billB, { id: ids.billB, organizationId: ids.orgB, billNumber: `${markerB}-BILL`, supplierId: ids.supplierB }],
    ]),
    payments: new Map([
      [ids.paymentA, { id: ids.paymentA, organizationId: ids.orgA, paymentNumber: `${markerA}-PAY`, customerId: ids.customerA }],
      [ids.paymentB, { id: ids.paymentB, organizationId: ids.orgB, paymentNumber: `${markerB}-PAY`, customerId: ids.customerB }],
    ]),
    journals: new Map([
      [ids.journalA, { id: ids.journalA, organizationId: ids.orgA, entryNumber: `${markerA}-JRN` }],
      [ids.journalB, { id: ids.journalB, organizationId: ids.orgB, entryNumber: `${markerB}-JRN` }],
    ]),
    generatedDocuments: new Map([
      [ids.generatedDocumentA, { id: ids.generatedDocumentA, organizationId: ids.orgA, filename: `${markerA}.pdf`, mimeType: "application/pdf" }],
      [ids.generatedDocumentB, { id: ids.generatedDocumentB, organizationId: ids.orgB, filename: `${markerB}.pdf`, mimeType: "application/pdf" }],
    ]),
    attachments: new Map([
      [ids.attachmentA, { id: ids.attachmentA, organizationId: ids.orgA, filename: `${markerA}.pdf`, mimeType: "application/pdf" }],
      [ids.attachmentB, { id: ids.attachmentB, organizationId: ids.orgB, filename: `${markerB}.pdf`, mimeType: "application/pdf" }],
    ]),
    auditLogs: new Map([
      [ids.auditA, { id: ids.auditA, organizationId: ids.orgA, action: `${markerA} ACTION` }],
      [ids.auditB, { id: ids.auditB, organizationId: ids.orgB, action: `${markerB} ACTION` }],
    ]),
    currencyRates: new Map([
      [ids.rateA, { id: ids.rateA, organizationId: ids.orgA, transactionCurrency: "USD", baseCurrency: "AED", marker: markerA }],
      [ids.rateB, { id: ids.rateB, organizationId: ids.orgB, transactionCurrency: "USD", baseCurrency: "SAR", marker: markerB }],
    ]),
    fxRevaluations: new Map([
      [ids.revaluationA, { id: ids.revaluationA, organizationId: ids.orgA, reference: `${markerA}-FXR` }],
      [ids.revaluationB, { id: ids.revaluationB, organizationId: ids.orgB, reference: `${markerB}-FXR` }],
    ]),
    createdInvoices: 0,
    createdBills: 0,
    createdPayments: 0,
    createdJournals: 0,
    createdInvites: 0,
    fxConfigUpdates: 0,
  };
}

function makeConfig() {
  return {
    get: jest.fn((key: string) => {
      if (key === "APP_ENV") {
        return "test";
      }
      if (key === "JWT_EXPIRES_IN") {
        return "1h";
      }
      if (key === "AUTH_COOKIE_SECURE") {
        return "false";
      }
      return undefined;
    }),
  };
}

function makeAuthSessionService() {
  const sessions = new Map<string, { id: string; userId: string }>();
  return {
    sessions,
    assertActiveSession: jest.fn(async ({ userId, jti }: { userId: string; jti: string }) => {
      const session = sessions.get(`${userId}:${jti}`);
      if (!session) {
        throw new Error("Invalid session");
      }
      return session;
    }),
  };
}

function makeAuthService(jwtService: JwtService, config: ReturnType<typeof makeConfig>, authSessionService: ReturnType<typeof makeAuthSessionService>) {
  return {
    login: jest.fn(async ({ email }: { email: string }) => {
      const userId = email === "tenant-a@example.test" ? ids.userA : ids.userB;
      const jti = `${userId}-session`;
      authSessionService.sessions.set(`${userId}:${jti}`, { id: `${userId}-session-row`, userId });
      return {
        user: { id: userId, email, name: email },
        accessToken: await jwtService.signAsync(
          { sub: userId, email, jti },
          { secret: readJwtSecret(config as never), expiresIn: "1h" },
        ),
      };
    }),
    me: jest.fn(),
  };
}

function makeLoginThrottleService() {
  return {
    assertLoginAllowed: jest.fn().mockResolvedValue({ allowed: true }),
    resetSuccessfulLogin: jest.fn(),
    recordFailedLogin: jest.fn(),
  };
}

function makePrismaService(store: TenantStore) {
  return {
    organizationMember: {
      findFirst: jest.fn(async ({ where }: { where: { organizationId: string; userId: string } }) => {
        const membership = Array.from(store.memberships.values()).find(
          (item) => item.organizationId === where.organizationId && item.userId === where.userId,
        );
        if (!membership) {
          return null;
        }
        return {
          id: membership.id,
          role: {
            id: membership.roleId,
            name: "Owner",
            permissions: [PERMISSIONS.admin.fullAccess],
          },
        };
      }),
    },
  };
}

function makeOrganizationService(store: TenantStore) {
  return {
    listForUser: jest.fn((userId: string) =>
      Array.from(store.memberships.values())
        .filter((member) => member.userId === userId)
        .map((member) => scopedGet(store.organizations, member.organizationId, member.organizationId)),
    ),
    getForUser: jest.fn((userId: string, organizationId: string) => {
      const membership = Array.from(store.memberships.values()).find((member) => member.userId === userId && member.organizationId === organizationId);
      if (!membership) {
        throw new NotFoundException("Organization not found.");
      }
      return scopedGet(store.organizations, organizationId, organizationId);
    }),
  };
}

function makeContactService(store: TenantStore) {
  const listByType = (organizationId: string, type: "CUSTOMER" | "SUPPLIER") =>
    Array.from(store.contacts.values()).filter((contact) => contact.organizationId === organizationId && contact.type === type);
  return {
    list: jest.fn((organizationId: string) => Array.from(store.contacts.values()).filter((contact) => contact.organizationId === organizationId)),
    listCustomers: jest.fn((organizationId: string) => listByType(organizationId, "CUSTOMER")),
    listSuppliers: jest.fn((organizationId: string) => listByType(organizationId, "SUPPLIER")),
    getCustomer: jest.fn((organizationId: string, id: string) => scopedGet(store.contacts, id, organizationId)),
    getSupplier: jest.fn((organizationId: string, id: string) => scopedGet(store.contacts, id, organizationId)),
    get: jest.fn((organizationId: string, id: string) => scopedGet(store.contacts, id, organizationId)),
    update: jest.fn((organizationId: string, _actorUserId: string, id: string, dto: { name?: string }) => {
      const contact = scopedGet(store.contacts, id, organizationId);
      const updated = { ...contact, ...dto };
      store.contacts.set(id, updated);
      return updated;
    }),
  };
}

function makeSalesInvoiceService(store: TenantStore) {
  return {
    get: jest.fn((organizationId: string, id: string) => scopedGet(store.invoices, id, organizationId)),
    pdf: jest.fn((organizationId: string, _actorUserId: string, id: string) => {
      const invoice = scopedGet(store.invoices, id, organizationId);
      return { filename: `${invoice.invoiceNumber}.pdf`, buffer: Buffer.from(invoice.invoiceNumber) };
    }),
    update: jest.fn((organizationId: string, _actorUserId: string, id: string) => scopedGet(store.invoices, id, organizationId)),
    remove: jest.fn((organizationId: string, _actorUserId: string, id: string) => {
      scopedGet(store.invoices, id, organizationId);
      return { deleted: true };
    }),
    create: jest.fn((organizationId: string, _actorUserId: string, dto: { customerId: string; lines: Array<{ itemId?: string; accountId?: string }> }) => {
      assertBelongsTo(store.contacts, dto.customerId, organizationId, "Customer");
      for (const line of dto.lines) {
        if (line.itemId) assertBelongsTo(store.items, line.itemId, organizationId, "Item");
        if (line.accountId) assertBelongsTo(store.accounts, line.accountId, organizationId, "Account");
      }
      store.createdInvoices += 1;
      return { id: "created-invoice", organizationId };
    }),
  };
}

function makePurchaseBillService(store: TenantStore) {
  return {
    get: jest.fn((organizationId: string, id: string) => scopedGet(store.bills, id, organizationId)),
    pdf: jest.fn((organizationId: string, _actorUserId: string, id: string) => {
      const bill = scopedGet(store.bills, id, organizationId);
      return { filename: `${bill.billNumber}.pdf`, buffer: Buffer.from(bill.billNumber) };
    }),
    update: jest.fn((organizationId: string, _actorUserId: string, id: string) => scopedGet(store.bills, id, organizationId)),
    remove: jest.fn((organizationId: string, _actorUserId: string, id: string) => {
      scopedGet(store.bills, id, organizationId);
      return { deleted: true };
    }),
    create: jest.fn((organizationId: string, _actorUserId: string, dto: { supplierId: string; lines: Array<{ accountId?: string }> }) => {
      assertBelongsTo(store.contacts, dto.supplierId, organizationId, "Supplier");
      for (const line of dto.lines) {
        if (line.accountId) assertBelongsTo(store.accounts, line.accountId, organizationId, "Account");
      }
      store.createdBills += 1;
      return { id: "created-bill", organizationId };
    }),
  };
}

function makeCustomerPaymentService(store: TenantStore) {
  const assertAllocations = (organizationId: string, allocations: Array<{ invoiceId: string }>) => {
    for (const allocation of allocations) {
      assertBelongsTo(store.invoices, allocation.invoiceId, organizationId, "Invoice");
    }
  };
  return {
    get: jest.fn((organizationId: string, id: string) => scopedGet(store.payments, id, organizationId)),
    create: jest.fn((organizationId: string, _actorUserId: string, dto: { customerId: string; accountId: string; allocations: Array<{ invoiceId: string }> }) => {
      assertBelongsTo(store.contacts, dto.customerId, organizationId, "Customer");
      assertBelongsTo(store.accounts, dto.accountId, organizationId, "Account");
      assertAllocations(organizationId, dto.allocations);
      store.createdPayments += 1;
      return { id: "created-payment", organizationId };
    }),
    applyUnapplied: jest.fn((organizationId: string, _actorUserId: string, paymentId: string, dto: { invoiceId: string }) => {
      scopedGet(store.payments, paymentId, organizationId);
      assertBelongsTo(store.invoices, dto.invoiceId, organizationId, "Invoice");
      return { applied: true };
    }),
  };
}

function makeAccountingService(store: TenantStore) {
  return {
    get: jest.fn((organizationId: string, id: string) => scopedGet(store.journals, id, organizationId)),
    update: jest.fn((organizationId: string, _actorUserId: string, id: string) => scopedGet(store.journals, id, organizationId)),
    post: jest.fn((organizationId: string, _actorUserId: string, id: string) => scopedGet(store.journals, id, organizationId)),
    create: jest.fn((organizationId: string, _actorUserId: string, dto: { lines: Array<{ accountId: string }> }) => {
      for (const line of dto.lines) {
        assertBelongsTo(store.accounts, line.accountId, organizationId, "Account");
      }
      store.createdJournals += 1;
      return { id: "created-journal", organizationId };
    }),
  };
}

function makeReportsService() {
  return {
    coreReport: jest.fn((organizationId: string, kind: string) => ({ kind, organizationId, marker: organizationId === ids.orgA ? markerA : markerB })),
    coreReportCsvFile: jest.fn((organizationId: string, kind: string) => ({
      filename: `${kind}.csv`,
      content: `kind,marker\n${kind},${organizationId === ids.orgA ? markerA : markerB}\n`,
    })),
    coreReportPdf: jest.fn((organizationId: string, _actorUserId: string, kind: string) => ({
      filename: `${kind}.pdf`,
      buffer: Buffer.from(`pdf:${kind}:${organizationId === ids.orgA ? markerA : markerB}`),
    })),
    vatReturn: jest.fn(),
    dashboardSummary: jest.fn(),
    reportPackManifestPreview: jest.fn(),
    cashFlow: jest.fn(),
    revenueTrend: jest.fn(),
    topCustomers: jest.fn(),
    topProductsServices: jest.fn(),
  };
}

function makeGeneratedDocumentService(store: TenantStore) {
  return {
    list: jest.fn((organizationId: string) => Array.from(store.generatedDocuments.values()).filter((document) => document.organizationId === organizationId)),
    get: jest.fn((organizationId: string, id: string) => scopedGet(store.generatedDocuments, id, organizationId)),
    download: jest.fn((organizationId: string, id: string) => {
      const document = scopedGet(store.generatedDocuments, id, organizationId);
      return { filename: document.filename, mimeType: document.mimeType, buffer: Buffer.from(document.filename) };
    }),
  };
}

function makeAttachmentService(store: TenantStore) {
  return {
    list: jest.fn((organizationId: string) => Array.from(store.attachments.values()).filter((attachment) => attachment.organizationId === organizationId)),
    get: jest.fn((organizationId: string, id: string) => scopedGet(store.attachments, id, organizationId)),
    download: jest.fn((organizationId: string, id: string) => {
      const attachment = scopedGet(store.attachments, id, organizationId);
      return { filename: attachment.filename, mimeType: attachment.mimeType, buffer: Buffer.from(attachment.filename) };
    }),
    softDelete: jest.fn((organizationId: string, _actorUserId: string, id: string) => {
      scopedGet(store.attachments, id, organizationId);
      return { deleted: true };
    }),
  };
}

function makeOrganizationMemberService(store: TenantStore) {
  return {
    list: jest.fn((organizationId: string) => Array.from(store.memberships.values()).filter((member) => member.organizationId === organizationId)),
    updateStatus: jest.fn((organizationId: string, _actorUserId: string, id: string) => scopedGet(store.memberships, id, organizationId)),
    invite: jest.fn((organizationId: string, _actorUserId: string, dto: { roleId: string }) => {
      scopedGet(store.roles, dto.roleId, organizationId);
      store.createdInvites += 1;
      return { invited: true };
    }),
  };
}

function makeAuditLogService(store: TenantStore) {
  return {
    list: jest.fn((organizationId: string) => Array.from(store.auditLogs.values()).filter((auditLog) => auditLog.organizationId === organizationId)),
    get: jest.fn((organizationId: string, id: string) => scopedGet(store.auditLogs, id, organizationId)),
    exportCsv: jest.fn((organizationId: string) => {
      const marker = organizationId === ids.orgA ? markerA : markerB;
      return { filename: "audit.csv", csv: `id,action\n${organizationId},${marker}\n` };
    }),
  };
}

function makeSearchService(store: TenantStore) {
  return {
    search: jest.fn((organizationId: string, query: string | undefined) => {
      const results = Array.from(store.contacts.values())
        .filter((contact) => contact.organizationId === organizationId && (!query || contact.name.includes(query)))
        .map((contact) => ({ id: contact.id, label: contact.name }));
      return { query: query ?? "", results };
    }),
  };
}

function makeForeignExchangeService(store: TenantStore) {
  return {
    currencies: jest.fn((organizationId: string) => ({ baseCurrency: organizationId === ids.orgA ? "AED" : "SAR" })),
    listRates: jest.fn((organizationId: string) => ({
      data: Array.from(store.currencyRates.values()).filter((rate) => rate.organizationId === organizationId),
      pagination: { page: 1, limit: 50, hasMore: false },
    })),
    getRate: jest.fn((organizationId: string, id: string) => scopedGet(store.currencyRates, id, organizationId)),
    createRate: jest.fn(),
    getAccountConfiguration: jest.fn(() => null),
    updateAccountConfiguration: jest.fn((organizationId: string, _actorUserId: string, dto: Record<string, string | null>) => {
      for (const accountId of Object.values(dto)) {
        if (accountId) {
          assertBelongsTo(store.accounts, accountId, organizationId, "FX account");
        }
      }
      store.fxConfigUpdates += 1;
      return { organizationId, ...dto };
    }),
    readiness: jest.fn(() => ({ status: "BLOCKED", foreignDocumentPostingEnabled: false })),
  };
}

function makeFxRevaluationService(store: TenantStore) {
  return {
    list: jest.fn((organizationId: string) => ({
      data: Array.from(store.fxRevaluations.values()).filter((run) => run.organizationId === organizationId),
      pagination: { page: 1, limit: 50, hasMore: false },
    })),
    get: jest.fn((organizationId: string, id: string) => scopedGet(store.fxRevaluations, id, organizationId)),
    preview: jest.fn(),
    review: jest.fn(),
    post: jest.fn(),
    reverse: jest.fn(),
  };
}

function scopedGet<T extends TenantRecord>(records: Map<string, T>, id: string, organizationId: string): T {
  const record = records.get(id);
  if (!record || record.organizationId !== organizationId) {
    throw new NotFoundException("Record not found.");
  }
  return record;
}

function assertBelongsTo<T extends TenantRecord>(records: Map<string, T>, id: string, organizationId: string, label: string): void {
  const record = records.get(id);
  if (!record || record.organizationId !== organizationId) {
    throw new BadRequestException(`${label} was not found in this organization.`);
  }
}

function readSessionCookies(response: Response): SessionCookies {
  const setCookieHeaders = (response.headers as Headers & { getSetCookie?: () => string[] }).getSetCookie?.() ?? splitSetCookieHeader(response.headers.get("set-cookie"));
  const cookieHeader = setCookieHeaders.map((cookie) => cookie.split(";")[0]).join("; ");
  const csrfToken = /(?:^|;\s*)ledgerbyte_csrf=([^;]+)/.exec(cookieHeader)?.[1];
  if (!cookieHeader.includes("ledgerbyte_auth=") || !csrfToken) {
    throw new Error("Login response did not include auth and CSRF cookies.");
  }
  return { cookieHeader, csrfToken: decodeURIComponent(csrfToken) };
}

function splitSetCookieHeader(header: string | null): string[] {
  if (!header) {
    return [];
  }
  return header.split(/,\s*(?=[^;,]+=)/);
}

function getBaseUrl(app: INestApplication): string {
  const address = app.getHttpServer().address();
  if (typeof address === "string" || !address) {
    throw new Error("Expected an HTTP server address.");
  }
  return `http://127.0.0.1:${address.port}`;
}
