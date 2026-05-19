const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "0.0.0.0"]);

function isLocalTargetUrl(value) {
  try {
    const hostname = new URL(value).hostname.toLowerCase();
    return LOCAL_HOSTS.has(hostname);
  } catch {
    return false;
  }
}

function resolveTestCredentials(options) {
  const env = options.env ?? process.env;
  const label = options.label ?? "Test";
  const targetUrls = options.targetUrls ?? [];
  const defaultEmail = options.defaultEmail ?? "admin@example.com";
  const defaultPassword = options.defaultPassword ?? "Password123!";
  const email = nonEmptyTrimmed(env[options.emailVar]);
  const password = nonEmpty(env[options.passwordVar]);
  const deployedTarget = targetUrls.some((url) => url && !isLocalTargetUrl(url));
  const generatedOverride = isTruthy(env.LEDGERBYTE_ALLOW_GENERATED_TEST_USER);

  if (deployedTarget && (!email || !password) && !generatedOverride) {
    throw new Error(
      [
        `${label} credentials must be provided explicitly for deployed targets.`,
        `Set ${options.emailVar} and ${options.passwordVar} from the secret store.`,
        "Local demo defaults are allowed only for local targets.",
        "For isolated non-production debugging only, set LEDGERBYTE_ALLOW_GENERATED_TEST_USER=true.",
      ].join(" "),
    );
  }

  return {
    email: email ?? defaultEmail,
    password: password ?? defaultPassword,
    source: email && password ? "explicit" : generatedOverride ? "generated-override" : "local-default",
    deployedTarget,
  };
}

function nonEmptyTrimmed(value) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function nonEmpty(value) {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function isTruthy(value) {
  return /^(1|true|yes)$/i.test(String(value ?? ""));
}

module.exports = {
  isLocalTargetUrl,
  resolveTestCredentials,
};
