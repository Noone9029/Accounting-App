import { Global, Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { AuthTokenRateLimitService } from "./auth-token-rate-limit.service";
import { AuthTokenService } from "./auth-token.service";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { OrganizationContextGuard } from "./guards/organization-context.guard";
import { PermissionGuard } from "./guards/permission.guard";

@Global()
@Module({
  imports: [ConfigModule, JwtModule.register({})],
  controllers: [AuthController],
  providers: [AuthService, AuthTokenService, AuthTokenRateLimitService, JwtAuthGuard, OrganizationContextGuard, PermissionGuard],
  exports: [JwtModule, AuthTokenService, AuthTokenRateLimitService, JwtAuthGuard, OrganizationContextGuard, PermissionGuard],
})
export class AuthModule {}
