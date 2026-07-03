import {
  APP_LOCALE_COOKIE,
  APP_LOCALES,
  appMessages,
  formatAppDate,
  formatAppMoney,
  getLocaleDirection,
  resolveAppLocale,
  translate,
} from "./app-i18n";

describe("app i18n", () => {
  it("resolves only supported locales and defaults safely", () => {
    expect(APP_LOCALE_COOKIE).toBe("ledgerbyte_locale");
    expect(APP_LOCALES).toEqual(["en", "ar"]);
    expect(resolveAppLocale("ar")).toBe("ar");
    expect(resolveAppLocale("en")).toBe("en");
    expect(resolveAppLocale("fr")).toBe("en");
    expect(resolveAppLocale(undefined)).toBe("en");
  });

  it("keeps English and Arabic message keys in parity", () => {
    expect(Object.keys(appMessages.ar).sort()).toEqual(Object.keys(appMessages.en).sort());
  });

  it("translates messages with interpolation", () => {
    expect(translate("ar", "topbar.lastUpdated", { value: "2026-06-04" })).toBe("آخر تحديث 2026-06-04.");
    expect(translate("en", "dashboard.activeAccounts", { count: 2 })).toBe("2 active accounts");
  });

  it("formats dates and money for the selected locale", () => {
    expect(getLocaleDirection("ar")).toBe("rtl");
    expect(getLocaleDirection("en")).toBe("ltr");
    expect(formatAppDate("2026-06-04T00:00:00.000Z", "ar", "-")).not.toBe("-");
    expect(formatAppMoney("123.4500", "SAR", "ar")).toContain("ر.س");
    expect(formatAppMoney("123.4500", "SAR", "en")).toContain("SAR");
  });
});
