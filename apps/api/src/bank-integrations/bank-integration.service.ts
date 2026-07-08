import { BadRequestException, Injectable, NotFoundException, Optional } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  BankBeneficiaryMappingStatus,
  BankIntegrationProvider,
  BankIntegrationStatus,
  BankPaymentRequestStatus,
  ContactType,
  Prisma,
} from "@prisma/client";
import { AUDIT_ENTITY_TYPES, AUDIT_EVENTS } from "../audit-log/audit-events";
import { AuditLogService } from "../audit-log/audit-log.service";
import { ObservabilityContextService } from "../observability/observability-context.service";
import { redactForDiagnostics } from "../observability/redaction";
import { PrismaService } from "../prisma/prisma.service";
import { resolveBankProviderAdapter, type BankProviderAdapter } from "./bank-provider.adapter";
import {
  CreateBankConnectionDto,
  CreateBankPaymentRequestDto,
  ManualExternalReleaseDto,
  ReconcileBankPaymentRequestDto,
  RecordMockFeedSyncDto,
  UpsertBankBeneficiaryMappingDto,
} from "./dto/bank-integration.dto";

const bankConnectionSelect = {
  id: true,
  organizationId: true,
  provider: true,
  status: true,
  displayName: true,
  externalConnectionRefMasked: true,
  externalInstitutionName: true,
  metadataJson: true,
  disabledAt: true,
  requestId: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.BankConnectionSelect;

const paymentRequestSelect = {
  id: true,
  organizationId: true,
  supplierId: true,
  purchaseBillId: true,
  bankConnectionId: true,
  beneficiaryMappingId: true,
  bankFeedTransactionId: true,
  bankStatementTransactionId: true,
  status: true,
  amount: true,
  currency: true,
  memo: true,
  externalReleaseReferenceMasked: true,
  releaseBlockedReason: true,
  requestId: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.BankPaymentRequestSelect;

@Injectable()
export class BankIntegrationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @Optional() private readonly auditLogService?: AuditLogService,
    @Optional() private readonly observabilityContext?: ObservabilityContextService,
  ) {}

  async readiness(organizationId: string) {
    const adapter = this.adapter();
    const [connectionCount, feedAccountCount, paymentRequestCount] = await Promise.all([
      this.prisma.bankConnection.count({ where: { organizationId } }),
      this.prisma.bankFeedAccount.count({ where: { organizationId } }),
      this.prisma.bankPaymentRequest.count({ where: { organizationId } }),
    ]);
    await this.audit(AUDIT_EVENTS.BANK_CONNECTION_READINESS_CHECKED, AUDIT_ENTITY_TYPES.BANK_CONNECTION, organizationId, organizationId);

    return {
      provider: adapter.provider,
      providerStateLabel: adapter.stateLabel,
      noSecretsReturned: true,
      noBankCredentialsStored: true,
      noRealWioApiCalls: true,
      noMoneyMovement: true,
      manualImportStillSupported: true,
      counts: { connections: connectionCount, feedAccounts: feedAccountCount, paymentRequests: paymentRequestCount },
      surfaces: {
        bankConnection: this.connectionReadinessFromAdapter(adapter),
        bankFeed: this.feedReadinessFromAdapter(adapter),
        beneficiaryMapping: this.beneficiaryReadinessFromAdapter(adapter),
        vendorPayment: this.vendorPaymentReadinessFromAdapter(adapter),
      },
      warnings: adapter.warnings,
    };
  }

  async connectionReadiness(organizationId: string) {
    const adapter = this.adapter();
    const count = await this.prisma.bankConnection.count({ where: { organizationId } });
    await this.audit(AUDIT_EVENTS.BANK_CONNECTION_READINESS_CHECKED, AUDIT_ENTITY_TYPES.BANK_CONNECTION, organizationId, organizationId);
    return { ...this.connectionReadinessFromAdapter(adapter), count, noSecretsReturned: true };
  }

  async feedReadiness(organizationId: string) {
    const adapter = this.adapter();
    const [accountCount, syncRunCount] = await Promise.all([
      this.prisma.bankFeedAccount.count({ where: { organizationId } }),
      this.prisma.bankFeedSyncRun.count({ where: { organizationId } }),
    ]);
    return { ...this.feedReadinessFromAdapter(adapter), accountCount, syncRunCount, noSecretsReturned: true };
  }

  async beneficiaryReadiness(organizationId: string) {
    const adapter = this.adapter();
    const count = await this.prisma.bankBeneficiaryMapping.count({ where: { organizationId } });
    return { ...this.beneficiaryReadinessFromAdapter(adapter), count, noSecretsReturned: true };
  }

  async vendorPaymentReadiness(organizationId: string) {
    const adapter = this.adapter();
    const count = await this.prisma.bankPaymentRequest.count({ where: { organizationId } });
    return { ...this.vendorPaymentReadinessFromAdapter(adapter), count, noSecretsReturned: true, noMoneyMovement: true };
  }

  async listConnections(organizationId: string) {
    return this.prisma.bankConnection.findMany({
      where: { organizationId },
      orderBy: [{ status: "asc" }, { displayName: "asc" }],
      select: bankConnectionSelect,
    });
  }

  async createConnection(organizationId: string, actorUserId: string, dto: CreateBankConnectionDto) {
    const adapter = this.adapter();
    const provider = dto.provider ?? adapter.provider;
    if (provider === BankIntegrationProvider.MOCK_WIO && adapter.provider !== BankIntegrationProvider.MOCK_WIO) {
      throw new BadRequestException("MOCK_WIO connections require LEDGERBYTE_BANK_INTEGRATION_PROVIDER=MOCK_WIO in local/test mode.");
    }
    if (provider === BankIntegrationProvider.WIO_DISABLED_PLACEHOLDER) {
      throw new BadRequestException("Real Wio connections are not implemented. Use readiness metadata only.");
    }
    const status = provider === BankIntegrationProvider.MOCK_WIO ? BankIntegrationStatus.READY_FOR_MOCK : BankIntegrationStatus.DISABLED;
    const connection = await this.prisma.bankConnection.create({
      data: {
        organizationId,
        provider,
        status,
        displayName: requiredText(dto.displayName, "displayName"),
        externalConnectionRefMasked: maskReference(dto.externalConnectionRef),
        externalInstitutionName: cleanOptional(dto.externalInstitutionName) ?? (provider === BankIntegrationProvider.MOCK_WIO ? "Wio local mock" : null),
        metadataJson: adapter.redactPayload({ noCredentialsStored: true, noRealBankApiCalls: true }) as Prisma.InputJsonObject,
        createdById: actorUserId,
        updatedById: actorUserId,
        requestId: this.requestId(),
      },
      select: bankConnectionSelect,
    });
    await this.audit(AUDIT_EVENTS.BANK_CONNECTION_CREATED, AUDIT_ENTITY_TYPES.BANK_CONNECTION, organizationId, connection.id, actorUserId, connection);
    return { ...connection, noBankCredentialsStored: true, noRealWioApiCalls: true };
  }

  async disableConnection(organizationId: string, actorUserId: string, id: string) {
    await this.findConnection(organizationId, id);
    const connection = await this.prisma.bankConnection.update({
      where: { id },
      data: { status: BankIntegrationStatus.DISABLED, disabledAt: new Date(), updatedById: actorUserId, requestId: this.requestId() },
      select: bankConnectionSelect,
    });
    await this.audit(AUDIT_EVENTS.BANK_CONNECTION_DISABLED, AUDIT_ENTITY_TYPES.BANK_CONNECTION, organizationId, id, actorUserId, connection);
    return { ...connection, noMoneyMovement: true };
  }

  async listFeedAccounts(organizationId: string) {
    return this.prisma.bankFeedAccount.findMany({
      where: { organizationId },
      orderBy: [{ status: "asc" }, { displayName: "asc" }],
      select: {
        id: true,
        organizationId: true,
        bankConnectionId: true,
        bankAccountProfileId: true,
        provider: true,
        status: true,
        displayName: true,
        currency: true,
        accountRefMasked: true,
        ibanMasked: true,
        externalAccountRefMasked: true,
        lastSyncedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async recordMockFeedSync(organizationId: string, actorUserId: string, bankConnectionId: string, dto: RecordMockFeedSyncDto) {
    const adapter = this.adapter();
    if (adapter.provider !== BankIntegrationProvider.MOCK_WIO || !adapter.canRecordLocalSync) {
      throw new BadRequestException("Mock Wio feed sync is disabled. No real bank feed sync is implemented.");
    }
    const connection = await this.findConnection(organizationId, bankConnectionId);
    if (connection.provider !== BankIntegrationProvider.MOCK_WIO) {
      throw new BadRequestException("Mock feed sync requires a MOCK_WIO connection.");
    }
    if (dto.account.bankAccountProfileId) {
      await this.assertBankAccountProfile(organizationId, dto.account.bankAccountProfileId);
    }

    const feedAccount = await this.prisma.bankFeedAccount.create({
      data: {
        organizationId,
        bankConnectionId,
        bankAccountProfileId: dto.account.bankAccountProfileId ?? null,
        provider: BankIntegrationProvider.MOCK_WIO,
        status: BankIntegrationStatus.SYNCED,
        displayName: requiredText(dto.account.displayName, "displayName"),
        currency: normalizeCurrency(dto.account.currency),
        accountRefMasked: maskReference(dto.account.accountRef),
        externalAccountRefMasked: maskReference(dto.account.externalAccountRef),
        metadataJson: adapter.redactPayload({ source: "mock-local-sync" }) as Prisma.InputJsonObject,
        lastSyncedAt: new Date(),
      },
    });
    const syncRun = await this.prisma.bankFeedSyncRun.create({
      data: {
        organizationId,
        bankConnectionId,
        status: BankIntegrationStatus.SYNCED,
        finishedAt: new Date(),
        transactionCount: dto.transactions.length,
        requestId: this.requestId(),
        metadataJson: adapter.redactPayload({ source: "mock-local-sync", noProviderPayloadStored: true }) as Prisma.InputJsonObject,
      },
    });
    const transactions = await Promise.all(
      dto.transactions.map((transaction) =>
        this.prisma.bankFeedTransaction.create({
          data: {
            organizationId,
            bankConnectionId,
            bankFeedAccountId: feedAccount.id,
            bankFeedSyncRunId: syncRun.id,
            bankAccountProfileId: dto.account.bankAccountProfileId ?? null,
            provider: BankIntegrationProvider.MOCK_WIO,
            transactionDate: parseDate(transaction.transactionDate, "transactionDate"),
            description: requiredText(transaction.description, "description"),
            reference: cleanOptional(transaction.reference),
            type: transaction.type,
            amount: money(transaction.amount),
            currency: normalizeCurrency(transaction.currency),
            externalTransactionRefMasked: maskReference(transaction.externalTransactionRef),
            accountRefMasked: maskReference(dto.account.accountRef),
            redactedMetadataJson: adapter.redactPayload({ source: "mock-local-sync" }) as Prisma.InputJsonObject,
          },
        }),
      ),
    );
    await this.prisma.bankConnection.update({ where: { id: bankConnectionId }, data: { status: BankIntegrationStatus.SYNCED, requestId: this.requestId() } });
    await this.audit(AUDIT_EVENTS.BANK_MOCK_SYNC_RECORDED, AUDIT_ENTITY_TYPES.BANK_FEED_SYNC_RUN, organizationId, syncRun.id, actorUserId, {
      syncRun,
      transactionCount: transactions.length,
      noRealWioApiCalls: true,
    });
    return { syncRun, feedAccount, transactions, noRealWioApiCalls: true, noSecretsReturned: true };
  }

  async upsertBeneficiaryMapping(organizationId: string, actorUserId: string, dto: UpsertBankBeneficiaryMappingDto) {
    await this.assertSupplier(organizationId, dto.supplierId);
    if (dto.bankConnectionId) await this.findConnection(organizationId, dto.bankConnectionId);
    const mapping = await this.prisma.bankBeneficiaryMapping.create({
      data: {
        organizationId,
        supplierId: dto.supplierId,
        bankConnectionId: dto.bankConnectionId ?? null,
        provider: dto.bankConnectionId ? (await this.findConnection(organizationId, dto.bankConnectionId)).provider : BankIntegrationProvider.NONE,
        status: dto.status ?? BankBeneficiaryMappingStatus.NEEDS_REVIEW,
        beneficiaryDisplayName: requiredText(dto.beneficiaryDisplayName, "beneficiaryDisplayName"),
        beneficiaryRefMasked: maskReference(dto.beneficiaryRef),
        externalBeneficiaryRefMasked: maskReference(dto.externalBeneficiaryRef),
        metadataJson: redactForDiagnostics({ noBeneficiarySecretsStored: true }) as Prisma.InputJsonObject,
        createdById: actorUserId,
        updatedById: actorUserId,
        requestId: this.requestId(),
      },
    });
    await this.audit(AUDIT_EVENTS.BANK_BENEFICIARY_MAPPING_CREATED, AUDIT_ENTITY_TYPES.BANK_BENEFICIARY_MAPPING, organizationId, mapping.id, actorUserId, mapping);
    return { ...mapping, noBankCredentialsStored: true };
  }

  async createPaymentRequest(organizationId: string, actorUserId: string, dto: CreateBankPaymentRequestDto) {
    if (!dto.supplierId && !dto.purchaseBillId) {
      throw new BadRequestException("supplierId or purchaseBillId is required.");
    }
    if (dto.supplierId) await this.assertSupplier(organizationId, dto.supplierId);
    if (dto.purchaseBillId) await this.assertPurchaseBill(organizationId, dto.purchaseBillId);
    if (dto.bankConnectionId) await this.findConnection(organizationId, dto.bankConnectionId);
    if (dto.beneficiaryMappingId) await this.assertBeneficiaryMapping(organizationId, dto.beneficiaryMappingId);
    const created = await this.prisma.bankPaymentRequest.create({
      data: {
        organizationId,
        supplierId: dto.supplierId ?? null,
        purchaseBillId: dto.purchaseBillId ?? null,
        bankConnectionId: dto.bankConnectionId ?? null,
        beneficiaryMappingId: dto.beneficiaryMappingId ?? null,
        status: BankPaymentRequestStatus.DRAFT,
        amount: money(dto.amount),
        currency: normalizeCurrency(dto.currency),
        memo: cleanOptional(dto.memo),
        createdById: actorUserId,
        requestId: this.requestId(),
        redactedMetadataJson: redactForDiagnostics({ noPaymentInitiated: true }) as Prisma.InputJsonObject,
      },
      select: paymentRequestSelect,
    });
    await this.audit(AUDIT_EVENTS.BANK_PAYMENT_REQUEST_CREATED, AUDIT_ENTITY_TYPES.BANK_PAYMENT_REQUEST, organizationId, created.id, actorUserId, created);
    return { ...created, noMoneyMovement: true };
  }

  async approvePaymentRequest(organizationId: string, actorUserId: string, id: string) {
    await this.findPaymentRequest(organizationId, id);
    const updated = await this.prisma.bankPaymentRequest.update({
      where: { id },
      data: { status: BankPaymentRequestStatus.APPROVED, approvedById: actorUserId, approvedAt: new Date(), requestId: this.requestId() },
      select: paymentRequestSelect,
    });
    await this.audit(AUDIT_EVENTS.BANK_PAYMENT_REQUEST_APPROVED, AUDIT_ENTITY_TYPES.BANK_PAYMENT_REQUEST, organizationId, id, actorUserId, updated);
    return { ...updated, noMoneyMovement: true };
  }

  async cancelPaymentRequest(organizationId: string, actorUserId: string, id: string) {
    await this.findPaymentRequest(organizationId, id);
    const updated = await this.prisma.bankPaymentRequest.update({
      where: { id },
      data: { status: BankPaymentRequestStatus.CANCELLED, cancelledById: actorUserId, cancelledAt: new Date(), requestId: this.requestId() },
      select: paymentRequestSelect,
    });
    await this.audit(AUDIT_EVENTS.BANK_PAYMENT_REQUEST_CANCELLED, AUDIT_ENTITY_TYPES.BANK_PAYMENT_REQUEST, organizationId, id, actorUserId, updated);
    return { ...updated, noMoneyMovement: true };
  }

  async blockRelease(organizationId: string, actorUserId: string, id: string) {
    await this.findPaymentRequest(organizationId, id);
    const updated = await this.prisma.bankPaymentRequest.update({
      where: { id },
      data: {
        status: BankPaymentRequestStatus.RELEASE_BLOCKED,
        releaseBlockedReason: "Real bank payment release is not implemented. No money movement was attempted.",
        requestId: this.requestId(),
      },
      select: paymentRequestSelect,
    });
    await this.audit(AUDIT_EVENTS.BANK_PAYMENT_RELEASE_BLOCKED, AUDIT_ENTITY_TYPES.BANK_PAYMENT_REQUEST, organizationId, id, actorUserId, updated);
    return { ...updated, noMoneyMovement: true, releaseAttempted: false };
  }

  async markExternallyReleased(organizationId: string, actorUserId: string, id: string, dto: ManualExternalReleaseDto) {
    await this.findPaymentRequest(organizationId, id);
    const updated = await this.prisma.bankPaymentRequest.update({
      where: { id },
      data: {
        status: BankPaymentRequestStatus.RELEASED_EXTERNALLY,
        externalReleaseReferenceMasked: maskReference(dto.externalReleaseReference),
        manuallyReleasedById: actorUserId,
        manuallyReleasedAt: new Date(),
        requestId: this.requestId(),
        redactedMetadataJson: redactForDiagnostics({ note: dto.note, manualExternalReleaseOnly: true }) as Prisma.InputJsonObject,
      },
      select: paymentRequestSelect,
    });
    await this.audit(AUDIT_EVENTS.BANK_PAYMENT_REQUEST_EXTERNALLY_RELEASED, AUDIT_ENTITY_TYPES.BANK_PAYMENT_REQUEST, organizationId, id, actorUserId, updated);
    return { ...updated, noMoneyMovement: true, externalReleaseRecordedOnly: true };
  }

  async reconcilePaymentRequest(organizationId: string, actorUserId: string, id: string, dto: ReconcileBankPaymentRequestDto) {
    if (!dto.bankFeedTransactionId && !dto.bankStatementTransactionId) {
      throw new BadRequestException("bankFeedTransactionId or bankStatementTransactionId is required.");
    }
    await this.findPaymentRequest(organizationId, id);
    if (dto.bankFeedTransactionId) await this.assertFeedTransaction(organizationId, dto.bankFeedTransactionId);
    if (dto.bankStatementTransactionId) await this.assertStatementTransaction(organizationId, dto.bankStatementTransactionId);
    const updated = await this.prisma.bankPaymentRequest.update({
      where: { id },
      data: {
        status: BankPaymentRequestStatus.RECONCILED,
        bankFeedTransactionId: dto.bankFeedTransactionId ?? undefined,
        bankStatementTransactionId: dto.bankStatementTransactionId ?? undefined,
        reconciledById: actorUserId,
        reconciledAt: new Date(),
        requestId: this.requestId(),
      },
      select: paymentRequestSelect,
    });
    await this.audit(AUDIT_EVENTS.BANK_PAYMENT_REQUEST_RECONCILED, AUDIT_ENTITY_TYPES.BANK_PAYMENT_REQUEST, organizationId, id, actorUserId, updated);
    return { ...updated, noMoneyMovement: true };
  }

  async listPaymentRequests(organizationId: string) {
    return this.prisma.bankPaymentRequest.findMany({ where: { organizationId }, orderBy: { createdAt: "desc" }, select: paymentRequestSelect });
  }

  private connectionReadinessFromAdapter(adapter: BankProviderAdapter) {
    return {
      provider: adapter.provider,
      status: adapter.provider === BankIntegrationProvider.MOCK_WIO ? BankIntegrationStatus.READY_FOR_MOCK : BankIntegrationStatus.DISABLED,
      stateLabel: adapter.stateLabel,
      canCreateLocalMockConnection: adapter.canCreateConnections,
      blockers: adapter.provider === BankIntegrationProvider.MOCK_WIO ? [] : ["Bank provider is disabled or future-only."],
    };
  }

  private feedReadinessFromAdapter(adapter: BankProviderAdapter) {
    return {
      provider: adapter.provider,
      status: adapter.provider === BankIntegrationProvider.MOCK_WIO ? BankIntegrationStatus.READY_FOR_MOCK : BankIntegrationStatus.NOT_CONFIGURED,
      stateLabel: adapter.stateLabel,
      canRecordMockSync: adapter.canRecordLocalSync,
      blockers: adapter.canRecordLocalSync ? [] : ["No bank feed provider is configured. Manual statement imports remain the supported path."],
    };
  }

  private beneficiaryReadinessFromAdapter(adapter: BankProviderAdapter) {
    return {
      provider: adapter.provider,
      status: adapter.provider === BankIntegrationProvider.NONE ? BankBeneficiaryMappingStatus.UNMAPPED : BankBeneficiaryMappingStatus.NEEDS_REVIEW,
      stateLabel: adapter.stateLabel,
      safeReferencesOnly: true,
      blockers: [],
    };
  }

  private vendorPaymentReadinessFromAdapter(adapter: BankProviderAdapter) {
    return {
      provider: adapter.provider,
      status: adapter.canReleasePayments ? BankPaymentRequestStatus.APPROVED : BankPaymentRequestStatus.RELEASE_BLOCKED,
      stateLabel: adapter.canReleasePayments ? "Needs Configuration" : "Blocked",
      releaseBlocked: true,
      blockers: ["Bank payment release is blocked until a real provider implementation is explicitly added and approved."],
    };
  }

  private adapter() {
    return resolveBankProviderAdapter(this.config.get<string>("LEDGERBYTE_BANK_INTEGRATION_PROVIDER"), this.productionLike());
  }

  private productionLike() {
    const value = (this.config.get<string>("APP_ENV") ?? this.config.get<string>("NODE_ENV") ?? "").trim().toLowerCase();
    return ["production", "prod", "live", "staging", "stage", "beta"].includes(value);
  }

  private requestId() {
    return this.observabilityContext?.getRequestId();
  }

  private async audit(action: string, entityType: string, organizationId: string, entityId: string, actorUserId?: string, after?: unknown) {
    await this.auditLogService?.log({ organizationId, actorUserId, action, entityType, entityId, after });
  }

  private async findConnection(organizationId: string, id: string) {
    const connection = await this.prisma.bankConnection.findFirst({ where: { id, organizationId }, select: bankConnectionSelect });
    if (!connection) throw new NotFoundException("Bank connection not found.");
    return connection;
  }

  private async findPaymentRequest(organizationId: string, id: string) {
    const request = await this.prisma.bankPaymentRequest.findFirst({ where: { id, organizationId }, select: paymentRequestSelect });
    if (!request) throw new NotFoundException("Bank payment request not found.");
    return request;
  }

  private async assertSupplier(organizationId: string, supplierId: string) {
    const supplier = await this.prisma.contact.findFirst({
      where: { id: supplierId, organizationId, type: { in: [ContactType.SUPPLIER, ContactType.BOTH] } },
      select: { id: true },
    });
    if (!supplier) throw new BadRequestException("Supplier must belong to this organization.");
  }

  private async assertPurchaseBill(organizationId: string, purchaseBillId: string) {
    const bill = await this.prisma.purchaseBill.findFirst({ where: { id: purchaseBillId, organizationId }, select: { id: true } });
    if (!bill) throw new BadRequestException("Purchase bill must belong to this organization.");
  }

  private async assertBankAccountProfile(organizationId: string, bankAccountProfileId: string) {
    const profile = await this.prisma.bankAccountProfile.findFirst({ where: { id: bankAccountProfileId, organizationId }, select: { id: true } });
    if (!profile) throw new BadRequestException("Bank account profile must belong to this organization.");
  }

  private async assertBeneficiaryMapping(organizationId: string, id: string) {
    const mapping = await this.prisma.bankBeneficiaryMapping.findFirst({ where: { id, organizationId }, select: { id: true } });
    if (!mapping) throw new BadRequestException("Beneficiary mapping must belong to this organization.");
  }

  private async assertFeedTransaction(organizationId: string, id: string) {
    const transaction = await this.prisma.bankFeedTransaction.findFirst({ where: { id, organizationId }, select: { id: true } });
    if (!transaction) throw new BadRequestException("Bank feed transaction must belong to this organization.");
  }

  private async assertStatementTransaction(organizationId: string, id: string) {
    const transaction = await this.prisma.bankStatementTransaction.findFirst({ where: { id, organizationId }, select: { id: true } });
    if (!transaction) throw new BadRequestException("Bank statement transaction must belong to this organization.");
  }
}

function requiredText(value: string | undefined, label: string) {
  const cleaned = value?.trim();
  if (!cleaned) throw new BadRequestException(`${label} is required.`);
  return cleaned;
}

function cleanOptional(value: string | null | undefined) {
  const cleaned = value?.trim();
  return cleaned || null;
}

function maskReference(value: string | null | undefined) {
  const cleaned = value?.trim();
  if (!cleaned) return null;
  const suffix = cleaned.replace(/[^a-zA-Z0-9]/g, "").slice(-4) || "ref";
  return `masked_${suffix}`;
}

function normalizeCurrency(value: string | null | undefined) {
  const cleaned = value?.trim().toUpperCase() || "AED";
  if (!/^[A-Z]{3}$/.test(cleaned)) throw new BadRequestException("currency must be a 3-letter code.");
  return cleaned;
}

function parseDate(value: string, label: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) throw new BadRequestException(`${label} must be a valid date.`);
  return parsed;
}

function money(value: string) {
  try {
    return new Prisma.Decimal(value).toFixed(4);
  } catch {
    throw new BadRequestException("amount must be a valid decimal value.");
  }
}
