import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { initialPreviousInvoiceHash, ZatcaLocalPihIcvChain, ZatcaLocalPihIcvChainError } from "../src/index.ts";

describe("local provisional ZATCA PIH/ICV chain", () => {
  it("commits A, B, and C only after local signing, validation, and conformance succeed", async () => {
    const chain = new ZatcaLocalPihIcvChain();

    const a = await chain.issue(issue("invoice-a", 1, initialPreviousInvoiceHash, hash("a")));
    const b = await chain.issue(issue("invoice-b", 2, hash("a"), hash("b")));
    const c = await chain.issue(issue("invoice-c", 3, hash("b"), hash("c")));

    assert.equal(a.status, "COMMITTED_LOCALLY");
    assert.equal(b.status, "COMMITTED_LOCALLY");
    assert.equal(c.status, "COMMITTED_LOCALLY");
    assert.deepEqual(chain.getState(), {
      scope: "LOCAL_PROVISIONAL_ONLY",
      lastIcv: 3,
      lastInvoiceHash: hash("c"),
      committedInvoiceCount: 3,
      reservedIcvCount: 0,
      durableProductionStateChanged: false,
    });
  });

  it("rejects duplicate or skipped ICVs, reused PIH, and wrong/tampered previous hashes", async () => {
    const chain = new ZatcaLocalPihIcvChain();
    await chain.issue(issue("invoice-a", 1, initialPreviousInvoiceHash, hash("a")));

    await assert.rejects(() => chain.issue(issue("duplicate-icv", 1, hash("a"), hash("duplicate"))), ZatcaLocalPihIcvChainError);
    await assert.rejects(() => chain.issue(issue("skipped-icv", 3, hash("a"), hash("skipped"))), ZatcaLocalPihIcvChainError);
    await assert.rejects(() => chain.issue(issue("reused-pih", 2, initialPreviousInvoiceHash, hash("reused"))), ZatcaLocalPihIcvChainError);
    await assert.rejects(() => chain.issue(issue("tampered-previous", 2, hash("tampered-a"), hash("tampered"))), ZatcaLocalPihIcvChainError);
    await assert.rejects(() => chain.issue(issue("raw-hash", 2, hash("a"), "not-a-canonical-hash")), ZatcaLocalPihIcvChainError);
  });

  it("rolls back reservations on failed signing, validation, or local conformance", async () => {
    const chain = new ZatcaLocalPihIcvChain();

    for (const [invoiceId, outcome] of [
      ["signing-failed", { signingSucceeded: false, validationSucceeded: true, conformanceAccepted: true }],
      ["validation-failed", { signingSucceeded: true, validationSucceeded: false, conformanceAccepted: true }],
      ["conformance-rejected", { signingSucceeded: true, validationSucceeded: true, conformanceAccepted: false }],
    ] as const) {
      const result = await chain.issue({ ...issue(invoiceId, 1, initialPreviousInvoiceHash, hash(invoiceId)), ...outcome });
      assert.equal(result.status, "ROLLED_BACK_LOCALLY");
      assert.equal(chain.getState().lastIcv, 0);
    }

    const retried = await chain.issue(issue("invoice-a", 1, initialPreviousInvoiceHash, hash("a")));
    assert.equal(retried.status, "COMMITTED_LOCALLY");
  });

  it("serializes two concurrent issuance attempts for the same ICV without durable mutation", async () => {
    const chain = new ZatcaLocalPihIcvChain();
    const [first, second] = await Promise.allSettled([
      chain.issue(issue("invoice-a", 1, initialPreviousInvoiceHash, hash("a"))),
      chain.issue(issue("invoice-b", 1, initialPreviousInvoiceHash, hash("b"))),
    ]);

    assert.equal([first, second].filter((result) => result.status === "fulfilled").length, 1);
    assert.equal([first, second].filter((result) => result.status === "rejected").length, 1);
    assert.equal(chain.getState().lastIcv, 1);
    assert.equal(chain.getState().durableProductionStateChanged, false);
  });
});

function issue(invoiceId: string, icv: number, previousInvoiceHash: string, canonicalInvoiceHash: string) {
  return { invoiceId, icv, previousInvoiceHash, canonicalInvoiceHash, signingSucceeded: true, validationSucceeded: true, conformanceAccepted: true };
}

function hash(value: string): string {
  return Buffer.alloc(32, value).toString("base64");
}
