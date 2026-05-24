import {
  buildFixturePlan,
  buildJsonSummary,
  classifyDatabaseUrl,
  classifyHttpUrl,
  redactSecrets,
  renderFixturePlan,
  runFixtureRunner,
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
    expect(plan.fixtureCreationEnabled).toBe(false);
    expect(plan.mutationEnabled).toBe(false);
    expect(plan.databaseWritesEnabled).toBe(false);
    expect(plan.loginEnabled).toBe(false);
    expect(plan.families).toHaveLength(1);
    expect(plan.families[0]?.family).toBe(family);
    const rendered = renderFixturePlan(plan);
    expect(rendered).toContain("NO DATA CREATED");
    expect(rendered).toContain("NO DATABASE WRITES");
    expect(rendered).toContain("Next manual approval needed");
  });

  it("builds an all-family plan without requiring or inheriting a generic database connection", () => {
    const plan = buildFixturePlan(["--plan", "--family", "all", "--marker", "DEV04-20260524T120000"], {
      DATABASE_URL: "postgresql://user:secret@db.example.supabase.co:5432/postgres",
    });

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
    expect(() => buildFixturePlan(["--dry-run", "--family", "ar", "--marker", "dev03-AR-20260524T120000"])).toThrow(/DEV03- or DEV04-/);
    expect(() => buildFixturePlan(["--dry-run", "--family", "ar", "--marker", "DEV03-AR-reset"])).toThrow(/uppercase letters/);
    expect(() => buildFixturePlan(["--dry-run", "--family", "ar", "--marker", "DEV03-AR-RESET"])).toThrow(/destructive or forbidden/);
    expect(() => buildFixturePlan(["--dry-run", "--family", "ar", "--marker", "DEV03-AR-SECRET"])).toThrow(/secret-looking/);
    expect(() => buildFixturePlan(["--dry-run", "--family", "ar", "--marker", "DEV03-AR-20260524/120000"])).toThrow(
      /uppercase letters/,
    );
    expect(buildFixturePlan(["--dry-run", "--family", "ar", "--marker", "DEV04-20260524T120000"]).marker).toBe("DEV04-20260524T120000");
  });

  it.each([
    ["supabase host", "postgresql://user:secret@db.example.supabase.co:5432/postgres"],
    ["supabase pooler", "postgresql://user:secret@aws-0-region.pooler.supabase.com:5432/postgres"],
    ["rds host", "postgresql://user:secret@ledgerbyte-prod.abc.us-east-1.rds.amazonaws.com:5432/accounting"],
    ["railway host", "postgresql://user:secret@containers-us-west-1.railway.app:5432/railway"],
    ["render host", "postgresql://user:secret@render-postgres.internal.render.com:5432/accounting"],
    ["fly host", "postgresql://user:secret@db.fly.dev:5432/accounting"],
    ["digitalocean host", "postgresql://user:secret@db.digitalocean.com:25060/accounting"],
    ["production database name", "postgresql://user:secret@localhost:5432/ledgerbyte-production"],
    ["live database name", "postgresql://user:secret@localhost:5432/ledgerbyte-live"],
  ])("rejects hosted or deployed database target: %s", (_label, databaseUrl) => {
    expect(() =>
      buildFixturePlan([
        "--dry-run",
        "--family",
        "ar",
        "--marker",
        "DEV03-AR-20260524T120000",
        "--database-url",
        databaseUrl,
      ]),
    ).toThrow(/hosted or forbidden/i);
  });

  it.each([
    ["ledgerbyte test api", "https://ledgerbyte-api-test.vercel.app"],
    ["ledgerbyte test web", "https://ledgerbyte-web-test.vercel.app"],
    ["vercel app", "https://ledgerbyte-api.vercel.app"],
    ["railway app", "https://ledgerbyte-api.railway.app"],
    ["render app", "https://ledgerbyte-api.onrender.com"],
    ["fly app", "https://ledgerbyte-api.fly.dev"],
    ["production path", "http://localhost:4000/production"],
  ])("rejects hosted or deployed API target: %s", (_label, apiUrl) => {
    expect(() =>
      buildFixturePlan([
        "--dry-run",
        "--family",
        "ar",
        "--marker",
        "DEV03-AR-20260524T120000",
        "--api-url",
        apiUrl,
      ]),
    ).toThrow(/hosted or forbidden/i);
  });

  it.each([
    ["localhost", "postgresql://accounting:secret@localhost:5432/accounting?schema=public", "http://localhost:4000"],
    ["ipv4", "postgresql://accounting:secret@127.0.0.1:5432/accounting?schema=public", "http://127.0.0.1:4000"],
    ["docker host", "postgresql://accounting:secret@host.docker.internal:5432/accounting?schema=public", "http://host.docker.internal:4000"],
    ["compose services", "postgresql://accounting:secret@postgres:5432/accounting?schema=public", "http://api:4000"],
  ])("accepts obvious local targets for plan and dry-run modes only: %s", (_label, databaseUrl, apiUrl) => {
    const databaseTarget = classifyDatabaseUrl(databaseUrl);
    const apiTarget = classifyHttpUrl(apiUrl);

    expect(databaseTarget).toMatchObject({ kind: "local-plan-only" });
    expect(apiTarget).toMatchObject({ kind: "local-plan-only" });
    expect(JSON.stringify(databaseTarget)).not.toContain("secret");
  });

  it("validates a dedicated DEV-04 database URL env var but ignores generic DATABASE_URL defaults", () => {
    const ignoredGeneric = buildFixturePlan(["--plan", "--family", "ar", "--marker", "DEV03-AR-20260524T120000"], {
      DATABASE_URL: "postgresql://user:secret@db.example.supabase.co:5432/postgres",
    });
    expect(ignoredGeneric.databaseTarget.kind).toBe("not-provided");

    expect(() =>
      buildFixturePlan(["--plan", "--family", "ar", "--marker", "DEV03-AR-20260524T120000"], {
        LEDGERBYTE_DEV04_DATABASE_URL: "postgresql://user:secret@db.example.supabase.co:5432/postgres",
      }),
    ).toThrow(/hosted or forbidden/i);
  });

  it("rejects execute without approval gates", () => {
    expect(() =>
      buildFixturePlan([
        "--execute",
        "--family",
        "ar",
        "--marker",
        "DEV03-AR-20260524T120000",
        "--database-url",
        "postgresql://accounting:secret@localhost:5432/accounting",
      ]),
    ).toThrow(/missing approval gates/i);
  });

  it("rejects execute with partial approval gates", () => {
    expect(() =>
      buildFixturePlan([
        "--execute",
        "--allow-local-mutation",
        "--approve-local-disposable-db",
        "--family",
        "ar",
        "--marker",
        "DEV03-AR-20260524T120000",
        "--database-url",
        "postgresql://accounting:secret@localhost:5432/accounting",
      ]),
    ).toThrow(/missing approval gates/i);
  });

  it("runs approved execute through an injected fixture executor", async () => {
    const output: string[] = [];
    const errors: string[] = [];

    const exitCode = await runFixtureRunner(
      [
        "--execute",
        "--allow-local-mutation",
        "--approve-local-disposable-db",
        "--approve-fixture-creation",
        "--approve-cleanup-retention",
        "--approve-no-production-no-beta",
        "--approve-no-customer-data",
        "--family",
        "ar",
        "--marker",
        "DEV03-AR-20260524T120000",
        "--database-url",
        "postgresql://accounting:secret@localhost:5432/accounting",
      ],
      {},
      {
        log: (message) => output.push(message),
        error: (message) => errors.push(message),
      },
      async () => ({
        createdFixtureData: true,
        fixtureDataPresent: true,
        databaseConnectionOpened: true,
        databaseWritesPerformed: true,
        loginPerformed: false,
        auditWritingPerformed: false,
        lifecycleMutationsPerformed: false,
        outputActionsPerformed: false,
        records: [
          {
            group: "bootstrap",
            recordType: "organization",
            marker: "DEV03-AR-ORG-20260524T120000",
            status: "created",
            idHint: "12345678...",
          },
        ],
      }),
    );

    expect(exitCode).toBe(0);
    expect(output.join("\n")).toContain("Execute requested: true");
    expect(output.join("\n")).toContain("Execute enabled: true");
    expect(output.join("\n")).toContain("DATA CREATED OR REUSED");
    expect(output.join("\n")).toContain("DATABASE WRITES PERFORMED");
    expect(output.join("\n")).toContain("No login or audit-writing flow was run.");
    expect(output.join("\n")).toContain("No AR lifecycle mutation was run.");
    expect(errors).toEqual([]);
  });

  it("requires an explicit local database target for the execute skeleton", () => {
    expect(() =>
      buildFixturePlan([
        "--execute",
        "--allow-local-mutation",
        "--approve-local-disposable-db",
        "--approve-fixture-creation",
        "--approve-cleanup-retention",
        "--approve-no-production-no-beta",
        "--approve-no-customer-data",
        "--family",
        "ar",
        "--marker",
        "DEV03-AR-20260524T120000",
      ]),
    ).toThrow(/explicit local database target/i);
  });

  it("rejects hosted targets before execute approval checks", () => {
    expect(() =>
      buildFixturePlan([
        "--execute",
        "--family",
        "ar",
        "--marker",
        "DEV03-AR-20260524T120000",
        "--database-url",
        "postgresql://user:secret@db.example.supabase.co:5432/postgres",
      ]),
    ).toThrow(/hosted or forbidden/i);
  });

  it("lists planned AR bootstrap and base records without writing", () => {
    const plan = buildFixturePlan(["--dry-run", "--family", "ar", "--marker", "DEV03-AR-20260524T120000"]);
    const arFamily = plan.families[0];
    const rendered = renderFixturePlan(plan);

    expect(arFamily?.proposedRecords?.map((record) => record.recordType)).toEqual(
      expect.arrayContaining([
        "organization",
        "user-role-membership",
        "customer",
        "service-item",
        "tax-account-dependencies",
        "posting-account-dependencies",
        "bank-cash-dependency",
      ]),
    );
    expect(rendered).toContain("Future approved AR records");
    expect(rendered).toContain("DEV03-AR-ORG-20260524T120000");
    expect(rendered).toContain("DEV03-AR-POSTING-ACCOUNTS-20260524T120000");
    expect(rendered).toContain("NO DATABASE WRITES");
  });

  it("marks approved execute JSON summaries as guarded local write-capable before execution", () => {
    const plan = buildFixturePlan([
      "--execute",
      "--allow-local-mutation",
      "--approve-local-disposable-db",
      "--approve-fixture-creation",
      "--approve-cleanup-retention",
      "--approve-no-production-no-beta",
      "--approve-no-customer-data",
      "--family",
      "ar",
      "--marker",
      "DEV03-AR-20260524T120000",
      "--database-url",
      "postgresql://accounting:secret@localhost:5432/accounting",
      "--json-summary",
    ]);
    const summary = buildJsonSummary(plan);

    expect(summary).toMatchObject({
      mode: "execute",
      family: "ar",
      executeRequested: true,
      executeEnabled: true,
      executeRefused: false,
      writesPerformed: false,
      createdFixtureData: false,
      fixtureDataPresent: false,
      databaseWritesEnabled: true,
      loginEnabled: false,
    });
  });

  it("does not expose a casual root execute package script", () => {
    const rootPackageJson = require("../../../package.json") as { scripts: Record<string, string> };

    expect(rootPackageJson.scripts["fixture:dev04:execute"]).toBeUndefined();
    expect(Object.keys(rootPackageJson.scripts).filter((script) => /^fixture:dev04:.*execute/.test(script))).toEqual([]);
  });

  it("renders cleanup-plan as inventory-only without implying deletion", () => {
    const plan = buildFixturePlan(["--cleanup-plan", "--family", "ar", "--marker", "DEV03-AR-20260524T120000"]);
    const rendered = renderFixturePlan(plan);

    expect(plan.cleanupPlanOnly).toBe(true);
    expect(plan.databaseWritesEnabled).toBe(false);
    expect(rendered).toContain("Cleanup: plan only");
    expect(rendered).toContain("deletion is not implemented");
    expect(rendered).toContain("NO DATA CREATED");
    expect(rendered).toContain("NO DATABASE WRITES");
    expect(rendered).not.toMatch(/records will be deleted/i);
  });

  it("produces a sanitized JSON summary", () => {
    const plan = buildFixturePlan(["--dry-run", "--family", "bank", "--marker", "DEV03-BANK-20260524T120000", "--json-summary"]);
    const summary = buildJsonSummary(plan);

    expect(summary).toMatchObject({
      mode: "dry-run",
      family: "bank",
      marker: "DEV03-BANK-20260524T120000",
      createdFixtureData: false,
      fixtureCreationEnabled: false,
      mutationEnabled: false,
      databaseWritesEnabled: false,
      loginEnabled: false,
      executeEnabled: false,
      nextManualApproval: expect.stringMatching(/local disposable fixture creation approval/i),
    });
    expect(JSON.stringify(summary)).not.toMatch(/password|token|cookie|Authorization|DATABASE_URL|secret/i);
  });

  it("redacts secret-looking keys and connection strings", () => {
    const redacted = redactSecrets({
      DATABASE_URL: "postgresql://user:secret@localhost:5432/accounting",
      Authorization: "Bearer token-value",
      apiKey: "api-key-value",
      smtpPassword: "smtp-password-value",
      nested: {
        token: "token-value",
        directUrl: "postgresql://user:direct-secret@localhost:5432/accounting",
        safeMarker: "DEV03-AR-20260524T120000",
      },
    });

    const serialized = JSON.stringify(redacted);
    expect(serialized).toContain("DEV03-AR-20260524T120000");
    expect(serialized).not.toContain("secret");
    expect(serialized).not.toContain("token-value");
    expect(serialized).not.toContain("api-key-value");
    expect(serialized).not.toContain("smtp-password-value");
    expect(serialized).not.toContain("direct-secret");
    expect(serialized).not.toContain("user:secret");
  });

  it("rejects destructive operation terms in CLI args", () => {
    expect(() => buildFixturePlan(["--dry-run", "--family", "ar", "--marker", "DEV03-AR-20260524T120000", "seed"])).toThrow(
      /destructive or forbidden/,
    );
  });
});
