import { ConfigService } from "@nestjs/config";
import { readJwtSecret } from "./jwt-secret";

function config(values: Record<string, string | undefined>) {
  return {
    get: jest.fn((key: string) => values[key]),
  } as unknown as ConfigService;
}

describe("readJwtSecret", () => {
  it("uses an explicit configured secret", () => {
    expect(readJwtSecret(config({ APP_ENV: "production", JWT_SECRET: "a".repeat(32) }))).toBe("a".repeat(32));
  });

  it("allows the development fallback only in development-like environments", () => {
    expect(readJwtSecret(config({ APP_ENV: "test" }))).toBe("dev-only-secret");
  });

  it("fails closed when JWT_SECRET is missing outside development and test", () => {
    expect(() => readJwtSecret(config({ APP_ENV: "production" }))).toThrow("JWT_SECRET must be configured");
  });

  it("rejects weak configured secrets outside development and test", () => {
    expect(() => readJwtSecret(config({ APP_ENV: "production", JWT_SECRET: "short" }))).toThrow("JWT_SECRET must be at least");
  });

  it("rejects the development fallback literal outside development and test", () => {
    expect(() => readJwtSecret(config({ APP_ENV: "production", JWT_SECRET: "dev-only-secret" }))).toThrow("development fallback");
  });
});
