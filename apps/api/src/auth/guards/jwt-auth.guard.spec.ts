import type { ExecutionContext } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { JwtService } from "@nestjs/jwt";
import { JwtAuthGuard } from "./jwt-auth.guard";

function contextFor(request: Record<string, unknown>) {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as unknown as ExecutionContext;
}

function makeGuard(payload: { sub: string; email: string; jti?: string } = { sub: "user-1", email: "user@example.com", jti: "session-jti" }) {
  const jwtService = {
    verifyAsync: jest.fn().mockResolvedValue(payload),
  } as unknown as JwtService;
  const config = {
    get: jest.fn((key: string) => {
      if (key === "JWT_SECRET") {
        return "test-secret-with-enough-length";
      }
      if (key === "APP_ENV") {
        return "test";
      }
      return undefined;
    }),
  } as unknown as ConfigService;

  const authSessionService = {
    assertActiveSession: jest.fn().mockResolvedValue({ id: "session-1", userId: "user-1" }),
  };

  return { guard: new JwtAuthGuard(jwtService, config, authSessionService as never), jwtService, authSessionService };
}

describe("JwtAuthGuard", () => {
  it("accepts bearer tokens for non-browser clients", async () => {
    const { guard, jwtService, authSessionService } = makeGuard();
    const request = { headers: { authorization: "Bearer bearer-token" } };

    await expect(guard.canActivate(contextFor(request))).resolves.toBe(true);

    expect(jwtService.verifyAsync).toHaveBeenCalledWith("bearer-token", expect.any(Object));
    expect(authSessionService.assertActiveSession).toHaveBeenCalledWith({ userId: "user-1", jti: "session-jti" });
    expect(request).toMatchObject({
      user: { id: "user-1", email: "user@example.com" },
      authTokenSource: "bearer",
      authSessionId: "session-1",
    });
  });

  it("accepts auth cookie tokens for browser sessions", async () => {
    const { guard, jwtService, authSessionService } = makeGuard();
    const request = { headers: { cookie: "ledgerbyte_auth=cookie-token" } };

    await expect(guard.canActivate(contextFor(request))).resolves.toBe(true);

    expect(jwtService.verifyAsync).toHaveBeenCalledWith("cookie-token", expect.any(Object));
    expect(authSessionService.assertActiveSession).toHaveBeenCalledWith({ userId: "user-1", jti: "session-jti" });
    expect(request).toMatchObject({
      user: { id: "user-1", email: "user@example.com" },
      authTokenSource: "cookie",
      authSessionId: "session-1",
    });
  });

  it("rejects requests without a bearer token or auth cookie", async () => {
    const { guard } = makeGuard();

    await expect(guard.canActivate(contextFor({ headers: {} }))).rejects.toThrow("Missing authentication token.");
  });

  it("rejects invalid tokens", async () => {
    const { guard, jwtService } = makeGuard();
    jest.mocked(jwtService.verifyAsync).mockRejectedValueOnce(new Error("bad token"));

    await expect(
      guard.canActivate(contextFor({ headers: { cookie: "ledgerbyte_auth=bad-token" } })),
    ).rejects.toThrow("Invalid or expired token.");
  });

  it("rejects tokens that do not include a jti session identifier", async () => {
    const { guard } = makeGuard({ sub: "user-1", email: "user@example.com" });

    await expect(
      guard.canActivate(contextFor({ headers: { authorization: "Bearer legacy-token" } })),
    ).rejects.toThrow("Invalid or expired token.");
  });

  it("rejects tokens when the durable session is revoked, expired, or missing", async () => {
    const { guard, authSessionService } = makeGuard();
    authSessionService.assertActiveSession.mockRejectedValueOnce(new Error("revoked"));

    await expect(
      guard.canActivate(contextFor({ headers: { authorization: "Bearer revoked-token" } })),
    ).rejects.toThrow("Invalid or expired token.");
  });
});
