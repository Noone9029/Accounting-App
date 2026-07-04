import { apiRequest, setAccessToken } from "./api";

describe("apiRequest browser session handling", () => {
  beforeEach(() => {
    localStorage.clear();
    document.cookie = "ledgerbyte_csrf=; Max-Age=0; path=/";
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true }),
    } as Response);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it("does not persist browser auth tokens", () => {
    localStorage.setItem("accessToken", "legacy-token");

    setAccessToken("new-token");

    expect(localStorage.getItem("ledgerbyte.accessToken")).toBeNull();
    expect(localStorage.getItem("accessToken")).toBeNull();
  });

  it("sends browser requests with credentials and without bearer authorization", async () => {
    localStorage.setItem("ledgerbyte.accessToken", "stored-token");

    await apiRequest("/auth/me");

    const init = jest.mocked(fetch).mock.calls[0]?.[1] as RequestInit;
    const headers = new Headers(init.headers);

    expect(init.credentials).toBe("include");
    expect(headers.has("authorization")).toBe(false);
  });

  it("adds the CSRF header for unsafe requests when the CSRF cookie is present", async () => {
    document.cookie = "ledgerbyte_csrf=csrf-token; path=/";

    await apiRequest("/sales-invoices", { method: "POST", body: { invoiceNumber: "INV-1" } });

    const init = jest.mocked(fetch).mock.calls[0]?.[1] as RequestInit;
    const headers = new Headers(init.headers);

    expect(init.credentials).toBe("include");
    expect(headers.get("x-csrf-token")).toBe("csrf-token");
  });
});
