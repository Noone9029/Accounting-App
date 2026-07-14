import "@testing-library/jest-dom";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { LedgerActionDialog } from "./action-dialog";

describe("LedgerActionDialog", () => {
  it("requires a reason before confirming a dangerous action", () => {
    const onConfirm = jest.fn();
    const onOpenChange = jest.fn();

    render(
      <LedgerActionDialog
        open
        onOpenChange={onOpenChange}
        tone="danger"
        title="Lock fiscal period"
        description="This action cannot be undone."
        confirmLabel="Lock period"
        reason={{
          id: "lock-reason",
          label: "Reason",
          value: "",
          required: true,
          onChange: jest.fn(),
        }}
        onConfirm={onConfirm}
      />,
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Lock period" })).toBeDisabled();
    expect(screen.getByLabelText("Reason")).toHaveAttribute("aria-required", "true");
  });

  it("prevents duplicate confirms while an async action is pending", async () => {
    let resolveConfirm: (() => void) | undefined;
    const onConfirm = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveConfirm = resolve;
        }),
    );

    render(
      <LedgerActionDialog
        open
        onOpenChange={jest.fn()}
        title="Delete attachment"
        description="The attachment will be removed."
        confirmLabel="Delete"
        onConfirm={onConfirm}
      />,
    );

    const confirm = screen.getByRole("button", { name: "Delete" });
    fireEvent.click(confirm);
    fireEvent.click(confirm);

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(confirm).toBeDisabled();

    await act(async () => {
      resolveConfirm?.();
    });
  });

  it("reports cancellation through the controlled open state callback", () => {
    const onOpenChange = jest.fn();

    render(
      <LedgerActionDialog
        open
        onOpenChange={onOpenChange}
        title="Archive"
        description="Archive this record."
        confirmLabel="Archive"
        onConfirm={jest.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
