import { readFileSync } from "node:fs";
import { join } from "node:path";

const repoRoot = join(__dirname, "..", "..", "..");

const readJson = (path: string): { scripts?: Record<string, string> } =>
  JSON.parse(readFileSync(join(repoRoot, path), "utf8")) as { scripts?: Record<string, string> };

describe("accounting smoke phase scripts", () => {
  const rootPackage = readJson("package.json");
  const apiPackage = readJson("apps/api/package.json");
  const tailScript = readFileSync(join(repoRoot, "apps/api/scripts/smoke-accounting-tail.ts"), "utf8");
  const narrowPhases = ["ar", "ap", "documents", "reports", "zatca-safe"] as const;

  it("preserves the full smoke and banking smoke commands", () => {
    expect(rootPackage.scripts?.["smoke:accounting"]).toBe("corepack pnpm --filter @ledgerbyte/api smoke:accounting");
    expect(apiPackage.scripts?.["smoke:accounting"]).toBe("tsx scripts/smoke-accounting.ts");
    expect(rootPackage.scripts?.["smoke:accounting:banking"]).toBe("corepack pnpm --filter @ledgerbyte/api smoke:accounting:banking");
    expect(apiPackage.scripts?.["smoke:accounting:banking"]).toBe("tsx scripts/smoke-banking.ts");
  });

  it("exposes a bounded tail smoke command for deployed validation", () => {
    expect(rootPackage.scripts?.["smoke:accounting:tail"]).toBe("corepack pnpm --filter @ledgerbyte/api smoke:accounting:tail");
    expect(apiPackage.scripts?.["smoke:accounting:tail"]).toBe("tsx scripts/smoke-accounting-tail.ts");
  });

  it("exposes narrow deployed tail phase commands", () => {
    for (const phase of narrowPhases) {
      expect(rootPackage.scripts?.[`smoke:accounting:${phase}`]).toBe(
        `corepack pnpm --filter @ledgerbyte/api smoke:accounting:${phase}`,
      );
      expect(apiPackage.scripts?.[`smoke:accounting:${phase}`]).toBe(`tsx scripts/smoke-accounting-tail.ts --phase=${phase}`);
    }
  });

  it("keeps the aggregate tail command wired to the narrow phases in order", () => {
    expect(tailScript).toContain('const TAIL_PHASE_ORDER = ["ar", "ap", "documents", "reports", "zatca-safe"] as const;');
    for (const phase of narrowPhases) {
      expect(tailScript).toContain(`case "${phase}":`);
    }
    expect(tailScript).toContain("await runTailSmokePhase(narrowPhase);");
    expect(tailScript).toContain("parseTailSmokePhase(process.argv)");
  });

  it("keeps the tail phase on the deployed credential and timeout guardrails", () => {
    expect(tailScript).toContain("resolveTestCredentials");
    expect(tailScript).toContain('emailVar: "LEDGERBYTE_SMOKE_EMAIL"');
    expect(tailScript).toContain('passwordVar: "LEDGERBYTE_SMOKE_PASSWORD"');
    expect(tailScript).toContain("parseSmokeRequestTimeout(process.env.LEDGERBYTE_SMOKE_REQUEST_TIMEOUT_MS)");
    expect(tailScript).toContain("smokeProgressEnabled(process.env.LEDGERBYTE_SMOKE_PROGRESS)");
    expect(tailScript).toContain("fetchSmokeApi");
  });

  it("does not add secret-bearing tail phase logs", () => {
    const logLines = tailScript
      .split(/\r?\n/)
      .filter((line) => line.includes("console.log") || line.includes("console.error"));

    expect(logLines.join("\n")).not.toMatch(/Authorization|Bearer|password|token|DATABASE_URL|DIRECT_URL|service[_-]?role/i);
    expect(logLines.join("\n")).not.toContain("error.body");
    expect(tailScript).not.toContain("failed with ${response.status}: ${text}");
    expect(tailScript).toContain("safeRouteLabel(method, path)");
    expect(tailScript).toContain('safeRouteLabel("GET", path)');
  });

  it("keeps generated document archive lookups on the API sourceId contract", () => {
    expect(tailScript).toContain("document.sourceId === draftInvoice.id && document.status === \"GENERATED\"");
    expect(tailScript).toContain("documentType=SALES_INVOICE&sourceId=");
    expect(tailScript).not.toContain("documentType=SALES_INVOICE&entityId=");
  });

  it("keeps standalone documents purchase bill setup on the purchase bill DTO contract", () => {
    expect(tailScript).toMatch(
      /const draftPurchaseBill = await post<PurchaseBill>\("\/purchase-bills", headers, \{\s+supplierId: supplier\.id,\s+billDate: new Date\(\)\.toISOString\(\),/s,
    );
  });
});
