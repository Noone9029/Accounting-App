import { StructuredLoggerService } from "./structured-logger.service";

describe("StructuredLoggerService", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("emits structured JSON logs with safe fields", () => {
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => undefined);
    const logger = new StructuredLoggerService();

    logger.emit({
      level: "info",
      message: "api.request.completed",
      requestId: "req-1",
      method: "GET",
      path: "/sales-invoices",
      statusCode: 200,
      durationMs: 12,
      organizationId: "org-1",
      userId: "user-1",
      module: "SalesInvoices",
      action: "list",
    });

    expect(logSpy).toHaveBeenCalledTimes(1);
    const payload = logSpy.mock.calls[0]?.[0];
    expect(typeof payload).toBe("string");
    expect(JSON.parse(payload as string)).toMatchObject({
      level: "info",
      message: "api.request.completed",
      requestId: "req-1",
      method: "GET",
      path: "/sales-invoices",
      statusCode: 200,
      durationMs: 12,
      organizationId: "org-1",
      userId: "user-1",
      module: "SalesInvoices",
      action: "list",
    });
  });

  it("redacts secret-looking log messages and metadata", () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);
    const logger = new StructuredLoggerService();

    logger.emit({
      level: "error",
      message: "Bearer abc.def.ghi",
      requestId: "req-1",
      path: "/payments/provider-events/stripe",
    });

    const payload = errorSpy.mock.calls[0]?.[0];
    expect(typeof payload).toBe("string");
    expect(JSON.parse(payload as string)).toMatchObject({
      level: "error",
      message: "[REDACTED]",
      requestId: "req-1",
      path: "/payments/provider-events/stripe",
    });
  });
});
