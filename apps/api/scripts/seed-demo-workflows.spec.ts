import { OWNER_APPROVAL_PHRASE, assertSafeSeedTarget } from "./seed-demo-workflows";

describe("seed-demo-workflows safety guard", () => {
  it("allows local demo workflow seeding by default", () => {
    expect(() => assertSafeSeedTarget("http://localhost:4000", {})).not.toThrow();
  });

  it("refuses remote targets without explicit owner approval", () => {
    expect(() => assertSafeSeedTarget("https://ledgerbyte-api-test.example", {})).toThrow(/local-only by default/);
    expect(() => assertSafeSeedTarget("https://ledgerbyte-api-test.example", { allowRemote: true })).toThrow(/disposable non-production/);
  });

  it("allows only owner-approved disposable non-production remote targets", () => {
    expect(() =>
      assertSafeSeedTarget("https://ledgerbyte-api-test.example", {
        allowRemote: true,
        targetClass: "disposable-non-production",
        ownerApproval: OWNER_APPROVAL_PHRASE,
      }),
    ).not.toThrow();
  });

  it("refuses production-like environments even with approval", () => {
    expect(() =>
      assertSafeSeedTarget("http://localhost:4000", {
        allowRemote: true,
        targetClass: "disposable-non-production",
        ownerApproval: OWNER_APPROVAL_PHRASE,
        env: { NODE_ENV: "production" },
      }),
    ).toThrow(/refuses production-like environments/);
  });
});
