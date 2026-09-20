describe("same-origin browser API contract", () => {
  const previousApiUrl = process.env.NEXT_PUBLIC_API_URL;

  beforeEach(() => {
    jest.resetModules();
    process.env.NEXT_PUBLIC_API_URL = "/api";
    localStorage.clear();
    document.cookie = "ledgerbyte_csrf=; Max-Age=0; path=/";
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true }) } as Response);
  });
  afterEach(() => {
    if (previousApiUrl === undefined) delete process.env.NEXT_PUBLIC_API_URL;
    else process.env.NEXT_PUBLIC_API_URL = previousApiUrl;
    document.cookie = "ledgerbyte_csrf=; Max-Age=0; path=/";
    jest.restoreAllMocks();
  });

  it.each(["POST", "PATCH", "DELETE"])("keeps %s method, body, tenant and readable CSRF token together on the web origin", async (method) => {
    const { apiRequest, setActiveOrganizationId } = await import("./api");
    setActiveOrganizationId("synthetic-organization");
    document.cookie = "ledgerbyte_csrf=synthetic-csrf; path=/";
    const body = { name: "Synthetic contact" };
    await apiRequest("/contacts", { method, body });
    const [url, init] = jest.mocked(fetch).mock.calls[0]!;
    const headers = new Headers(init?.headers);
    expect(url).toBe("/api/contacts");
    expect(init).toMatchObject({ method, body: JSON.stringify(body), credentials: "include", cache: "no-store" });
    expect(headers.get("x-csrf-token")).toBe("synthetic-csrf");
    expect(headers.get("x-organization-id")).toBe("synthetic-organization");
    expect(headers.get("content-type")).toBe("application/json");
    expect(headers.has("authorization")).toBe(false);
  });

  it("uses the same origin for login and cookie-authenticated reads without inventing a CSRF token", async () => {
    const { apiRequest } = await import("./api");
    await apiRequest("/auth/login", { method: "POST", auth: false, organizationId: null, body: { email: "synthetic@example.test", password: "SyntheticOnly123!" } });
    await apiRequest("/contacts");
    expect(jest.mocked(fetch).mock.calls.map(([url]) => url)).toEqual(["/api/auth/login", "/api/contacts"]);
    for (const [, init] of jest.mocked(fetch).mock.calls) {
      expect(init?.credentials).toBe("include");
      expect(new Headers(init?.headers).has("x-csrf-token")).toBe(false);
      expect(new Headers(init?.headers).has("authorization")).toBe(false);
    }
  });

  it("preserves API CSRF rejection when the browser lacks the cookie", async () => {
    const { apiRequest } = await import("./api");
    jest.mocked(fetch).mockResolvedValue({
      ok: false, status: 403, headers: new Headers(),
      json: async () => ({ error: { code: "FORBIDDEN", message: "Invalid CSRF token.", requestId: "synthetic-request" } }),
    } as Response);
    await expect(apiRequest("/contacts", { method: "POST", body: {} })).rejects.toMatchObject({ message: "Invalid CSRF token.", status: 403, requestId: "synthetic-request" });
    expect(new Headers(jest.mocked(fetch).mock.calls[0]?.[1]?.headers).has("x-csrf-token")).toBe(false);
  });
});
