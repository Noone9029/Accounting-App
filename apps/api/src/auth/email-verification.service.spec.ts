import { AuthService } from "./auth.service";

describe("email verification", () => {
  function harness() {
    const tx = { authToken: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) }, user: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) } };
    const prisma = { $transaction: jest.fn((fn) => fn(tx)), user: { findUniqueOrThrow: jest.fn().mockResolvedValue({ id: "user-1", email: "synthetic@example.test", emailVerifiedAt: null }) } };
    const tokens = { create: jest.fn().mockResolvedValue({ rawToken: "synthetic-raw-token" }), getTokenForUse: jest.fn().mockResolvedValue({ id: "token-1", userId: "user-1", email: "synthetic@example.test" }) };
    const rate = { registerPasswordResetAttempt: jest.fn().mockResolvedValue({ allowed: true }) };
    const email = { sendEmailVerification: jest.fn() };
    const config = { get: () => "http://localhost:3000" };
    return { service: new AuthService(prisma as never, {} as never, config as never, tokens as never, rate as never, email as never, {} as never, {} as never), prisma, tx, tokens, rate, email };
  }
  it("queues a bounded verification link without returning the bearer token", async () => {
    const { service, tokens, rate, email } = harness();
    const result = await service.requestEmailVerification("user-1");
    expect(tokens.create).toHaveBeenCalledWith(expect.objectContaining({ purpose: "EMAIL_VERIFICATION", consumeExistingForUser: true }));
    expect(rate.registerPasswordResetAttempt).toHaveBeenCalledWith(expect.objectContaining({ purpose: "EMAIL_VERIFICATION" }));
    expect(email.sendEmailVerification).toHaveBeenCalledWith(expect.objectContaining({ toEmail: "synthetic@example.test", verificationUrl: expect.stringContaining("/verify-email?token=") }));
    expect(JSON.stringify(result)).not.toContain("synthetic-raw-token");
  });
  it("consumes one valid verification token bound to the same user email", async () => {
    const { service, tx, tokens } = harness();
    await expect(service.confirmEmailVerification("token")).resolves.toMatchObject({ verified: true });
    expect(tokens.getTokenForUse).toHaveBeenCalledWith("token", "EMAIL_VERIFICATION", tx);
    expect(tx.user.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "user-1", email: "synthetic@example.test" } }));
  });
  it("rejects replay before modifying the user", async () => {
    const { service, tx } = harness();
    tx.authToken.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.confirmEmailVerification("token")).rejects.toThrow("already used or expired");
    expect(tx.user.updateMany).not.toHaveBeenCalled();
  });
  it("rejects a changed account email and relies on transaction rollback", async () => {
    const { service, tx } = harness();
    tx.user.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.confirmEmailVerification("token")).rejects.toThrow("no longer matches");
  });
});
