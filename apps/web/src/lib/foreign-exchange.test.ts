import { apiRequest } from "./api";
import {
  createCurrencyRate,
  formatFxRate,
  getCurrencyRate,
  getFxAccountConfiguration,
  getFxCurrencies,
  getFxReadiness,
  listCurrencyRates,
  ratePairLabel,
  saveFxAccountConfiguration,
} from "./foreign-exchange";

jest.mock("./api", () => ({
  apiRequest: jest.fn(),
}));

const apiRequestMock = jest.mocked(apiRequest);

describe("foreign exchange API helpers", () => {
  beforeEach(() => {
    apiRequestMock.mockReset();
    apiRequestMock.mockResolvedValue({} as never);
  });

  it("loads the independent FX settings resources from their typed endpoints", async () => {
    await Promise.all([getFxCurrencies(), getFxAccountConfiguration(), getFxReadiness()]);

    expect(apiRequestMock).toHaveBeenCalledWith("/fx/currencies");
    expect(apiRequestMock).toHaveBeenCalledWith("/fx/account-configuration");
    expect(apiRequestMock).toHaveBeenCalledWith("/fx/readiness");
  });

  it("builds a filtered, paginated immutable-rate query without blank filters", async () => {
    await listCurrencyRates({ transactionCurrency: "USD", rateDate: "", page: 2, limit: 25 });

    expect(apiRequestMock).toHaveBeenCalledWith("/fx/rates?transactionCurrency=USD&page=2&limit=25");
  });

  it("loads one immutable rate snapshot by id", async () => {
    await getCurrencyRate("11111111-1111-4111-8111-111111111111");

    expect(apiRequestMock).toHaveBeenCalledWith("/fx/rates/11111111-1111-4111-8111-111111111111");
  });

  it("posts an exact manual rate snapshot and saves the full account configuration", async () => {
    await createCurrencyRate({
      transactionCurrency: "USD",
      rate: "3.67250000",
      rateDate: "2026-07-10",
      sourceReference: "Treasury worksheet 17",
    });
    await saveFxAccountConfiguration({
      realizedGainAccountId: "revenue-1",
      realizedLossAccountId: "expense-1",
      unrealizedGainAccountId: "revenue-2",
      unrealizedLossAccountId: "expense-2",
    });

    expect(apiRequestMock).toHaveBeenCalledWith("/fx/rates", {
      method: "POST",
      body: {
        transactionCurrency: "USD",
        rate: "3.67250000",
        rateDate: "2026-07-10",
        sourceReference: "Treasury worksheet 17",
      },
    });
    expect(apiRequestMock).toHaveBeenCalledWith("/fx/account-configuration", {
      method: "PUT",
      body: {
        realizedGainAccountId: "revenue-1",
        realizedLossAccountId: "expense-1",
        unrealizedGainAccountId: "revenue-2",
        unrealizedLossAccountId: "expense-2",
      },
    });
  });
});

describe("foreign exchange display helpers", () => {
  it("shows the transaction/base orientation and exactly eight rate places", () => {
    expect(ratePairLabel("USD", "SAR")).toBe("USD/SAR");
    expect(formatFxRate("3.67")).toBe("3.67000000");
    expect(formatFxRate("0.00000001")).toBe("0.00000001");
  });
});
