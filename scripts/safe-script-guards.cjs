const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "0.0.0.0"]);
const OWNER_APPROVAL_PHRASE = "I_UNDERSTAND_THIS_MUTATES_A_DISPOSABLE_NON_PRODUCTION_TARGET";

function isLocalTargetUrl(value) {
  try {
    return LOCAL_HOSTS.has(new URL(value).hostname.toLowerCase());
  } catch {
    return false;
  }
}

function isTruthy(value) {
  return /^(1|true|yes)$/i.test(String(value ?? ""));
}

function isProductionLikeEnvironment(env = process.env) {
  return [env.NODE_ENV, env.VERCEL_ENV, env.LEDGERBYTE_ENV, env.LEDGERBYTE_DEPLOY_ENV, env.LEDGERBYTE_TARGET_ENV].some((value) =>
    /^(prod|production)$/i.test(String(value ?? "")),
  );
}

function isProductionLikeUrl(value) {
  try {
    const host = new URL(value).hostname.toLowerCase();
    return /(^|[.-])(prod|production)([.-]|$)/i.test(host);
  } catch {
    return false;
  }
}

function hasCliFlag(argv = process.argv, flag) {
  return Array.isArray(argv) && argv.includes(flag);
}

function assertNonProductionEnvironment(scriptName, env = process.env, apiUrl) {
  if (isProductionLikeEnvironment(env) || (apiUrl && isProductionLikeUrl(apiUrl))) {
    throw new Error(`${scriptName} refuses production-like environments and targets.`);
  }
}

function assertLocalOnlyApiTarget(input) {
  const {
    scriptName,
    apiUrl,
    env = process.env,
    argv = process.argv,
    approvalEnvVar = "LEDGERBYTE_ALLOW_LOCAL_ZATCA_SCRIPT",
    approvalFlag = "--allow-local-api",
  } = input;

  assertNonProductionEnvironment(scriptName, env, apiUrl);

  if (!isLocalTargetUrl(apiUrl)) {
    throw new Error(`${scriptName} is restricted to local API targets only; real hosted/API provider execution is blocked.`);
  }

  if (!isTruthy(env[approvalEnvVar]) && !hasCliFlag(argv, approvalFlag)) {
    throw new Error(`${scriptName} requires ${approvalFlag} or ${approvalEnvVar}=true before local API workflow execution.`);
  }
}

function assertOwnerApprovedDisposableTarget(input) {
  const { scriptName, apiUrl, env = process.env, allowRemoteVar, targetClassVar, approvalVar } = input;

  assertNonProductionEnvironment(scriptName, env, apiUrl);

  if (isLocalTargetUrl(apiUrl)) {
    return;
  }

  const allowRemote = isTruthy(env[allowRemoteVar]);
  const targetClass = String(env[targetClassVar] ?? "");
  const approval = String(env[approvalVar] ?? "");
  if (!allowRemote || targetClass !== "disposable-non-production" || approval !== OWNER_APPROVAL_PHRASE) {
    throw new Error(
      `${scriptName} requires explicit owner approval for remote mutation targets: ${allowRemoteVar}=true, ${targetClassVar}=disposable-non-production, and ${approvalVar}=${OWNER_APPROVAL_PHRASE}.`,
    );
  }
}

function redactSensitiveText(value, extraSecrets = []) {
  let redacted = String(value ?? "")
    .replace(/-----BEGIN [^-]*PRIVATE KEY-----[\s\S]*?-----END [^-]*PRIVATE KEY-----/gi, "[REDACTED]")
    .replace(/\b(postgresql|postgres):\/\/[^\s"'<>]+/gi, "$1://[REDACTED]")
    .replace(/\b(DATABASE_URL|DIRECT_URL|SERVICE_ROLE|SMTP_PASSWORD|JWT_SECRET|S3_SECRET_ACCESS_KEY|ZATCA_PRIVATE_KEY|UAE_ASP_API_KEY|UAE_ASP_WEBHOOK_SECRET)\s*[:=]\s*[^\s,;]+/gi, "$1=[REDACTED]")
    .replace(/\b(password|passwordHash|token|tokenHash|secret|apiKey|accessKey|privateKey|privateKeyPem|authorization|contentBase64)\s*[:=]\s*[^\s,;]+/gi, "$1=[REDACTED]")
    .replace(/Authorization:\s*Bearer\s+[^\s,;]+/gi, "Authorization: Bearer [REDACTED]")
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/g, "Bearer [REDACTED]");

  for (const secret of extraSecrets.filter(Boolean)) {
    redacted = redacted.replace(new RegExp(escapeRegExp(secret), "g"), "[REDACTED]");
  }
  return redacted;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

module.exports = {
  OWNER_APPROVAL_PHRASE,
  assertLocalOnlyApiTarget,
  assertNonProductionEnvironment,
  assertOwnerApprovedDisposableTarget,
  isLocalTargetUrl,
  isProductionLikeEnvironment,
  isProductionLikeUrl,
  redactSensitiveText,
};
