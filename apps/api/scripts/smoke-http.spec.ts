import { fetchSmokeApi, parseSmokeRequestTimeout, safeRouteLabel, smokeProgressEnabled } from "./smoke-http";

describe("smoke-http", () => {
  it("parses request timeout values with a positive fallback", () => {
    expect(parseSmokeRequestTimeout("1500")).toBe(1500);
    expect(parseSmokeRequestTimeout("0", 60000)).toBe(60000);
    expect(parseSmokeRequestTimeout("not-a-number", 60000)).toBe(60000);
  });

  it("enables progress logging only for the explicit true value", () => {
    expect(smokeProgressEnabled("true")).toBe(true);
    expect(smokeProgressEnabled("TRUE")).toBe(false);
    expect(smokeProgressEnabled(undefined)).toBe(false);
  });

  it("redacts route identifiers and query values from progress labels", () => {
    expect(safeRouteLabel("GET", "/journal-entries/123e4567-e89b-12d3-a456-426614174000?token=secret")).toBe("GET /journal-entries/:id?...");
    expect(safeRouteLabel("POST", "/bank-transfers/123e4567-e89b-12d3-a456-426614174000/void")).toBe("POST /bank-transfers/:id/void");
  });

  it("fails a stuck request with a clear route timeout", async () => {
    const fetchImpl = (_input: string, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(init.signal?.reason));
      });

    await expect(
      fetchSmokeApi("/journal-entries", { method: "GET" }, { apiUrl: "https://ledgerbyte-api-test.example", timeoutMs: 1, progress: false, fetchImpl }),
    ).rejects.toThrow("Smoke request timed out after 1ms: GET /journal-entries");

    await expect(
      fetchSmokeApi("/bank-transfers/123e4567-e89b-12d3-a456-426614174000/void", { method: "POST" }, { apiUrl: "https://ledgerbyte-api-test.example", timeoutMs: 1, progress: false, fetchImpl }),
    ).rejects.toThrow("Smoke request timed out after 1ms: POST /bank-transfers/:id/void");
  });

  it("logs only safe route labels when progress logging is enabled", async () => {
    const messages: string[] = [];
    const fetchImpl = jest.fn().mockResolvedValue(new Response("[]", { status: 200 }));

    await fetchSmokeApi(
      "/journal-entries/123e4567-e89b-12d3-a456-426614174000?token=secret",
      {
        method: "GET",
        headers: { Authorization: "Bearer secret-token" },
      },
      {
        apiUrl: "https://ledgerbyte-api-test.example",
        timeoutMs: 1000,
        progress: true,
        fetchImpl,
        logger: { log: (message: string) => messages.push(message) },
      },
    );

    expect(messages).toEqual([
      "[smoke-fetch:start] GET /journal-entries/:id?...",
      expect.stringContaining("[smoke-fetch:done] GET /journal-entries/:id?... -> 200"),
    ]);
    expect(messages.join("\n")).not.toContain("secret-token");
    expect(messages.join("\n")).not.toContain("token=secret");
  });
});
