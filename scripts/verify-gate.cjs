"use strict";

const { spawnSync } = require("node:child_process");
const fs = require("node:fs");

const EXCLUDED_SUMMARY =
  "Excluded from verification gates: migrations, seed/reset/delete, E2E, smoke, deploys, env changes, ZATCA, email, backup/restore, production URLs, and login flows.";

const FORBIDDEN_EXTRA_ARG_PATTERNS = [
  /https?:\/\//i,
  /\bmigrate\b/i,
  /\bseed\b/i,
  /\breset\b/i,
  /\bdelete\b/i,
  /\be2e\b/i,
  /\bsmoke\b/i,
  /\bdeploy\b/i,
  /\bzatca\b/i,
  /\bemail\b/i,
  /\bbackup\b/i,
  /\brestore\b/i,
  /\blogin\b/i,
];

const FORBIDDEN_COMMAND_PATTERNS = [
  /https?:\/\//i,
  /\bdb:migrate\b/i,
  /\bdb:seed\b/i,
  /\bdemo:seed-workflows\b/i,
  /\bdb:reset\b/i,
  /\be2e\b/i,
  /\bsmoke:/i,
  /\bdeploy\b/i,
  /\bzatca:/i,
  /\bbackup\b/i,
  /\brestore\b/i,
];

const DOCS_STATIC_GUARD_ALLOWED_PATHS = [
  /^(?:CODEX_HANDOFF|BUG_AUDIT|README)\.md$/i,
  /^docs\/.+\.md$/i,
  /^package\.json$/i,
  /^scripts\/verify-gate(?:\.test)?\.cjs$/i,
  /^scripts\/[A-Za-z0-9._-]*approval-gate(?:\.test)?\.cjs$/i,
];

const command = (bin, args = []) => ({ bin, args });

const GATES = {
  "verify:diff": {
    description: "Diff and staging whitespace safety only.",
    commands: [
      command("git", ["status", "--short"]),
      command("git", ["diff", "--check"]),
      command("git", ["diff", "--cached", "--check"]),
    ],
  },
  "verify:local:web": {
    description: "Fast web developer gate. Optional extra args run targeted web Jest tests.",
    buildCommands: (extraArgs) => [
      command("git", ["diff", "--check"]),
      command("corepack", ["pnpm", "--filter", "@ledgerbyte/web", "typecheck"]),
      ...targetedTestCommand("@ledgerbyte/web", extraArgs),
    ],
  },
  "verify:local:api": {
    description: "Fast API developer gate. Optional extra args run targeted API Jest tests.",
    buildCommands: (extraArgs) => [
      command("git", ["diff", "--check"]),
      command("corepack", ["pnpm", "--filter", "@ledgerbyte/api", "typecheck"]),
      ...targetedTestCommand("@ledgerbyte/api", extraArgs),
    ],
  },
  "verify:local:guards": {
    description: "Credential and user-testing cleanup-plan guard checks.",
    commands: [
      command("git", ["diff", "--check"]),
      command("node", ["--test", "scripts/test-credential-env.test.cjs"]),
      command("corepack", ["pnpm", "test:user-testing-cleanup-plan"]),
    ],
  },
  "verify:repo": {
    description: "Slower whole-repo local candidate gate.",
    commands: [
      command("git", ["diff", "--check"]),
      command("corepack", ["pnpm", "typecheck"]),
      command("corepack", ["pnpm", "test"]),
      command("corepack", ["pnpm", "build"]),
      command("git", ["diff", "--cached", "--check"]),
    ],
  },
  "verify:ci:local": {
    description: "Local mirror of the proposed non-destructive CI gate.",
    buildCommands: (_extraArgs, options = {}) => {
      const changedFiles = Array.isArray(options.changedFiles) ? options.changedFiles : detectChangedFilesForCiScope(options.cwd);
      if (isDocsStaticGuardPackageOnlyChange(changedFiles)) {
        return buildDocsStaticGuardCiCommands(changedFiles);
      }

      return [
        command("git", ["diff", "--check"]),
        command("corepack", ["pnpm", "db:generate"]),
        command("corepack", ["pnpm", "typecheck"]),
        command("corepack", ["pnpm", "test"]),
        command("corepack", ["pnpm", "build"]),
        command("node", ["--test", "scripts/test-credential-env.test.cjs"]),
        command("corepack", ["pnpm", "test:user-testing-cleanup-plan"]),
      ];
    },
  },
};

function targetedTestCommand(workspace, extraArgs) {
  if (extraArgs.length === 0) {
    return [];
  }

  return [command("corepack", ["pnpm", "--filter", workspace, "test", "--", ...extraArgs])];
}

function splitCliArgs(argv) {
  const args = [...argv];
  const gateName = args.shift();
  const planOnly = args.includes("--plan") || args.includes("--dry-run");
  const filteredArgs = args.filter((arg) => arg !== "--plan" && arg !== "--dry-run");
  const separatorIndex = filteredArgs.indexOf("--");
  const extraArgs =
    separatorIndex === -1 ? filteredArgs : filteredArgs.filter((_, index) => index !== separatorIndex);

  return { gateName, planOnly, extraArgs };
}

function buildGatePlan(gateName, extraArgs = [], options = {}) {
  const gate = GATES[gateName];
  if (!gate) {
    throw new Error(`Unknown verification gate "${gateName}". Run "node scripts/verify-gate.cjs --list" for options.`);
  }

  assertSafeExtraArgs(extraArgs);

  const commands = gate.buildCommands ? gate.buildCommands(extraArgs, options) : gate.commands;
  const plan = {
    name: gateName,
    description: gate.description,
    commands,
    excluded: EXCLUDED_SUMMARY,
  };

  assertSafePlan(plan);
  return plan;
}

function assertSafeExtraArgs(extraArgs) {
  for (const arg of extraArgs) {
    const matchedPattern = FORBIDDEN_EXTRA_ARG_PATTERNS.find((pattern) => pattern.test(arg));
    if (matchedPattern) {
      const message = matchedPattern.source.includes("https")
        ? "Targeted verification args must not include URLs."
        : `Targeted verification arg "${arg}" matches a forbidden default-gate area.`;
      throw new Error(message);
    }
  }
}

function assertSafePlan(plan) {
  for (const item of plan.commands) {
    const rendered = formatCommand(item);
    const matchedPattern = FORBIDDEN_COMMAND_PATTERNS.find((pattern) => pattern.test(rendered));
    if (matchedPattern) {
      throw new Error(`Verification plan for ${plan.name} includes forbidden command: ${rendered}`);
    }
  }
}

function detectChangedFilesForCiScope(cwd = process.cwd()) {
  const candidates = [
    ["git", ["diff", "--name-only", "--diff-filter=ACMR", "origin/main...HEAD"]],
    ["git", ["diff-tree", "-m", "--no-commit-id", "--name-only", "-r", "HEAD"]],
    ["git", ["show", "--pretty=", "--name-only", "HEAD"]],
  ];

  for (const [bin, args] of candidates) {
    const result = spawnSync(bin, args, {
      cwd,
      encoding: "utf8",
      shell: process.platform === "win32",
    });

    if (result.error || result.status !== 0) {
      continue;
    }

    const files = result.stdout
      .split(/\r?\n/)
      .map((line) => line.trim().replace(/\\/g, "/"))
      .filter(Boolean);

    if (files.length > 0) {
      return [...new Set(files)];
    }
  }

  return [];
}

function isDocsStaticGuardPackageOnlyChange(changedFiles) {
  return (
    changedFiles.length > 0 &&
    changedFiles.every((file) => DOCS_STATIC_GUARD_ALLOWED_PATHS.some((pattern) => pattern.test(file)))
  );
}

function buildDocsStaticGuardCiCommands(changedFiles) {
  const commands = [command("git", ["diff", "--check"])];
  const changedSet = new Set(changedFiles.map((file) => file.replace(/\\/g, "/")));

  if (changedSet.has("scripts/verify-gate.cjs") || changedSet.has("scripts/verify-gate.test.cjs")) {
    commands.push(command("node", ["--test", "scripts/verify-gate.test.cjs"]));
  }

  const approvalGateTests = new Set();
  for (const file of changedSet) {
    if (/^scripts\/[A-Za-z0-9._-]*approval-gate\.test\.cjs$/i.test(file)) {
      approvalGateTests.add(file);
      continue;
    }

    if (/^scripts\/[A-Za-z0-9._-]*approval-gate\.cjs$/i.test(file)) {
      const derivedTestPath = file.replace(/\.cjs$/i, ".test.cjs");
      if (fs.existsSync(derivedTestPath)) {
        approvalGateTests.add(derivedTestPath);
      }
    }
  }

  for (const testPath of [...approvalGateTests].sort()) {
    commands.push(command("node", ["--test", testPath]));
  }

  if (changedSet.has("package.json")) {
    commands.push(
      command("node", [
        "-e",
        "JSON.parse(require('fs').readFileSync('package.json','utf8')); console.log('package.json parse ok')",
      ]),
    );
  }

  return commands;
}

function formatCommand(item) {
  return [item.bin, ...item.args.map(formatArg)].join(" ");
}

function formatArg(arg) {
  if (/^[A-Za-z0-9_@./:=+-]+$/.test(arg)) {
    return arg;
  }

  return JSON.stringify(arg);
}

function printPlan(plan, { planOnly }) {
  console.log(`Verification gate: ${plan.name}`);
  console.log(`Purpose: ${plan.description}`);
  console.log(`Mode: ${planOnly ? "plan only" : "execute"}`);
  console.log("");
  console.log("Command plan:");
  plan.commands.forEach((item, index) => {
    console.log(`${index + 1}. ${formatCommand(item)}`);
  });
  console.log("");
  console.log(plan.excluded);
}

function runPlan(plan) {
  for (const item of plan.commands) {
    console.log("");
    console.log(`> ${formatCommand(item)}`);
    const result = spawnSync(item.bin, item.args, {
      stdio: "inherit",
      shell: process.platform === "win32",
    });

    if (result.error) {
      throw result.error;
    }

    if (result.status !== 0) {
      process.exitCode = result.status ?? 1;
      return;
    }
  }
}

function printList() {
  console.log("Available verification gates:");
  for (const [name, gate] of Object.entries(GATES)) {
    console.log(`- ${name}: ${gate.description}`);
  }
}

function main(argv = process.argv.slice(2)) {
  if (argv.length === 0 || argv.includes("--help") || argv.includes("-h")) {
    console.log("Usage: node scripts/verify-gate.cjs <gate> [--plan|--dry-run] [-- <targeted test args>]");
    console.log("");
    printList();
    console.log("");
    console.log(EXCLUDED_SUMMARY);
    process.exitCode = argv.length === 0 ? 1 : 0;
    return;
  }

  if (argv.includes("--list")) {
    printList();
    return;
  }

  const { gateName, planOnly, extraArgs } = splitCliArgs(argv);
  const plan = buildGatePlan(gateName, extraArgs, { cwd: process.cwd() });

  printPlan(plan, { planOnly });
  if (!planOnly) {
    runPlan(plan);
  }
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = {
  EXCLUDED_SUMMARY,
  FORBIDDEN_COMMAND_PATTERNS,
  GATES,
  assertSafePlan,
  buildGatePlan,
  buildDocsStaticGuardCiCommands,
  detectChangedFilesForCiScope,
  formatCommand,
  isDocsStaticGuardPackageOnlyChange,
  main,
  splitCliArgs,
};
