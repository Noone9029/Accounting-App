import { ConfigService } from "@nestjs/config";
import { UnauthorizedException } from "@nestjs/common";
import type { Response } from "express";
import { AuthController } from "./auth.controller";
import type { AuthService } from "./auth.service";

function config() {
  return {
    get: jest.fn((key: string) => {
      if (key === "APP_ENV") {
        return "test";
      }
      return undefined;
    }),
  } as unknown as ConfigService;
}

function response() {
  return {
    cookie: jest.fn(),
    clearCookie: jest.fn(),
    setHeader: jest.fn(),
  } as unknown as Response & { cookie: jest.Mock; clearCookie: jest.Mock };
}

function request() {
  return {
    headers: {},
    ip: "203.0.113.10",
    socket: { remoteAddress: "203.0.113.11" },
  };
}

function requestWithBearer() {
  return {
    headers: { authorization: "Bearer bearer-token" },
    ip: "203.0.113.10",
    socket: { remoteAddress: "203.0.113.11" },
  };
}

function requestWithCookie() {
  return {
    headers: { cookie: "ledgerbyte_auth=cookie-token; ledgerbyte_csrf=csrf-token" },
    ip: "203.0.113.10",
    socket: { remoteAddress: "203.0.113.11" },
  };
}

function loginThrottle(overrides: Partial<{
  assertLoginAllowed: jest.Mock;
  recordFailedLogin: jest.Mock;
  resetSuccessfulLogin: jest.Mock;
}> = {}) {
  return {
    assertLoginAllowed: jest.fn().mockResolvedValue({ allowed: true }),
    recordFailedLogin: jest.fn().mockResolvedValue(undefined),
    resetSuccessfulLogin: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("AuthController cookie sessions", () => {
  it("sets an httpOnly auth cookie and readable CSRF cookie on login", async () => {
    const authService = {
      login: jest.fn().mockResolvedValue({
        user: { id: "user-1", email: "user@example.com" },
        accessToken: "jwt-token",
      }),
    } as unknown as AuthService;
    const throttle = loginThrottle();
    const controller = new AuthController(authService, config(), throttle as never);
    const res = response();

    await controller.login({ email: "user@example.com", password: "Password123!" }, request() as never, res);

    expect(res.cookie).toHaveBeenCalledWith(
      "ledgerbyte_auth",
      "jwt-token",
      expect.objectContaining({ httpOnly: true, sameSite: "lax", path: "/" }),
    );
    expect(res.cookie).toHaveBeenCalledWith(
      "ledgerbyte_csrf",
      expect.any(String),
      expect.objectContaining({ httpOnly: false, sameSite: "lax", path: "/" }),
    );
    expect(throttle.resetSuccessfulLogin).toHaveBeenCalledWith({
      email: "user@example.com",
      ipAddress: "203.0.113.10",
    });
  });

  it("revokes the current bearer session and clears auth and CSRF cookies on logout", async () => {
    const authService = {
      logout: jest.fn().mockResolvedValue({ revoked: true }),
    } as unknown as AuthService;
    const controller = new AuthController(authService, config(), loginThrottle() as never);
    const res = response();

    await expect(controller.logout(requestWithBearer() as never, res)).resolves.toEqual({ message: "Logged out." });

    expect(authService.logout).toHaveBeenCalledWith("bearer-token");
    expect(res.clearCookie).toHaveBeenCalledWith("ledgerbyte_auth", expect.objectContaining({ path: "/" }));
    expect(res.clearCookie).toHaveBeenCalledWith("ledgerbyte_csrf", expect.objectContaining({ path: "/" }));
  });

  it("clears cookies and returns the same logout response when no token is present", async () => {
    const authService = {
      logout: jest.fn(),
    } as unknown as AuthService;
    const controller = new AuthController(authService, config(), loginThrottle() as never);
    const res = response();

    await expect(controller.logout(request() as never, res)).resolves.toEqual({ message: "Logged out." });

    expect(authService.logout).not.toHaveBeenCalled();
    expect(res.clearCookie).toHaveBeenCalledWith("ledgerbyte_auth", expect.objectContaining({ path: "/" }));
    expect(res.clearCookie).toHaveBeenCalledWith("ledgerbyte_csrf", expect.objectContaining({ path: "/" }));
  });

  it("revokes the current cookie session on logout", async () => {
    const authService = {
      logout: jest.fn().mockResolvedValue({ revoked: true }),
    } as unknown as AuthService;
    const controller = new AuthController(authService, config(), loginThrottle() as never);
    const res = response();

    await expect(controller.logout(requestWithCookie() as never, res)).resolves.toEqual({ message: "Logged out." });

    expect(authService.logout).toHaveBeenCalledWith("cookie-token");
    expect(res.clearCookie).toHaveBeenCalledWith("ledgerbyte_auth", expect.objectContaining({ path: "/" }));
    expect(res.clearCookie).toHaveBeenCalledWith("ledgerbyte_csrf", expect.objectContaining({ path: "/" }));
  });

  it("records failed login attempts while keeping the invalid-credentials response generic", async () => {
    const authService = {
      login: jest.fn().mockRejectedValue(new UnauthorizedException("Invalid email or password.")),
    } as unknown as AuthService;
    const throttle = loginThrottle();
    const controller = new AuthController(authService, config(), throttle as never);

    await expect(
      controller.login({ email: "missing@example.com", password: "wrong-password" }, request() as never, response()),
    ).rejects.toThrow("Invalid email or password.");

    expect(throttle.recordFailedLogin).toHaveBeenCalledWith({
      email: "missing@example.com",
      ipAddress: "203.0.113.10",
    });
  });

  it("returns a generic 429 with Retry-After before password verification when throttled", async () => {
    const authService = {
      login: jest.fn(),
    } as unknown as AuthService;
    const throttle = loginThrottle({
      assertLoginAllowed: jest.fn().mockResolvedValue({
        allowed: false,
        retryAfterSeconds: 300,
        reason: "rate_limited",
      }),
    });
    const controller = new AuthController(authService, config(), throttle as never);
    const res = response();

    await expect(
      controller.login({ email: "unknown@example.com", password: "wrong-password" }, request() as never, res),
    ).rejects.toThrow("Too many login attempts. Please try again later.");

    expect(res.setHeader).toHaveBeenCalledWith("Retry-After", "300");
    expect(authService.login).not.toHaveBeenCalled();
    expect(throttle.recordFailedLogin).not.toHaveBeenCalled();
  });
});
