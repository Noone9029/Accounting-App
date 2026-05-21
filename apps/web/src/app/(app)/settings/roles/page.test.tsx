import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { BetaRoleGuidance } from "./page";

describe("roles settings beta guidance", () => {
  it("renders safe beta role guidance without production claims", () => {
    render(<BetaRoleGuidance />);

    expect(screen.getByText("Beta role guidance")).toBeInTheDocument();
    expect(screen.getByText(/Keep Owner\/Admin roles for internal staff/)).toBeInTheDocument();
    expect(screen.getByText(/Use Viewer for accountant\/readability review/)).toBeInTheDocument();
    expect(screen.getByText(/suspend tester memberships/)).toBeInTheDocument();
    expect(screen.getByText(/do not enable real ZATCA submission/)).toBeInTheDocument();
    expect(screen.getByText(/live bank feeds/)).toBeInTheDocument();
    expect(screen.queryByText(/production ready/i)).not.toBeInTheDocument();
  });
});
