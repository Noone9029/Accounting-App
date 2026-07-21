export type EphemeralOtpErrorCode =
  | "OTP_ARGUMENTS_REJECTED"
  | "OTP_OPERATION_ALREADY_CONSUMED"
  | "OTP_APPROVAL_REQUIRED"
  | "OTP_PREFLIGHT_REQUIRED"
  | "OTP_OPERATION_EXPIRED"
  | "OTP_INPUT_NOT_INTERACTIVE"
  | "OTP_INPUT_INVALID";

export class EphemeralOtpError extends Error {
  constructor(public readonly code: EphemeralOtpErrorCode) {
    super("Ephemeral OTP input was rejected. Sensitive input was not retained.");
    this.name = "EphemeralOtpError";
  }
}

export interface EphemeralOtpFormat {
  digits: number;
  officialEvidenceConfirmed: boolean;
}

export interface EphemeralOtpOperationOptions {
  approvalPresent: boolean;
  preflightReady: boolean;
  interactiveInput?: boolean;
  expiresAt?: Date;
  now?: () => Date;
  format?: EphemeralOtpFormat;
  reader: () => Promise<Buffer>;
}

/**
 * A disposable, operation-scoped OTP boundary. It never returns an OTP to its
 * caller; the sensitive buffer exists only inside the supplied callback.
 */
export class EphemeralOtpOperation {
  private consumed = false;
  private disposed = false;

  constructor(private readonly options: EphemeralOtpOperationOptions) {}

  async consume<T>(callback: (otp: Buffer) => Promise<T> | T): Promise<T> {
    this.assertReadyBeforeReading();
    this.consumed = true;

    let source: Buffer | undefined;
    let otp: Buffer | undefined;
    try {
      source = await this.options.reader();
      otp = Buffer.from(source);
      this.assertValidFormat(otp);
      return await callback(otp);
    } finally {
      source?.fill(0);
      otp?.fill(0);
      this.dispose();
    }
  }

  dispose(): void {
    this.disposed = true;
  }

  private assertReadyBeforeReading(): void {
    if (this.consumed || this.disposed) {
      throw new EphemeralOtpError("OTP_OPERATION_ALREADY_CONSUMED");
    }
    if (!this.options.approvalPresent) {
      throw new EphemeralOtpError("OTP_APPROVAL_REQUIRED");
    }
    if (!this.options.preflightReady) {
      throw new EphemeralOtpError("OTP_PREFLIGHT_REQUIRED");
    }
    if (this.options.interactiveInput === false) {
      throw new EphemeralOtpError("OTP_INPUT_NOT_INTERACTIVE");
    }
    if (this.options.expiresAt && this.options.expiresAt.getTime() <= (this.options.now?.() ?? new Date()).getTime()) {
      throw new EphemeralOtpError("OTP_OPERATION_EXPIRED");
    }
    if (!this.options.format?.officialEvidenceConfirmed) {
      throw new EphemeralOtpError("OTP_PREFLIGHT_REQUIRED");
    }
  }

  private assertValidFormat(otp: Buffer): void {
    const format = this.options.format;
    if (!format || format.digits < 1 || otp.length !== format.digits) {
      throw new EphemeralOtpError("OTP_INPUT_INVALID");
    }
    for (const byte of otp) {
      if (byte < 0x30 || byte > 0x39) {
        throw new EphemeralOtpError("OTP_INPUT_INVALID");
      }
    }
  }
}
