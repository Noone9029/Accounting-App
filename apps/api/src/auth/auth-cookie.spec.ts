import { ForbiddenException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  createCsrfToken,
  extractAuthCookieToken,
  readAuthCookieSettings,
  setAuthCookies,
  validateCsrfRequest,
} from "./auth-cookie";

function config(values: Record<string, string | undefined>) {
  return {
    get: jest.fn((key: string) => values[key]),
  } as unknown as ConfigService;
}

describe("auth cookie helpers", () => {
  it("uses cross-site-compatible secure cookies by default in production", () => {
    const settings = readAuthCookieSettings(
      config({
        APP_ENV: "production",
        JWT_EXPIRES_IN: "2h",
      }),
    );

    expect(settings.authCookieName).toBe("ledgerbyte_auth");
    expect(settings.csrfCookieName).toBe("ledgerbyte_csrf");
    expect(settings.csrfHeaderName).toBe("x-csrf-token");
    expect(settings.authCookieOptions).toEqual(
      expect.objectContaining({
        httpOnly: true,
        secure: true,
        sameSite: "none",
        path: "/",
        maxAge: 2 * 60 * 60 * 1000,
      }),
    );
    expect(settings.csrfCookieOptions).toEqual(
      expect.objectContaining({
        httpOnly: false,
        secure: true,
        sameSite: "none",
        path: "/",
      }),
    );
  });

  it("respects an explicit production SameSite policy", () => {
    const settings = readAuthCookieSettings(
      config({
        APP_ENV: "production",
        AUTH_COOKIE_SAME_SITE: "lax",
      }),
    );

    expect(settings.authCookieOptions).toEqual(expect.objectContaining({ secure: true, sameSite: "lax" }));
    expect(settings.csrfCookieOptions).toEqual(expect.objectContaining({ secure: true, sameSite: "lax" }));
  });

  it("emits secure host-only auth and CSRF cookies for cross-site production clients", () => {
    const response = { cookie: jest.fn() };

    setAuthCookies(response as never, config({ APP_ENV: "production" }), "jwt-fixture");

    expect(response.cookie).toHaveBeenCalledWith(
      "ledgerbyte_auth",
      "jwt-fixture",
      expect.objectContaining({ httpOnly: true, secure: true, sameSite: "none", path: "/" }),
    );
    expect(response.cookie).toHaveBeenCalledWith(
      "ledgerbyte_csrf",
      expect.any(String),
      expect.objectContaining({ httpOnly: false, secure: true, sameSite: "none", path: "/" }),
    );
    for (const [, , options] of response.cookie.mock.calls) {
      expect(options).not.toHaveProperty("domain");
    }
  });

  it("rejects insecure production auth cookie configuration", () => {
    expect(() =>
      readAuthCookieSettings(
        config({
          APP_ENV: "production",
          AUTH_COOKIE_SECURE: "false",
        }),
      ),
    ).toThrow("AUTH_COOKIE_SECURE=false is not allowed outside development and test.");
  });

  it("extracts the JWT from the configured auth cookie", () => {
    const request = {
      headers: {
        cookie: "other=value; ledgerbyte_auth=jwt-token; ledgerbyte_csrf=csrf-token",
      },
    };

    expect(extractAuthCookieToken(request, config({ APP_ENV: "test" }))).toBe("jwt-token");
  });

  it("requires matching double-submit CSRF values for unsafe cookie-authenticated requests", () => {
    const request = {
      method: "POST",
      path: "/sales-invoices",
      headers: {
        cookie: "ledgerbyte_auth=jwt-token; ledgerbyte_csrf=csrf-token",
      },
    };

    expect(() => validateCsrfRequest(request, config({ APP_ENV: "test" }))).toThrow(
      new ForbiddenException("Invalid CSRF token."),
    );

    expect(() =>
      validateCsrfRequest(
        {
          ...request,
          headers: {
            ...request.headers,
            "x-csrf-token": "csrf-token",
          },
        },
        config({ APP_ENV: "test" }),
      ),
    ).not.toThrow();
  });

  it("does not require CSRF for bearer-token requests", () => {
    expect(() =>
      validateCsrfRequest(
        {
          method: "POST",
          path: "/sales-invoices",
          headers: {
            authorization: "Bearer jwt-token",
            cookie: "ledgerbyte_auth=jwt-token",
          },
        },
        config({ APP_ENV: "test" }),
      ),
    ).not.toThrow();
  });

  it("creates non-empty unpredictable CSRF tokens", () => {
    const first = createCsrfToken();
    const second = createCsrfToken();

    expect(first).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(second).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(first).not.toBe(second);
  });
});
