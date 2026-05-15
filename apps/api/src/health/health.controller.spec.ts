import type { Response } from "express";
import { HealthController } from "./health.controller";

describe("HealthController", () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns safe root status without secret-like fields", () => {
    process.env = { ...originalEnv, APP_ENV: "test", DATABASE_URL: "postgres://secret", JWT_SECRET: "secret" };
    const controller = new HealthController({ $queryRaw: jest.fn() } as never);

    const result = controller.getRoot();
    const serialized = JSON.stringify(result);

    expect(result.service).toBe("LedgerByte API");
    expect(result.status).toBe("ok");
    expect(result.healthUrl).toBe("/health");
    expect(result.readinessUrl).toBe("/readiness");
    expect(result.docs).toEqual({ deployment: "docs/DEPLOYMENT_VERCEL_SUPABASE.md" });
    expect(result.environment).toBe("test");
    expect(result.timestamp).toEqual(expect.any(String));
    expect(serialized).not.toContain("DATABASE_URL");
    expect(serialized).not.toContain("JWT_SECRET");
    expect(serialized).not.toContain("postgres://secret");
    expect(serialized).not.toContain("secret");
  });

  it("keeps the lightweight health response stable", () => {
    const controller = new HealthController({ $queryRaw: jest.fn() } as never);

    expect(controller.getHealth()).toEqual({ status: "ok", service: "api" });
  });

  it("returns readiness ok when the database check succeeds", async () => {
    const controller = new HealthController({ $queryRaw: jest.fn().mockResolvedValue([{ "?column?": 1 }]) } as never);
    const response = { status: jest.fn() } as unknown as Response;

    await expect(controller.getReadiness(response)).resolves.toMatchObject({
      service: "LedgerByte API",
      status: "ok",
      checks: { database: "ok" },
      timestamp: expect.any(String),
    });
    expect(response.status).not.toHaveBeenCalled();
  });

  it("returns readiness unavailable safely when the database check fails", async () => {
    const controller = new HealthController({ $queryRaw: jest.fn().mockRejectedValue(new Error("connection failed with secret")) } as never);
    const response = { status: jest.fn() } as unknown as Response;

    const result = await controller.getReadiness(response);

    expect(response.status).toHaveBeenCalledWith(503);
    expect(result).toMatchObject({
      service: "LedgerByte API",
      status: "unavailable",
      checks: { database: "unavailable" },
      timestamp: expect.any(String),
    });
    expect(JSON.stringify(result)).not.toContain("connection failed");
    expect(JSON.stringify(result)).not.toContain("secret");
  });
});
