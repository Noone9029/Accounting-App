export const initialPreviousInvoiceHash = "NWZlY2ViNjZmZmM4NmYzOGQ5NTI3ODZjNmQ2OTZjNzljMmRiYzIzOWRkNGU5MWI0NjcyOWQ3M2EyN2ZiNTdlOQ==";

export interface ZatcaLocalPihIcvIssueInput {
  invoiceId: string;
  icv: number;
  previousInvoiceHash: string;
  canonicalInvoiceHash: string;
  signingSucceeded: boolean;
  validationSucceeded: boolean;
  conformanceAccepted: boolean;
}

export interface ZatcaLocalPihIcvIssueResult {
  status: "COMMITTED_LOCALLY" | "ROLLED_BACK_LOCALLY";
  invoiceId: string;
  icv: number;
  durableProductionStateChanged: false;
  localOnly: true;
}

export interface ZatcaLocalPihIcvState {
  scope: "LOCAL_PROVISIONAL_ONLY";
  lastIcv: number;
  lastInvoiceHash: string;
  committedInvoiceCount: number;
  reservedIcvCount: number;
  durableProductionStateChanged: false;
}

export class ZatcaLocalPihIcvChainError extends Error {
  constructor(readonly code: "ZATCA_LOCAL_ICV_SEQUENCE" | "ZATCA_LOCAL_PREVIOUS_HASH" | "ZATCA_LOCAL_DUPLICATE" | "ZATCA_LOCAL_INVALID_HASH") {
    super(messageForCode(code));
    this.name = "ZatcaLocalPihIcvChainError";
  }
}

/**
 * In-memory conformance proof only. It deliberately has no database adapter and
 * never represents clearance/reporting acceptance or durable production state.
 */
export class ZatcaLocalPihIcvChain {
  private lastIcv = 0;
  private lastInvoiceHash = initialPreviousInvoiceHash;
  private readonly committedInvoiceIds = new Set<string>();
  private readonly committedHashes = new Set<string>();
  private readonly reservedIcvByInvoiceId = new Map<string, number>();

  async issue(input: ZatcaLocalPihIcvIssueInput): Promise<ZatcaLocalPihIcvIssueResult> {
    this.reserve(input);
    await Promise.resolve();
    if (!input.signingSucceeded || !input.validationSucceeded || !input.conformanceAccepted) {
      this.reservedIcvByInvoiceId.delete(input.invoiceId);
      return { status: "ROLLED_BACK_LOCALLY", invoiceId: input.invoiceId, icv: input.icv, durableProductionStateChanged: false, localOnly: true };
    }

    this.reservedIcvByInvoiceId.delete(input.invoiceId);
    this.committedInvoiceIds.add(input.invoiceId);
    this.committedHashes.add(input.canonicalInvoiceHash);
    this.lastIcv = input.icv;
    this.lastInvoiceHash = input.canonicalInvoiceHash;
    return { status: "COMMITTED_LOCALLY", invoiceId: input.invoiceId, icv: input.icv, durableProductionStateChanged: false, localOnly: true };
  }

  getState(): ZatcaLocalPihIcvState {
    return {
      scope: "LOCAL_PROVISIONAL_ONLY",
      lastIcv: this.lastIcv,
      lastInvoiceHash: this.lastInvoiceHash,
      committedInvoiceCount: this.committedInvoiceIds.size,
      reservedIcvCount: this.reservedIcvByInvoiceId.size,
      durableProductionStateChanged: false,
    };
  }

  private reserve(input: ZatcaLocalPihIcvIssueInput): void {
    const invoiceId = input.invoiceId.trim();
    const previousInvoiceHash = input.previousInvoiceHash.trim();
    const canonicalInvoiceHash = input.canonicalInvoiceHash.trim();
    if (!invoiceId || !isSha256Base64(canonicalInvoiceHash)) {
      throw new ZatcaLocalPihIcvChainError("ZATCA_LOCAL_INVALID_HASH");
    }
    if (this.committedInvoiceIds.has(invoiceId) || this.reservedIcvByInvoiceId.has(invoiceId) || this.committedHashes.has(canonicalInvoiceHash)) {
      throw new ZatcaLocalPihIcvChainError("ZATCA_LOCAL_DUPLICATE");
    }
    if (input.icv !== this.lastIcv + 1 || [...this.reservedIcvByInvoiceId.values()].includes(input.icv)) {
      throw new ZatcaLocalPihIcvChainError("ZATCA_LOCAL_ICV_SEQUENCE");
    }
    if (previousInvoiceHash !== this.lastInvoiceHash) {
      throw new ZatcaLocalPihIcvChainError("ZATCA_LOCAL_PREVIOUS_HASH");
    }
    this.reservedIcvByInvoiceId.set(invoiceId, input.icv);
  }
}

function isSha256Base64(value: string): boolean {
  return /^[A-Za-z0-9+/]{43}=$/.test(value);
}

function messageForCode(code: ZatcaLocalPihIcvChainError["code"]): string {
  switch (code) {
    case "ZATCA_LOCAL_ICV_SEQUENCE":
      return "Local ZATCA conformance requires the next unreserved ICV in sequence.";
    case "ZATCA_LOCAL_PREVIOUS_HASH":
      return "Local ZATCA conformance requires the accepted canonical hash of the immediately previous invoice.";
    case "ZATCA_LOCAL_DUPLICATE":
      return "Local ZATCA conformance rejects a duplicate invoice, hash, or active reservation.";
    case "ZATCA_LOCAL_INVALID_HASH":
      return "Local ZATCA conformance requires non-empty invoice and canonical hash identifiers.";
  }
}
