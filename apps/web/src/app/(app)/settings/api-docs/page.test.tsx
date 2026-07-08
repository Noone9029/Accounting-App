import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import ApiDocsSettingsPage from "./page";

jest.mock("@/lib/api", () => ({
  apiBaseUrl: "http://localhost:4000",
}));

describe("ApiDocsSettingsPage", () => {
  it("renders beta docs access without production-public claims", () => {
    render(<ApiDocsSettingsPage />);

    expect(screen.getByRole("heading", { name: "API docs" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open /api/docs" })).toHaveAttribute("href", "http://localhost:4000/api/docs");
    expect(screen.getByText(/disabled in production unless LEDGERBYTE_API_DOCS_ENABLED/i)).toBeInTheDocument();
    expect(screen.getByText(/do not mean the API is public production infrastructure/i)).toBeInTheDocument();
  });
});
