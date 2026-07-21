import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { toMoney } from "@ledgerbyte/accounting-core";
import {
  CollectionActivityType,
  CollectionCaseStatus,
  CollectionPriority,
  ContactType,
  NumberSequenceScope,
  Prisma,
  SalesInvoiceStatus,
} from "@prisma/client";
import { AuditLogService } from "../audit-log/audit-log.service";
import { AUDIT_ENTITY_TYPES } from "../audit-log/audit-events";
import { NumberSequenceService } from "../number-sequences/number-sequence.service";
import { PrismaService } from "../prisma/prisma.service";
import { agingBucket } from "../reports/reports.service";
import { CreateCollectionActivityDto } from "./dto/create-collection-activity.dto";
import { CreateCollectionCaseDto } from "./dto/create-collection-case.dto";
import { UpdateCollectionCaseDto } from "./dto/update-collection-case.dto";

const collectionCaseInclude = {
  customer: { select: { id: true, name: true, displayName: true, email: true, phone: true, type: true } },
  salesInvoice: {
    select: {
      id: true,
      invoiceNumber: true,
      customerId: true,
      issueDate: true,
      dueDate: true,
      currency: true,
      status: true,
      total: true,
      balanceDue: true,
    },
  },
  assignedTo: { select: { id: true, name: true, email: true } },
  createdBy: { select: { id: true, name: true, email: true } },
  updatedBy: { select: { id: true, name: true, email: true } },
  activities: {
    orderBy: { activityDate: "desc" as const },
    take: 25,
    include: { createdBy: { select: { id: true, name: true, email: true } } },
  },
} satisfies Prisma.CollectionCaseInclude;

type CollectionCaseWithRelations = Prisma.CollectionCaseGetPayload<{ include: typeof collectionCaseInclude }>;
type CollectionCaseListFilters = {
  status?: string;
  priority?: string;
  customerId?: string;
  invoiceId?: string;
  overdue?: string;
  dueToday?: string;
  disputed?: string;
  promisedToPay?: string;
};

const OPEN_CASE_STATUSES: CollectionCaseStatus[] = [
  CollectionCaseStatus.OPEN,
  CollectionCaseStatus.IN_PROGRESS,
  CollectionCaseStatus.PROMISED_TO_PAY,
  CollectionCaseStatus.ON_HOLD,
  CollectionCaseStatus.DISPUTED,
];

const reminderCandidateInvoiceSelect = {
  id: true,
  invoiceNumber: true,
  issueDate: true,
  dueDate: true,
  currency: true,
  total: true,
  balanceDue: true,
  customer: { select: { id: true, name: true, displayName: true, email: true, phone: true } },
  collectionCases: {
    where: { status: { in: OPEN_CASE_STATUSES } },
    select: {
      id: true,
      caseNumber: true,
      status: true,
      priority: true,
      nextActionAt: true,
      followUpDate: true,
      promisedPaymentDate: true,
      promisedAmount: true,
      updatedAt: true,
    },
    orderBy: [{ nextActionAt: "asc" as const }, { followUpDate: "asc" as const }, { updatedAt: "desc" as const }],
  },
} satisfies Prisma.SalesInvoiceSelect;

type ReminderCandidateInvoice = Prisma.SalesInvoiceGetPayload<{ select: typeof reminderCandidateInvoiceSelect }>;

const TERMINAL_CASE_STATUSES = new Set<CollectionCaseStatus>([CollectionCaseStatus.CLOSED, CollectionCaseStatus.CANCELLED]);
const CREATE_BLOCKED_STATUSES = new Set<CollectionCaseStatus>([
  CollectionCaseStatus.CLOSED,
  CollectionCaseStatus.CANCELLED,
  CollectionCaseStatus.PAID,
]);

@Injectable()
export class CollectionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
    private readonly numberSequences: NumberSequenceService,
  ) {}

  list(organizationId: string, filters: CollectionCaseListFilters = {}) {
    const { todayStart, todayEnd } = dayBounds(new Date());
    const and: Prisma.CollectionCaseWhereInput[] = [];

    if (truthy(filters.overdue)) {
      and.push({ OR: [{ nextActionAt: { lt: todayStart } }, { followUpDate: { lt: todayStart } }] });
    }

    if (truthy(filters.dueToday)) {
      and.push({
        OR: [
          { nextActionAt: { gte: todayStart, lt: todayEnd } },
          { followUpDate: { gte: todayStart, lt: todayEnd } },
        ],
      });
    }

    const where: Prisma.CollectionCaseWhereInput = {
      organizationId,
      ...(isCollectionCaseStatus(filters.status) ? { status: filters.status } : {}),
      ...(isCollectionPriority(filters.priority) ? { priority: filters.priority } : {}),
      ...(filters.customerId ? { customerId: filters.customerId } : {}),
      ...(filters.invoiceId ? { salesInvoiceId: filters.invoiceId } : {}),
      ...(truthy(filters.disputed) ? { status: CollectionCaseStatus.DISPUTED } : {}),
      ...(truthy(filters.promisedToPay) ? { status: CollectionCaseStatus.PROMISED_TO_PAY } : {}),
      ...(and.length > 0 ? { AND: and } : {}),
    };

    return this.prisma.collectionCase.findMany({
      where,
      include: collectionCaseInclude,
      orderBy: [{ nextActionAt: "asc" }, { followUpDate: "asc" }, { updatedAt: "desc" }],
    });
  }

  async summary(organizationId: string) {
    const now = new Date();
    const { todayStart, todayEnd } = dayBounds(now);
    const invoices = await this.prisma.salesInvoice.findMany({
      where: { organizationId, status: SalesInvoiceStatus.FINALIZED, balanceDue: { gt: 0 } },
      select: {
        id: true,
        dueDate: true,
        issueDate: true,
        currency: true,
        balanceDue: true,
        customer: { select: { id: true, name: true, displayName: true } },
      },
    });
    const openCases = await this.prisma.collectionCase.findMany({
      where: { organizationId, status: { in: OPEN_CASE_STATUSES } },
      include: collectionCaseInclude,
    });

    const overdueInvoices = invoices.filter((invoice) => dueDateFor(invoice) < todayStart);
    const agingBuckets = new Map<string, string>([
      ["CURRENT", "0.0000"],
      ["1_30", "0.0000"],
      ["31_60", "0.0000"],
      ["61_90", "0.0000"],
      ["90_PLUS", "0.0000"],
    ]);
    const customers = new Map<string, { customerId: string; customerName: string; overdueAmount: string; overdueInvoiceCount: number }>();

    for (const invoice of invoices) {
      const due = dueDateFor(invoice);
      const daysOverdue = Math.max(0, Math.floor((todayStart.getTime() - due.getTime()) / 86_400_000));
      const bucket = agingBucket(daysOverdue);
      agingBuckets.set(bucket, addMoney(agingBuckets.get(bucket), invoice.balanceDue));

      if (due < todayStart) {
        const customerId = invoice.customer.id;
        const existing = customers.get(customerId) ?? {
          customerId,
          customerName: invoice.customer.displayName ?? invoice.customer.name,
          overdueAmount: "0.0000",
          overdueInvoiceCount: 0,
        };
        existing.overdueAmount = addMoney(existing.overdueAmount, invoice.balanceDue);
        existing.overdueInvoiceCount += 1;
        customers.set(customerId, existing);
      }
    }

    const promisedToPayTotal = openCases
      .filter((row) => row.status === CollectionCaseStatus.PROMISED_TO_PAY)
      .reduce((sum, row) => addMoney(sum, row.promisedAmount), "0.0000");
    const disputedTotal = openCases
      .filter((row) => row.status === CollectionCaseStatus.DISPUTED)
      .reduce((sum, row) => addMoney(sum, row.salesInvoice?.balanceDue), "0.0000");

    return {
      totalOverdueAmount: overdueInvoices.reduce((sum, invoice) => addMoney(sum, invoice.balanceDue), "0.0000"),
      overdueInvoiceCount: overdueInvoices.length,
      openCollectionCaseCount: openCases.length,
      casesDueToday: openCases.filter((row) => isWithinDay(row.nextActionAt ?? row.followUpDate, todayStart, todayEnd)).length,
      casesOverdueForFollowUp: openCases.filter((row) => {
        const nextDate = row.nextActionAt ?? row.followUpDate;
        return Boolean(nextDate && nextDate < todayStart);
      }).length,
      promisedToPayTotal,
      disputedTotal,
      topCustomersByOverdueAmount: [...customers.values()]
        .sort((a, b) => toMoney(b.overdueAmount).cmp(toMoney(a.overdueAmount)))
        .slice(0, 5),
      agingBuckets: [...agingBuckets.entries()].map(([bucket, amount]) => ({ bucket, amount })),
      safeWording:
        "Collections records track follow-up work only. They do not post journals, allocate payments, send emails, create payment links, file VAT, call ZATCA, or change invoice balances.",
    };
  }

  async reminderCandidates(organizationId: string) {
    const now = new Date();
    const { todayStart } = dayBounds(now);
    const invoices = await this.prisma.salesInvoice.findMany({
      where: {
        organizationId,
        status: SalesInvoiceStatus.FINALIZED,
        balanceDue: { gt: 0 },
        OR: [{ dueDate: { lt: todayStart } }, { dueDate: null, issueDate: { lt: todayStart } }],
      },
      select: reminderCandidateInvoiceSelect,
      orderBy: [{ dueDate: "asc" }, { issueDate: "asc" }, { invoiceNumber: "asc" }],
    });
    const candidates = invoices.map((invoice) => reminderCandidateResponse(invoice, todayStart));

    return {
      generatedAt: now.toISOString(),
      asOfDate: todayStart.toISOString(),
      totalCandidateCount: candidates.length,
      reviewNotice:
        "Reminder candidates are review-only Sales/AR signals. They do not send email or reminders, create payment links, collect payments, post journals, file VAT, call ZATCA, or change invoice balances.",
      blockedActions: [
        "No email, reminder, notification, or provider call is sent from this endpoint.",
        "No payment link, customer payment, allocation, credit note, or journal entry is created.",
        "No VAT, ZATCA, UAE, Peppol, storage, backup, or production-readiness action or claim is made.",
      ],
      candidates,
    };
  }

  async nextNumberPreview(organizationId: string) {
    const preview = await this.numberSequences.preview(organizationId, NumberSequenceScope.COLLECTION_CASE);
    return {
      ...preview,
      caseNumber: preview.exampleNextNumber,
      helperText: "Assigned from the collection case sequence when saved.",
    };
  }

  async get(organizationId: string, id: string) {
    const collectionCase = await this.prisma.collectionCase.findFirst({
      where: { id, organizationId },
      include: collectionCaseInclude,
    });

    if (!collectionCase) {
      throw new NotFoundException("Collection case not found.");
    }

    return {
      ...collectionCase,
      invoiceSettled: collectionCase.salesInvoice ? toMoney(collectionCase.salesInvoice.balanceDue).eq(0) : false,
      nonPostingNotice:
        "Collections records help track follow-up work. They do not post journals, allocate payments, send emails, create payment links, file VAT, call ZATCA, or change invoice balances.",
    };
  }

  async byCustomer(organizationId: string, customerId: string) {
    await this.assertCustomer(organizationId, customerId);
    return this.prisma.collectionCase.findMany({
      where: { organizationId, customerId },
      include: collectionCaseInclude,
      orderBy: [{ status: "asc" }, { nextActionAt: "asc" }, { updatedAt: "desc" }],
    });
  }

  async byInvoice(organizationId: string, invoiceId: string) {
    const invoice = await this.prisma.salesInvoice.findFirst({
      where: { id: invoiceId, organizationId },
      select: { id: true },
    });
    if (!invoice) {
      throw new NotFoundException("Sales invoice not found.");
    }

    return this.prisma.collectionCase.findMany({
      where: { organizationId, salesInvoiceId: invoiceId },
      include: collectionCaseInclude,
      orderBy: [{ status: "asc" }, { nextActionAt: "asc" }, { updatedAt: "desc" }],
    });
  }

  async create(organizationId: string, actorUserId: string, dto: CreateCollectionCaseDto) {
    const status = dto.status ?? CollectionCaseStatus.OPEN;
    if (CREATE_BLOCKED_STATUSES.has(status)) {
      throw new BadRequestException("New collection cases must start as open, in progress, promised, disputed, or on hold.");
    }

    const customer = await this.assertCustomer(organizationId, dto.customerId);
    const salesInvoice = dto.salesInvoiceId ? await this.assertInvoice(organizationId, dto.salesInvoiceId, customer.id) : null;
    if (salesInvoice) {
      await this.assertNoDuplicateOpenInvoiceCase(organizationId, salesInvoice.id);
    }
    await this.assertAssignableUser(organizationId, dto.assignedToUserId);

    try {
      return await this.prisma.$transaction(async (tx) => {
        const caseNumber = await this.numberSequences.next(organizationId, NumberSequenceScope.COLLECTION_CASE, tx);
        const collectionCase = await tx.collectionCase.create({
          data: {
            organizationId,
            caseNumber,
            customerId: customer.id,
            salesInvoiceId: salesInvoice?.id ?? null,
            status,
            priority: dto.priority ?? CollectionPriority.NORMAL,
            followUpDate: parseOptionalDate(dto.followUpDate, "Follow-up date"),
            nextActionAt: parseOptionalDate(dto.nextActionAt, "Next action date") ?? parseOptionalDate(dto.followUpDate, "Follow-up date"),
            promisedPaymentDate: parseOptionalDate(dto.promisedPaymentDate, "Promised payment date"),
            promisedAmount: parseOptionalMoney(dto.promisedAmount, "Promised amount"),
            assignedToUserId: cleanNullable(dto.assignedToUserId),
            summary: cleanNullable(dto.summary),
            notes: cleanNullable(dto.notes),
            createdById: actorUserId,
            updatedById: actorUserId,
          },
          include: collectionCaseInclude,
        });

        await this.auditLog.log({
          organizationId,
          actorUserId,
          action: "CREATE",
          entityType: AUDIT_ENTITY_TYPES.COLLECTION_CASE,
          entityId: collectionCase.id,
          after: caseAuditSnapshot(collectionCase),
        });

        return collectionCase;
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new BadRequestException("Collection case number already exists. Check the collection case number sequence.");
      }
      throw error;
    }
  }

  async update(organizationId: string, actorUserId: string, id: string, dto: UpdateCollectionCaseDto) {
    const before = await this.get(organizationId, id);
    assertCaseEditable(before);

    const customerId = cleanNullable(dto.customerId) ?? before.customerId;
    const customer = await this.assertCustomer(organizationId, customerId);
    const invoiceId = Object.prototype.hasOwnProperty.call(dto, "salesInvoiceId") ? cleanNullable(dto.salesInvoiceId) : before.salesInvoiceId;
    const salesInvoice = invoiceId ? await this.assertInvoice(organizationId, invoiceId, customer.id) : null;
    if (salesInvoice) {
      await this.assertNoDuplicateOpenInvoiceCase(organizationId, salesInvoice.id, before.id);
    }
    await this.assertAssignableUser(organizationId, dto.assignedToUserId);

    const followUpDate = parseOptionalDate(dto.followUpDate, "Follow-up date");
    const nextActionAt = parseOptionalDate(dto.nextActionAt, "Next action date");
    const promisedPaymentDate = parseOptionalDate(dto.promisedPaymentDate, "Promised payment date");
    const promisedAmount = parseOptionalMoney(dto.promisedAmount, "Promised amount");

    const data: Prisma.CollectionCaseUpdateInput = {
      customer: { connect: { id: customer.id } },
      salesInvoice: salesInvoice ? { connect: { id: salesInvoice.id } } : { disconnect: true },
      updatedBy: { connect: { id: actorUserId } },
      ...(dto.status ? { status: dto.status } : {}),
      ...(dto.priority ? { priority: dto.priority } : {}),
      ...(Object.prototype.hasOwnProperty.call(dto, "followUpDate") ? { followUpDate } : {}),
      ...(Object.prototype.hasOwnProperty.call(dto, "nextActionAt") ? { nextActionAt } : {}),
      ...(Object.prototype.hasOwnProperty.call(dto, "promisedPaymentDate") ? { promisedPaymentDate } : {}),
      ...(Object.prototype.hasOwnProperty.call(dto, "promisedAmount") ? { promisedAmount } : {}),
      ...(Object.prototype.hasOwnProperty.call(dto, "assignedToUserId")
        ? cleanNullable(dto.assignedToUserId)
          ? { assignedTo: { connect: { id: cleanNullable(dto.assignedToUserId)! } } }
          : { assignedTo: { disconnect: true } }
        : {}),
      ...(Object.prototype.hasOwnProperty.call(dto, "summary") ? { summary: cleanNullable(dto.summary) } : {}),
      ...(Object.prototype.hasOwnProperty.call(dto, "notes") ? { notes: cleanNullable(dto.notes) } : {}),
    };

    const updated = await this.prisma.collectionCase.update({
      where: { id: before.id },
      data,
      include: collectionCaseInclude,
    });

    await this.auditLog.log({
      organizationId,
      actorUserId,
      action: "UPDATE",
      entityType: AUDIT_ENTITY_TYPES.COLLECTION_CASE,
      entityId: updated.id,
      before: caseAuditSnapshot(before),
      after: caseAuditSnapshot(updated),
    });

    return updated;
  }

  start(organizationId: string, actorUserId: string, id: string) {
    return this.transitionStatus(organizationId, actorUserId, id, CollectionCaseStatus.IN_PROGRESS, "START");
  }

  markPromised(organizationId: string, actorUserId: string, id: string, dto: UpdateCollectionCaseDto) {
    return this.transitionStatus(organizationId, actorUserId, id, CollectionCaseStatus.PROMISED_TO_PAY, "MARK_PROMISED", {
      promisedPaymentDate: parseOptionalDate(dto.promisedPaymentDate, "Promised payment date"),
      promisedAmount: parseOptionalMoney(dto.promisedAmount, "Promised amount"),
      nextActionAt: parseOptionalDate(dto.nextActionAt, "Next action date") ?? parseOptionalDate(dto.followUpDate, "Follow-up date"),
      followUpDate: parseOptionalDate(dto.followUpDate, "Follow-up date"),
      summary: cleanNullable(dto.summary),
    });
  }

  markDisputed(organizationId: string, actorUserId: string, id: string, dto: UpdateCollectionCaseDto) {
    return this.transitionStatus(organizationId, actorUserId, id, CollectionCaseStatus.DISPUTED, "MARK_DISPUTED", {
      nextActionAt: parseOptionalDate(dto.nextActionAt, "Next action date") ?? parseOptionalDate(dto.followUpDate, "Follow-up date"),
      followUpDate: parseOptionalDate(dto.followUpDate, "Follow-up date"),
      summary: cleanNullable(dto.summary),
    });
  }

  hold(organizationId: string, actorUserId: string, id: string, dto: UpdateCollectionCaseDto) {
    return this.transitionStatus(organizationId, actorUserId, id, CollectionCaseStatus.ON_HOLD, "HOLD", {
      nextActionAt: parseOptionalDate(dto.nextActionAt, "Next action date") ?? parseOptionalDate(dto.followUpDate, "Follow-up date"),
      followUpDate: parseOptionalDate(dto.followUpDate, "Follow-up date"),
      summary: cleanNullable(dto.summary),
    });
  }

  close(organizationId: string, actorUserId: string, id: string, dto: UpdateCollectionCaseDto) {
    return this.transitionStatus(organizationId, actorUserId, id, CollectionCaseStatus.CLOSED, "CLOSE", {
      nextActionAt: null,
      followUpDate: null,
      summary: cleanNullable(dto.summary),
    });
  }

  cancel(organizationId: string, actorUserId: string, id: string, dto: UpdateCollectionCaseDto) {
    return this.transitionStatus(organizationId, actorUserId, id, CollectionCaseStatus.CANCELLED, "CANCEL", {
      nextActionAt: null,
      followUpDate: null,
      summary: cleanNullable(dto.summary),
    });
  }

  async addActivity(organizationId: string, actorUserId: string, id: string, dto: CreateCollectionActivityDto) {
    const collectionCase = await this.get(organizationId, id);
    assertCaseEditable(collectionCase);

    const activityDate = parseOptionalDate(dto.activityDate, "Activity date") ?? new Date();
    const nextFollowUpDate = parseOptionalDate(dto.nextFollowUpDate, "Next follow-up date");
    const promisedPaymentDate = parseOptionalDate(dto.promisedPaymentDate, "Promised payment date");
    const promisedAmount = parseOptionalMoney(dto.promisedAmount, "Promised amount");
    const note = cleanNullable(dto.note);
    if (!note) {
      throw new BadRequestException("Collection activity note is required.");
    }

    const activity = await this.prisma.collectionActivity.create({
      data: {
        organizationId,
        collectionCaseId: collectionCase.id,
        customerId: collectionCase.customerId,
        salesInvoiceId: collectionCase.salesInvoiceId,
        activityType: dto.activityType,
        activityDate,
        note,
        nextFollowUpDate,
        promisedPaymentDate,
        promisedAmount,
        createdById: actorUserId,
      },
      include: { createdBy: { select: { id: true, name: true, email: true } } },
    });

    const casePatch: Prisma.CollectionCaseUpdateInput = {
      lastActivityAt: activityDate,
      updatedBy: { connect: { id: actorUserId } },
      ...(nextFollowUpDate ? { nextActionAt: nextFollowUpDate, followUpDate: nextFollowUpDate } : {}),
      ...(promisedPaymentDate ? { promisedPaymentDate } : {}),
      ...(promisedAmount !== undefined ? { promisedAmount } : {}),
      ...(activityStatus(dto.activityType) ? { status: activityStatus(dto.activityType)! } : {}),
    };

    const updated = await this.prisma.collectionCase.update({
      where: { id: collectionCase.id },
      data: casePatch,
      include: collectionCaseInclude,
    });

    await this.auditLog.log({
      organizationId,
      actorUserId,
      action: "CREATE",
      entityType: AUDIT_ENTITY_TYPES.COLLECTION_ACTIVITY,
      entityId: activity.id,
      after: activityAuditSnapshot(activity),
    });

    await this.auditLog.log({
      organizationId,
      actorUserId,
      action: "UPDATE",
      entityType: AUDIT_ENTITY_TYPES.COLLECTION_CASE,
      entityId: updated.id,
      before: caseAuditSnapshot(collectionCase),
      after: caseAuditSnapshot(updated),
    });

    return updated;
  }

  private async transitionStatus(
    organizationId: string,
    actorUserId: string,
    id: string,
    status: CollectionCaseStatus,
    action: "START" | "MARK_PROMISED" | "MARK_DISPUTED" | "HOLD" | "CLOSE" | "CANCEL",
    patch: Partial<Prisma.CollectionCaseUpdateInput> = {},
  ) {
    const before = await this.get(organizationId, id);
    if (TERMINAL_CASE_STATUSES.has(before.status)) {
      throw new BadRequestException("Closed or cancelled collection cases cannot be changed.");
    }

    const updated = await this.prisma.collectionCase.update({
      where: { id: before.id },
      data: {
        ...patch,
        status,
        updatedBy: { connect: { id: actorUserId } },
      },
      include: collectionCaseInclude,
    });

    await this.auditLog.log({
      organizationId,
      actorUserId,
      action,
      entityType: AUDIT_ENTITY_TYPES.COLLECTION_CASE,
      entityId: updated.id,
      before: caseAuditSnapshot(before),
      after: caseAuditSnapshot(updated),
    });

    return updated;
  }

  private async assertCustomer(organizationId: string, customerId: string) {
    const customer = await this.prisma.contact.findFirst({
      where: {
        id: customerId,
        organizationId,
        isActive: true,
        type: { in: [ContactType.CUSTOMER, ContactType.BOTH] },
      },
      select: { id: true },
    });

    if (!customer) {
      throw new BadRequestException("Customer must belong to the organization and be active.");
    }

    return customer;
  }

  private async assertInvoice(organizationId: string, invoiceId: string, customerId: string) {
    const invoice = await this.prisma.salesInvoice.findFirst({
      where: { id: invoiceId, organizationId },
      select: { id: true, customerId: true, status: true, balanceDue: true },
    });

    if (!invoice || invoice.customerId !== customerId) {
      throw new BadRequestException("Linked sales invoice must belong to the selected customer and organization.");
    }
    if (invoice.status !== SalesInvoiceStatus.FINALIZED || toMoney(invoice.balanceDue).lte(0)) {
      throw new BadRequestException("Collection cases can only link to finalized invoices with an outstanding balance.");
    }

    return invoice;
  }

  private async assertNoDuplicateOpenInvoiceCase(organizationId: string, salesInvoiceId: string, currentCaseId?: string) {
    const duplicate = await this.prisma.collectionCase.findFirst({
      where: {
        organizationId,
        salesInvoiceId,
        status: { in: OPEN_CASE_STATUSES },
        ...(currentCaseId ? { id: { not: currentCaseId } } : {}),
      },
      select: { id: true, caseNumber: true },
    });

    if (duplicate) {
      throw new BadRequestException(`Invoice already has an open collection case (${duplicate.caseNumber}).`);
    }
  }

  private async assertAssignableUser(organizationId: string, userId: string | null | undefined) {
    const cleaned = cleanNullable(userId);
    if (!cleaned) {
      return;
    }

    const membership = await this.prisma.organizationMember.findFirst({
      where: { organizationId, userId: cleaned },
      select: { id: true },
    });
    if (!membership) {
      throw new BadRequestException("Assigned user must belong to the active organization.");
    }
  }
}

function assertCaseEditable(collectionCase: { status: CollectionCaseStatus }) {
  if (TERMINAL_CASE_STATUSES.has(collectionCase.status)) {
    throw new BadRequestException("Closed or cancelled collection cases cannot be edited.");
  }
}

function activityStatus(activityType: CollectionActivityType): CollectionCaseStatus | null {
  switch (activityType) {
    case CollectionActivityType.PROMISE_TO_PAY:
      return CollectionCaseStatus.PROMISED_TO_PAY;
    case CollectionActivityType.DISPUTE:
      return CollectionCaseStatus.DISPUTED;
    case CollectionActivityType.PAYMENT_RECEIVED_NOTE:
      return CollectionCaseStatus.PAID;
    case CollectionActivityType.CLOSED_NOTE:
      return CollectionCaseStatus.CLOSED;
    default:
      return null;
  }
}

function parseOptionalDate(value: string | null | undefined, label: string): Date | null | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value === null || value.trim() === "") {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException(`${label} must be a valid date.`);
  }
  return date;
}

function parseOptionalMoney(value: string | null | undefined, label: string): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value === null || value.trim() === "") {
    return null;
  }

  try {
    const amount = toMoney(value);
    if (amount.isNegative()) {
      throw new BadRequestException(`${label} cannot be negative.`);
    }
    return amount.toFixed(4);
  } catch (error) {
    if (error instanceof BadRequestException) {
      throw error;
    }
    throw new BadRequestException(`${label} must be a valid amount.`);
  }
}

function cleanNullable(value: string | null | undefined): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function caseAuditSnapshot(collectionCase: CollectionCaseWithRelations | Awaited<ReturnType<CollectionService["get"]>>) {
  return {
    id: collectionCase.id,
    caseNumber: collectionCase.caseNumber,
    customerId: collectionCase.customerId,
    salesInvoiceId: collectionCase.salesInvoiceId,
    status: collectionCase.status,
    priority: collectionCase.priority,
    followUpDate: collectionCase.followUpDate,
    nextActionAt: collectionCase.nextActionAt,
    promisedPaymentDate: collectionCase.promisedPaymentDate,
    promisedAmount: collectionCase.promisedAmount,
    assignedToUserId: collectionCase.assignedToUserId,
    hasSummary: Boolean(collectionCase.summary),
    hasNotes: Boolean(collectionCase.notes),
  };
}

function activityAuditSnapshot(activity: {
  id: string;
  collectionCaseId: string;
  customerId: string;
  salesInvoiceId: string | null;
  activityType: CollectionActivityType;
  activityDate: Date;
  nextFollowUpDate: Date | null;
  promisedPaymentDate: Date | null;
  promisedAmount: unknown;
  note: string;
}) {
  return {
    id: activity.id,
    collectionCaseId: activity.collectionCaseId,
    customerId: activity.customerId,
    salesInvoiceId: activity.salesInvoiceId,
    activityType: activity.activityType,
    activityDate: activity.activityDate,
    nextFollowUpDate: activity.nextFollowUpDate,
    promisedPaymentDate: activity.promisedPaymentDate,
    promisedAmount: activity.promisedAmount,
    hasNote: Boolean(activity.note),
    noteLength: activity.note.length,
  };
}

function dueDateFor(invoice: { dueDate: Date | null; issueDate: Date }): Date {
  return invoice.dueDate ?? invoice.issueDate;
}

function reminderCandidateResponse(invoice: ReminderCandidateInvoice, todayStart: Date) {
  const due = dueDateFor(invoice);
  const daysOverdue = Math.max(0, Math.floor((todayStart.getTime() - due.getTime()) / 86_400_000));
  const openCollectionCase = invoice.collectionCases[0] ?? null;

  return {
    invoiceId: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate,
    currency: invoice.currency,
    total: formatMoney(invoice.total),
    balanceDue: formatMoney(invoice.balanceDue),
    daysOverdue,
    agingBucket: agingBucket(daysOverdue),
    customer: {
      id: invoice.customer.id,
      name: invoice.customer.displayName ?? invoice.customer.name,
      legalName: invoice.customer.name,
      email: invoice.customer.email,
      phone: invoice.customer.phone,
    },
    actionStatus: openCollectionCase ? "REVIEW_EXISTING_CASE" : "READY_FOR_MANUAL_REVIEW",
    recommendedNextAction: openCollectionCase
      ? "Review the existing open collection case before planning any internal reminder."
      : "Review the overdue invoice before creating a collection case or planning an internal reminder.",
    openCollectionCase: openCollectionCase
      ? {
          id: openCollectionCase.id,
          caseNumber: openCollectionCase.caseNumber,
          status: openCollectionCase.status,
          priority: openCollectionCase.priority,
          nextActionAt: openCollectionCase.nextActionAt,
          followUpDate: openCollectionCase.followUpDate,
          promisedPaymentDate: openCollectionCase.promisedPaymentDate,
          promisedAmount: openCollectionCase.promisedAmount ? formatMoney(openCollectionCase.promisedAmount) : null,
        }
      : null,
  };
}

function dayBounds(date: Date): { todayStart: Date; todayEnd: Date } {
  const todayStart = new Date(date);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);
  return { todayStart, todayEnd };
}

function isWithinDay(value: Date | null | undefined, todayStart: Date, todayEnd: Date): boolean {
  return Boolean(value && value >= todayStart && value < todayEnd);
}

function addMoney(left: unknown, right: unknown): string {
  return toMoney(moneyInput(left)).plus(toMoney(moneyInput(right))).toFixed(4);
}

function formatMoney(value: unknown): string {
  return toMoney(moneyInput(value)).toFixed(4);
}

function moneyInput(value: unknown): string | number | null | undefined {
  if (typeof value === "string" || typeof value === "number" || value === null || value === undefined) {
    return value;
  }
  return String(value);
}

function truthy(value: string | undefined): boolean {
  return value === "true" || value === "1";
}

function isCollectionCaseStatus(value: string | undefined): value is CollectionCaseStatus {
  return Boolean(value && Object.values(CollectionCaseStatus).includes(value as CollectionCaseStatus));
}

function isCollectionPriority(value: string | undefined): value is CollectionPriority {
  return Boolean(value && Object.values(CollectionPriority).includes(value as CollectionPriority));
}

function isUniqueConstraintError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "P2002";
}
