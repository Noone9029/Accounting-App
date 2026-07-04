export const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

const TOKEN_KEY = "ledgerbyte.accessToken";
const CSRF_COOKIE_NAME = process.env.NEXT_PUBLIC_CSRF_COOKIE_NAME ?? "ledgerbyte_csrf";
const CSRF_HEADER_NAME = process.env.NEXT_PUBLIC_CSRF_HEADER_NAME ?? "x-csrf-token";
const ORGANIZATION_KEY = "ledgerbyte.activeOrganizationId";
const LEGACY_TOKEN_KEY = "accessToken";
const LEGACY_ORGANIZATION_KEY = "organizationId";
const ORGANIZATION_CHANGED_EVENT = "ledgerbyte:organization-changed";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly details?: unknown,
  ) {
    super(message);
  }
}

interface ApiRequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  auth?: boolean;
  organizationId?: string | null;
}

export function getAccessToken(): string | null {
  clearBrowserTokenStorage();
  return null;
}

export function setAccessToken(_token: string | undefined): void {
  clearBrowserTokenStorage();
}

export function getActiveOrganizationId(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return localStorage.getItem(ORGANIZATION_KEY) ?? localStorage.getItem(LEGACY_ORGANIZATION_KEY);
}

export function setActiveOrganizationId(organizationId: string): void {
  localStorage.setItem(ORGANIZATION_KEY, organizationId);
  localStorage.removeItem(LEGACY_ORGANIZATION_KEY);
  window.dispatchEvent(new CustomEvent(ORGANIZATION_CHANGED_EVENT, { detail: organizationId }));
}

export function clearSession(): void {
  clearBrowserTokenStorage();

  if (typeof window === "undefined") {
    return;
  }

  localStorage.removeItem(ORGANIZATION_KEY);
  localStorage.removeItem(LEGACY_ORGANIZATION_KEY);
  window.dispatchEvent(new CustomEvent(ORGANIZATION_CHANGED_EVENT));
}

export async function logoutSession(): Promise<void> {
  try {
    await apiRequest<{ message: string }>("/auth/logout", { method: "POST", organizationId: null });
  } finally {
    clearSession();
  }
}

export function subscribeToOrganizationChange(listener: () => void): () => void {
  window.addEventListener(ORGANIZATION_CHANGED_EVENT, listener);
  window.addEventListener("storage", listener);

  return () => {
    window.removeEventListener(ORGANIZATION_CHANGED_EVENT, listener);
    window.removeEventListener("storage", listener);
  };
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);
  const method = options.method ?? (options.body === undefined ? "GET" : "POST");

  if (options.body !== undefined && !(options.body instanceof FormData)) {
    headers.set("content-type", "application/json");
  }

  if (!headers.has(CSRF_HEADER_NAME) && isUnsafeMethod(method)) {
    const csrfToken = readCookie(CSRF_COOKIE_NAME);
    if (csrfToken) {
      headers.set(CSRF_HEADER_NAME, csrfToken);
    }
  }

  const organizationId = options.organizationId === undefined ? getActiveOrganizationId() : options.organizationId;
  if (organizationId) {
    headers.set("x-organization-id", organizationId);
  }

  if (!headers.has("cache-control")) {
    headers.set("cache-control", "no-store");
  }
  if (!headers.has("pragma")) {
    headers.set("pragma", "no-cache");
  }

  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    method,
    cache: options.cache ?? "no-store",
    credentials: options.credentials ?? "include",
    headers,
    body: serializeBody(options.body),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiError(readErrorMessage(body, response.status), response.status, body);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

function serializeBody(body: unknown): BodyInit | undefined {
  if (body === undefined) {
    return undefined;
  }

  if (body instanceof FormData || typeof body === "string") {
    return body;
  }

  return JSON.stringify(body);
}

function readErrorMessage(body: unknown, status: number): string {
  if (isRecord(body)) {
    const message = body.message;

    if (typeof message === "string") {
      return message;
    }

    if (Array.isArray(message)) {
      return message.filter((item): item is string => typeof item === "string").join(" ");
    }

    if (isRecord(message) && typeof message.message === "string") {
      return message.message;
    }

    if (typeof body.error === "string") {
      return body.error;
    }
  }

  return `Request failed with ${status}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function clearBrowserTokenStorage(): void {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(LEGACY_TOKEN_KEY);
}

function isUnsafeMethod(method: string): boolean {
  return ["POST", "PUT", "PATCH", "DELETE"].includes(method.toUpperCase());
}

function readCookie(name: string): string | null {
  if (typeof document === "undefined") {
    return null;
  }

  for (const part of document.cookie.split(";")) {
    const [rawName, ...rawValue] = part.trim().split("=");
    if (rawName === name) {
      return decodeURIComponent(rawValue.join("="));
    }
  }

  return null;
}
