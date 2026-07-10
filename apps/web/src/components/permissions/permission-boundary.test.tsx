import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { PermissionBoundary } from "./permission-boundary";

let mockOrganizationId = "org-1";
let mockBaseCurrency = "AED";

jest.mock("next/navigation", () => ({
  usePathname: () => "/organization/setup",
}));

jest.mock("./permission-provider", () => ({
  usePermissions: () => ({
    activeMembership: { organization: { id: mockOrganizationId, baseCurrency: mockBaseCurrency } },
    error: "",
    loading: false,
    user: { id: "user-1", memberships: [] },
  }),
}));

describe("PermissionBoundary organization isolation", () => {
  beforeEach(() => {
    mockOrganizationId = "org-1";
    mockBaseCurrency = "AED";
  });

  it.each(["AED", "SAR"])(
    "remounts route state and clears a stale selected ID on a same-%s organization switch",
    (baseCurrency) => {
      mockBaseCurrency = baseCurrency;
      mockOrganizationId = `org-1-${baseCurrency.toLowerCase()}`;
      const { rerender } = render(
        <PermissionBoundary>
          <StatefulRoute />
        </PermissionBoundary>,
      );

      fireEvent.click(screen.getByRole("button", { name: "No selection" }));
      expect(screen.getByRole("button", { name: "prior-org-entity-id" })).toBeInTheDocument();

      mockOrganizationId = `org-2-${baseCurrency.toLowerCase()}`;
      rerender(
        <PermissionBoundary>
          <StatefulRoute />
        </PermissionBoundary>,
      );

      expect(screen.getByRole("button", { name: "No selection" })).toBeInTheDocument();
    },
  );
});

function StatefulRoute() {
  const [selectedId, setSelectedId] = useState("");

  return (
    <button onClick={() => setSelectedId("prior-org-entity-id")}>
      {selectedId || "No selection"}
    </button>
  );
}
