import { ConfigService } from "@nestjs/config";
import { isOpenApiDocsEnabled } from "./openapi";

function config(values: Record<string, string | undefined>) {
  return {
    get: jest.fn((key: string) => values[key]),
  } as unknown as ConfigService;
}

describe("OpenAPI docs gate", () => {
  it("enables API docs in non-production by default", () => {
    expect(isOpenApiDocsEnabled(config({ APP_ENV: "test" }))).toBe(true);
  });

  it("disables API docs in production by default", () => {
    expect(isOpenApiDocsEnabled(config({ APP_ENV: "production" }))).toBe(false);
  });

  it("requires an explicit production opt-in", () => {
    expect(isOpenApiDocsEnabled(config({ APP_ENV: "production", LEDGERBYTE_API_DOCS_ENABLED: "true" }))).toBe(true);
    expect(isOpenApiDocsEnabled(config({ APP_ENV: "local", LEDGERBYTE_API_DOCS_ENABLED: "false" }))).toBe(false);
  });
});
