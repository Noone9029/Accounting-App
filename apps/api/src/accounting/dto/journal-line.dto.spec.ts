import { validate } from "class-validator";
import { JournalLineDto } from "./journal-line.dto";

describe("JournalLineDto", () => {
  function makeLine(overrides: Partial<JournalLineDto> = {}) {
    return Object.assign(new JournalLineDto(), {
      accountId: "13f2a3d1-9c10-45d5-a829-0f07c391c128",
      debit: "100.0000",
      credit: "0.0000",
      currency: "SAR",
      ...overrides,
    });
  }

  it("accepts omitted or null journal dimensions", async () => {
    await expect(validate(makeLine())).resolves.toHaveLength(0);
    await expect(
      validate(
        makeLine({
          costCenterId: null,
          projectId: null,
        }),
      ),
    ).resolves.toHaveLength(0);
  });

  it("rejects non-UUID journal dimensions", async () => {
    const errors = await validate(
      makeLine({
        costCenterId: "not-a-cost-center-uuid",
        projectId: "not-a-project-uuid",
      }),
    );

    expect(errors.map((error) => error.property).sort()).toEqual(["costCenterId", "projectId"]);
  });
});
