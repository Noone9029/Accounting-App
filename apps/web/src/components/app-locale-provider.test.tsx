import "@testing-library/jest-dom";
import { act, render, screen } from "@testing-library/react";
import { AppLocaleProvider } from "@/components/app-locale-provider";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: jest.fn() }),
}));

describe("AppLocaleProvider", () => {
  it("translates dictionary-backed legacy text nodes in Arabic and restores English", async () => {
    const { rerender } = render(
      <AppLocaleProvider key="ar" initialLocale="ar">
        <div>
          <h1>Cash expenses</h1>
          <span>EXP-1001</span>
        </div>
      </AppLocaleProvider>,
    );

    expect(await screen.findByText("المصروفات النقدية")).toBeInTheDocument();
    expect(screen.getByText("EXP-1001")).toBeInTheDocument();

    await act(async () => {
      rerender(
        <AppLocaleProvider key="en" initialLocale="en">
          <div>
            <h1>Cash expenses</h1>
            <span>EXP-1001</span>
          </div>
        </AppLocaleProvider>,
      );
    });

    expect(screen.getByText("Cash expenses")).toBeInTheDocument();
    expect(screen.getByText("EXP-1001")).toBeInTheDocument();
  });
});
