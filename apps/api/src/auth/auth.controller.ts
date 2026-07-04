import { Body, Controller, Get, HttpException, HttpStatus, Param, Post, Req, Res, UnauthorizedException, UseGuards } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PERMISSIONS } from "@ledgerbyte/shared";
import type { Request, Response } from "express";
import { clearAuthCookies, extractAuthCookieToken, setAuthCookies } from "./auth-cookie";
import { CurrentUser } from "./decorators/current-user.decorator";
import { AuthenticatedUser } from "./auth.types";
import { AuthService } from "./auth.service";
import { CurrentOrganizationId } from "./decorators/current-organization.decorator";
import { RequirePermissions } from "./decorators/require-permissions.decorator";
import { AcceptInvitationDto } from "./dto/accept-invitation.dto";
import { LoginDto } from "./dto/login.dto";
import { PasswordResetConfirmDto } from "./dto/password-reset-confirm.dto";
import { PasswordResetRequestDto } from "./dto/password-reset-request.dto";
import { RegisterDto } from "./dto/register.dto";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { getLoginClientIp, LoginThrottleService } from "./login-throttle.service";
import { OrganizationContextGuard } from "./guards/organization-context.guard";
import { PermissionGuard } from "./guards/permission.guard";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
    private readonly loginThrottleService: LoginThrottleService,
  ) {}

  @Post("register")
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) response: Response) {
    const result = await this.authService.register(dto);
    setAuthCookies(response, this.config, result.accessToken);
    return result;
  }

  @Post("login")
  async login(@Body() dto: LoginDto, @Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const ipAddress = getLoginClientIp(request, readTrustProxyHeaders(this.config));
    const throttle = await this.loginThrottleService.assertLoginAllowed({ email: dto.email, ipAddress });
    if (!throttle.allowed) {
      response.setHeader("Retry-After", String(throttle.retryAfterSeconds));
      throw new HttpException("Too many login attempts. Please try again later.", HttpStatus.TOO_MANY_REQUESTS);
    }

    let result: Awaited<ReturnType<AuthService["login"]>>;
    try {
      result = await this.authService.login(dto);
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        await this.loginThrottleService.recordFailedLogin({ email: dto.email, ipAddress });
        throw new UnauthorizedException("Invalid email or password.");
      }
      throw error;
    }

    await this.loginThrottleService.resetSuccessfulLogin({ email: dto.email, ipAddress });
    setAuthCookies(response, this.config, result.accessToken);
    return result;
  }

  @Get("invitations/:token/preview")
  previewInvitation(@Param("token") token: string) {
    return this.authService.previewInvitation(token);
  }

  @Post("invitations/:token/accept")
  async acceptInvitation(@Param("token") token: string, @Body() dto: AcceptInvitationDto, @Res({ passthrough: true }) response: Response) {
    const result = await this.authService.acceptInvitation(token, dto);
    setAuthCookies(response, this.config, result.accessToken);
    return result;
  }

  @Post("password-reset/request")
  requestPasswordReset(@Body() dto: PasswordResetRequestDto, @Req() request: Request) {
    return this.authService.requestPasswordReset(dto, getRequestMeta(request));
  }

  @Post("password-reset/confirm")
  confirmPasswordReset(@Body() dto: PasswordResetConfirmDto) {
    return this.authService.confirmPasswordReset(dto);
  }

  @Post("tokens/cleanup-expired")
  @UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionGuard)
  @RequirePermissions(PERMISSIONS.users.manage)
  cleanupExpiredTokens(@CurrentOrganizationId() organizationId: string) {
    return this.authService.cleanupExpiredTokens(organizationId);
  }

  @Post("logout")
  async logout(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const token = extractRequestAuthToken(request, this.config);
    if (token) {
      await this.authService.logout(token);
    }
    clearAuthCookies(response, this.config);
    return { message: "Logged out." };
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.me(user.id);
  }
}

function getRequestMeta(request: Request) {
  return {
    ipAddress: getClientIp(request),
    userAgent: typeof request.headers["user-agent"] === "string" ? request.headers["user-agent"] : null,
  };
}

function getClientIp(request: Request): string | null {
  const forwardedFor = request.headers["x-forwarded-for"];
  if (typeof forwardedFor === "string" && forwardedFor.trim()) {
    return forwardedFor.split(",")[0]?.trim() || null;
  }
  if (Array.isArray(forwardedFor) && forwardedFor[0]) {
    return forwardedFor[0].split(",")[0]?.trim() || null;
  }
  return request.ip ?? request.socket.remoteAddress ?? null;
}

function readTrustProxyHeaders(config: ConfigService): boolean {
  return config.get<string>("LOGIN_TRUST_PROXY_HEADERS")?.toLowerCase() === "true";
}

function extractRequestAuthToken(request: Request, config: ConfigService): string | null {
  const authorization = request.headers.authorization;
  if (authorization?.startsWith("Bearer ")) {
    return authorization.slice("Bearer ".length);
  }

  return extractAuthCookieToken(request, config);
}
