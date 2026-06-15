import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import { FinancialFlowScene } from "./financial-flow-scene";

describe("FinancialFlowScene", () => {
  const originalMatchMedia = window.matchMedia;

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  it("renders a reduced-motion fallback without requiring WebGL", async () => {
    window.matchMedia = jest.fn().mockImplementation((query: string) => ({
      matches: query === "(prefers-reduced-motion: reduce)",
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));

    render(<FinancialFlowScene />);

    const scene = screen.getByTestId("financial-flow-scene");
    await waitFor(() => expect(scene).toHaveAttribute("data-fallback", "true"));
  });
});
