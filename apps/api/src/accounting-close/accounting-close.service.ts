import { Injectable, NotFoundException } from "@nestjs/common";
import { FiscalPeriodStatus } from "@prisma/client";
import { FxCloseReadinessService } from "../foreign-exchange/fx-close-readiness.service";
import { PrismaService } from "../prisma/prisma.service";
import { RecurringReadinessService } from "../recurring-transactions/recurring-readiness.service";
import {
  AccountingCloseCheck,
  canonicalReadinessHash,
  normalizeFxReadiness,
  normalizeRecurringReadiness,
} from "./close-readiness";

@Injectable()
export class AccountingCloseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fxCloseReadinessService: FxCloseReadinessService,
    private readonly recurringReadinessService: RecurringReadinessService,
  ) {}

  async readiness(organizationId: string, fiscalPeriodId: string) {
    const fiscalPeriod = await this.prisma.fiscalPeriod.findFirst({ where: { id: fiscalPeriodId, organizationId } });
    if (!fiscalPeriod) throw new NotFoundException("Fiscal period not found.");

    const [fx, recurring] = await Promise.allSettled([
      this.fxCloseReadinessService.readiness(organizationId, fiscalPeriod.endsOn),
      this.recurringReadinessService.get(organizationId, { startsOn: fiscalPeriod.startsOn, endsOn: fiscalPeriod.endsOn }),
    ]);
    const checks = [
      ...(fx.status === "fulfilled"
        ? normalizeFxReadiness(fx.value)
        : [unavailableCheck("fx.error", "Foreign exchange close readiness", "FX_READINESS_UNAVAILABLE")]),
      ...(recurring.status === "fulfilled"
        ? normalizeRecurringReadiness(recurring.value)
        : [unavailableCheck("recurring.error", "Recurring transaction readiness", "RECURRING_READINESS_UNAVAILABLE")]),
    ].sort((left, right) => left.key.localeCompare(right.key));
    const blockerCount = count(checks, "BLOCKER");
    const warningCount = count(checks, "WARNING");
    const informationCount = count(checks, "INFORMATION");

    return {
      fiscalPeriod: {
        id: fiscalPeriod.id,
        name: fiscalPeriod.name,
        startsOn: fiscalPeriod.startsOn,
        endsOn: fiscalPeriod.endsOn,
        status: fiscalPeriod.status as FiscalPeriodStatus,
      },
      checks,
      blockerCount,
      warningCount,
      informationCount,
      checkCount: checks.filter((check) => check.severity !== "NOT_APPLICABLE").length,
      canonicalHash: canonicalReadinessHash(checks),
    };
  }
}

function count(checks: AccountingCloseCheck[], severity: AccountingCloseCheck["severity"]) {
  return checks.filter((check) => check.severity === severity && check.status !== "NOT_APPLICABLE").length;
}

function unavailableCheck(key: string, title: string, code: string): AccountingCloseCheck {
  return {
    key,
    title,
    severity: "BLOCKER",
    status: "ERROR",
    code,
    safeMessage: "This readiness category could not be evaluated. Refresh after the service is available.",
    count: 1,
    canAcknowledge: false,
  };
}
