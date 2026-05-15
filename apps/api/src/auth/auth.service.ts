import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { AuthTokenPurpose, MembershipStatus } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import { EmailService } from "../email/email.service";
import { PrismaService } from "../prisma/prisma.service";
import { AuthTokenRateLimitService, type AuthTokenDeliveryRequestMeta } from "./auth-token-rate-limit.service";
import { AuthTokenService } from "./auth-token.service";
import { AcceptInvitationDto } from "./dto/accept-invitation.dto";
import { LoginDto } from "./dto/login.dto";
import { PasswordResetConfirmDto } from "./dto/password-reset-confirm.dto";
import { PasswordResetRequestDto } from "./dto/password-reset-request.dto";
import { RegisterDto } from "./dto/register.dto";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;
const PASSWORD_RESET_GENERIC_MESSAGE = "If an account exists, password reset instructions have been sent.";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly authTokenService: AuthTokenService,
    private readonly authTokenRateLimitService: AuthTokenRateLimitService,
    private readonly emailService: EmailService,
  ) {}

  async register(dto: RegisterDto) {
    const email = dto.email.toLowerCase().trim();
    const existing = await this.prisma.user.findUnique({ where: { email } });

    if (existing) {
      throw new ConflictException("A user with this email already exists.");
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        name: dto.name.trim(),
      },
      select: { id: true, email: true, name: true, createdAt: true },
    });

    return {
      user,
      accessToken: await this.signAccessToken(user.id, user.email),
    };
  }

  async login(dto: LoginDto) {
    const email = dto.email.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) {
      throw new UnauthorizedException("Invalid email or password.");
    }

    const validPassword = await bcrypt.compare(dto.password, user.passwordHash);
    if (!validPassword) {
      throw new UnauthorizedException("Invalid email or password.");
    }

    return {
      user: { id: user.id, email: user.email, name: user.name },
      accessToken: await this.signAccessToken(user.id, user.email),
    };
  }

  async me(userId: string) {
    return this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        memberships: {
          where: { status: "ACTIVE" },
          select: {
            id: true,
            status: true,
            organization: {
              select: {
                id: true,
                name: true,
                legalName: true,
                taxNumber: true,
                countryCode: true,
                baseCurrency: true,
                timezone: true,
              },
            },
            role: { select: { id: true, name: true, permissions: true } },
          },
        },
      },
    });
  }

  async previewInvitation(rawToken: string) {
    const preview = await this.authTokenService.preview(rawToken, AuthTokenPurpose.ORGANIZATION_INVITE);
    if (!preview.authToken) {
      return { valid: false, reason: "INVALID" };
    }

    const context = await this.getInvitationContext(preview.authToken.organizationId, preview.authToken.userId);
    return {
      valid: preview.valid && Boolean(context),
      reason: preview.valid && context ? null : preview.reason ?? "INVALID",
      email: preview.authToken.email,
      organization: context?.organization ?? null,
      role: context?.role ?? null,
      expiresAt: preview.authToken.expiresAt,
      consumed: Boolean(preview.authToken.consumedAt),
    };
  }

  async acceptInvitation(rawToken: string, dto: AcceptInvitationDto) {
    const token = await this.authTokenService.getTokenForUse(rawToken, AuthTokenPurpose.ORGANIZATION_INVITE);
    if (!token.userId || !token.organizationId) {
      throw new BadRequestException("Invalid invitation token.");
    }

    const member = await this.prisma.organizationMember.findFirst({
      where: { organizationId: token.organizationId, userId: token.userId },
      select: {
        id: true,
        status: true,
        organization: { select: { id: true, name: true, legalName: true, taxNumber: true, countryCode: true, baseCurrency: true, timezone: true } },
        user: { select: { id: true, email: true, name: true } },
      },
    });

    if (!member || member.status !== MembershipStatus.INVITED) {
      throw new BadRequestException("Invitation is not pending.");
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const nextName = dto.name?.trim();
    const user = await this.prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id: token.userId! },
        data: {
          passwordHash,
          ...(nextName ? { name: nextName } : {}),
        },
        select: { id: true, email: true, name: true },
      });
      await tx.organizationMember.update({
        where: { id: member.id },
        data: { status: MembershipStatus.ACTIVE },
      });
      await this.authTokenService.consume(token.id, tx);
      return updatedUser;
    });

    return {
      user,
      organization: member.organization,
      accessToken: await this.signAccessToken(user.id, user.email),
    };
  }

  async requestPasswordReset(dto: PasswordResetRequestDto, requestMeta: AuthTokenDeliveryRequestMeta = {}) {
    const email = dto.email.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        memberships: {
          where: { status: MembershipStatus.ACTIVE },
          select: { organizationId: true },
          orderBy: { createdAt: "asc" },
          take: 1,
        },
      },
    });

    const organizationId = user?.memberships[0]?.organizationId ?? null;
    const rateLimit = await this.authTokenRateLimitService.registerPasswordResetAttempt({
      organizationId,
      email,
      ipAddress: requestMeta.ipAddress,
      userAgent: requestMeta.userAgent,
    });

    if (!rateLimit.allowed) {
      return { message: PASSWORD_RESET_GENERIC_MESSAGE };
    }

    if (user) {
      const { rawToken } = await this.authTokenService.create({
        organizationId,
        userId: user.id,
        email: user.email,
        purpose: AuthTokenPurpose.PASSWORD_RESET,
        expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MS),
        consumeExistingForUser: true,
      });

      await this.emailService.sendPasswordReset({
        organizationId,
        toEmail: user.email,
        resetUrl: this.buildWebUrl(`/password-reset/confirm?token=${encodeURIComponent(rawToken)}`),
      });
    }

    return { message: PASSWORD_RESET_GENERIC_MESSAGE };
  }

  async confirmPasswordReset(dto: PasswordResetConfirmDto) {
    const token = await this.authTokenService.getTokenForUse(dto.token, AuthTokenPurpose.PASSWORD_RESET);
    if (!token.userId) {
      throw new BadRequestException("Invalid password reset token.");
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: token.userId! },
        data: { passwordHash },
      });
      await this.authTokenService.consume(token.id, tx);
    });

    return { message: "Password has been reset." };
  }

  cleanupExpiredTokens(organizationId: string) {
    return this.authTokenService.cleanupExpiredUnconsumed(organizationId, 30);
  }

  private signAccessToken(userId: string, email: string): Promise<string> {
    return this.jwtService.signAsync(
      { sub: userId, email },
      {
        secret: this.config.get<string>("JWT_SECRET") ?? "dev-only-secret",
        expiresIn: (this.config.get<string>("JWT_EXPIRES_IN") ?? "7d") as never,
      },
    );
  }

  private async getInvitationContext(organizationId?: string | null, userId?: string | null) {
    if (!organizationId || !userId) {
      return null;
    }

    const member = await this.prisma.organizationMember.findFirst({
      where: { organizationId, userId },
      select: {
        organization: { select: { id: true, name: true } },
        role: { select: { id: true, name: true } },
      },
    });

    return member;
  }

  private buildWebUrl(path: string): string {
    const baseUrl = this.config.get<string>("APP_WEB_URL")?.trim() || "http://localhost:3000";
    return `${baseUrl.replace(/\/$/, "")}${path}`;
  }
}
