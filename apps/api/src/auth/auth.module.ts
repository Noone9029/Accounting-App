import { Global, Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { AuditLogModule } from "../audit-log/audit-log.module";
import { AuthSessionService } from "./auth-session.service";
import { AuthTokenRateLimitService } from "./auth-token-rate-limit.service";
import { AuthTokenService } from "./auth-token.service";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { LoginThrottleService } from "./login-throttle.service";
import { OrganizationContextGuard } from "./guards/organization-context.guard";
import { PermissionGuard } from "./guards/permission.guard";
import { SecurityMaintenanceService } from "./security-maintenance.service";

@Global()
@Module({
  imports: [ConfigModule, JwtModule.register({}), AuditLogModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthSessionService,
    AuthTokenService,
    AuthTokenRateLimitService,
    LoginThrottleService,
    SecurityMaintenanceService,
    JwtAuthGuard,
    OrganizationContextGuard,
    PermissionGuard,
  ],
  exports: [
    JwtModule,
    AuthSessionService,
    AuthTokenService,
    AuthTokenRateLimitService,
    SecurityMaintenanceService,
    JwtAuthGuard,
    OrganizationContextGuard,
    PermissionGuard,
  ],
})
export class AuthModule {}
