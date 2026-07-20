import { LoopbackZatcaSandboxHttpClient, LoopbackZatcaSandboxServer } from "./loopback-zatca-sandbox-http";

describe("loopback ZATCA sandbox HTTP proof boundary", () => {
  it("uses an ephemeral literal-loopback listener and retains no bodies", async () => {
    const server = new LoopbackZatcaSandboxServer();
    const baseUrl = await server.start(true);
    try {
      await expect(new LoopbackZatcaSandboxHttpClient(baseUrl).submit("/loopback/compliance", { invoiceUuid: "synthetic-uuid", invoiceHash: "synthetic-hash" })).resolves.toMatchObject({ responseCode: "SIMULATED_ACCEPTED" });
      expect(server.getEvidence()).toEqual(expect.objectContaining({ loopbackOnly: true, externalDnsLookups: 0, externalSockets: 0, requestBodiesRetained: false, responseBodiesRetained: false, requestCount: 1 }));
    } finally { await server.stop(); }
  });

  it("ignores proxy environment variables and closes its ephemeral listener on teardown", async () => {
    const previous = { HTTP_PROXY: process.env.HTTP_PROXY, HTTPS_PROXY: process.env.HTTPS_PROXY, ALL_PROXY: process.env.ALL_PROXY, NO_PROXY: process.env.NO_PROXY };
    process.env.HTTP_PROXY = "http://192.0.2.1:8080";
    process.env.HTTPS_PROXY = "http://192.0.2.1:8080";
    process.env.ALL_PROXY = "http://192.0.2.1:8080";
    process.env.NO_PROXY = "";
    const server = new LoopbackZatcaSandboxServer();
    const baseUrl = await server.start(true);
    try {
      expect(new URL(baseUrl)).toMatchObject({ protocol: "http:", hostname: "127.0.0.1" });
      expect(new URL(baseUrl).port).not.toBe("0");
      await expect(new LoopbackZatcaSandboxHttpClient(baseUrl).submit("/loopback/compliance", { invoiceUuid: "synthetic", invoiceHash: "hash" })).resolves.toMatchObject({ responseCode: "SIMULATED_ACCEPTED" });
      expect(server.getEvidence()).toMatchObject({ externalDnsLookups: 0, externalSockets: 0, redirectsFollowed: 0 });
    } finally {
      await server.stop();
      for (const [key, value] of Object.entries(previous)) {
        if (value === undefined) delete process.env[key]; else process.env[key] = value;
      }
    }
    await expect(new LoopbackZatcaSandboxHttpClient(baseUrl).submit("/loopback/compliance", { invoiceUuid: "synthetic", invoiceHash: "hash" })).rejects.toThrow("SIMULATED_CONNECTION_UNCERTAIN");
  });
  it("rejects non-loopback targets and malformed, wrong-content-type, and oversized responses", async () => {
    expect(() => new LoopbackZatcaSandboxHttpClient("https://example.com")).toThrow("Only literal 127.0.0.1");
    expect(() => new LoopbackZatcaSandboxHttpClient("http://localhost:9999")).toThrow("Only literal 127.0.0.1");
    expect(() => new LoopbackZatcaSandboxHttpClient("http://[::1]:9999")).toThrow("Only literal 127.0.0.1");
    expect(() => new LoopbackZatcaSandboxHttpClient("http://user:pass@127.0.0.1:9999")).toThrow("Only literal 127.0.0.1");
    expect(() => new LoopbackZatcaSandboxHttpClient("http://127.0.0.2:9999")).toThrow("Only literal 127.0.0.1");
    for (const scenario of ["MALFORMED", "WRONG_CONTENT_TYPE", "OVERSIZED"] as const) {
      const server = new LoopbackZatcaSandboxServer(scenario); const baseUrl = await server.start(true);
      try { await expect(new LoopbackZatcaSandboxHttpClient(baseUrl).submit("/loopback/compliance", { invoiceUuid: "synthetic", invoiceHash: "hash" })).rejects.toThrow(/^SIMULATED_PROTOCOL_/); } finally { await server.stop(); }
    }
  });

  it("classifies timeout and a reset after request receipt as safe uncertain transport outcomes", async () => {
    for (const scenario of ["TIMEOUT", "RESET_AFTER_REQUEST"] as const) {
      const server = new LoopbackZatcaSandboxServer(scenario); const baseUrl = await server.start(true);
      try {
        await expect(new LoopbackZatcaSandboxHttpClient(baseUrl).submit("/loopback/compliance", { invoiceUuid: "synthetic", invoiceHash: "hash" })).rejects.toThrow("SIMULATED_CONNECTION_UNCERTAIN");
        expect(server.getEvidence().requestCount).toBe(1);
      } finally { await server.stop(); }
    }
  });
});
