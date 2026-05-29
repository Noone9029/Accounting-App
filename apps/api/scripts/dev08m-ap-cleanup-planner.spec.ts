import { buildCleanupPlannerPlan, renderCleanupPlannerPlan, runCleanupPlanner, REQUIRED_DEV08M_MARKER } from "./dev08m-ap-cleanup-planner";
import apiPackageJson from "../package.json";
import rootPackageJson from "../../../package.json";

describe("DEV-08M AP cleanup dry-run planner", () => {
  const localDatabaseUrl = "postgresql://accounting:local-secret@localhost:5432/accounting?schema=public";

  it("builds a dry-run-only local AP cleanup plan without exposing database secrets", () => {
    const plan = buildCleanupPlannerPlan(["--dry-run", "--marker", REQUIRED_DEV08M_MARKER, "--database-url", localDatabaseUrl]);
    const rendered = renderCleanupPlannerPlan(plan);

    expect(plan.mode).toBe("dry-run");
    expect(plan.marker).toBe(REQUIRED_DEV08M_MARKER);
    expect(plan.dryRun).toBe(true);
    expect(plan.readOnly).toBe(true);
    expect(plan.noDeletion).toBe(true);
    expect(plan.deletionPathImplemented).toBe(false);
    expect(plan.databaseTarget.kind).toBe("local");
    expect(rendered).toContain("NO DELETION PATH IMPLEMENTED");
    expect(rendered).toContain("COUNT-ONLY OUTPUT");
    expect(rendered).not.toContain("local-secret");
    expect(JSON.stringify(plan)).not.toContain("local-secret");
  });

  it("requires the exact DEV-08M marker", () => {
    expect(() => buildCleanupPlannerPlan(["--dry-run", "--database-url", localDatabaseUrl])).toThrow(/marker is required/i);
    expect(() => buildCleanupPlannerPlan(["--dry-run", "--marker", "DEV08M-AP-WRONG", "--database-url", localDatabaseUrl])).toThrow(
      /exact DEV-08M marker/,
    );
  });

  it.each([
    ["supabase", "postgresql://user:secret@db.example.supabase.co:5432/postgres"],
    ["rds", "postgresql://user:secret@ledgerbyte-prod.abc.us-east-1.rds.amazonaws.com:5432/accounting"],
    ["local production database", "postgresql://user:secret@localhost:5432/ledgerbyte-production"],
    ["beta database name", "postgresql://user:secret@localhost:5432/ledgerbyte_beta"],
  ])("refuses hosted or forbidden database targets: %s", (_label, databaseUrl) => {
    expect(() => buildCleanupPlannerPlan(["--dry-run", "--marker", REQUIRED_DEV08M_MARKER, "--database-url", databaseUrl])).toThrow(
      /hosted or forbidden|local database target/i,
    );
  });

  it("ignores generic DATABASE_URL and requires an explicit DEV-08M database target for dry-run", () => {
    expect(() =>
      buildCleanupPlannerPlan(["--dry-run", "--marker", REQUIRED_DEV08M_MARKER], {
        DATABASE_URL: "postgresql://user:secret@localhost:5432/accounting",
      }),
    ).toThrow(/explicit local database target/i);

    const plan = buildCleanupPlannerPlan(["--plan", "--marker", REQUIRED_DEV08M_MARKER], {
      DATABASE_URL: "postgresql://user:secret@db.example.supabase.co:5432/postgres",
    });
    expect(plan.mode).toBe("plan");
    expect(plan.databaseTarget.kind).toBe("not-provided");
  });

  it.each(["--execute", "--delete", "--purge", "--truncate", "--drop", "--archive", "--revoke", "delete"])(
    "rejects destructive cleanup argument %s",
    (flag) => {
      expect(() => buildCleanupPlannerPlan(["--dry-run", "--marker", REQUIRED_DEV08M_MARKER, "--database-url", localDatabaseUrl, flag])).toThrow(
        /dry-run only|destructive/i,
      );
    },
  );

  it("renders count-only dry-run evidence from an injected collector", async () => {
    const output: string[] = [];
    const errors: string[] = [];
    const exitCode = await runCleanupPlanner(
      ["--dry-run", "--marker", REQUIRED_DEV08M_MARKER, "--database-url", localDatabaseUrl],
      {},
      {
        log: (message) => output.push(message),
        error: (message) => errors.push(message),
      },
      async () => ({
        markersDetected: 12,
        sourceDocuments: 64,
        sourceLines: 25,
        journalsAndJournalLines: 67,
        allocations: 2,
        receiptsAndStockMovements: 9,
        generatedDocumentsBySource: 24,
        emailOutboxBySourceOrDocument: 4,
        providerEventsForGeneratedDocumentEmails: 0,
        auditLogsForSourceIds: 110,
        zatcaMarkerHits: 0,
        usersRolesMembershipsMarkerHits: 6,
      }),
    );

    expect(exitCode).toBe(0);
    expect(errors).toEqual([]);
    const rendered = output.join("\n");
    expect(rendered).toContain("markersDetected: 12");
    expect(rendered).toContain("generatedDocumentsBySource: 24");
    expect(rendered).toContain("bodyOrSecretOutputPrinted: false");
    expect(rendered).not.toContain("local-secret");
    expect(rendered).not.toContain("00000000-0000-0000-0000-000000000000");
  });

  it("adds only plan/dry-run package scripts and no execute/delete helpers", () => {
    expect(apiPackageJson.scripts["cleanup:dev08m:ap"]).toBe("tsx scripts/dev08m-ap-cleanup-planner.ts");
    expect(rootPackageJson.scripts["cleanup:dev08m:ap:plan"]).toBe(
      "corepack pnpm --filter @ledgerbyte/api cleanup:dev08m:ap -- --plan",
    );
    expect(rootPackageJson.scripts["cleanup:dev08m:ap:dry-run"]).toBe(
      "corepack pnpm --filter @ledgerbyte/api cleanup:dev08m:ap -- --dry-run",
    );
    expect(Object.keys(apiPackageJson.scripts).filter((script) => /dev08m.*(execute|delete|cleanup-run)/i.test(script))).toEqual([]);
    expect(Object.keys(rootPackageJson.scripts).filter((script) => /dev08m.*(execute|delete|cleanup-run)/i.test(script))).toEqual([]);
  });
});
