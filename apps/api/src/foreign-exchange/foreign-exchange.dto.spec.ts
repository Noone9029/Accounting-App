import { validate } from "class-validator";
import { CreateCurrencyRateSnapshotDto } from "./dto/create-currency-rate-snapshot.dto";
import { UpdateFxAccountConfigurationDto } from "./dto/update-fx-account-configuration.dto";

describe("foreign exchange DTOs", () => {
  it.each(["1", "1.12345678", "9999999999.99999999"])("accepts a Decimal(18,8) rate string: %s", async (rate) => {
    const dto = Object.assign(new CreateCurrencyRateSnapshotDto(), {
      transactionCurrency: "USD",
      rate,
      rateDate: "2026-07-10",
    });
    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it.each([0.1, "1e3", "0x10", "10000000000", "1.123456789", "1."])("rejects an unsafe rate: %s", async (rate) => {
    const dto = Object.assign(new CreateCurrencyRateSnapshotDto(), {
      transactionCurrency: "USD",
      rate,
      rateDate: "2026-07-10",
    });
    expect(await validate(dto)).not.toHaveLength(0);
  });

  it("requires a supported currency and a date-only rate date", async () => {
    const dto = Object.assign(new CreateCurrencyRateSnapshotDto(), {
      transactionCurrency: "ZZZ",
      rate: "1",
      rateDate: "2026-07-10T12:00:00Z",
    });
    expect(await validate(dto)).toHaveLength(2);
  });

  it("requires all four nullable configuration fields for full replacement", async () => {
    const dto = Object.assign(new UpdateFxAccountConfigurationDto(), {
      realizedGainAccountId: null,
      realizedLossAccountId: null,
      unrealizedGainAccountId: null,
    });
    expect(await validate(dto)).toHaveLength(1);
  });
});
