import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { normalizeSupportedCurrencyCode } from "@ledgerbyte/shared";
import { PrismaService } from "../prisma/prisma.service";

export const FOREIGN_CURRENCY_POSTING_DISABLED_MESSAGE =
  "Foreign-currency posting is disabled until document conversion, settlement, and reporting controls are complete.";

type OrganizationExecutor = Pick<Prisma.TransactionClient, "organization">;

@Injectable()
export class BaseCurrencyPostingGuardService {
  constructor(private readonly prisma: PrismaService) {}

  async assertPostingAllowed(
    organizationId: string,
    currency: string,
    executor: OrganizationExecutor = this.prisma,
  ): Promise<void> {
    const organization = await executor.organization.findUnique({
      where: { id: organizationId },
      select: { baseCurrency: true },
    });
    if (!organization) {
      throw new NotFoundException("Organization not found.");
    }

    const baseCurrency = normalizeSupportedCurrencyCode(organization.baseCurrency);
    const postingCurrency = normalizeSupportedCurrencyCode(currency);
    if (!baseCurrency || !postingCurrency || postingCurrency !== baseCurrency) {
      throw new BadRequestException(FOREIGN_CURRENCY_POSTING_DISABLED_MESSAGE);
    }
  }
}
