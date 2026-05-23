import {
  buildFixturePlan,
  buildJsonSummary,
  classifyDatabaseUrl,
  classifyHttpUrl,
  redactSecrets,
  renderFixturePlan,
} from "./dev04-fixture-runner";

describe("DEV-04 fixture runner dry-run skeleton", () => {
  const markersByFamily = {
    ar: "DEV03-AR-20260524T120000",
    ap: "DEV03-AP-20260524T120000",
    bank: "DEV03-BANK-20260524T120000",
    inv: "DEV03-INV-20260524T120000",
    jrd: "DEV03-JRD-20260524T120000",
  } as const;

  it.each(Object.entries(markersByFamily))("builds a dry-run plan for %s", (family, marker) => {
    const plan = buildFixturePlan(["--dry-run", "--family", family, "--marker", marker]);

    expect(plan.mode).toBe("dry-run");
    expect(plan.family).toBe(family);
    expect(plan.marker).toBe(marker);
    expect(plan.createdFixtureData).toBe(false);
    expect(plan.mutationEnabled).toBe(false);
    expect(plan.loginEnabled).toBe(false);
    expect(plan.families).toHaveLength(1);
    expect(plan.families[0]?.family).toBe(family);
    expect(renderFixturePlan(plan)).toContain("No fixture data was created.");
  });

  it("builds an all-family plan without requiring a database connection", () => {
    const plan = buildFixturePlan(["--plan", "--family", "all", "--marker", "DEV04-20260524T120000"]);

    expect(plan.mode).toBe("plan");
    expect(plan.family).toBe("all");
    expect(plan.databaseTarget.kind).toBe("not-provided");
    expect(plan.apiTarget.kind).toBe("not-provided");
    expect(plan.families.map((entry) => entry.family)).toEqual(["ar", "ap", "bank", "inv", "jrd"]);
  });

  it("rejects invalid families", () => {
    expect(() => buildFixturePlan(["--dry-run", "--family", "payroll", "--marker", "DEV03-AR-20260524T120000"])).toThrow(
      /Invalid fixture family/,
    );
  });

  it("rejects missing, malformed, and mismatched markers", () => {
    expect(() => buildFixturePlan(["--dry-run", "--family", "ar"])).toThrow(/marker is required/i);
    expect(() => buildFixturePlan(["--dry-run", "--family", "ar", "--marker", "AR-20260524T120000"])).toThrow(/DEV03- or DEV04-/);
    expect(() => buildFixturePlan(["--dry-run", "--family", "ar", "--marker", "DEV03-AP-20260524T120000"])).toThrow(
      /does not match family ar/,
    );
  });

  it("rejects production, beta, and hosted targets before planning", () => {
    expect(() =>
      buildFixturePlan([
        "--dry-run",
        "--family",
        "ar",
        "--marker",
        "DEV03-AR-20260524T120000",
        "--database-url",
        "postgresql://user:secret@db.example.supabase.co:5432/postgres",
      ]),
    ).toThrow(/hosted or forbidden/i);

    expect(() =>
      buildFixturePlan([
        "--dry-run",
        "--family",
        "ar",
        "--marker",
        "DEV03-AR-20260524T120000",
        "--api-url",
        "https://ledgerbyte-api-test.vercel.app",
      ]),
    ).toThrow(/hosted or forbidden/i);
  });

  it("accepts obvious local targets for plan and dry-run modes only", () => {
    const databaseTarget = classifyDatabaseUrl("postgresql://accounting:secret@host.docker.internal:5432/accounting?schema=public");
    const apiTarget = classifyHttpUrl("http://localhost:4000");

    expect(databaseTarget).toMatchObject({ kind: "local-plan-only", host: "host.docker.internal" });
    expect(apiTarget).toMatchObject({ kind: "local-plan-only", host: "localhost" });
    expect(JSON.stringify(databaseTarget)).not.toContain("secret");
  });

  it("rejects execute mode even with local mutation approval", () => {
    expect(() =>
      buildFixturePlan([
        "--execute",
        "--allow-local-mutation",
        "--family",
        "ar",
        "--marker",
        "DEV03-AR-20260524T120000",
        "--database-url",
        "postgresql://accounting:secret@localhost:5432/accounting",
      ]),
    ).toThrow(/execute mode is not implemented/i);
  });

  it("produces a sanitized JSON summary", () => {
    const plan = buildFixturePlan(["--dry-run", "--family", "bank", "--marker", "DEV03-BANK-20260524T120000", "--json-summary"]);
    const summary = buildJsonSummary(plan);

    expect(summary).toMatchObject({
      mode: "dry-run",
      family: "bank",
      marker: "DEV03-BANK-20260524T120000",
      createdFixtureData: false,
      mutationEnabled: false,
      loginEnabled: false,
    });
    expect(JSON.stringify(summary)).not.toMatch(/password|token|cookie|Authorization|DATABASE_URL|secret/i);
  });

  it("redacts secret-looking keys and connection strings", () => {
    const redacted = redactSecrets({
      DATABASE_URL: "postgresql://user:secret@localhost:5432/accounting",
      Authorization: "Bearer token-value",
      nested: {
        token: "token-value",
        safeMarker: "DEV03-AR-20260524T120000",
      },
    });

    const serialized = JSON.stringify(redacted);
    expect(serialized).toContain("DEV03-AR-20260524T120000");
    expect(serialized).not.toContain("secret");
    expect(serialized).not.toContain("token-value");
    expect(serialized).not.toContain("user:secret");
  });

  it("rejects destructive operation terms in CLI args", () => {
    expect(() => buildFixturePlan(["--dry-run", "--family", "ar", "--marker", "DEV03-AR-20260524T120000", "seed"])).toThrow(
      /destructive or forbidden/,
    );
  });
});
