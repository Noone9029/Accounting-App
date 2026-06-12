import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import SupplierStatementPage from "./page";

jest.mock("@/components/parties/party-statement-page", () => ({
  __esModule: true,
  PartyStatementPage: ({ kind }: { kind: string }) => <div>{kind}-statement-route</div>,
}));

describe("supplier statement route", () => {
  it("mounts the dedicated supplier statement page", () => {
    render(<SupplierStatementPage />);

    expect(screen.getByText("supplier-statement-route")).toBeInTheDocument();
  });
});
