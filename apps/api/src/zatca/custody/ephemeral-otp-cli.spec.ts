import { EventEmitter } from "node:events";
import { EphemeralOtpError } from "./ephemeral-otp";
import { main, parseSecureOtpArguments, readHiddenOtpFromTty, runSecureOtpInput, type SecureOtpTerminalInput, type SecureOtpTerminalOutput } from "./ephemeral-otp-cli";

class FakeInput extends EventEmitter implements SecureOtpTerminalInput {
  isTTY = true;
  setRawMode = jest.fn();
  resume = jest.fn();
  pause = jest.fn();
}

class FakeOutput implements SecureOtpTerminalOutput {
  isTTY = true;
  writes: string[] = [];
  write(chunk: string): boolean {
    this.writes.push(chunk);
    return true;
  }
}

describe("secure ephemeral OTP terminal boundary", () => {
  it("uses raw TTY input without echoing the fake OTP", async () => {
    const input = new FakeInput();
    const output = new FakeOutput();
    const read = readHiddenOtpFromTty(input, output);
    const inputBytes = Buffer.from("123456\r");
    input.emit("data", inputBytes);
    const otp = await read;

    expect(otp.toString("utf8")).toBe("123456");
    expect(output.writes.join("")).not.toContain("123456");
    expect(input.setRawMode).toHaveBeenNthCalledWith(1, true);
    expect(input.setRawMode).toHaveBeenLastCalledWith(false);
    expect(input.pause).toHaveBeenCalledTimes(1);
    expect(inputBytes.every((byte) => byte === 0)).toBe(true);
    otp.fill(0);
  });

  it("rejects a non-interactive terminal without reading", async () => {
    const input = new FakeInput();
    input.isTTY = false;
    const output = new FakeOutput();
    await expect(readHiddenOtpFromTty(input, output)).rejects.toMatchObject({ code: "OTP_INPUT_NOT_INTERACTIVE" });
    expect(input.setRawMode).not.toHaveBeenCalled();
    expect(output.writes).toEqual([]);
  });

  it("rejects command-line OTP values and does not read before approval", async () => {
    expect(() => parseSecureOtpArguments(["--otp=123456"])).toThrow(EphemeralOtpError);
    expect(() => parseSecureOtpArguments(["--", "--stdin-secure"])).not.toThrow();
    const input = new FakeInput();
    const output = new FakeOutput();
    const execute = jest.fn(async () => undefined);
    await expect(runSecureOtpInput(
      ["--stdin-secure"],
      { approvalPresent: false, preflightReady: true, format: { digits: 6, officialEvidenceConfirmed: true }, executeApprovedOperation: execute },
      { input, output },
    )).rejects.toMatchObject({ code: "OTP_APPROVAL_REQUIRED" });
    expect(input.setRawMode).not.toHaveBeenCalled();
    expect(execute).not.toHaveBeenCalled();
    expect(output.writes.join("")).not.toContain("123456");
  });

  it("does not expose the fake OTP through command output when the approved callback runs", async () => {
    const input = new FakeInput();
    const output = new FakeOutput();
    const received: Buffer[] = [];
    const run = runSecureOtpInput(
      ["--stdin-secure"],
      { approvalPresent: true, preflightReady: true, format: { digits: 6, officialEvidenceConfirmed: true }, executeApprovedOperation: async (otp) => { received.push(otp); } },
      { input, output },
    );
    input.emit("data", Buffer.from("123456\r"));
    await run;
    expect(output.writes.join("")).not.toContain("123456");
    expect(received).toHaveLength(1);
    expect(received[0]?.every((byte) => byte === 0)).toBe(true);
  });

  it("writes only a bounded rejection to stderr and nothing to stdout before any input read", async () => {
    const input = new FakeInput();
    const output = new FakeOutput();
    const errors: string[] = [];
    const previousExitCode = process.exitCode;
    try {
      await main(["--", "--stdin-secure"], { input, output, error: { write: (chunk) => errors.push(chunk) } });
      expect(output.writes).toEqual([]);
      expect(errors.join("")).toContain("OTP_APPROVAL_REQUIRED");
      expect(errors.join("")).not.toContain("123456");
      expect(input.setRawMode).not.toHaveBeenCalled();
    } finally {
      process.exitCode = previousExitCode;
    }
  });
});
