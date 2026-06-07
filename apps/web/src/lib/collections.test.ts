import { collectionActivityTypeLabel, collectionsSafeWording } from "./collections";

describe("collection wording helpers", () => {
  it("labels planned collection activities without implying sent email or posted payment", () => {
    expect(collectionActivityTypeLabel("EMAIL_PLANNED")).toBe("Planned email");
    expect(collectionActivityTypeLabel("REMINDER_PLANNED")).toBe("Planned reminder");
    expect(collectionActivityTypeLabel("PAYMENT_RECEIVED_NOTE")).toBe("Payment received note");
    expect(collectionActivityTypeLabel("PROMISE_TO_PAY")).toBe("Promise to pay");
  });

  it("keeps collection cases non-posting and non-payment-gateway", () => {
    expect(collectionsSafeWording).toContain("do not post journals");
    expect(collectionsSafeWording).toContain("allocate payments");
    expect(collectionsSafeWording).toContain("send email or reminders");
    expect(collectionsSafeWording).toContain("create payment links");
    expect(collectionsSafeWording).toContain("change invoice balances");
    expect(collectionsSafeWording).not.toMatch(/email sent|reminder sent|payment link created|journal posted|VAT filed/i);
  });
});
