import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { useActiveOrganization } from "./use-active-organization";

let mockActiveMembership: { organization: { id: string; baseCurrency: string } } | null = null;

jest.mock("@/components/permissions/permission-provider", () => ({
  usePermissions: () => ({ activeMembership: mockActiveMembership }),
}));

function ActiveOrganizationProbe() {
  const organization = useActiveOrganization();

  return <div>{organization ? `${organization.id}:${organization.baseCurrency}` : "no-active-organization"}</div>;
}

describe("useActiveOrganization", () => {
  beforeEach(() => {
    mockActiveMembership = null;
  });

  it.each([
    ["org-ae", "AED"],
    ["org-sa", "SAR"],
  ])("returns the active %s organization and its %s base currency", (id, baseCurrency) => {
    mockActiveMembership = { organization: { id, baseCurrency } };

    render(<ActiveOrganizationProbe />);

    expect(screen.getByText(`${id}:${baseCurrency}`)).toBeInTheDocument();
  });

  it("returns null while no active membership is available", () => {
    render(<ActiveOrganizationProbe />);

    expect(screen.getByText("no-active-organization")).toBeInTheDocument();
  });
});
