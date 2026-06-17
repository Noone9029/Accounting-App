import { getLedgerByteEdition, getLedgerByteMarket, normalizeLedgerByteMarket } from "./edition";

describe("LedgerByte edition config", () => {
  const originalPublicMarket = process.env.NEXT_PUBLIC_LEDGERBYTE_MARKET;
  const originalServerMarket = process.env.LEDGERBYTE_MARKET;

  afterEach(() => {
    process.env.NEXT_PUBLIC_LEDGERBYTE_MARKET = originalPublicMarket;
    process.env.LEDGERBYTE_MARKET = originalServerMarket;
  });

  it("normalizes supported markets and falls back to generic", () => {
    expect(normalizeLedgerByteMarket("ksa")).toBe("KSA");
    expect(normalizeLedgerByteMarket("UAE")).toBe("UAE");
    expect(normalizeLedgerByteMarket("generic")).toBe("GENERIC");
    expect(normalizeLedgerByteMarket("")).toBe("GENERIC");
    expect(normalizeLedgerByteMarket("QATAR")).toBe("GENERIC");
  });

  it("reads public or server env and treats invalid env as generic", () => {
    delete process.env.NEXT_PUBLIC_LEDGERBYTE_MARKET;
    process.env.LEDGERBYTE_MARKET = "KSA";
    expect(getLedgerByteMarket()).toBe("KSA");

    process.env.NEXT_PUBLIC_LEDGERBYTE_MARKET = "UAE";
    expect(getLedgerByteMarket()).toBe("UAE");

    process.env.NEXT_PUBLIC_LEDGERBYTE_MARKET = "invalid";
    process.env.LEDGERBYTE_MARKET = "KSA";
    expect(getLedgerByteMarket()).toBe("GENERIC");
  });

  it("keeps generic edition free of country compliance modules", () => {
    const edition = getLedgerByteEdition("GENERIC");

    expect(edition.market).toBe("GENERIC");
    expect(edition.marketLabel).toBe("Generic");
    expect(edition.countryLabel).toBe("Global");
    expect(edition.brandSubline).toBe("Accounting workspace");
    expect(edition.defaultCurrency).toBe("USD");
    expect(edition.isGeneric).toBe(true);
    expect(edition.showCountryCompliance).toBe(false);
    expect(edition.showZatca).toBe(false);
    expect(edition.showUaeEinvoicing).toBe(false);
    expect(edition.complianceModules).toEqual({ zatca: false, uaeEinvoicing: false });
    expect(edition.shellFooter).not.toMatch(/UAE|FTA|ZATCA|Saudi|KSA|PINT-AE|Peppol/i);
  });

  it("enables KSA ZATCA labels without UAE/PINT-AE labels", () => {
    const edition = getLedgerByteEdition("KSA");

    expect(edition.defaultCurrency).toBe("SAR");
    expect(edition.isKsa).toBe(true);
    expect(edition.showZatca).toBe(true);
    expect(edition.showUaeEinvoicing).toBe(false);
    expect(edition.complianceNavLabel).toBe("ZATCA readiness");
    expect(edition.complianceReadinessExplanation).not.toMatch(/FTA|PINT-AE|Peppol|ASP validation/i);
  });

  it("enables UAE eInvoicing labels without KSA/ZATCA labels", () => {
    const edition = getLedgerByteEdition("UAE");

    expect(edition.defaultCurrency).toBe("AED");
    expect(edition.isUae).toBe(true);
    expect(edition.showZatca).toBe(false);
    expect(edition.showUaeEinvoicing).toBe(true);
    expect(edition.complianceNavLabel).toBe("UAE eInvoicing readiness");
    expect(edition.complianceReadinessExplanation).toMatch(/no FTA reporting is enabled/i);
    expect(edition.complianceReadinessExplanation).not.toMatch(/ZATCA|Saudi|KSA/i);
  });
});
