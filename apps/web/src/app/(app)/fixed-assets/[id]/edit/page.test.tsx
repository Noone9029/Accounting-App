import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import EditFixedAssetPage from "./page";

const apiRequestMock = jest.fn();

jest.mock("next/navigation", () => ({
  useParams: () => ({ id: "asset-1" }),
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock("@/hooks/use-active-organization", () => ({
  useActiveOrganizationId: () => "org-1",
}));

jest.mock("@/lib/api", () => ({
  apiRequest: (...args: unknown[]) => apiRequestMock(...args),
}));

describe("EditFixedAssetPage", () => {
  beforeEach(() => {
    apiRequestMock.mockReset();
    apiRequestMock.mockResolvedValue({
      id: "asset-1",
      assetNumber: "FA-000001",
      name: "Office equipment",
      description: "Finance laptop",
      status: "DRAFT",
      acquisitionDate: "2026-01-15T00:00:00.000Z",
      inServiceDate: "2026-01-15T00:00:00.000Z",
      baseAcquisitionCost: "100.0000",
      baseSalvageValue: "10.0000",
      usefulLifeMonths: 12,
      category: { id: "category-1", code: "EQUIP", name: "Equipment" },
    });
  });

  it("loads a draft asset into the finance-first edit form", async () => {
    render(<EditFixedAssetPage />);

    expect(await screen.findByRole("heading", { name: "Edit fixed asset" })).toBeInTheDocument();
    expect(screen.getByLabelText("Asset name")).toHaveValue("Office equipment");
    expect(screen.getByLabelText("Base acquisition cost")).toHaveValue("100.0000");
    expect(screen.getByRole("link", { name: "Cancel" })).toHaveAttribute("href", "/fixed-assets/asset-1");
  });
});
