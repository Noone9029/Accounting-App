import { EphemeralOtpError, EphemeralOtpOperation, type EphemeralOtpFormat } from "./ephemeral-otp";

const SECURE_INPUT_FLAG = "--stdin-secure";

export interface SecureOtpTerminalInput {
  isTTY?: boolean;
  setRawMode?: (enabled: boolean) => unknown;
  resume: () => unknown;
  pause: () => unknown;
  on: (event: "data", listener: (chunk: Buffer) => void) => unknown;
  off: (event: "data", listener: (chunk: Buffer) => void) => unknown;
}

export interface SecureOtpTerminalOutput {
  isTTY?: boolean;
  write: (chunk: string) => unknown;
}

export interface SecureOtpExecutionContext {
  approvalPresent: boolean;
  preflightReady: boolean;
  format: EphemeralOtpFormat;
  expiresAt?: Date;
  executeApprovedOperation: (otp: Buffer) => Promise<void>;
}

export interface SecureOtpCommandStreams {
  input: SecureOtpTerminalInput;
  output: SecureOtpTerminalOutput;
  error: { write: (chunk: string) => unknown };
}

export function parseSecureOtpArguments(argv: readonly string[]): void {
  const normalized = argv[0] === "--" ? argv.slice(1) : argv;
  if (normalized.length !== 1 || normalized[0] !== SECURE_INPUT_FLAG) {
    throw new EphemeralOtpError("OTP_ARGUMENTS_REJECTED");
  }
}

/** Reads from a real TTY only. It never writes entered bytes to the terminal. */
export function readHiddenOtpFromTty(input: SecureOtpTerminalInput, output: SecureOtpTerminalOutput): Promise<Buffer> {
  const setRawMode = input.setRawMode;
  if (!input.isTTY || !output.isTTY || typeof setRawMode !== "function") {
    return Promise.reject(new EphemeralOtpError("OTP_INPUT_NOT_INTERACTIVE"));
  }

  return new Promise<Buffer>((resolve, reject) => {
    const bytes: number[] = [];
    let finished = false;
    const finish = (error?: Error, value?: Buffer) => {
      if (finished) return;
      finished = true;
      input.off("data", onData);
      setRawMode(false);
      input.pause();
      output.write("\n");
      bytes.fill(0);
      bytes.length = 0;
      if (error) reject(error);
      else resolve(value ?? Buffer.alloc(0));
    };
    const onData = (chunk: Buffer) => {
      try {
        for (const byte of chunk) {
          if (byte === 0x03) {
            finish(new EphemeralOtpError("OTP_INPUT_INVALID"));
            return;
          }
          if (byte === 0x0d || byte === 0x0a) {
            finish(undefined, Buffer.from(bytes));
            return;
          }
          if (byte === 0x08 || byte === 0x7f) {
            bytes.pop();
            continue;
          }
          bytes.push(byte);
        }
      } finally {
        chunk.fill(0);
      }
    };

    output.write("Enter OTP securely: ");
    setRawMode(true);
    input.on("data", onData);
    input.resume();
  });
}

export async function runSecureOtpInput(
  argv: readonly string[],
  context: SecureOtpExecutionContext,
  terminal: { input: SecureOtpTerminalInput; output: SecureOtpTerminalOutput },
): Promise<void> {
  parseSecureOtpArguments(argv);
  const operation = new EphemeralOtpOperation({
    approvalPresent: context.approvalPresent,
    preflightReady: context.preflightReady,
    interactiveInput: true,
    expiresAt: context.expiresAt,
    format: context.format,
    reader: () => readHiddenOtpFromTty(terminal.input, terminal.output),
  });
  await operation.consume(context.executeApprovedOperation);
}

export async function main(
  argv = process.argv.slice(2),
  streams: SecureOtpCommandStreams = { input: process.stdin, output: process.stdout, error: process.stderr },
): Promise<void> {
  try {
    await runSecureOtpInput(
      argv,
      {
        // This local-preparation command never reads process environment or an
        // argument as approval. Future reviewed execution code must inject both
        // active approval and a checksum-backed official format separately.
        approvalPresent: false,
        preflightReady: false,
        format: { digits: 0, officialEvidenceConfirmed: false },
        executeApprovedOperation: async () => undefined,
      },
      { input: streams.input, output: streams.output },
    );
  } catch (error) {
    if (error instanceof EphemeralOtpError) {
      streams.error.write(`Secure OTP input rejected: ${error.code}.\n`);
      process.exitCode = 1;
      return;
    }
    streams.error.write("Secure OTP input rejected. Sensitive input was not retained.\n");
    process.exitCode = 1;
  }
}

if (require.main === module) {
  void main();
}
