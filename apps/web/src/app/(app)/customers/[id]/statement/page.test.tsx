import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import CustomerStatementPage from "./page";

jest.mock("@/components/parties/party-statement-page", () => ({
  __esModule: true,
  PartyStatementPage: ({ kind }: { kind: string }) => <div>{kind}-statement-route</div>,
}));

describe("customer statement route", () => {
  it("mounts the dedicated customer statement page", () => {
    render(<CustomerStatementPage />);

    expect(screen.getByText("customer-statement-route")).toBeInTheDocument();
  });
});
