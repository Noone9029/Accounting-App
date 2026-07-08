import { createCsrfProtectionMiddleware, createSecurityHeadersMiddleware, isCorsOriginAllowed, readCorsOrigin } from "./app-bootstrap";

describe("app bootstrap", () => {
  it("defaults CORS to localhost web development", () => {
    expect(readCorsOrigin(undefined)).toBe("http://localhost:3000");
  });

  it("rejects wildcard CORS outside development and test when credentials are enabled", () => {
    expect(() => readCorsOrigin("*", "production")).toThrow("Wildcard CORS origins are not allowed");
  });

  it("allows comma-separated exact and wildcard Vercel origins", () => {
    expect(isCorsOriginAllowed("https://ledgerbyte-web.vercel.app", "https://*.vercel.app")).toBe(true);
    expect(isCorsOriginAllowed("https://ledgerbyte.example.com", "https://ledgerbyte.example.com")).toBe(true);
    expect(isCorsOriginAllowed("https://example.com.evil.test", "https://*.vercel.app")).toBe(false);
  });

  it("installs baseline security headers through the bootstrap middleware", () => {
    const middleware = expect.any(Function);
    const observabilityContext = { run: jest.fn((_context: unknown, callback: () => void) => callback()) };
    const app = {
      get: jest.fn((token: unknown) => {
        const tokenName = typeof token === "function" ? token.name : String(token);
        return tokenName === "ObservabilityContextService" ? observabilityContext : { get: jest.fn() };
      }),
      enableCors: jest.fn(),
      use: jest.fn(),
      useGlobalPipes: jest.fn(),
    };

    jest.isolateModules(() => {
      const { configureApp } = require("./app-bootstrap") as typeof import("./app-bootstrap");
      configureApp(app as never);
    });

    expect(app.use).toHaveBeenCalledWith(middleware);
    const securityMiddleware = app.use.mock.calls.find(([candidate]) => {
      const response = { setHeader: jest.fn() };
      const next = jest.fn();
      (candidate as (request: unknown, response: { setHeader: jest.Mock }, next: jest.Mock) => void)({ headers: {} }, response, next);
      return response.setHeader.mock.calls.some(([header]) => header === "X-Content-Type-Options");
    })?.[0] as (request: unknown, response: { setHeader: jest.Mock }, next: jest.Mock) => void;
    expect(securityMiddleware).toEqual(expect.any(Function));
    const response = { setHeader: jest.fn() };
    const next = jest.fn();

    securityMiddleware({}, response, next);

    expect(response.setHeader).toHaveBeenCalledWith("X-Content-Type-Options", "nosniff");
    expect(response.setHeader).toHaveBeenCalledWith("X-Frame-Options", "DENY");
    expect(response.setHeader).toHaveBeenCalledWith("Referrer-Policy", "no-referrer");
    expect(response.setHeader).toHaveBeenCalledWith("Content-Security-Policy", expect.stringContaining("default-src 'self'"));
    expect(next).toHaveBeenCalled();
  });

  it("adds HSTS outside development and test", () => {
    const response = { setHeader: jest.fn() };
    const next = jest.fn();

    createSecurityHeadersMiddleware("production")({}, response, next);

    expect(response.setHeader).toHaveBeenCalledWith("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    expect(next).toHaveBeenCalled();
  });

  it("rejects unsafe cookie-authenticated requests without a matching CSRF token", () => {
    const config = { get: jest.fn((key: string) => (key === "APP_ENV" ? "test" : undefined)) };
    const middleware = createCsrfProtectionMiddleware(config as never);
    const response = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    middleware(
      {
        method: "POST",
        path: "/sales-invoices",
        requestId: "req-csrf",
        headers: {
          cookie: "ledgerbyte_auth=jwt-token; ledgerbyte_csrf=csrf-token",
        },
      },
      response as never,
      next,
    );

    expect(response.status).toHaveBeenCalledWith(403);
    expect(response.json).toHaveBeenCalledWith({
      error: {
        code: "FORBIDDEN",
        message: "Invalid CSRF token.",
        statusCode: 403,
        requestId: "req-csrf",
      },
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("allows unsafe cookie-authenticated requests with a matching CSRF token", () => {
    const config = { get: jest.fn((key: string) => (key === "APP_ENV" ? "test" : undefined)) };
    const middleware = createCsrfProtectionMiddleware(config as never);
    const response = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    middleware(
      {
        method: "POST",
        path: "/sales-invoices",
        headers: {
          cookie: "ledgerbyte_auth=jwt-token; ledgerbyte_csrf=csrf-token",
          "x-csrf-token": "csrf-token",
        },
      },
      response as never,
      next,
    );

    expect(response.status).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });
});
