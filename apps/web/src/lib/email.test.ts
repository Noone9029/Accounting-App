import {
  emailStatusLabel,
  emailTemplateLabel,
  emailProviderLabel,
  emailProviderWarningText,
  emailReadinessLabel,
  inviteAcceptPath,
  isValidAuthPassword,
  passwordResetConfirmPath,
  passwordResetGenericMessage,
  isValidTestEmailAddress,
  smtpConfigStateLabel,
} from "./email";

describe("email helpers", () => {
  it("labels mock delivery statuses", () => {
    expect(emailStatusLabel("SENT_MOCK")).toBe("Sent (mock)");
    expect(emailStatusLabel("SENT_PROVIDER")).toBe("Sent");
    expect(emailStatusLabel("FAILED")).toBe("Failed");
  });

  it("labels email template types", () => {
    expect(emailTemplateLabel("ORGANIZATION_INVITE")).toBe("Organization invite");
    expect(emailTemplateLabel("PASSWORD_RESET")).toBe("Password reset");
    expect(emailTemplateLabel("TEST_EMAIL")).toBe("Test email");
  });

  it("labels provider readiness without exposing config values", () => {
    expect(emailProviderLabel("mock")).toBe("Mock/local");
    expect(emailProviderLabel("smtp-disabled")).toBe("SMTP disabled");
    expect(emailReadinessLabel(true)).toBe("Ready");
    expect(emailReadinessLabel(false)).toBe("Needs configuration");
    expect(smtpConfigStateLabel(false)).toBe("Missing");
  });

  it("describes provider warnings without secret values", () => {
    expect(emailProviderWarningText("mock", true, false)).toContain("Mock mode");
    expect(emailProviderWarningText("smtp", false, true)).toContain("Real SMTP sending is enabled");
    expect(emailProviderWarningText("smtp-disabled", false, false)).toContain("SMTP disabled");
    expect(emailProviderWarningText("smtp", false, false)).not.toContain("SMTP_PASSWORD");
  });

  it("validates test-send email input", () => {
    expect(isValidTestEmailAddress("ops@example.com")).toBe(true);
    expect(isValidTestEmailAddress("bad-address")).toBe(false);
  });

  it("builds token URLs with encoding", () => {
    expect(inviteAcceptPath("a b")).toBe("/invite/accept?token=a%20b");
    expect(passwordResetConfirmPath("a+b")).toBe("/password-reset/confirm?token=a%2Bb");
  });

  it("validates password length", () => {
    expect(isValidAuthPassword("short")).toBe(false);
    expect(isValidAuthPassword("Password123!")).toBe(true);
  });

  it("keeps password reset request copy generic", () => {
    expect(passwordResetGenericMessage()).toBe("If an account exists, password reset instructions have been sent.");
  });
});
