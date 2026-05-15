const required = ["LEDGERBYTE_WEB_URL", "LEDGERBYTE_API_URL", "LEDGERBYTE_E2E_EMAIL", "LEDGERBYTE_E2E_PASSWORD"];

function readRequiredEnv(name) {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`${name} is required for deployed E2E.`);
  }
  return value.trim();
}

function normalizeUrl(value, name) {
  try {
    return new URL(value);
  } catch {
    throw new Error(`${name} must be a valid URL.`);
  }
}

async function checkReachable(label, url, options = {}) {
  let response;
  try {
    response = await fetch(url, { method: "GET", redirect: "follow" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    throw new Error(`${label} is not reachable at ${url}: ${message}`);
  }

  if (options.requireOk ? !response.ok : response.status >= 500) {
    throw new Error(`${label} returned HTTP ${response.status} at ${url}`);
  }

  return response.status;
}

async function main() {
  for (const name of required) {
    readRequiredEnv(name);
  }

  const webUrl = normalizeUrl(process.env.LEDGERBYTE_WEB_URL, "LEDGERBYTE_WEB_URL");
  const apiUrl = normalizeUrl(process.env.LEDGERBYTE_API_URL, "LEDGERBYTE_API_URL");
  const apiHealthUrl = new URL("/health", apiUrl);

  console.log(`Checking deployed web: ${webUrl.toString()}`);
  const webStatus = await checkReachable("Web app", webUrl.toString());
  console.log(`Web app reachable with HTTP ${webStatus}.`);

  console.log(`Checking deployed API health: ${apiHealthUrl.toString()}`);
  const apiStatus = await checkReachable("API health", apiHealthUrl.toString(), { requireOk: true });
  console.log(`API health reachable with HTTP ${apiStatus}.`);

  console.log("Required deployed E2E credentials are configured.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
