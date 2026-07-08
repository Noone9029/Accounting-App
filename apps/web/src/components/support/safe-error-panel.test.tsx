import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { SafeErrorPanel, readRequestId } from "./safe-error-panel";

describe("SafeErrorPanel", () => {
  it("shows a friendly message and request reference without raw error details", () => {
    render(
      <SafeErrorPanel
        error={{
          message: "database password leaked",
          stack: "stack with sk_live_secret",
          details: { error: { requestId: "req-web-123", message: "raw backend message" } },
        }}
      />,
    );

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByText("req-web-123")).toBeInTheDocument();
    expect(screen.queryByText("database password leaked")).not.toBeInTheDocument();
    expect(screen.queryByText("stack with sk_live_secret")).not.toBeInTheDocument();
    expect(screen.queryByText("raw backend message")).not.toBeInTheDocument();
  });

  it("runs retry action when provided", () => {
    const onRetry = jest.fn();
    render(<SafeErrorPanel requestId="req-web-456" onRetry={onRetry} />);

    fireEvent.click(screen.getByRole("button", { name: /try again/i }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("extracts request IDs from supported API error shapes", () => {
    expect(readRequestId({ requestId: "direct" })).toBe("direct");
    expect(readRequestId({ details: { requestId: "details" } })).toBe("details");
    expect(readRequestId({ details: { error: { requestId: "nested" } } })).toBe("nested");
    expect(readRequestId({ details: { error: { message: "missing" } } })).toBeNull();
  });
});
