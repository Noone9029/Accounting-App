import { complianceStatusLabel } from "./compliance";

describe("compliance helpers", () => {
  it("formats compliance status labels", () => {
    expect(complianceStatusLabel("READY_FOR_VALIDATION")).toBe("Ready For Validation");
  });
});
