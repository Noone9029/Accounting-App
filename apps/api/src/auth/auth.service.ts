import { ConflictException, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import { PrismaService } from "../prisma/prisma.service";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
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

  private signAccessToken(userId: string, email: string): Promise<string> {
    return this.jwtService.signAsync(
      { sub: userId, email },
      {
        secret: this.config.get<string>("JWT_SECRET") ?? "dev-only-secret",
        expiresIn: (this.config.get<string>("JWT_EXPIRES_IN") ?? "7d") as never,
      },
    );
  }
}
