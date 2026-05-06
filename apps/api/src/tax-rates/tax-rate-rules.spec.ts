import { BadRequestException } from "@nestjs/common";
import { TaxRateCategory, TaxRateScope } from "@prisma/client";
import { TaxRateService } from "./tax-rate.service";

describe("tax rate rules", () => {
  it("rejects negative tax rates on create and update", async () => {
    const prisma = {
      taxRate: {
        create: jest.fn(),
        findFirst: jest.fn().mockResolvedValue({ id: "tax-1", organizationId: "org-1", rate: "15.0000" }),
        update: jest.fn(),
      },
    };
    const service = new TaxRateService(prisma as never, { log: jest.fn() } as never);

    await expect(
      service.create("org-1", "user-1", {
        name: "Invalid",
        scope: TaxRateScope.SALES,
        category: TaxRateCategory.STANDARD,
        rate: "-1.0000",
      }),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.taxRate.create).not.toHaveBeenCalled();

    await expect(service.update("org-1", "user-1", "tax-1", { rate: "-0.0001" })).rejects.toThrow(BadRequestException);
    expect(prisma.taxRate.update).not.toHaveBeenCalled();
  });
});
