import {
  emailStatusLabel,
  emailTemplateLabel,
  inviteAcceptPath,
  isValidAuthPassword,
  passwordResetConfirmPath,
} from "./email";

describe("email helpers", () => {
  it("labels mock delivery statuses", () => {
    expect(emailStatusLabel("SENT_MOCK")).toBe("Sent (mock)");
    expect(emailStatusLabel("FAILED")).toBe("Failed");
  });

  it("labels email template types", () => {
    expect(emailTemplateLabel("ORGANIZATION_INVITE")).toBe("Organization invite");
    expect(emailTemplateLabel("PASSWORD_RESET")).toBe("Password reset");
  });

  it("builds token URLs with encoding", () => {
    expect(inviteAcceptPath("a b")).toBe("/invite/accept?token=a%20b");
    expect(passwordResetConfirmPath("a+b")).toBe("/password-reset/confirm?token=a%2Bb");
  });

  it("validates password length", () => {
    expect(isValidAuthPassword("short")).toBe(false);
    expect(isValidAuthPassword("Password123!")).toBe(true);
  });
});
