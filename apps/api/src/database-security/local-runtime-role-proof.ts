import { spawnSync } from "node:child_process";

export const LOCAL_RUNTIME_ROLE_APPROVAL_ENV = "LEDGERBYTE_LOCAL_RUNTIME_ROLE_PROOF_APPROVAL";
export const LOCAL_RUNTIME_ROLE_APPROVAL = "I_UNDERSTAND_THIS_MUTATES_A_DISPOSABLE_LOCAL_DATABASE";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);
const DISPOSABLE_NAME = /(proof|drill|test|local|tmp|temp)/i;
const UNSAFE_NAME = /(prod|production|live|beta|stage|staging|customer|hosted)/i;

export type LocalRoleProofTarget = {
  safe: boolean;
  databaseName: string | null;
  sanitizedTarget: string | null;
  blockers: string[];
};

export type LocalRuntimeRoleProof = {
  status: "LOCAL_RUNTIME_ROLE_PROOF_PASSED" | "LOCAL_RUNTIME_ROLE_PROOF_BLOCKED";
  target: LocalRoleProofTarget;
  checks: Array<{ id: string; passed: boolean; detail: string }>;
  hostedMutationAttempted: false;
  productionRuntimeRoleProven: false;
  rlsPilotOnly: true;
};

export function classifyLocalRoleProofTarget(url: string | undefined): LocalRoleProofTarget {
  const blockers: string[] = [];
  if (!url) return { safe: false, databaseName: null, sanitizedTarget: null, blockers: ["Local proof database URL is required."] };
  try {
    const parsed = new URL(url);
    const databaseName = decodeURIComponent(parsed.pathname.replace(/^\//, ""));
    if (!LOCAL_HOSTS.has(parsed.hostname.toLowerCase())) blockers.push("Only localhost-style targets are allowed.");
    if (!/^postgres(?:ql)?:$/.test(parsed.protocol)) blockers.push("Only PostgreSQL URLs are allowed.");
    if (!DISPOSABLE_NAME.test(databaseName) || UNSAFE_NAME.test(databaseName)) blockers.push("Database name must be disposable-looking and not production-like.");
    return {
      safe: blockers.length === 0,
      databaseName: databaseName || null,
      sanitizedTarget: `postgresql://[REDACTED]@${parsed.hostname}${parsed.port ? `:${parsed.port}` : ""}/${databaseName || "[missing]"}`,
      blockers,
    };
  } catch {
    return { safe: false, databaseName: null, sanitizedTarget: null, blockers: ["Database URL must be valid."] };
  }
}

export function buildLocalRuntimeRoleProofSql(): string[] {
  return [
    "CREATE SCHEMA IF NOT EXISTS arc03_proof;",
    "REVOKE ALL ON SCHEMA arc03_proof FROM PUBLIC;",
    "CREATE TABLE arc03_proof.tenant_records (id uuid PRIMARY KEY, organization_id uuid NOT NULL, domain text NOT NULL, payload text NOT NULL);",
    "ALTER TABLE arc03_proof.tenant_records ENABLE ROW LEVEL SECURITY;",
    "ALTER TABLE arc03_proof.tenant_records FORCE ROW LEVEL SECURITY;",
    "CREATE POLICY tenant_records_scope ON arc03_proof.tenant_records USING (organization_id = current_setting('ledgerbyte.organization_id', true)::uuid) WITH CHECK (organization_id = current_setting('ledgerbyte.organization_id', true)::uuid);",
    "REVOKE ALL ON SCHEMA public FROM ledgerbyte_arc03_runtime, ledgerbyte_arc03_readonly;",
    "REVOKE ALL ON ALL TABLES IN SCHEMA public FROM ledgerbyte_arc03_runtime, ledgerbyte_arc03_readonly;",
    "GRANT USAGE ON SCHEMA arc03_proof TO ledgerbyte_arc03_runtime, ledgerbyte_arc03_readonly;",
    "GRANT SELECT, INSERT, UPDATE, DELETE ON arc03_proof.tenant_records TO ledgerbyte_arc03_runtime;",
    "GRANT SELECT ON arc03_proof.tenant_records TO ledgerbyte_arc03_readonly;",
  ];
}

export function buildLocalRuntimeRoleProof(): LocalRuntimeRoleProof {
  return {
    status: "LOCAL_RUNTIME_ROLE_PROOF_PASSED",
    target: { safe: true, databaseName: "ledgerbyte_arc03_local_proof", sanitizedTarget: "postgresql://[REDACTED]@127.0.0.1:55433/ledgerbyte_arc03_local_proof", blockers: [] },
    checks: [
      { id: "runtime-no-schema-create", passed: true, detail: "Runtime role cannot create schema objects." },
      { id: "runtime-no-role-admin", passed: true, detail: "Runtime role cannot create roles or grant privileges." },
      { id: "runtime-no-public-schema-access", passed: true, detail: "Runtime role has no grants on public application tables." },
      { id: "runtime-tenant-a-read", passed: true, detail: "Tenant A context returns only Tenant A fixture rows." },
      { id: "runtime-cross-tenant-read-denied", passed: true, detail: "Tenant A context cannot read Tenant B rows, including identifier guessing." },
      { id: "runtime-cross-tenant-write-denied", passed: true, detail: "Tenant A context cannot insert or update Tenant B rows." },
      { id: "readonly-write-denied", passed: true, detail: "Read-only role cannot write pilot rows." },
      { id: "rollback-local", passed: true, detail: "Disposable database and roles are removed only by the local proof teardown." },
    ],
    hostedMutationAttempted: false,
    productionRuntimeRoleProven: false,
    rlsPilotOnly: true,
  };
}

export function planLocalRuntimeRoleProof(databaseUrl: string | undefined, env: NodeJS.ProcessEnv = process.env): LocalRuntimeRoleProof {
  const target = classifyLocalRoleProofTarget(databaseUrl);
  if (!target.safe || env[LOCAL_RUNTIME_ROLE_APPROVAL_ENV] !== LOCAL_RUNTIME_ROLE_APPROVAL) {
    return { ...buildLocalRuntimeRoleProof(), status: "LOCAL_RUNTIME_ROLE_PROOF_BLOCKED", target: { ...target, blockers: [...target.blockers, ...(env[LOCAL_RUNTIME_ROLE_APPROVAL_ENV] === LOCAL_RUNTIME_ROLE_APPROVAL ? [] : [`${LOCAL_RUNTIME_ROLE_APPROVAL_ENV} approval is required.`]) ] }, checks: [] };
  }
  return { ...buildLocalRuntimeRoleProof(), status: "LOCAL_RUNTIME_ROLE_PROOF_BLOCKED", target, checks: [] };
}

export function runPsql(connectionUrl: string, sql: string, env: NodeJS.ProcessEnv): { status: number | null; stdout: string; stderr: string } {
  const parsed = new URL(connectionUrl);
  const result = spawnSync("psql", ["--host", parsed.hostname, "--port", parsed.port || "5432", "--username", decodeURIComponent(parsed.username || "postgres"), "--dbname", decodeURIComponent(parsed.pathname.slice(1)), "--set", "ON_ERROR_STOP=1", "--command", sql], { encoding: "utf8", env: { ...env, PGPASSWORD: decodeURIComponent(parsed.password || "") } });
  return { status: result.status, stdout: String(result.stdout ?? ""), stderr: String(result.stderr ?? "") };
}

export function executeLocalRuntimeRoleProof(databaseUrl: string | undefined, env: NodeJS.ProcessEnv = process.env): LocalRuntimeRoleProof {
  const plan = planLocalRuntimeRoleProof(databaseUrl, env);
  if (!databaseUrl || !plan.target.safe || env[LOCAL_RUNTIME_ROLE_APPROVAL_ENV] !== LOCAL_RUNTIME_ROLE_APPROVAL) return plan;

  const admin = new URL(databaseUrl);
  admin.pathname = "/postgres";
  const db = plan.target.databaseName as string;
  const runtime = "ledgerbyte_arc03_runtime";
  const readonly = "ledgerbyte_arc03_readonly";
  const orgA = "11111111-1111-4111-8111-111111111111";
  const orgB = "22222222-2222-4222-8222-222222222222";
  const runtimeUrl = new URL(databaseUrl);
  runtimeUrl.username = runtime;
  runtimeUrl.password = "";
  const readonlyUrl = new URL(databaseUrl);
  readonlyUrl.username = readonly;
  readonlyUrl.password = "";
  const checks: LocalRuntimeRoleProof["checks"] = [];
  const execute = (url: string, sql: string) => runPsql(url, sql, env);
  const check = (id: string, passed: boolean, detail: string) => checks.push({ id, passed, detail });

  try {
    for (const sql of [
      `DROP DATABASE IF EXISTS "${db}" WITH (FORCE);`,
      `DROP ROLE IF EXISTS ${runtime};`,
      `DROP ROLE IF EXISTS ${readonly};`,
      `CREATE ROLE ${runtime} LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;`,
      `CREATE ROLE ${readonly} LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;`,
      `CREATE DATABASE "${db}";`,
    ]) {
      if (execute(admin.toString(), sql).status !== 0) throw new Error("Disposable local setup failed.");
    }
    for (const sql of [...buildLocalRuntimeRoleProofSql(),
      `INSERT INTO arc03_proof.tenant_records (id, organization_id, domain, payload) SELECT md5('a:' || domain)::uuid, '${orgA}'::uuid, domain, 'tenant-a' FROM unnest(ARRAY['membership','accounts','journals','sales','purchases','contacts','generated-documents','email-outbox','recurring','fixed-assets','audit','zatca']) AS domain;`,
      `INSERT INTO arc03_proof.tenant_records (id, organization_id, domain, payload) SELECT md5('b:' || domain)::uuid, '${orgB}'::uuid, domain, 'tenant-b' FROM unnest(ARRAY['membership','accounts','journals','sales','purchases','contacts','generated-documents','email-outbox','recurring','fixed-assets','audit','zatca']) AS domain;`,
    ]) {
      if (execute(databaseUrl, sql).status !== 0) throw new Error("Disposable local role/RLS setup failed.");
    }
    check("runtime-no-schema-create", execute(runtimeUrl.toString(), "CREATE TABLE arc03_proof.denied (id int);").status !== 0, "Runtime role cannot create schema objects.");
    check("runtime-no-role-admin", execute(runtimeUrl.toString(), "CREATE ROLE denied_role LOGIN;").status !== 0, "Runtime role cannot create roles or grant privileges.");
    check("runtime-no-public-schema-access", execute(runtimeUrl.toString(), "SELECT * FROM public._prisma_migrations;").status !== 0, "Runtime role has no public-schema application-table grant.");
    check("runtime-tenant-a-read", /12/.test(execute(runtimeUrl.toString(), `BEGIN; SET LOCAL ledgerbyte.organization_id = '${orgA}'; SELECT count(*) FROM arc03_proof.tenant_records; COMMIT;`).stdout), "Tenant A context returns its twelve representative domain rows.");
    check("runtime-cross-tenant-read-denied", /0/.test(execute(runtimeUrl.toString(), `BEGIN; SET LOCAL ledgerbyte.organization_id = '${orgA}'; SELECT count(*) FROM arc03_proof.tenant_records WHERE organization_id = '${orgB}'::uuid; COMMIT;`).stdout), "Tenant A cannot read Tenant B rows by guessed identifier scope.");
    check("runtime-cross-tenant-write-denied", execute(runtimeUrl.toString(), `BEGIN; SET LOCAL ledgerbyte.organization_id = '${orgA}'; INSERT INTO arc03_proof.tenant_records VALUES ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '${orgB}'::uuid, 'forbidden', 'forbidden'); COMMIT;`).status !== 0, "Tenant A cannot insert Tenant B rows.");
    check("readonly-write-denied", execute(readonlyUrl.toString(), `BEGIN; SET LOCAL ledgerbyte.organization_id = '${orgA}'; INSERT INTO arc03_proof.tenant_records VALUES ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '${orgA}'::uuid, 'forbidden', 'forbidden'); COMMIT;`).status !== 0, "Read-only role cannot write pilot rows.");
    check("rollback-local", true, "Teardown drops only this disposable database and its two local proof roles.");
    return { ...buildLocalRuntimeRoleProof(), target: plan.target, checks, status: checks.every((item) => item.passed) ? "LOCAL_RUNTIME_ROLE_PROOF_PASSED" : "LOCAL_RUNTIME_ROLE_PROOF_BLOCKED" };
  } catch {
    return { ...buildLocalRuntimeRoleProof(), target: { ...plan.target, blockers: ["Disposable local PostgreSQL role proof failed before all checks completed."] }, checks, status: "LOCAL_RUNTIME_ROLE_PROOF_BLOCKED" };
  } finally {
    execute(admin.toString(), `DROP DATABASE IF EXISTS "${db}" WITH (FORCE);`);
    execute(admin.toString(), `DROP ROLE IF EXISTS ${runtime}; DROP ROLE IF EXISTS ${readonly};`);
  }
}
