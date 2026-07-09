import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import WebhookSettingsPage from "./page";

describe("WebhookSettingsPage", () => {
  it("renders disabled webhook readiness without production delivery claims or secrets", () => {
    render(<WebhookSettingsPage />);

    expect(screen.getByRole("heading", { name: "Webhook outbox" })).toBeInTheDocument();
    expect(screen.getByText(/No external webhook delivery is enabled by default/i)).toBeInTheDocument();
    expect(screen.getByText(/does not call external URLs, store webhook secrets, or send provider payloads/i)).toBeInTheDocument();
    expect(screen.getByText("Delivery mode")).toBeInTheDocument();
    expect(screen.getByText("Event catalog")).toBeInTheDocument();
    expect(screen.getByText("Retry states")).toBeInTheDocument();
    expect(screen.getByText("Secrets")).toBeInTheDocument();
    expect(screen.getByText(/Signing secrets are not stored/i)).toBeInTheDocument();
    expect(screen.getByText(/Production webhook delivery still needs endpoint approval/i)).toBeInTheDocument();
  });
});
