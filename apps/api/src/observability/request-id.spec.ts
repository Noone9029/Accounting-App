import { createRequestContextMiddleware } from "./request-context.middleware";
import { createRequestId, normalizeRequestId } from "./request-id";

describe("request id utilities", () => {
  it("accepts only bounded safe request IDs", () => {
    expect(normalizeRequestId(" req-123:abc.def ")).toBe("req-123:abc.def");
    expect(normalizeRequestId(["first", "second"])).toBe("first");
    expect(normalizeRequestId("bad request")).toBeNull();
    expect(normalizeRequestId("bad\nrequest")).toBeNull();
    expect(normalizeRequestId("x".repeat(129))).toBeNull();
  });

  it("generates a UUID when the caller-supplied ID is unsafe", () => {
    const generated = createRequestId("bad request");

    expect(generated).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("sets response header, request property, and async context", () => {
    const context = { run: jest.fn((_context: unknown, callback: () => void) => callback()) };
    const middleware = createRequestContextMiddleware(context as never);
    const request = { headers: { "x-request-id": "client-req-1" } };
    const response = { setHeader: jest.fn() };
    const next = jest.fn();

    middleware(request as never, response as never, next);

    expect(request).toMatchObject({ requestId: "client-req-1" });
    expect(response.setHeader).toHaveBeenCalledWith("x-request-id", "client-req-1");
    expect(context.run).toHaveBeenCalledWith({ requestId: "client-req-1" }, expect.any(Function));
    expect(next).toHaveBeenCalled();
  });
});
