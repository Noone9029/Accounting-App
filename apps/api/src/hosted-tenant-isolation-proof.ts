export type HostedTenantProofEnvironment = "local" | "staging" | "production";
export type HostedTenantProofMode = "dry-run" | "read-only-plan";
export type HostedTenantProofSafety = "ready" | "refused";

export type HostedTenantProofOptions = {
  environment: HostedTenantProofEnvironment;
  proofRunId: string;
  baseUrl: string;
  allow: string | undefined;
  productionOverride?: string | undefined;
  mode?: HostedTenantProofMode | undefined;
  requestedOperations?: string[] | undefined;
};

export type HostedTenantProofPlan = {
  safety: HostedTenantProofSafety;
  environment: HostedTenantProofEnvironment;
  proofRunId: string | null;
  mode: HostedTenantProofMode;
  dryRun: true;
  networkEnabled: false;
  mutationEnabled: false;
  target: {
    baseUrl: string | null;
    host: string | null;
    local: boolean;
    productionLooking: boolean;
  };
  requiredGate: "LEDGERBYTE_HOSTED_TENANT_PROOF_ALLOW=1";
  refusedReasons: string[];
  warnings: string[];
  allowedNextActions: string[];
  prohibitedActions: string[];
  redactionCheck: {
    secretsPrinted: false;
    secretLikeInputsRedacted: boolean;
  };
};

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "0.0.0.0", "host.docker.internal"]);

const PRODUCTION_LOOKING_PATTERNS = [
  /(^|[.\-_/])prod(?:uction)?($|[.\-_/])/i,
  /(^|[.\-_/])live($|[.\-_/])/i,
  /(^|[.\-_/])customer($|[.\-_/])/i,
  /(^|[.\-_/])customers($|[.\-_/])/i,
  /ledgerbyte\.com$/i,
  /accounting-app\.com$/i,
];

const DESTRUCTIVE_OPERATION_PATTERNS = [
  /^--?(?:seed|reset|delete|truncate|drop|purge|migrate|deploy)$/i,
  /^--?(?:call-zatca|call-peppol|call-asp|call-provider|send-email|connect-bank-feed|connect-payment-processor)$/i,
];

const PRODUCTION_OVERRIDE = "I_UNDERSTAND_PRODUCTION_IS_READ_ONLY_AND_APPROVED";

export function createHostedTenantIsolationProofPlan(options: HostedTenantProofOptions): HostedTenantProofPlan {
  const mode = options.mode ?? "dry-run";
  const refusedReasons: string[] = [];
  const warnings: string[] = [];
  const target = classifyTarget(options.baseUrl);
  const proofRunId = options.proofRunId.trim() || null;
  const destructiveOperations = (options.requestedOperations ?? []).filter((operation) =>
    DESTRUCTIVE_OPERATION_PATTERNS.some((pattern) => pattern.test(operation.trim())),
  );

  if (options.allow !== "1") {
    refusedReasons.push("Set LEDGERBYTE_HOSTED_TENANT_PROOF_ALLOW=1 before even planning a proof run.");
  }
  if (!proofRunId || !isValidProofRunId(proofRunId)) {
    refusedReasons.push("Provide a proofRunId of 8-128 characters using letters, numbers, dot, dash, underscore, or colon.");
  }
  if (!target.baseUrl) {
    refusedReasons.push("Provide a valid http or https base URL for classification.");
  }
  if (target.productionLooking && options.productionOverride !== PRODUCTION_OVERRIDE) {
    refusedReasons.push("Target URL is production-looking; production proof remains blocked without explicit read-only override approval.");
  }
  if (options.environment === "local" && target.baseUrl && !target.local) {
    refusedReasons.push("Local mode only accepts localhost-style targets.");
  }
  if (options.environment === "production" && options.productionOverride !== PRODUCTION_OVERRIDE) {
    refusedReasons.push("Production mode is blocked for this harness unless a later approved read-only run supplies the production override.");
  }
  if (mode !== "dry-run" && mode !== "read-only-plan") {
    refusedReasons.push("Unsupported mode. This harness only supports dry-run and read-only-plan.");
  }
  if (destructiveOperations.length > 0) {
    refusedReasons.push(`Destructive or external operations are not allowed: ${destructiveOperations.join(", ")}.`);
  }

  if (options.environment === "staging" && target.local) {
    warnings.push("Staging mode was requested with a local target; this can only validate guard wiring, not hosted behavior.");
  }
  if (options.environment === "staging" && target.baseUrl && !target.local) {
    warnings.push("Staging target classified for plan-only use. This harness still performs no network calls or writes.");
  }

  const sanitizedUrl = target.baseUrl ? redactSecrets(target.baseUrl) : null;

  return {
    safety: refusedReasons.length > 0 ? "refused" : "ready",
    environment: options.environment,
    proofRunId,
    mode,
    dryRun: true,
    networkEnabled: false,
    mutationEnabled: false,
    target: {
      baseUrl: sanitizedUrl,
      host: target.host,
      local: target.local,
      productionLooking: target.productionLooking,
    },
    requiredGate: "LEDGERBYTE_HOSTED_TENANT_PROOF_ALLOW=1",
    refusedReasons,
    warnings,
    allowedNextActions: [
      "Print this safety classification.",
      "Archive the proofRunId and target classification as sanitized evidence.",
      "Use the hosted proof plan to design future read-only checks before enabling any networked staging run.",
    ],
    prohibitedActions: [
      "No hosted/customer-data mutation.",
      "No seed, reset, delete, truncate, purge, migration, or deploy command.",
      "No Supabase or Vercel mutation command.",
      "No provider, ZATCA, Peppol, ASP, email, bank-feed, or payment-processor call.",
      "No secret, auth header, database URL, storage credential, document body, attachment body, signed XML, or QR payload logging.",
    ],
    redactionCheck: {
      secretsPrinted: false,
      secretLikeInputsRedacted: target.baseUrl !== sanitizedUrl,
    },
  };
}

export function createHostedTenantIsolationProofPlanFromCli(argv: string[], env: NodeJS.ProcessEnv): HostedTenantProofPlan {
  const environment = parseEnvironment(valueFor(argv, "--environment") || env.LEDGERBYTE_HOSTED_TENANT_PROOF_ENVIRONMENT || "local");
  const mode = parseMode(valueFor(argv, "--mode") || "dry-run");
  const proofRunId = valueFor(argv, "--proof-run-id") || env.LEDGERBYTE_HOSTED_TENANT_PROOF_RUN_ID || "";
  const baseUrl = valueFor(argv, "--base-url") || env.LEDGERBYTE_HOSTED_TENANT_PROOF_BASE_URL || "http://localhost:3001";
  return createHostedTenantIsolationProofPlan({
    environment,
    proofRunId,
    baseUrl,
    allow: env.LEDGERBYTE_HOSTED_TENANT_PROOF_ALLOW,
    productionOverride: env.LEDGERBYTE_HOSTED_TENANT_PROOF_PRODUCTION_OVERRIDE,
    mode,
    requestedOperations: argv,
  });
}

export function redactSecrets(value: string): string {
  let redacted = value.replace(/(password|passwd|pwd|token|secret|key|authorization|auth|apikey|api_key)=([^&\s]+)/gi, "$1=[REDACTED]");
  redacted = redacted.replace(/:\/\/([^:/\s]+):([^@\s]+)@/g, "://$1:[REDACTED]@");
  return redacted;
}

function classifyTarget(baseUrl: string): { baseUrl: string | null; host: string | null; local: boolean; productionLooking: boolean } {
  try {
    const url = new URL(baseUrl);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return { baseUrl: null, host: null, local: false, productionLooking: false };
    }
    const host = url.hostname.toLowerCase();
    const local = LOCAL_HOSTS.has(host);
    const targetText = `${host}${url.pathname}`;
    const productionLooking = PRODUCTION_LOOKING_PATTERNS.some((pattern) => pattern.test(targetText));
    return { baseUrl: url.toString(), host, local, productionLooking };
  } catch {
    return { baseUrl: null, host: null, local: false, productionLooking: false };
  }
}

function parseEnvironment(value: string): HostedTenantProofEnvironment {
  const normalized = value.trim().toLowerCase();
  if (normalized === "staging" || normalized === "production") {
    return normalized;
  }
  return "local";
}

function parseMode(value: string): HostedTenantProofMode {
  return value.trim().toLowerCase() === "read-only-plan" ? "read-only-plan" : "dry-run";
}

function valueFor(argv: string[], name: string): string {
  const inline = argv.find((arg) => arg.startsWith(`${name}=`));
  if (inline) {
    return inline.slice(name.length + 1);
  }
  const index = argv.indexOf(name);
  return index >= 0 && index + 1 < argv.length ? (argv[index + 1] ?? "") : "";
}

function isValidProofRunId(value: string): boolean {
  return /^[a-zA-Z0-9][a-zA-Z0-9._:-]{7,127}$/.test(value);
}
