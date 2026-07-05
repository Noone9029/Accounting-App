export type HostedTenantProofEnvironment = "local" | "staging" | "production";
export type HostedTenantProofMode =
  | "dry-run"
  | "read-only-plan"
  | "staging-read-only-probe"
  | "staging-synthetic-proof"
  | "production-read-only-posture";
export type HostedTenantProofSafety = "ready" | "refused";

export type HostedTenantProofOptions = {
  environment: HostedTenantProofEnvironment;
  requestedEnvironmentName?: string | undefined;
  proofRunId: string;
  baseUrl: string;
  allow: string | undefined;
  readonlyAllow?: string | undefined;
  stagingMutationAllow?: string | undefined;
  productionOverride?: string | undefined;
  authToken?: string | undefined;
  tenantAId?: string | undefined;
  tenantBId?: string | undefined;
  mode?: HostedTenantProofMode | undefined;
  requestedOperations?: string[] | undefined;
};

export type HostedTenantProofExecutionContract = {
  stage: HostedTenantProofMode;
  networkRequired: boolean;
  mutationRequired: boolean;
  networkEnabled: false;
  mutationEnabled: false;
  proofRunIdRequired: boolean;
  syntheticDataLabel: string | null;
  cleanupScope: "proofRunId-only" | "blocked";
  requiredVariables: string[];
  missingVariables: string[];
  auth: {
    tokenPresent: boolean;
    tokenPrinted: false;
    tenantAIdPresent: boolean;
    tenantBIdPresent: boolean;
  };
  safeExecutionStatus:
    | "classification-only"
    | "ready-for-staging-read-only-probe-adapter"
    | "ready-for-staging-synthetic-proof-adapter"
    | "refused";
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
    stagingLooking: boolean;
  };
  requiredGate: "LEDGERBYTE_HOSTED_TENANT_PROOF_ALLOW=1";
  missingVariables: string[];
  executionContract: HostedTenantProofExecutionContract;
  refusedReasons: string[];
  warnings: string[];
  allowedNextActions: string[];
  prohibitedActions: string[];
  redactionCheck: {
    secretsPrinted: false;
    secretLikeInputsRedacted: boolean;
  };
};

export type HostedTenantProofHttpRequest = {
  method: "GET";
  url: string;
  headers: Record<string, string>;
};

export type HostedTenantProofHttpResponse = {
  status: number;
};

export type HostedTenantProofHttpClient = (request: HostedTenantProofHttpRequest) => Promise<HostedTenantProofHttpResponse>;

export type HostedTenantReadOnlyProbeCheck = {
  id: string;
  method: "GET";
  path: string;
  organizationContext: "none" | "tenantA" | "tenantB";
  expectedStatus: "2xx" | "403";
  status: number | null;
  passed: boolean;
  failure: "request-failed" | "unexpected-status" | null;
  responseBodyCaptured: false;
};

export type HostedTenantReadOnlyProbeResult = {
  safety: HostedTenantProofSafety;
  mode: "staging-read-only-probe";
  passed: boolean;
  networkAttempted: boolean;
  mutationAttempted: false;
  target: HostedTenantProofPlan["target"];
  checks: HostedTenantReadOnlyProbeCheck[];
  refusedReasons: string[];
  warnings: string[];
  redactionCheck: {
    secretsPrinted: false;
    responseBodiesPrinted: false;
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

const STAGING_LOOKING_PATTERNS = [
  /(^|[.\-_/])stag(?:e|ing)?($|[.\-_/])/i,
  /(^|[.\-_/])proof($|[.\-_/])/i,
  /(^|[.\-_/])test($|[.\-_/])/i,
  /(^|[.\-_/])sandbox($|[.\-_/])/i,
];

const DESTRUCTIVE_OPERATION_PATTERNS = [
  /^--?(?:seed|reset|delete|truncate|drop|purge|migrate|deploy)$/i,
  /^--?(?:call-zatca|call-peppol|call-asp|call-provider|send-email|connect-bank-feed|connect-payment-processor)$/i,
];

const PRODUCTION_OVERRIDE = "I_UNDERSTAND_PRODUCTION_IS_READ_ONLY_AND_APPROVED";
const READ_ONLY_PROBE_TIMEOUT_MS = 15_000;

export function createHostedTenantIsolationProofPlan(options: HostedTenantProofOptions): HostedTenantProofPlan {
  const mode = options.mode ?? "dry-run";
  const refusedReasons: string[] = [];
  const warnings: string[] = [];
  const missingVariables: string[] = [];
  const target = classifyTarget(options.baseUrl);
  const proofRunId = options.proofRunId.trim() || null;
  const validProofRunId = proofRunId ? isValidProofRunId(proofRunId) : false;
  const environmentNameProductionLike = isProductionLikeEnvironmentName(options.requestedEnvironmentName ?? options.environment);
  const destructiveOperations = (options.requestedOperations ?? []).filter((operation) =>
    DESTRUCTIVE_OPERATION_PATTERNS.some((pattern) => pattern.test(operation.trim())),
  );
  const requiredVariables = requiredVariablesFor(mode);

  for (const variable of requiredVariables) {
    if (variable === "LEDGERBYTE_HOSTED_TENANT_PROOF_ALLOW" && options.allow !== "1") {
      missingVariables.push(variable);
    }
    if (variable === "LEDGERBYTE_HOSTED_TENANT_PROOF_READONLY_ALLOW" && options.readonlyAllow !== "1") {
      missingVariables.push(variable);
    }
    if (variable === "LEDGERBYTE_HOSTED_TENANT_PROOF_STAGING_MUTATION_ALLOW" && options.stagingMutationAllow !== "1") {
      missingVariables.push(variable);
    }
    if (variable === "LEDGERBYTE_HOSTED_TENANT_PROOF_RUN_ID" && !validProofRunId) {
      missingVariables.push(variable);
    }
    if (variable === "LEDGERBYTE_HOSTED_TENANT_PROOF_AUTH_TOKEN" && !hasValue(options.authToken)) {
      missingVariables.push(variable);
    }
    if (variable === "LEDGERBYTE_HOSTED_TENANT_PROOF_TENANT_A_ID" && !hasValue(options.tenantAId)) {
      missingVariables.push(variable);
    }
    if (variable === "LEDGERBYTE_HOSTED_TENANT_PROOF_TENANT_B_ID" && !hasValue(options.tenantBId)) {
      missingVariables.push(variable);
    }
  }

  if (mode !== "dry-run" && options.allow !== "1") {
    refusedReasons.push("Set LEDGERBYTE_HOSTED_TENANT_PROOF_ALLOW=1 before even planning a proof run.");
  }
  if (!validProofRunId && mode !== "dry-run") {
    refusedReasons.push("Provide a proofRunId of 8-128 characters using letters, numbers, dot, dash, underscore, or colon.");
  }
  if (!target.baseUrl) {
    refusedReasons.push("Provide a valid http or https base URL for classification.");
  }
  if (environmentNameProductionLike && mode !== "production-read-only-posture") {
    refusedReasons.push("Requested environment name is production-like; only production-read-only-posture may classify it and it remains non-mutating.");
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
  if (mode === "staging-read-only-probe" || mode === "staging-synthetic-proof") {
    if (options.environment !== "staging") {
      refusedReasons.push("Staging proof modes require LEDGERBYTE_HOSTED_TENANT_PROOF_ENVIRONMENT=staging.");
    }
    if (target.local) {
      refusedReasons.push("Staging proof modes require a staging or dedicated proof URL, not a localhost target.");
    }
    if (target.baseUrl && !target.stagingLooking) {
      refusedReasons.push("Staging proof modes require a target that is clearly staging, sandbox, test, or dedicated proof.");
    }
    if (options.readonlyAllow !== "1") {
      refusedReasons.push("Set LEDGERBYTE_HOSTED_TENANT_PROOF_READONLY_ALLOW=1 before staging read-only probes.");
    }
    if (!hasValue(options.authToken)) {
      refusedReasons.push("Provide LEDGERBYTE_HOSTED_TENANT_PROOF_AUTH_TOKEN for staging proof modes; it will not be printed.");
    }
    if (!hasValue(options.tenantAId) || !hasValue(options.tenantBId)) {
      refusedReasons.push("Provide both synthetic proof tenant identifiers before staging proof modes.");
    }
  }
  if (mode === "staging-synthetic-proof" && options.stagingMutationAllow !== "1") {
    refusedReasons.push("Set LEDGERBYTE_HOSTED_TENANT_PROOF_STAGING_MUTATION_ALLOW=1 before staging synthetic proof mutation.");
  }
  if (destructiveOperations.length > 0) {
    refusedReasons.push(`Destructive or external operations are not allowed: ${destructiveOperations.join(", ")}.`);
  }

  if (!validProofRunId && mode === "dry-run") {
    missingVariables.push("LEDGERBYTE_HOSTED_TENANT_PROOF_RUN_ID");
    warnings.push("Dry-run classification did not receive a proofRunId; execution modes remain blocked until one is supplied.");
  }
  if (options.environment === "staging" && target.local) {
    warnings.push("Staging mode was requested with a local target; this can only validate guard wiring, not hosted behavior.");
  }
  if (options.environment === "staging" && target.baseUrl && !target.local) {
    warnings.push("Staging target classified. The safety plan performs no network calls or writes; the read-only probe adapter runs only after all staging gates pass.");
  }

  const sanitizedUrl = target.baseUrl ? redactSecrets(target.baseUrl) : null;
  const executionContract = createExecutionContract({
    mode,
    proofRunId,
    validProofRunId,
    requiredVariables,
    missingVariables,
    authToken: options.authToken,
    tenantAId: options.tenantAId,
    tenantBId: options.tenantBId,
    refused: refusedReasons.length > 0,
  });

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
      stagingLooking: target.stagingLooking,
    },
    requiredGate: "LEDGERBYTE_HOSTED_TENANT_PROOF_ALLOW=1",
    missingVariables: Array.from(new Set(missingVariables)),
    executionContract,
    refusedReasons,
    warnings,
    allowedNextActions: [
      "Print this safety classification.",
      "Archive the proofRunId and target classification as sanitized evidence.",
      "Run staging-read-only-probe only after staging URL, auth, synthetic tenant IDs, and read-only allow gates are present.",
      "Run staging-synthetic-proof only after the read-only probe passes and the explicit staging mutation gate is present.",
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
  return createHostedTenantIsolationProofPlan(createHostedTenantIsolationProofOptionsFromCli(argv, env));
}

export function createHostedTenantIsolationProofOptionsFromCli(argv: string[], env: NodeJS.ProcessEnv): HostedTenantProofOptions {
  const requestedEnvironmentName = valueFor(argv, "--environment") || env.LEDGERBYTE_HOSTED_TENANT_PROOF_ENVIRONMENT || "local";
  const environment = parseEnvironment(requestedEnvironmentName);
  const mode = parseMode(valueFor(argv, "--mode") || "dry-run");
  const proofRunId = valueFor(argv, "--proof-run-id") || env.LEDGERBYTE_HOSTED_TENANT_PROOF_RUN_ID || "";
  const baseUrl = valueFor(argv, "--base-url") || env.LEDGERBYTE_HOSTED_TENANT_PROOF_BASE_URL || "http://localhost:3001";
  return {
    environment,
    requestedEnvironmentName,
    proofRunId,
    baseUrl,
    allow: env.LEDGERBYTE_HOSTED_TENANT_PROOF_ALLOW,
    readonlyAllow: env.LEDGERBYTE_HOSTED_TENANT_PROOF_READONLY_ALLOW,
    stagingMutationAllow: env.LEDGERBYTE_HOSTED_TENANT_PROOF_STAGING_MUTATION_ALLOW,
    productionOverride: env.LEDGERBYTE_HOSTED_TENANT_PROOF_PRODUCTION_OVERRIDE,
    authToken: env.LEDGERBYTE_HOSTED_TENANT_PROOF_AUTH_TOKEN,
    tenantAId: env.LEDGERBYTE_HOSTED_TENANT_PROOF_TENANT_A_ID,
    tenantBId: env.LEDGERBYTE_HOSTED_TENANT_PROOF_TENANT_B_ID,
    mode,
    requestedOperations: argv,
  };
}

export function formatHostedTenantIsolationProofSummary(plan: HostedTenantProofPlan): string {
  const missing = plan.missingVariables.length > 0 ? plan.missingVariables.join(",") : "none";
  const refused = plan.refusedReasons.length > 0 ? plan.refusedReasons.join(" | ") : "none";
  return [
    `safety=${plan.safety}`,
    `environment=${plan.environment}`,
    `mode=${plan.mode}`,
    `proofRunId=${plan.proofRunId ?? "missing"}`,
    `targetHost=${plan.target.host ?? "invalid"}`,
    `productionLooking=${plan.target.productionLooking}`,
    `stagingLooking=${plan.target.stagingLooking}`,
    `networkEnabled=${plan.networkEnabled}`,
    `mutationEnabled=${plan.mutationEnabled}`,
    `missingVariables=${missing}`,
    `refusedReasons=${refused}`,
  ].join("\n");
}

export async function executeHostedTenantReadOnlyProbe(
  options: HostedTenantProofOptions,
  httpClient: HostedTenantProofHttpClient = defaultHostedTenantProofHttpClient,
): Promise<HostedTenantReadOnlyProbeResult> {
  const plan = createHostedTenantIsolationProofPlan(options);
  const warnings = [...plan.warnings];

  if (plan.mode !== "staging-read-only-probe") {
    return createRefusedReadOnlyProbeResult(plan, ["Read-only probe execution requires --mode staging-read-only-probe."], warnings);
  }

  if (plan.safety !== "ready") {
    return createRefusedReadOnlyProbeResult(plan, plan.refusedReasons, warnings);
  }

  const authToken = options.authToken?.trim();
  const tenantAId = options.tenantAId?.trim();
  const tenantBId = options.tenantBId?.trim();
  if (!authToken || !tenantAId || !tenantBId || !plan.target.baseUrl) {
    return createRefusedReadOnlyProbeResult(plan, ["Staging read-only probe is missing auth token, tenant IDs, or target URL."], warnings);
  }

  const checks: HostedTenantReadOnlyProbeCheck[] = [];
  const specs = createReadOnlyProbeSpecs(plan.proofRunId ?? options.proofRunId, tenantAId, tenantBId);

  for (const spec of specs) {
    const request: HostedTenantProofHttpRequest = {
      method: "GET",
      url: buildProbeUrl(options.baseUrl, spec.path),
      headers: createProbeHeaders(authToken, spec.organizationId),
    };

    try {
      const response = await httpClient(request);
      const passed = statusMatchesExpectation(response.status, spec.expectedStatus);
      checks.push({
        id: spec.id,
        method: "GET",
        path: spec.path,
        organizationContext: spec.organizationContext,
        expectedStatus: spec.expectedStatus,
        status: response.status,
        passed,
        failure: passed ? null : "unexpected-status",
        responseBodyCaptured: false,
      });
    } catch {
      checks.push({
        id: spec.id,
        method: "GET",
        path: spec.path,
        organizationContext: spec.organizationContext,
        expectedStatus: spec.expectedStatus,
        status: null,
        passed: false,
        failure: "request-failed",
        responseBodyCaptured: false,
      });
    }
  }

  return {
    safety: "ready",
    mode: "staging-read-only-probe",
    passed: checks.every((check) => check.passed),
    networkAttempted: true,
    mutationAttempted: false,
    target: plan.target,
    checks,
    refusedReasons: [],
    warnings,
    redactionCheck: {
      secretsPrinted: false,
      responseBodiesPrinted: false,
    },
  };
}

export function redactSecrets(value: string): string {
  let redacted = value.replace(/(password|passwd|pwd|token|secret|key|authorization|auth|apikey|api_key)=([^&\s]+)/gi, "$1=[REDACTED]");
  redacted = redacted.replace(/:\/\/([^:/\s]+):([^@\s]+)@/g, "://$1:[REDACTED]@");
  return redacted;
}

function classifyTarget(baseUrl: string): {
  baseUrl: string | null;
  host: string | null;
  local: boolean;
  productionLooking: boolean;
  stagingLooking: boolean;
} {
  try {
    const url = new URL(baseUrl);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return { baseUrl: null, host: null, local: false, productionLooking: false, stagingLooking: false };
    }
    const host = url.hostname.toLowerCase();
    const local = LOCAL_HOSTS.has(host);
    const targetText = `${host}${url.pathname}`;
    const productionLooking = PRODUCTION_LOOKING_PATTERNS.some((pattern) => pattern.test(targetText));
    const stagingLooking = STAGING_LOOKING_PATTERNS.some((pattern) => pattern.test(targetText));
    return { baseUrl: url.toString(), host, local, productionLooking, stagingLooking };
  } catch {
    return { baseUrl: null, host: null, local: false, productionLooking: false, stagingLooking: false };
  }
}

function parseEnvironment(value: string): HostedTenantProofEnvironment {
  const normalized = value.trim().toLowerCase();
  if (normalized === "staging" || normalized === "stage" || normalized === "sandbox" || normalized === "test" || normalized === "proof") {
    return "staging";
  }
  if (normalized === "production" || normalized === "prod" || normalized === "live" || normalized === "customer" || normalized === "customers") {
    return "production";
  }
  return "local";
}

function parseMode(value: string): HostedTenantProofMode {
  const normalized = value.trim().toLowerCase();
  if (
    normalized === "read-only-plan" ||
    normalized === "staging-read-only-probe" ||
    normalized === "staging-synthetic-proof" ||
    normalized === "production-read-only-posture"
  ) {
    return normalized;
  }
  return "dry-run";
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

function requiredVariablesFor(mode: HostedTenantProofMode): string[] {
  if (mode === "dry-run") {
    return [];
  }
  if (mode === "read-only-plan" || mode === "production-read-only-posture") {
    return ["LEDGERBYTE_HOSTED_TENANT_PROOF_ALLOW", "LEDGERBYTE_HOSTED_TENANT_PROOF_RUN_ID"];
  }
  const readOnlyVariables = [
    "LEDGERBYTE_HOSTED_TENANT_PROOF_ALLOW",
    "LEDGERBYTE_HOSTED_TENANT_PROOF_READONLY_ALLOW",
    "LEDGERBYTE_HOSTED_TENANT_PROOF_RUN_ID",
    "LEDGERBYTE_HOSTED_TENANT_PROOF_AUTH_TOKEN",
    "LEDGERBYTE_HOSTED_TENANT_PROOF_TENANT_A_ID",
    "LEDGERBYTE_HOSTED_TENANT_PROOF_TENANT_B_ID",
  ];
  if (mode === "staging-synthetic-proof") {
    return [...readOnlyVariables, "LEDGERBYTE_HOSTED_TENANT_PROOF_STAGING_MUTATION_ALLOW"];
  }
  return readOnlyVariables;
}

function createExecutionContract(args: {
  mode: HostedTenantProofMode;
  proofRunId: string | null;
  validProofRunId: boolean;
  requiredVariables: string[];
  missingVariables: string[];
  authToken?: string | undefined;
  tenantAId?: string | undefined;
  tenantBId?: string | undefined;
  refused: boolean;
}): HostedTenantProofExecutionContract {
  const networkRequired = args.mode === "staging-read-only-probe" || args.mode === "staging-synthetic-proof";
  const mutationRequired = args.mode === "staging-synthetic-proof";
  const syntheticDataLabel = args.validProofRunId && args.proofRunId ? `LB-TENANT-PROOF:${args.proofRunId}` : null;
  return {
    stage: args.mode,
    networkRequired,
    mutationRequired,
    networkEnabled: false,
    mutationEnabled: false,
    proofRunIdRequired: args.mode !== "dry-run",
    syntheticDataLabel,
    cleanupScope: syntheticDataLabel ? "proofRunId-only" : "blocked",
    requiredVariables: args.requiredVariables,
    missingVariables: Array.from(new Set(args.missingVariables)),
    auth: {
      tokenPresent: hasValue(args.authToken),
      tokenPrinted: false,
      tenantAIdPresent: hasValue(args.tenantAId),
      tenantBIdPresent: hasValue(args.tenantBId),
    },
    safeExecutionStatus: args.refused
      ? "refused"
      : args.mode === "staging-read-only-probe"
        ? "ready-for-staging-read-only-probe-adapter"
        : args.mode === "staging-synthetic-proof"
          ? "ready-for-staging-synthetic-proof-adapter"
          : "classification-only",
  };
}

function hasValue(value: string | undefined): boolean {
  return Boolean(value?.trim());
}

function isProductionLikeEnvironmentName(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return normalized === "production" || normalized === "prod" || normalized === "live" || normalized === "customer" || normalized === "customers";
}

type ReadOnlyProbeSpec = {
  id: string;
  path: string;
  organizationContext: HostedTenantReadOnlyProbeCheck["organizationContext"];
  organizationId: string | null;
  expectedStatus: HostedTenantReadOnlyProbeCheck["expectedStatus"];
};

async function defaultHostedTenantProofHttpClient(request: HostedTenantProofHttpRequest): Promise<HostedTenantProofHttpResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), READ_ONLY_PROBE_TIMEOUT_MS);

  try {
    const response = await fetch(request.url, {
      method: request.method,
      headers: request.headers,
      signal: controller.signal,
    });
    return { status: response.status };
  } finally {
    clearTimeout(timeout);
  }
}

function createRefusedReadOnlyProbeResult(
  plan: HostedTenantProofPlan,
  refusedReasons: string[],
  warnings: string[],
): HostedTenantReadOnlyProbeResult {
  return {
    safety: "refused",
    mode: "staging-read-only-probe",
    passed: false,
    networkAttempted: false,
    mutationAttempted: false,
    target: plan.target,
    checks: [],
    refusedReasons,
    warnings,
    redactionCheck: {
      secretsPrinted: false,
      responseBodiesPrinted: false,
    },
  };
}

function createReadOnlyProbeSpecs(proofRunId: string, tenantAId: string, tenantBId: string): ReadOnlyProbeSpec[] {
  return [
    {
      id: "auth-me",
      path: "/auth/me",
      organizationContext: "none",
      organizationId: null,
      expectedStatus: "2xx",
    },
    {
      id: "tenant-a-dashboard-summary",
      path: "/dashboard/summary",
      organizationContext: "tenantA",
      organizationId: tenantAId,
      expectedStatus: "2xx",
    },
    {
      id: "tenant-a-search-proof-marker",
      path: `/search?query=${encodeURIComponent(`LB-TENANT-PROOF:${proofRunId}`)}`,
      organizationContext: "tenantA",
      organizationId: tenantAId,
      expectedStatus: "2xx",
    },
    {
      id: "tenant-a-profit-and-loss",
      path: "/reports/profit-and-loss?from=2026-01-01&to=2026-12-31",
      organizationContext: "tenantA",
      organizationId: tenantAId,
      expectedStatus: "2xx",
    },
    {
      id: "tenant-b-dashboard-summary-denied",
      path: "/dashboard/summary",
      organizationContext: "tenantB",
      organizationId: tenantBId,
      expectedStatus: "403",
    },
  ];
}

function createProbeHeaders(authToken: string, organizationId: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${authToken}`,
    "Cache-Control": "no-store",
    Pragma: "no-cache",
  };

  if (organizationId) {
    headers["x-organization-id"] = organizationId;
  }

  return headers;
}

function buildProbeUrl(baseUrl: string, path: string): string {
  const base = new URL(baseUrl);
  const endpoint = new URL(path, "http://ledgerbyte.local");
  const basePath = base.pathname === "/" ? "" : base.pathname.replace(/\/$/, "");
  base.pathname = `${basePath}${endpoint.pathname}`;
  base.search = endpoint.search;
  base.hash = "";
  return base.toString();
}

function statusMatchesExpectation(status: number, expectedStatus: HostedTenantReadOnlyProbeCheck["expectedStatus"]): boolean {
  if (expectedStatus === "2xx") {
    return status >= 200 && status < 300;
  }

  return status === 403;
}
