#!/usr/bin/env tsx
import { spawnSync } from "node:child_process";
import {
  LOCAL_DRILL_APPROVAL_ENV,
  OWNER_APPROVAL_PHRASE,
  STATUS_BACKUP_CREATED,
  STATUS_BLOCKED_UNSAFE_TARGET,
  STATUS_FIXTURE_PREPARED,
  STATUS_PLAN_READY,
  STATUS_RESTORE_COMPLETED,
  STATUS_RESTORE_VERIFIED,
  buildEvidenceReport,
  createBackup,
  prepareLocalDrillDatabases,
  restoreBackup,
  verifyRestore,
  writeEvidenceFiles,
  type DrillMode,
} from "../src/disaster-recovery/local-postgres-drill";

interface CliArgs {
  mode: DrillMode;
  execute: boolean;
  json: boolean;
  evidenceDir?: string;
  backupFile?: string;
  backupOutputDir?: string;
  prepareFixture: boolean;
  help: boolean;
}

function parseArgs(argv: string[]): CliArgs {
  const parsed: CliArgs = { mode: "plan", execute: false, json: false, prepareFixture: false, help: false };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--mode") {
      const value = argv[index + 1] as DrillMode | undefined;
      if (!value || !["plan", "backup", "restore", "verify", "drill"].includes(value)) {
        throw new Error("--mode must be one of plan, backup, restore, verify, or drill.");
      }
      parsed.mode = value;
      index += 1;
      continue;
    }
    if (arg === "--execute") {
      parsed.execute = true;
      continue;
    }
    if (arg === "--json") {
      parsed.json = true;
      continue;
    }
    if (arg === "--prepare-fixture") {
      parsed.prepareFixture = true;
      continue;
    }
    if (arg === "--evidence-dir") {
      parsed.evidenceDir = readValue(argv, index, "--evidence-dir");
      index += 1;
      continue;
    }
    if (arg === "--backup-file") {
      parsed.backupFile = readValue(argv, index, "--backup-file");
      index += 1;
      continue;
    }
    if (arg === "--backup-output-dir") {
      parsed.backupOutputDir = readValue(argv, index, "--backup-output-dir");
      index += 1;
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      parsed.help = true;
      continue;
    }
    if (arg === "--") {
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return parsed;
}

function usage(): string {
  return [
    "Usage:",
    "  corepack pnpm --filter @ledgerbyte/api backup:local-postgres-drill -- --mode plan --json --evidence-dir artifacts/dr",
    "  corepack pnpm --filter @ledgerbyte/api backup:local-postgres-drill -- --mode backup --execute --backup-output-dir artifacts/dr/backups",
    "  corepack pnpm --filter @ledgerbyte/api backup:local-postgres-drill -- --mode restore --execute --backup-file artifacts/dr/backups/<file>.dump",
    "  corepack pnpm --filter @ledgerbyte/api backup:local-postgres-drill -- --mode verify --execute",
    "  corepack pnpm --filter @ledgerbyte/api backup:local-postgres-drill -- --mode drill --execute --prepare-fixture --backup-output-dir artifacts/dr/backups --evidence-dir artifacts/dr",
    "",
    "Execution modes require:",
    `  ${LOCAL_DRILL_APPROVAL_ENV}=${OWNER_APPROVAL_PHRASE}`,
    "  LEDGERBYTE_DR_SOURCE_DATABASE_URL for backup/drill",
    "  LEDGERBYTE_DR_RESTORE_DATABASE_URL for restore/verify/drill",
    "  Optional LEDGERBYTE_DR_ADMIN_DATABASE_URL for --prepare-fixture; otherwise the source URL is rewritten to the postgres database.",
    "  Optional LEDGERBYTE_DR_PG_TOOLS=docker-compose and LEDGERBYTE_DR_PG_DOCKER_COMPOSE_FILE=infra/docker-compose.yml when local pg tools are not installed.",
    "",
    "Hosted, production, beta, staging, and non-disposable restore targets are blocked.",
  ].join("\n");
}

function main(): void {
  let args: CliArgs;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
    return;
  }

  if (args.help) {
    console.log(usage());
    return;
  }

  const input = {
    mode: args.mode,
    sourceDatabaseUrl: process.env.LEDGERBYTE_DR_SOURCE_DATABASE_URL,
    restoreDatabaseUrl: process.env.LEDGERBYTE_DR_RESTORE_DATABASE_URL,
    adminDatabaseUrl: process.env.LEDGERBYTE_DR_ADMIN_DATABASE_URL,
    backupFile: args.backupFile,
    backupOutputDir: args.backupOutputDir,
    gitCommit: readGitCommit(),
    env: process.env,
  };

  let status = STATUS_PLAN_READY;
  let backup = undefined;
  let verification = undefined;
  const warnings: string[] = [];
  const blockers: string[] = [];

  try {
    if (args.mode !== "plan" && !args.execute) {
      status = STATUS_BLOCKED_UNSAFE_TARGET;
      blockers.push("Execution mode requested without --execute. No backup, restore, or verification command was run.");
    } else if (args.prepareFixture && args.mode !== "drill") {
      status = STATUS_BLOCKED_UNSAFE_TARGET;
      blockers.push("--prepare-fixture is only supported with --mode drill.");
    } else if (args.mode === "backup") {
      backup = createBackup(input);
      status = STATUS_BACKUP_CREATED;
    } else if (args.mode === "restore") {
      restoreBackup(input);
      status = STATUS_RESTORE_COMPLETED;
    } else if (args.mode === "verify") {
      verification = verifyRestore(input);
      status = verification.passed ? STATUS_RESTORE_VERIFIED : STATUS_BLOCKED_UNSAFE_TARGET;
    } else if (args.mode === "drill") {
      if (args.prepareFixture) {
        prepareLocalDrillDatabases(input);
        status = STATUS_FIXTURE_PREPARED;
      }
      backup = createBackup(input);
      restoreBackup({ ...input, backupFile: backup.absolutePath });
      verification = verifyRestore(input);
      status = verification.passed ? STATUS_RESTORE_VERIFIED : STATUS_BLOCKED_UNSAFE_TARGET;
    } else {
      warnings.push("Plan mode produced evidence only. No pg_dump, pg_restore, or psql command was run.");
    }
  } catch (error) {
    status = STATUS_BLOCKED_UNSAFE_TARGET;
    blockers.push(error instanceof Error ? error.message : String(error));
  }

  const evidence = buildEvidenceReport({
    ...input,
    backup,
    verification,
    status,
    blockers,
    warnings,
  });
  const written = args.evidenceDir ? writeEvidenceFiles(evidence, args.evidenceDir) : null;
  const output = written ? { ...evidence, evidenceFiles: written } : evidence;

  if (args.json) {
    console.log(JSON.stringify(output, null, 2));
  } else {
    console.log(`${evidence.status}: hosted/prod recovery still not proven.`);
    if (written) {
      console.log(`Evidence JSON: ${written.jsonPath}`);
      console.log(`Evidence Markdown: ${written.markdownPath}`);
    }
  }

  if (status === STATUS_BLOCKED_UNSAFE_TARGET) {
    process.exitCode = 1;
  }
}

function readValue(argv: string[], index: number, flag: string): string {
  const value = argv[index + 1];
  if (!value) {
    throw new Error(`Missing value for ${flag}.`);
  }
  return value;
}

function readGitCommit(): string {
  const result = spawnSync("git", ["rev-parse", "--short", "HEAD"], {
    encoding: "utf8",
    shell: process.platform === "win32",
  });
  return result.status === 0 ? result.stdout.trim() : "unknown";
}

main();
