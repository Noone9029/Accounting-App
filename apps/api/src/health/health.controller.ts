import { Controller, Get, Res } from "@nestjs/common";
import type { Response } from "express";
import { PrismaService } from "../prisma/prisma.service";

const SAFE_ENVIRONMENTS = new Set(["development", "test", "production"]);

function safeEnvironment() {
  const value = (process.env.APP_ENV ?? process.env.NODE_ENV ?? "").trim().toLowerCase();
  return SAFE_ENVIRONMENTS.has(value) ? value : "unknown";
}

@Controller()
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  getRoot() {
    return {
      service: "LedgerByte API",
      status: "ok",
      healthUrl: "/health",
      readinessUrl: "/readiness",
      docs: {
        deployment: "docs/DEPLOYMENT_VERCEL_SUPABASE.md",
      },
      environment: safeEnvironment(),
      timestamp: new Date().toISOString(),
    };
  }

  @Get("health")
  getHealth() {
    return { status: "ok", service: "api" };
  }

  @Get("readiness")
  async getReadiness(@Res({ passthrough: true }) response: Response) {
    const timestamp = new Date().toISOString();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        service: "LedgerByte API",
        status: "ok",
        checks: {
          database: "ok",
        },
        timestamp,
      };
    } catch {
      response.status(503);
      return {
        service: "LedgerByte API",
        status: "unavailable",
        checks: {
          database: "unavailable",
        },
        timestamp,
      };
    }
  }
}
