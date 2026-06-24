import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";

import { NotificationCenterSummaryPanel } from "./notification-center-summary-panel";
import type { EmailNotificationCenterSummary } from "@/lib/types";

describe("NotificationCenterSummaryPanel", () => {
  it("renders read-only notification metadata without customer message content or send claims", () => {
    render(<NotificationCenterSummaryPanel summary={summaryFixture()} />);

    expect(screen.getByText("Notification center")).toBeInTheDocument();
    expect(screen.getByText("Queued")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText("Due retries")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("Delivered events")).toBeInTheDocument();
    expect(screen.getByText("6")).toBeInTheDocument();
    expect(screen.getByText("Active suppressions")).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
    expect(screen.getByText("ORGANIZATION_INVITE")).toBeInTheDocument();
    expect(screen.getByText("QUEUED")).toBeInTheDocument();
    expect(screen.getByText("read-only")).toBeInTheDocument();
    expect(screen.getByText("No customer email sent")).toBeInTheDocument();
    expect(screen.getByText("No retry or provider action")).toBeInTheDocument();

    expect(document.body).not.toHaveTextContent("customer@example.com");
    expect(document.body).not.toHaveTextContent("Private invoice subject");
    expect(document.body).not.toHaveTextContent("Body text");
    expect(document.body).not.toHaveTextContent(/send reminder/i);
    expect(document.body).not.toHaveTextContent(/reminder sent/i);
    expect(document.body).not.toHaveTextContent(/customer email delivered/i);
    expect(document.body).not.toHaveTextContent(/production ready/i);
  });

  it("renders an empty metadata state without implying provider delivery", () => {
    render(<NotificationCenterSummaryPanel summary={{ ...summaryFixture(), recentItems: [] }} />);

    expect(screen.getByText("No recent notification metadata")).toBeInTheDocument();
    expect(screen.getByText("No provider, retry, or customer-send action is available from this panel.")).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent(/real email provider/i);
  });
});

function summaryFixture(): EmailNotificationCenterSummary {
  return {
    generatedAt: "2026-06-20T18:00:00.000Z",
    readOnly: true,
    noMutation: true,
    noCustomerEmailSent: true,
    productionReady: false,
    outboxCounts: {
      queuedCount: 4,
      sentMockCount: 3,
      sentProviderCount: 2,
      failedCount: 1,
      dueRetryCount: 5,
    },
    providerEventCounts: {
      deliveredCount: 6,
      bouncedCount: 2,
      complainedCount: 1,
      failedEventCount: 3,
    },
    activeSuppressionCount: 7,
    recentItems: [
      {
        id: "email-1",
        templateType: "ORGANIZATION_INVITE",
        status: "QUEUED",
        provider: "mock",
        providerEventStatus: null,
        attemptCount: 0,
        maxAttempts: 3,
        nextAttemptAt: null,
        lastAttemptAt: null,
        bouncedAt: null,
        complainedAt: null,
        deliveredAt: null,
        createdAt: "2026-06-20T17:00:00.000Z",
        updatedAt: "2026-06-20T17:30:00.000Z",
        toEmail: "customer@example.com",
        subject: "Private invoice subject",
        bodyText: "Body text",
      } as EmailNotificationCenterSummary["recentItems"][number],
    ],
    reviewNotice: "Notification center summary is read-only and exposes operational metadata only.",
    blockedActions: [
      "No email, reminder, notification, or provider call is sent from this endpoint.",
      "No retry worker, retry process, outbox update, suppression update, or provider webhook processing is run.",
    ],
  };
}
