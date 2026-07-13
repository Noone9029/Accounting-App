import { safePrismaArgument } from "./request-logging.interceptor";

describe("safePrismaArgument", () => {
  it("returns only the invalid Prisma argument name", () => {
    expect(safePrismaArgument("Invalid value for argument `sourceUpdatedAt`: Provided Date object is invalid.")).toBe("sourceUpdatedAt");
  });

  it("does not return arbitrary error-message content", () => {
    expect(safePrismaArgument("Unexpected backend failure: value=123.")).toBeUndefined();
  });
});
