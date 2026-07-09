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
    expect(screen.getByText("Public API v1")).toBeInTheDocument();
    expect(screen.getByText(/proof routes remain authenticated and admin-gated/i)).toBeInTheDocument();
    expect(screen.getByText("Idempotency")).toBeInTheDocument();
    expect(screen.getByText(/hashed keys and safe response summaries only/i)).toBeInTheDocument();
    expect(screen.getByText("Rate limits")).toBeInTheDocument();
    expect(screen.getByText(/fails closed without an approved strategy/i)).toBeInTheDocument();
    expect(screen.getByText("API keys and OAuth")).toBeInTheDocument();
    expect(screen.getByText(/No production API secrets or OAuth clients are issued/i)).toBeInTheDocument();
  });
});
