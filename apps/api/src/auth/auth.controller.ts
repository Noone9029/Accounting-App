import { Body, Controller, Get, Param, Post, Req, UseGuards } from "@nestjs/common";
import { PERMISSIONS } from "@ledgerbyte/shared";
import type { Request } from "express";
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
import { OrganizationContextGuard } from "./guards/organization-context.guard";
import { PermissionGuard } from "./guards/permission.guard";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("register")
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post("login")
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get("invitations/:token/preview")
  previewInvitation(@Param("token") token: string) {
    return this.authService.previewInvitation(token);
  }

  @Post("invitations/:token/accept")
  acceptInvitation(@Param("token") token: string, @Body() dto: AcceptInvitationDto) {
    return this.authService.acceptInvitation(token, dto);
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
