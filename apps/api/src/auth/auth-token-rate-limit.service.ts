import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { AuthTokenPurpose } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export interface AuthTokenDeliveryRequestMeta {
  ipAddress?: string | null;
  userAgent?: string | null;
}

interface PasswordResetAttemptInput extends AuthTokenDeliveryRequestMeta {
  organizationId?: string | null;
  email: string;
}

interface InviteAttemptInput extends AuthTokenDeliveryRequestMeta {
  organizationId: string;
  email: string;
}

@Injectable()
export class AuthTokenRateLimitService {
  constructor(private readonly prisma: PrismaService) {}

  async registerPasswordResetAttempt(input: PasswordResetAttemptInput) {
    const email = normalizeEmail(input.email);
    const since = new Date(Date.now() - HOUR_MS);
    const blockingReasons: string[] = [];

    const [emailCount, ipCount] = await Promise.all([
      this.prisma.authTokenRateLimitEvent.count({
        where: {
          email,
          purpose: AuthTokenPurpose.PASSWORD_RESET,
          createdAt: { gte: since },
        },
      }),
      input.ipAddress
        ? this.prisma.authTokenRateLimitEvent.count({
            where: {
              ipAddress: input.ipAddress,
              purpose: AuthTokenPurpose.PASSWORD_RESET,
              createdAt: { gte: since },
            },
          })
        : Promise.resolve(0),
    ]);

    if (emailCount >= 3) {
      blockingReasons.push("Password reset rate limit reached for this email.");
    }
    if (ipCount >= 10) {
      blockingReasons.push("Password reset rate limit reached for this IP address.");
    }

    if (blockingReasons.length > 0) {
      return { allowed: false, blockingReasons };
    }

    await this.createEvent({
      organizationId: input.organizationId ?? null,
      email,
      purpose: AuthTokenPurpose.PASSWORD_RESET,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
    });

    return { allowed: true, blockingReasons: [] };
  }

  async assertInviteAllowed(input: InviteAttemptInput) {
    const email = normalizeEmail(input.email);
    const hourAgo = new Date(Date.now() - HOUR_MS);
    const dayAgo = new Date(Date.now() - DAY_MS);

    const [emailCount, orgDailyCount] = await Promise.all([
      this.prisma.authTokenRateLimitEvent.count({
        where: {
          organizationId: input.organizationId,
          email,
          purpose: AuthTokenPurpose.ORGANIZATION_INVITE,
          createdAt: { gte: hourAgo },
        },
      }),
      this.prisma.authTokenRateLimitEvent.count({
        where: {
          organizationId: input.organizationId,
          purpose: AuthTokenPurpose.ORGANIZATION_INVITE,
          createdAt: { gte: dayAgo },
        },
      }),
    ]);

    if (emailCount >= 5) {
      throw new HttpException("Invite rate limit reached for this email. Try again later.", HttpStatus.TOO_MANY_REQUESTS);
    }
    if (orgDailyCount >= 50) {
      throw new HttpException("Daily organization invite rate limit reached. Try again tomorrow.", HttpStatus.TOO_MANY_REQUESTS);
    }

    await this.createEvent({
      organizationId: input.organizationId,
      email,
      purpose: AuthTokenPurpose.ORGANIZATION_INVITE,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
    });
  }

  private createEvent(input: {
    organizationId?: string | null;
    email: string;
    purpose: AuthTokenPurpose;
    ipAddress?: string | null;
    userAgent?: string | null;
  }) {
    return this.prisma.authTokenRateLimitEvent.create({
      data: {
        organizationId: input.organizationId ?? null,
        email: normalizeEmail(input.email),
        purpose: input.purpose,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
      },
    });
  }
}

function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}
