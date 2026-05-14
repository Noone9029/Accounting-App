import { isCorsOriginAllowed, readCorsOrigin } from "./app-bootstrap";

describe("app bootstrap", () => {
  it("defaults CORS to localhost web development", () => {
    expect(readCorsOrigin(undefined)).toBe("http://localhost:3000");
  });

  it("allows comma-separated exact and wildcard Vercel origins", () => {
    expect(isCorsOriginAllowed("https://ledgerbyte-web.vercel.app", "https://*.vercel.app")).toBe(true);
    expect(isCorsOriginAllowed("https://ledgerbyte.example.com", "https://ledgerbyte.example.com")).toBe(true);
    expect(isCorsOriginAllowed("https://example.com.evil.test", "https://*.vercel.app")).toBe(false);
  });
});
