const DEFAULT_SMOKE_REQUEST_TIMEOUT_MS = 60000;
const UUID_PATTERN = /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/gi;
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "0.0.0.0"]);
export const OWNER_APPROVAL_PHRASE = "I_UNDERSTAND_THIS_MUTATES_A_DISPOSABLE_NON_PRODUCTION_TARGET";

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

interface SmokeFetchOptions {
  apiUrl: string;
  timeoutMs: number;
  progress: boolean;
  fetchImpl?: FetchLike;
  logger?: Pick<Console, "log">;
}

export const parseSmokeRequestTimeout = (value: string | undefined, fallback = DEFAULT_SMOKE_REQUEST_TIMEOUT_MS): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const smokeProgressEnabled = (value: string | undefined): boolean => value === "true";

export const isLocalSmokeTargetUrl = (value: string): boolean => {
  try {
    return LOCAL_HOSTS.has(new URL(value).hostname.toLowerCase());
  } catch {
    return false;
  }
};

const isTruthy = (value: string | undefined): boolean => /^(1|true|yes)$/i.test(String(value ?? ""));

const isProductionLikeEnvironment = (env: Record<string, string | undefined>): boolean =>
  [env.NODE_ENV, env.VERCEL_ENV, env.LEDGERBYTE_ENV, env.LEDGERBYTE_DEPLOY_ENV, env.LEDGERBYTE_TARGET_ENV].some((value) => /^(prod|production)$/i.test(String(value ?? "")));

const isProductionLikeUrl = (value: string): boolean => {
  try {
    return /(^|[.-])(prod|production)([.-]|$)/i.test(new URL(value).hostname.toLowerCase());
  } catch {
    return false;
  }
};

export const assertSmokeMutationTargetAllowed = (apiUrl: string, env: Record<string, string | undefined> = process.env): void => {
  if (isProductionLikeEnvironment(env) || isProductionLikeUrl(apiUrl)) {
    throw new Error("Accounting smoke scripts refuse production-like environments and targets.");
  }
  if (isLocalSmokeTargetUrl(apiUrl)) {
    return;
  }
  if (
    !isTruthy(env.LEDGERBYTE_SMOKE_ALLOW_REMOTE_MUTATION) ||
    env.LEDGERBYTE_SMOKE_TARGET_CLASS !== "disposable-non-production" ||
    env.LEDGERBYTE_SMOKE_OWNER_APPROVAL !== OWNER_APPROVAL_PHRASE
  ) {
    throw new Error(
      `Accounting smoke scripts require explicit owner approval for remote mutation targets: LEDGERBYTE_SMOKE_ALLOW_REMOTE_MUTATION=true, LEDGERBYTE_SMOKE_TARGET_CLASS=disposable-non-production, and LEDGERBYTE_SMOKE_OWNER_APPROVAL=${OWNER_APPROVAL_PHRASE}.`,
    );
  }
};

export const safeRouteLabel = (method: string | undefined, path: string): string => {
  const [pathname, query] = path.split("?", 2);
  const safePath = (pathname || path).replace(UUID_PATTERN, ":id");
  return `${method ?? "GET"} ${safePath}${query ? "?..." : ""}`;
};

export const fetchSmokeApi = async (path: string, init: RequestInit, options: SmokeFetchOptions): Promise<Response> => {
  const method = init.method ?? "GET";
  const label = safeRouteLabel(method, path);
  const fetchImpl = options.fetchImpl ?? fetch;
  const logger = options.logger ?? console;
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort(new Error(`Smoke request timed out after ${options.timeoutMs}ms: ${label}`));
  }, options.timeoutMs);
  const startedAt = Date.now();

  if (options.progress) {
    logger.log(`[smoke-fetch:start] ${label}`);
  }

  try {
    const response = await fetchImpl(`${options.apiUrl}${path}`, {
      ...init,
      signal: init.signal ?? controller.signal,
    });
    if (options.progress) {
      logger.log(`[smoke-fetch:done] ${label} -> ${response.status} (${Date.now() - startedAt}ms)`);
    }
    return response;
  } catch (error) {
    if (options.progress) {
      logger.log(`[smoke-fetch:error] ${label} -> ${error instanceof Error ? error.message : String(error)}`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
};
