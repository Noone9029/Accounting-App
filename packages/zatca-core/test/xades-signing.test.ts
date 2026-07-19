import assert from "node:assert/strict";
import { generateKeyPairSync, sign, verify } from "node:crypto";
import { describe, it } from "node:test";
import { createZatcaXadesSignedInvoice, type ZatcaSigningProvider } from "../src/index.ts";

describe("LedgerByte XAdES invoice construction", () => {
  it("constructs the official UBL XAdES shape and verifies its LedgerByte ECDSA signature", async () => {
    const { privateKey, publicKey } = generateKeyPairSync("ec", { namedCurve: "secp256k1" });
    const provider: ZatcaSigningProvider = {
      async getCertificateMetadata() {
        return {
          provider: "LOCAL_EXTERNAL_PATH", algorithm: "EC_SECP256K1", keyId: "test-key", rotationStatus: "ACTIVE", certificateStatus: "ACTIVE",
          certificateFingerprint: null, certificateSerialNumber: "42", certificateIssuer: "CN=LedgerByte Test", certificateExpiresAt: null, certificateRevokedAt: null,
          signingEnabled: true, privateKeyReturned: false, certificateBodyReturned: false,
        };
      },
      async getPublicKey() {
        return Buffer.from(publicKey.export({ type: "spki", format: "der" }));
      },
      async signCanonicalizedData(bytes) {
        return sign("sha256", bytes, { key: privateKey, dsaEncoding: "ieee-p1363" });
      },
    };
    const result = await createZatcaXadesSignedInvoice({
      unsignedXml: '<?xml version="1.0" encoding="UTF-8"?><Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2" xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"><cac:AccountingSupplierParty/></Invoice>',
      invoiceHashBase64: Buffer.alloc(32, 1).toString("base64"),
      certificateDerBase64: Buffer.from("synthetic-public-certificate", "utf8").toString("base64"),
      signingTime: "2026-07-20T12:00:00Z",
      canonicalize: async (xml) => Buffer.from(xml, "utf8"),
      signingProvider: provider,
    });

    assert.match(result.xml, /<ext:UBLExtensions/);
    assert.match(result.xml, /<Invoice[^>]*><ext:UBLExtensions/);
    assert.match(result.xml, /<ds:CanonicalizationMethod Algorithm="http:\/\/www\.w3\.org\/2006\/12\/xml-c14n11"\/>/);
    assert.match(result.xml, /<ds:SignatureMethod Algorithm="http:\/\/www\.w3\.org\/2001\/04\/xmldsig-more#ecdsa-sha256"\/>/);
    assert.match(result.xml, /URI="#xadesSignedProperties"/);
    assert.match(result.xml, /<xades:SigningTime>2026-07-20T12:00:00Z<\/xades:SigningTime>/);
    assert.match(result.xml, /<cac:Signature>/);
    assert.equal(verify("sha256", result.signedInfoCanonicalBytes, { key: publicKey, dsaEncoding: "ieee-p1363" }, result.signatureP1363), true);
    assert.equal(result.xml.includes("PRIVATE KEY"), false);
  });
});
