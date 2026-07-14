import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ACCOUNTING_CLOSE_REVALIDATION_TRANSACTION_OPTIONS } from "./accounting-close/accounting-close-revalidation-transaction";

describe("API Vercel configuration", () => {
  it("configures the CLI fallback API entrypoint with the close revalidation request budget", () => {
    const config = JSON.parse(readFileSync(resolve(__dirname, "..", "..", "..", "vercel.api.json"), "utf8"));

    expect(config.functions?.["api/index.js"]).toMatchObject({
      maxDuration: 60,
    });
    expect(config.outputDirectory).toBe("apps/api/dist");
    expect(config).not.toHaveProperty("builds");
  });

  it("keeps the tracked root API deployment config on the supported functions model", () => {
    const config = JSON.parse(readFileSync(resolve(__dirname, "..", "..", "..", "vercel.json"), "utf8"));

    expect(config.functions?.["api/index.js"]).toMatchObject({
      maxDuration: 60,
    });
    expect(config.outputDirectory).toBe("apps/api/dist");
    expect(config).not.toHaveProperty("builds");
  });

  it("reserves a bounded 60-second request budget for accountant-close revalidation", () => {
    const config = JSON.parse(readFileSync(resolve(__dirname, "..", "vercel.json"), "utf8"));

    expect(config.functions?.["api/index.ts"]).toMatchObject({
      maxDuration: 60,
      memory: 1024,
    });
  });

  it("leaves response headroom after acquiring and running a close revalidation transaction", () => {
    const config = JSON.parse(readFileSync(resolve(__dirname, "..", "vercel.json"), "utf8"));
    const functionBudgetMs = config.functions["api/index.ts"].maxDuration * 1_000;

    expect(ACCOUNTING_CLOSE_REVALIDATION_TRANSACTION_OPTIONS.maxWait + ACCOUNTING_CLOSE_REVALIDATION_TRANSACTION_OPTIONS.timeout)
      .toBeLessThanOrEqual(functionBudgetMs - 10_000);
  });
});
