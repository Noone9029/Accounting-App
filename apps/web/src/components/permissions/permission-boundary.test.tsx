import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { PermissionBoundary } from "./permission-boundary";

let mockOrganizationId = "org-1";

jest.mock("next/navigation", () => ({
  usePathname: () => "/organization/setup",
}));

jest.mock("./permission-provider", () => ({
  usePermissions: () => ({
    activeMembership: { organization: { id: mockOrganizationId } },
    error: "",
    loading: false,
    user: { id: "user-1", memberships: [] },
  }),
}));

describe("PermissionBoundary organization isolation", () => {
  beforeEach(() => {
    mockOrganizationId = "org-1";
  });

  it("remounts route state when the active organization changes", () => {
    const { rerender } = render(
      <PermissionBoundary>
        <StatefulRoute />
      </PermissionBoundary>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Count 0" }));
    expect(screen.getByRole("button", { name: "Count 1" })).toBeInTheDocument();

    mockOrganizationId = "org-2";
    rerender(
      <PermissionBoundary>
        <StatefulRoute />
      </PermissionBoundary>,
    );

    expect(screen.getByRole("button", { name: "Count 0" })).toBeInTheDocument();
  });
});

function StatefulRoute() {
  const [count, setCount] = useState(0);

  return <button onClick={() => setCount((current) => current + 1)}>Count {count}</button>;
}
