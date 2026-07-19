import assert from "node:assert/strict";
import { generateKeyPairSync, sign } from "node:crypto";
import { describe, it } from "node:test";
import { decodeZatcaPhase2Qr, encodeZatcaPhase2Qr, verifyZatcaPhase2QrSignature } from "../src/index.ts";

describe("ZATCA Phase 2 QR", () => {
  it("round-trips all nine tags with Arabic UTF-8 content and verifies the decoded ECDSA signature", () => {
    const { privateKey, publicKey } = generateKeyPairSync("ec", { namedCurve: "secp256k1" });
    const signedInfo = Buffer.from("canonical signed info", "utf8");
    const signatureDer = sign("sha256", signedInfo, privateKey);
    const qr = encodeZatcaPhase2Qr({
      invoiceType: "SIMPLIFIED_TAX_INVOICE",
      artifactStatus: "REPORTED",
      sellerName: "شركة ليدجربايت العربية",
      vatNumber: "399999999900003",
      timestamp: "2026-07-20T12:00:00Z",
      invoiceTotal: "115.00",
      vatTotal: "15.00",
      invoiceHashBase64: Buffer.alloc(32, 1).toString("base64"),
      ecdsaSignatureDerBase64: signatureDer.toString("base64"),
      publicKeyDerBase64: Buffer.from(publicKey.export({ type: "spki", format: "der" })).toString("base64"),
      authoritySignatureDerBase64: Buffer.from([0x30, 0x03, 0x02, 0x01, 0x01]).toString("base64"),
    });
    const decoded = decodeZatcaPhase2Qr(qr.base64);

    assert.equal(qr.status, "PHASE_2_CRYPTOGRAPHIC");
    assert.equal(decoded.sellerName, "شركة ليدجربايت العربية");
    assert.equal(decoded.tagOrder.join(","), "1,2,3,4,5,6,7,8,9");
    assert.equal(verifyZatcaPhase2QrSignature({ qrBase64: qr.base64, signedInfoCanonicalBytes: signedInfo }), true);
  });

  it("rejects missing cryptographic tags, duplicate tags, unsupported invoice artifact states, and tampering", () => {
    const input = validInput();
    assert.throws(() => encodeZatcaPhase2Qr({ ...input, authoritySignatureDerBase64: "" }), /authority signature/i);
    assert.throws(() => encodeZatcaPhase2Qr({ ...input, publicKeyDerBase64: "not-base64" }), /encoding is invalid/i);
    assert.throws(() => encodeZatcaPhase2Qr({ ...input, invoiceType: "STANDARD_TAX_INVOICE", artifactStatus: "REPORTED" }), /cleared/i);
    const qr = encodeZatcaPhase2Qr(input);
    const duplicated = Buffer.concat([Buffer.from(qr.base64, "base64"), Buffer.from([1, 1, 65])]).toString("base64");
    assert.throws(() => decodeZatcaPhase2Qr(duplicated), /duplicate/i);
    const bytes = Buffer.from(qr.base64, "base64");
    const signatureTagOffset = bytes.indexOf(7);
    bytes[signatureTagOffset + 2] ^= 1;
    assert.equal(verifyZatcaPhase2QrSignature({ qrBase64: bytes.toString("base64"), signedInfoCanonicalBytes: Buffer.from("canonical signed info") }), false);
  });

  it("preserves UTF-8 values that require multi-byte TLV lengths", () => {
    const input = validInput();
    const sellerName = "أ".repeat(100);
    const qr = encodeZatcaPhase2Qr({ ...input, sellerName });

    assert.equal(decodeZatcaPhase2Qr(qr.base64).sellerName, sellerName);
  });
});

function validInput() {
  const { privateKey, publicKey } = generateKeyPairSync("ec", { namedCurve: "secp256k1" });
  const signedInfo = Buffer.from("canonical signed info");
  return {
    invoiceType: "SIMPLIFIED_TAX_INVOICE" as const,
    artifactStatus: "REPORTED" as const,
    sellerName: "LedgerByte",
    vatNumber: "399999999900003",
    timestamp: "2026-07-20T12:00:00Z",
    invoiceTotal: "115.00",
    vatTotal: "15.00",
    invoiceHashBase64: Buffer.alloc(32, 1).toString("base64"),
    ecdsaSignatureDerBase64: sign("sha256", signedInfo, privateKey).toString("base64"),
    publicKeyDerBase64: Buffer.from(publicKey.export({ type: "spki", format: "der" })).toString("base64"),
    authoritySignatureDerBase64: Buffer.from([0x30, 0x03, 0x02, 0x01, 0x01]).toString("base64"),
  };
}
