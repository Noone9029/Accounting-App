import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { generateKeyPairSync, sign, verify } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, it } from "node:test";
import {
  attachZatcaPhase2QrToSignedInvoice,
  buildZatcaInvoiceXml,
  createZatcaXadesSignedInvoice,
  encodeZatcaPhase2Qr,
  extractZatcaCertificateAuthoritySignatureDer,
  LocalExternalPathZatcaSigningProvider,
  type ZatcaSigningProvider,
  verifyZatcaPhase2QrSignature,
} from "../src/index.ts";

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
      async getCertificateDerForSigning() {
        return Buffer.from("synthetic-public-certificate", "utf8");
      },
      async signCanonicalizedData(bytes) {
        return sign("sha256", bytes, { key: privateKey, dsaEncoding: "ieee-p1363" });
      },
    };
    const result = await createZatcaXadesSignedInvoice({
      unsignedXml: '<?xml version="1.0" encoding="UTF-8"?><Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2" xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"><cac:AccountingSupplierParty/></Invoice>',
      invoiceHashBase64: Buffer.alloc(32, 1).toString("base64"),
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

  it("signs a LedgerByte fixture with external local-only material and C14N11 bytes", async (t) => {
    const sdkRoot = process.env.ZATCA_SDK_ROOT;
    const javaBin = process.env.ZATCA_SDK_JAVA_BIN;
    if (!sdkRoot || !javaBin) {
      t.skip("external SDK/JDK are not configured");
      return;
    }
    const root = resolve(__dirname, "../../..");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const c14n = require(join(root, "scripts", "zatca-c14n11-hash.cjs")) as typeof import("../../../scripts/zatca-c14n11-hash.cjs");
    const invoice = JSON.parse(readFileSync(join(root, "packages", "zatca-core", "fixtures", "ledgerbyte-generated-standard-invoice.input.json"), "utf8"));
    const unsignedXml = buildZatcaInvoiceXml(invoice);
    const hash = c14n.computeZatcaC14n11Hash({ xml: unsignedXml, cwd: root, env: process.env });
    assert.equal(hash.status, "PASSED");
    const provider = new LocalExternalPathZatcaSigningProvider({
      environment: "LOCAL_TEST",
      privateKeyPath: join(sdkRoot, "Data", "Certificates", "ec-secp256k1-priv-key.pem"),
      certificatePath: join(sdkRoot, "Data", "Certificates", "cert.pem"),
      keyId: "external-local-sdk-dummy-key",
      certificate: { status: "ACTIVE", expiresAt: null, revokedAt: null },
    });
    const result = await createZatcaXadesSignedInvoice({
      unsignedXml,
      invoiceHashBase64: hash.hash,
      signingTime: "2026-07-20T12:00:00Z",
      canonicalize: async (xml) => {
        const canonical = c14n.canonicalizeZatcaXmlC14n11({ xml, cwd: root, env: process.env });
        if (canonical.status !== "PASSED" || !canonical.canonicalBytes) throw new Error("C14N11 helper failed");
        return canonical.canonicalBytes;
      },
      signingProvider: provider,
    });

    assert.equal(verify("sha256", result.signedInfoCanonicalBytes, { key: await provider.getPublicKey(), format: "der", type: "spki", dsaEncoding: "ieee-p1363" }, result.signatureP1363), true);
    assert.match(result.xml, /<ds:SignatureValue>[A-Za-z0-9+/]+=*<\/ds:SignatureValue>/);
    assert.doesNotMatch(result.xml, /PRIVATE KEY/);
  });

  it("validates a LedgerByte-created signed XML with a generated Phase 2 QR using the offline official SDK", async (t) => {
    const sdkRoot = process.env.ZATCA_SDK_ROOT;
    const javaBin = process.env.ZATCA_SDK_JAVA_BIN;
    if (!sdkRoot || !javaBin) {
      t.skip("external SDK/JDK are not configured");
      return;
    }

    const root = resolve(__dirname, "../../..");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const c14n = require(join(root, "scripts", "zatca-c14n11-hash.cjs")) as typeof import("../../../scripts/zatca-c14n11-hash.cjs");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const sdk = require(join(root, "scripts", "zatca-sdk-validate-local-lib.cjs")) as typeof import("../../../scripts/zatca-sdk-validate-local-lib.cjs");
    const invoice = JSON.parse(readFileSync(join(root, "packages", "zatca-core", "fixtures", "ledgerbyte-generated-standard-invoice.input.json"), "utf8"));
    const unsignedXml = buildZatcaInvoiceXml(invoice);
    const hash = c14n.computeZatcaC14n11Hash({ xml: unsignedXml, cwd: root, env: process.env });
    assert.equal(hash.status, "PASSED");
    const provider = new LocalExternalPathZatcaSigningProvider({
      environment: "LOCAL_TEST",
      privateKeyPath: join(sdkRoot, "Data", "Certificates", "ec-secp256k1-priv-key.pem"),
      certificatePath: join(sdkRoot, "Data", "Certificates", "cert.pem"),
      keyId: "external-local-sdk-dummy-key",
      certificate: { status: "ACTIVE", expiresAt: null, revokedAt: null },
    });
    const result = await createZatcaXadesSignedInvoice({
      unsignedXml,
      invoiceHashBase64: hash.hash,
      signingTime: "2026-07-20T12:00:00Z",
      canonicalize: async (xml) => {
        const canonical = c14n.canonicalizeZatcaXmlC14n11({ xml, cwd: root, env: process.env });
        if (canonical.status !== "PASSED" || !canonical.canonicalBytes) throw new Error("C14N11 helper failed");
        return canonical.canonicalBytes;
      },
      signingProvider: provider,
    });

    const qr = encodeZatcaPhase2Qr({
      invoiceType: "STANDARD_TAX_INVOICE",
      artifactStatus: "CLEARED",
      sellerName: invoice.seller.name,
      vatNumber: invoice.seller.vatNumber,
      timestamp: "2026-06-06T09:00:00Z",
      invoiceTotal: invoice.total,
      vatTotal: invoice.taxTotal,
      invoiceHashBase64: result.invoiceHashBase64,
      ecdsaSignatureDerBase64: result.signatureDerBase64,
      publicKeyDerBase64: (await provider.getPublicKey()).toString("base64"),
      authoritySignatureDerBase64: extractZatcaCertificateAuthoritySignatureDer(await provider.getCertificateDerForSigning()).toString("base64"),
    });
    const signedXmlWithQr = attachZatcaPhase2QrToSignedInvoice(result.xml, qr.base64);
    assert.equal(verifyZatcaPhase2QrSignature({ qrBase64: qr.base64, signedInfoCanonicalBytes: result.signedInfoCanonicalBytes }), true);

    const temp = mkdtempSync(join(tmpdir(), "ledgerbyte-zatca-xades-"));
    const signedInvoicePath = join(temp, "signed-invoice.xml");
    writeFileSync(signedInvoicePath, signedXmlWithQr, "utf8");
    const commandPlan = sdk.buildValidationCommand({ sdk: sdk.discoverSdk(root, process.env), fixturePath: signedInvoicePath, javaBin });
    try {
      const validation = spawnSync(commandPlan.command, commandPlan.args, {
        cwd: sdkRoot,
        env: { ...process.env, ...commandPlan.envAdditions },
        encoding: "utf8",
        timeout: 60_000,
        windowsHide: true,
        maxBuffer: 1024 * 1024,
      });
      const safe = sdk.summarizeSdkOutput([validation.stdout, validation.stderr, validation.error?.message].filter(Boolean).join("\n"));
      assert.equal(validation.status, 0, `offline SDK rejected LedgerByte signed XML: ${safe.errorCodes.join(",") || "SDK_EXIT_NONZERO"}`);
      assert.match(safe.textForInference, /PASS/i, "offline SDK did not report a passing signed-XML validation result");
    } finally {
      rmSync(temp, { recursive: true, force: true });
      for (const cleanupPath of commandPlan.cleanupPaths ?? []) {
        rmSync(cleanupPath, { recursive: true, force: true });
      }
    }
  });
});
