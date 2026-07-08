import { PERMISSIONS } from "@ledgerbyte/shared";
import { REQUIRED_PERMISSIONS_KEY } from "../auth/decorators/require-permissions.decorator";
import { WebhookOutboxController } from "./webhook-outbox.controller";

describe("WebhookOutboxController", () => {
  it("keeps webhook readiness and local mock routes admin-gated", () => {
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, WebhookOutboxController.prototype.readiness)).toEqual([
      PERMISSIONS.users.manage,
    ]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, WebhookOutboxController.prototype.eventCatalog)).toEqual([
      PERMISSIONS.users.manage,
    ]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, WebhookOutboxController.prototype.createLocalMockEvent)).toEqual([
      PERMISSIONS.users.manage,
    ]);
  });

  it("delegates readiness and local mock event creation", async () => {
    const service = {
      readiness: jest.fn(() => ({ mode: "DISABLED" })),
      eventCatalog: jest.fn(() => ({ eventTypes: [] })),
      createLocalMockEvent: jest.fn().mockResolvedValue({ status: "MOCK_DELIVERED" }),
    };
    const controller = new WebhookOutboxController(service as never);

    expect(controller.readiness()).toEqual({ mode: "DISABLED" });
    expect(controller.eventCatalog()).toEqual({ eventTypes: [] });
    await expect(
      controller.createLocalMockEvent("org-1", { id: "user-1" } as never, {
        eventType: "invoice.created",
        aggregateType: "SalesInvoice",
        aggregateId: "invoice-1",
      }),
    ).resolves.toEqual({ status: "MOCK_DELIVERED" });
    expect(service.createLocalMockEvent).toHaveBeenCalledWith("org-1", "user-1", expect.objectContaining({ eventType: "invoice.created" }));
  });
});
