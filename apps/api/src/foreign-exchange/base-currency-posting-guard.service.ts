import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { normalizeSupportedCurrencyCode } from "@ledgerbyte/shared";
import { PrismaService } from "../prisma/prisma.service";

export const FOREIGN_CURRENCY_POSTING_DISABLED_MESSAGE =
  "Foreign-currency posting is disabled until document conversion, settlement, and reporting controls are complete.";

type OrganizationExecutor = Pick<Prisma.TransactionClient, "organization">;

export async function resolveOrganizationBaseCurrency(
  organizationId: string,
  executor: OrganizationExecutor,
): Promise<string> {
  const organization = await executor.organization.findUnique({
    where: { id: organizationId },
    select: { baseCurrency: true },
  });
  if (!organization) {
    throw new NotFoundException("Organization not found.");
  }
  const baseCurrency = normalizeSupportedCurrencyCode(organization.baseCurrency);
  if (!baseCurrency) {
    throw new BadRequestException(FOREIGN_CURRENCY_POSTING_DISABLED_MESSAGE);
  }
  return baseCurrency;
}

export async function resolveBaseOnlyPostingCurrency(
  organizationId: string,
  currency: string | undefined,
  executor: OrganizationExecutor,
): Promise<string> {
  const baseCurrency = await resolveOrganizationBaseCurrency(organizationId, executor);
  const postingCurrency = currency === undefined ? baseCurrency : normalizeSupportedCurrencyCode(currency);
  if (!postingCurrency || postingCurrency !== baseCurrency) {
    throw new BadRequestException(FOREIGN_CURRENCY_POSTING_DISABLED_MESSAGE);
  }
  return postingCurrency;
}

@Injectable()
export class BaseCurrencyPostingGuardService {
  constructor(private readonly prisma: PrismaService) {}

  async assertPostingAllowed(
    organizationId: string,
    currency: string | undefined,
    executor: OrganizationExecutor = this.prisma,
  ): Promise<string> {
    return resolveBaseOnlyPostingCurrency(organizationId, currency, executor);
  }

  async assertJournalPostingAllowed(
    organizationId: string,
    currency: string,
    lines: ReadonlyArray<{ currency: string; exchangeRate: unknown }>,
    executor: OrganizationExecutor = this.prisma,
  ): Promise<void> {
    const baseCurrency = await resolveOrganizationBaseCurrency(organizationId, executor);
    const invalid =
      !this.matchesBaseCurrency(currency, baseCurrency) ||
      lines.some(
        (line) => !this.matchesBaseCurrency(line.currency, baseCurrency) || !this.isRateOne(line.exchangeRate),
      );
    if (invalid) {
      throw new BadRequestException(FOREIGN_CURRENCY_POSTING_DISABLED_MESSAGE);
    }
  }

  private matchesBaseCurrency(currency: string, baseCurrency: string): boolean {
    return normalizeSupportedCurrencyCode(currency) === baseCurrency;
  }

  private isRateOne(exchangeRate: unknown): boolean {
    try {
      return new Prisma.Decimal(String(exchangeRate)).eq(1);
    } catch {
      return false;
    }
  }
}
