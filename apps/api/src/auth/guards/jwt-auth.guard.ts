import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import type { AuthenticatedRequest } from "../auth.types";
import { extractAuthCookieToken } from "../auth-cookie";
import { AuthSessionService } from "../auth-session.service";
import { readJwtSecret } from "../jwt-secret";

interface JwtPayload {
  sub: string;
  email: string;
  jti?: string;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly authSessionService: AuthSessionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authorization = request.headers.authorization;
    const bearerToken = authorization?.startsWith("Bearer ") ? authorization.slice("Bearer ".length) : null;
    const cookieToken = bearerToken ? null : extractAuthCookieToken(request, this.config);
    const token = bearerToken ?? cookieToken;

    if (!token) {
      throw new UnauthorizedException("Missing authentication token.");
    }

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: readJwtSecret(this.config),
      });
      if (!payload.jti) {
        throw new UnauthorizedException("Invalid or expired token.");
      }

      const session = await this.authSessionService.assertActiveSession({ userId: payload.sub, jti: payload.jti });
      request.user = { id: payload.sub, email: payload.email };
      request.authTokenSource = bearerToken ? "bearer" : "cookie";
      request.authSessionId = session.id;
      return true;
    } catch {
      throw new UnauthorizedException("Invalid or expired token.");
    }
  }
}
