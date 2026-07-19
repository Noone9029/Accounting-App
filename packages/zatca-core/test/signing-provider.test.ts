import assert from "node:assert/strict";
import { generateKeyPairSync, verify } from "node:crypto";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  createZatcaSigningProvider,
  DisabledZatcaSigningProvider,
  LocalExternalPathZatcaSigningProvider,
  ZatcaSigningProviderDisabledError,
} from "../src/index.ts";

describe("ZATCA signing provider boundary", () => {
  it("defaults to a disabled provider that fails closed", async () => {
    const provider = createZatcaSigningProvider();

    await assert.rejects(() => provider.getCertificateMetadata(), ZatcaSigningProviderDisabledError);
    await assert.rejects(() => provider.getPublicKey(), ZatcaSigningProviderDisabledError);
    await assert.rejects(() => provider.signCanonicalizedData(Buffer.from("canonical signed info", "utf8")), ZatcaSigningProviderDisabledError);
    assert.ok(provider instanceof DisabledZatcaSigningProvider);
  });

  it("permits a local external-path secp256k1 signer only in a local environment", async () => {
    const dir = mkdtempSync(join(tmpdir(), "ledgerbyte-zatca-signing-provider-"));
    const privateKeyPath = join(dir, "local-test-signing-key.pem");
    const data = Buffer.from("canonical signed info", "utf8");
    const { privateKey, publicKey } = generateKeyPairSync("ec", { namedCurve: "secp256k1" });
    writeFileSync(privateKeyPath, privateKey.export({ type: "pkcs8", format: "pem" }), "utf8");

    try {
      const provider = new LocalExternalPathZatcaSigningProvider({
        environment: "LOCAL_TEST",
        privateKeyPath,
        keyId: "local-test-key-rotation-1",
        certificate: { status: "UNAVAILABLE", expiresAt: null, revokedAt: null },
      });

      const metadata = await provider.getCertificateMetadata();
      const signature = await provider.signCanonicalizedData(data);
      const returnedPublicKey = await provider.getPublicKey();

      assert.equal(metadata.algorithm, "EC_SECP256K1");
      assert.equal(metadata.keyId, "local-test-key-rotation-1");
      assert.equal(metadata.rotationStatus, "ACTIVE");
      assert.equal(metadata.certificateStatus, "UNAVAILABLE");
      assert.equal(metadata.privateKeyReturned, false);
      assert.equal(metadata.certificateBodyReturned, false);
      assert.equal(metadata.signingEnabled, true);
      assert.equal(signature.length, 64);
      assert.equal(verify("sha256", data, { key: returnedPublicKey, format: "der", type: "spki", dsaEncoding: "ieee-p1363" }, signature), true);
      assert.equal(returnedPublicKey.equals(publicKey.export({ type: "spki", format: "der" })), true);
      assert.doesNotMatch(JSON.stringify(metadata), /BEGIN (?:EC )?PRIVATE KEY|local-test-signing-key\.pem/i);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("rejects local dummy material in sandbox and production-looking environments", () => {
    for (const environment of ["SANDBOX", "SIMULATION", "PRODUCTION"] as const) {
      assert.throws(
        () =>
          new LocalExternalPathZatcaSigningProvider({
            environment,
            privateKeyPath: "C:\\untracked\\local-dummy-key.pem",
            keyId: "local-dummy-key",
            certificate: { status: "UNAVAILABLE", expiresAt: null, revokedAt: null },
          }),
        /local-only/i,
      );
    }
  });

  it("rejects RSA and malformed local signing keys without exposing the path or material", async () => {
    const dir = mkdtempSync(join(tmpdir(), "ledgerbyte-zatca-signing-provider-"));
    const privateKeyPath = join(dir, "not-a-zatca-key.pem");
    const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
    writeFileSync(privateKeyPath, privateKey.export({ type: "pkcs8", format: "pem" }), "utf8");

    try {
      const provider = new LocalExternalPathZatcaSigningProvider({
        environment: "LOCAL_TEST",
        privateKeyPath,
        keyId: "local-test-key",
        certificate: { status: "UNAVAILABLE", expiresAt: null, revokedAt: null },
      });
      await assert.rejects(() => provider.getPublicKey(), /EC secp256k1/i);
      await assert.rejects(() => provider.signCanonicalizedData(Buffer.from("data")), /EC secp256k1/i);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
