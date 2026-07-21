import { EphemeralOtpOperation, EphemeralOtpError } from "./ephemeral-otp";

const format = { digits: 6, officialEvidenceConfirmed: true } as const;

describe("ephemeral sandbox OTP operation", () => {
  it("rejects absent approval before calling the reader", async () => {
    const reader = jest.fn(async () => Buffer.from("123456"));
    const operation = new EphemeralOtpOperation({ approvalPresent: false, preflightReady: true, format, reader });
    await expect(operation.consume(async () => undefined)).rejects.toMatchObject({ code: "OTP_APPROVAL_REQUIRED" });
    expect(reader).not.toHaveBeenCalled();
  });

  it("supplies a fake six-digit OTP only to one callback and rejects replay", async () => {
    const reader = jest.fn(async () => Buffer.from("123456"));
    const operation = new EphemeralOtpOperation({ approvalPresent: true, preflightReady: true, format, reader });
    await expect(operation.consume(async (otp) => otp.length)).resolves.toBe(6);
    await expect(operation.consume(async () => 0)).rejects.toBeInstanceOf(EphemeralOtpError);
    expect(reader).toHaveBeenCalledTimes(1);
  });

  it("rejects non-numeric, empty, and non-interactive input without exposing it", async () => {
    for (const value of ["", "12 456", "12345", "1234567"]) {
      const operation = new EphemeralOtpOperation({ approvalPresent: true, preflightReady: true, format, reader: async () => Buffer.from(value) });
      await expect(operation.consume(async () => undefined)).rejects.toBeInstanceOf(EphemeralOtpError);
    }
  });

  it("rejects non-interactive, expired, failed-preflight, and unconfirmed-format contexts before reading", async () => {
    const cases = [
      { options: { interactiveInput: false }, code: "OTP_INPUT_NOT_INTERACTIVE" },
      { options: { expiresAt: new Date(0), now: () => new Date(1) }, code: "OTP_OPERATION_EXPIRED" },
      { options: { preflightReady: false }, code: "OTP_PREFLIGHT_REQUIRED" },
      { options: { format: { digits: 6, officialEvidenceConfirmed: false } }, code: "OTP_PREFLIGHT_REQUIRED" },
    ] as const;

    for (const testCase of cases) {
      const reader = jest.fn(async () => Buffer.from("123456"));
      const operation = new EphemeralOtpOperation({ approvalPresent: true, preflightReady: true, format, reader, ...testCase.options });
      await expect(operation.consume(async () => undefined)).rejects.toMatchObject({ code: testCase.code });
      expect(reader).not.toHaveBeenCalled();
    }
  });

  it("clears the source and callback buffers after both success and failure", async () => {
    const successSource = Buffer.from("123456");
    let successCallbackBuffer: Buffer | undefined;
    const success = new EphemeralOtpOperation({ approvalPresent: true, preflightReady: true, format, reader: async () => successSource });
    await success.consume(async (otp) => {
      successCallbackBuffer = otp;
      return "done";
    });
    expect(successSource.every((byte) => byte === 0)).toBe(true);
    expect(successCallbackBuffer?.every((byte) => byte === 0)).toBe(true);

    const failureSource = Buffer.from("123456");
    const failure = new EphemeralOtpOperation({ approvalPresent: true, preflightReady: true, format, reader: async () => failureSource });
    await expect(failure.consume(async () => {
      throw new Error("synthetic callback failure");
    })).rejects.toThrow("synthetic callback failure");
    expect(failureSource.every((byte) => byte === 0)).toBe(true);
  });
});
