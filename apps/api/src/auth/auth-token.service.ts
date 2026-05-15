import { BadRequestException, Injectable } from "@nestjs/common";
import { AuthTokenPurpose } from "@prisma/client";
import { createHash, randomBytes } from "node:crypto";
import { PrismaService } from "../prisma/prisma.service";

const DEFAULT_TOKEN_BYTES = 32;

interface CreateAuthTokenInput {
  organizationId?: string | null;
  userId?: string | null;
  email: string;
  purpose: AuthTokenPurpose;
  expiresAt: Date;
  createdById?: string | null;
  consumeExistingForUser?: boolean;
}

@Injectable()
export class AuthTokenService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateAuthTokenInput, tx: AuthTokenClient = this.prisma) {
    const email = input.email.toLowerCase().trim();
    const rawToken = this.generateRawToken();
    const tokenHash = this.hashToken(rawToken);
    const now = new Date();

    if (input.consumeExistingForUser && input.userId) {
      await tx.authToken.updateMany({
        where: {
          userId: input.userId,
          purpose: input.purpose,
          consumedAt: null,
        },
        data: { consumedAt: now },
      });
    }

    const authToken = await tx.authToken.create({
      data: {
        organizationId: input.organizationId ?? null,
        userId: input.userId ?? null,
        email,
        purpose: input.purpose,
        tokenHash,
        expiresAt: input.expiresAt,
        createdById: input.createdById ?? null,
      },
    });

    return { rawToken, authToken };
  }

  async getTokenForUse(rawToken: string, purpose: AuthTokenPurpose, tx: AuthTokenClient = this.prisma) {
    const tokenHash = this.hashToken(rawToken);
    const authToken = await tx.authToken.findUnique({
      where: { tokenHash },
    });

    if (!authToken || authToken.purpose !== purpose) {
      throw new BadRequestException("Invalid or expired token.");
    }

    if (authToken.consumedAt) {
      throw new BadRequestException("This token has already been used.");
    }

    if (authToken.expiresAt.getTime() <= Date.now()) {
      throw new BadRequestException("This token has expired.");
    }

    return authToken;
  }

  async preview(rawToken: string, purpose: AuthTokenPurpose) {
    const authToken = await this.prisma.authToken.findUnique({
      where: { tokenHash: this.hashToken(rawToken) },
    });

    if (!authToken || authToken.purpose !== purpose) {
      return { valid: false as const, reason: "INVALID" as const, authToken: null };
    }

    if (authToken.consumedAt) {
      return { valid: false as const, reason: "CONSUMED" as const, authToken };
    }

    if (authToken.expiresAt.getTime() <= Date.now()) {
      return { valid: false as const, reason: "EXPIRED" as const, authToken };
    }

    return { valid: true as const, reason: null, authToken };
  }

  async consume(id: string, tx: AuthTokenClient = this.prisma) {
    return tx.authToken.update({
      where: { id },
      data: { consumedAt: new Date() },
    });
  }

  hashToken(rawToken: string): string {
    return createHash("sha256").update(rawToken, "utf8").digest("hex");
  }

  private generateRawToken(): string {
    return randomBytes(DEFAULT_TOKEN_BYTES).toString("base64url");
  }
}

type AuthTokenClient = Pick<PrismaService, "authToken">;
