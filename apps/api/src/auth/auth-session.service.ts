import { UnauthorizedException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHash, randomUUID } from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import { readJwtSecret } from "./jwt-secret";

const DEFAULT_JWT_EXPIRES_IN = "7d";
const DEFAULT_JWT_EXPIRES_IN_MS = 7 * 24 * 60 * 60 * 1000;

export type JwtSessionRecord = {
  id: string;
  userId: string;
};

export type CreateJwtSessionInput = {
  userId: string;
  expiresAt: Date;
};

export type CreateJwtSessionResult = {
  jti: string;
  expiresAt: Date;
};

export type TokenSessionInput = {
  userId: string;
  jti: string;
};

@Injectable()
export class AuthSessionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async createForJwt(input: CreateJwtSessionInput): Promise<CreateJwtSessionResult> {
    const jti = randomUUID();
    await this.prisma.authSession.create({
      data: {
        userId: input.userId,
        jtiHash: this.hashJti(jti),
        expiresAt: input.expiresAt,
      },
    });

    return { jti, expiresAt: input.expiresAt };
  }

  async assertActiveSession(input: TokenSessionInput): Promise<JwtSessionRecord> {
    const session = await this.prisma.authSession.findUnique({
      where: { jtiHash: this.hashJti(input.jti) },
      select: {
        id: true,
        userId: true,
        expiresAt: true,
        revokedAt: true,
      },
    });

    if (!session || session.userId !== input.userId || session.revokedAt || session.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException("Invalid or expired token.");
    }

    return { id: session.id, userId: session.userId };
  }

  async revokeSession(input: TokenSessionInput & { reason: string }): Promise<{ revoked: boolean }> {
    const session = await this.prisma.authSession.findUnique({
      where: { jtiHash: this.hashJti(input.jti) },
      select: {
        id: true,
        userId: true,
        revokedAt: true,
      },
    });

    if (!session || session.userId !== input.userId || session.revokedAt) {
      return { revoked: false };
    }

    await this.prisma.authSession.update({
      where: { jtiHash: this.hashJti(input.jti) },
      data: {
        revokedAt: new Date(),
        revokedReason: input.reason,
      },
    });

    return { revoked: true };
  }

  private hashJti(jti: string): string {
    const pepper = this.config.get<string>("AUTH_SESSION_PEPPER")?.trim() || readJwtSecret(this.config);
    return createHash("sha256").update(`${pepper}:auth-session:${jti}`).digest("hex");
  }
}

export function readJwtExpiresIn(config: ConfigService): string {
  return config.get<string>("JWT_EXPIRES_IN")?.trim() || DEFAULT_JWT_EXPIRES_IN;
}

export function calculateJwtExpiresAt(config: ConfigService, now = new Date()): Date {
  return new Date(now.getTime() + parseDurationMs(readJwtExpiresIn(config), DEFAULT_JWT_EXPIRES_IN_MS));
}

function parseDurationMs(value: string, fallback: number): number {
  const match = /^(\d+)(ms|s|m|h|d)?$/.exec(value.trim());
  if (!match) {
    return fallback;
  }

  const amount = Number(match[1]);
  const unit = match[2] ?? "s";
  const multipliers: Record<string, number> = {
    ms: 1,
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  return amount * (multipliers[unit] ?? fallback);
}
