import { BadRequestException, ConflictException, ForbiddenException, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { SafeExceptionFilter } from "./safe-exception.filter";

describe("SafeExceptionFilter", () => {
  it.each([
    [new BadRequestException(["name must be a string"]), "BAD_REQUEST", 400, "Validation failed."],
    [new UnauthorizedException("Authentication required."), "UNAUTHORIZED", 401, "Authentication required."],
    [new ForbiddenException("Permission denied."), "FORBIDDEN", 403, "Permission denied."],
    [new NotFoundException("Record not found."), "NOT_FOUND", 404, "Record not found."],
  ])("returns standardized safe HTTP errors with requestId", (exception, code, statusCode, message) => {
    const { filter, response } = makeFilter("production", "req-123");

    filter.catch(exception, makeHost(response, { requestId: "req-123" }));

    expect(response.status).toHaveBeenCalledWith(statusCode);
    expect(response.json).toHaveBeenCalledWith({
      error: {
        code,
        message,
        statusCode,
        requestId: "req-123",
      },
    });
  });

  it("does not leak internal errors or stack traces in production mode", () => {
    const { filter, response } = makeFilter("production", "req-500");
    const exception = new Error("database password leaked in stack");
    exception.stack = "stack with sk_live_secret";

    filter.catch(exception, makeHost(response, { requestId: "req-500" }));

    expect(response.status).toHaveBeenCalledWith(500);
    expect(response.json).toHaveBeenCalledWith({
      error: {
        code: "INTERNAL_ERROR",
        message: "Internal server error.",
        statusCode: 500,
        requestId: "req-500",
      },
    });
  });

  it("includes redacted validation details only in local-safe mode", () => {
    const { filter, response } = makeFilter("test", "req-local");

    filter.catch(new BadRequestException(["authorization must not be Bearer abc.def.ghi"]), makeHost(response, { requestId: "req-local" }));

    expect(response.json).toHaveBeenCalledWith({
      error: {
        code: "BAD_REQUEST",
        message: "Validation failed.",
        statusCode: 400,
        requestId: "req-local",
        details: ["[REDACTED]"],
      },
    });
  });

  it("preserves the explicitly whitelisted close-review invalidation code in production", () => {
    const { filter, response } = makeFilter("production", "req-close-invalidated");
    filter.catch(
      new ConflictException({
        code: "ACCOUNTING_CLOSE_REVIEW_INVALIDATED",
        message: "Close readiness changed and the review was invalidated.",
      }),
      makeHost(response, { requestId: "req-close-invalidated" }),
    );

    expect(response.json).toHaveBeenCalledWith({
      error: {
        code: "ACCOUNTING_CLOSE_REVIEW_INVALIDATED",
        message: "Close readiness changed and the review was invalidated.",
        statusCode: 409,
        requestId: "req-close-invalidated",
      },
    });
  });

  it("preserves the explicitly whitelisted post-close lock-revalidation code in production", () => {
    const { filter, response } = makeFilter("production", "req-lock-drift");
    filter.catch(
      new ConflictException({
        code: "ACCOUNTING_CLOSE_LOCK_REVALIDATION_FAILED",
        message: "Readiness changed after the period was closed.",
      }),
      makeHost(response, { requestId: "req-lock-drift" }),
    );

    expect(response.json).toHaveBeenCalledWith({
      error: {
        code: "ACCOUNTING_CLOSE_LOCK_REVALIDATION_FAILED",
        message: "Readiness changed after the period was closed.",
        statusCode: 409,
        requestId: "req-lock-drift",
      },
    });
  });
});

function makeFilter(environment: string, requestId: string) {
  const response = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
    getHeader: jest.fn((key: string) => (key.toLowerCase() === "x-request-id" ? requestId : undefined)),
  };
  const config = { get: jest.fn((key: string) => (key === "APP_ENV" ? environment : undefined)) };

  return { filter: new SafeExceptionFilter(config as never), response };
}

function makeHost(response: unknown, request: unknown) {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
  } as never;
}
