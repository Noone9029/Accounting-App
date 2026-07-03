import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { AppLocaleProvider } from "@/components/app-locale-provider";
import NewCreditNotePage from "./page";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: jest.fn() }),
}));

jest.mock("@/components/forms/credit-note-form", () => ({
  CreditNoteForm: () => <div data-testid="credit-note-form" />,
}));

describe("NewCreditNotePage", () => {
  it("renders Arabic create copy", () => {
    render(
      <AppLocaleProvider initialLocale="ar">
        <NewCreditNotePage />
      </AppLocaleProvider>,
    );

    expect(screen.getByRole("heading", { name: "إنشاء إشعار دائن" })).toBeInTheDocument();
    expect(screen.getByText("احفظ إشعارا دائنا مسودة لعميل أو فاتورة أصلية.")).toBeInTheDocument();
    expect(screen.getByTestId("credit-note-form")).toBeInTheDocument();
  });
});
