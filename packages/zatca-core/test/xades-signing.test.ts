import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash, generateKeyPairSync, sign, verify } from "node:crypto";
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
  verifyZatcaSignedArtifact,
  verifyZatcaPhase2QrSignature,
  verifyZatcaXadesSignature,
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
    assert.match(result.xml, /<\/ext:UBLExtensions>/);
    assert.doesNotMatch(result.xml, /<\/ext:UBLEExtensions>/);
    assert.match(result.xml, /<Invoice[^>]*><ext:UBLExtensions/);
    assert.match(result.xml, /<ds:CanonicalizationMethod Algorithm="http:\/\/www\.w3\.org\/2006\/12\/xml-c14n11"\/>/);
    assert.match(result.xml, /<ds:SignatureMethod Algorithm="http:\/\/www\.w3\.org\/2001\/04\/xmldsig-more#ecdsa-sha256"\/>/);
    assert.match(result.xml, /URI="#xadesSignedProperties"/);
    assert.match(result.xml, /<xades:SigningTime>2026-07-20T12:00:00Z<\/xades:SigningTime>/);
    assert.match(result.xml, /<cac:Signature>/);
    const expectedCertificateDigest = createHash("sha256").update("synthetic-public-certificate", "utf8").digest("base64");
    assert.match(result.xml, new RegExp(`<ds:DigestValue>${expectedCertificateDigest}<\\/ds:DigestValue>`));
    assert.equal(verify("sha256", result.signedInfoCanonicalBytes, { key: publicKey, dsaEncoding: "ieee-p1363" }, result.signatureP1363), true);
    const publicKeyDer = Buffer.from(publicKey.export({ type: "spki", format: "der" }));
    assert.equal(verifyZatcaXadesSignature({ signedInfoCanonicalBytes: result.signedInfoCanonicalBytes, signatureP1363: result.signatureP1363, publicKeyDer }), true);
    assert.equal(verifyZatcaXadesSignature({ signedInfoCanonicalBytes: Buffer.from("tampered"), signatureP1363: result.signatureP1363, publicKeyDer }), false);
    assert.equal(result.xml.includes("PRIVATE KEY"), false);
  });

  it("fails closed for malformed hash input, certificate metadata, and malformed signer output", async () => {
    const baseProvider: ZatcaSigningProvider = {
      async getCertificateMetadata() {
        return {
          provider: "LOCAL_EXTERNAL_PATH", algorithm: "EC_SECP256K1", keyId: "test-key", rotationStatus: "ACTIVE", certificateStatus: "ACTIVE",
          certificateFingerprint: null, certificateSerialNumber: "42", certificateIssuer: "CN=LedgerByte Test", certificateExpiresAt: null, certificateRevokedAt: null,
          signingEnabled: true, privateKeyReturned: false, certificateBodyReturned: false,
        };
      },
      async getPublicKey() { return Buffer.alloc(0); },
      async getCertificateDerForSigning() { return Buffer.from("synthetic-certificate", "utf8"); },
      async signCanonicalizedData() { return Buffer.alloc(63); },
    };
    const input = {
      unsignedXml: '<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2" xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"><cac:AccountingSupplierParty/></Invoice>',
      invoiceHashBase64: Buffer.alloc(32, 1).toString("base64"),
      signingTime: "2026-07-20T12:00:00Z",
      canonicalize: async (xml: string) => Buffer.from(xml, "utf8"),
      signingProvider: baseProvider,
    };

    await assert.rejects(() => createZatcaXadesSignedInvoice({ ...input, invoiceHashBase64: "raw-diagnostic-hash" }), { code: "ZATCA_XADES_INVALID_INPUT" });
    await assert.rejects(() => createZatcaXadesSignedInvoice(input), { code: "ZATCA_XADES_SIGNATURE_FAILED" });
    await assert.rejects(
      () => createZatcaXadesSignedInvoice({
        ...input,
        signingProvider: { ...baseProvider, async getCertificateMetadata() { return { ...(await baseProvider.getCertificateMetadata()), certificateSerialNumber: null }; } },
      }),
      { code: "ZATCA_XADES_CERTIFICATE_METADATA" },
    );
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

  it("validates standard and Arabic LedgerByte-created signed XML with generated Phase 2 QR values using the offline official SDK", async (t) => {
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
    const fixtures = [
      { id: "standard", input: "ledgerbyte-generated-standard-invoice.input.json", invoiceType: "STANDARD_TAX_INVOICE", artifactStatus: "CLEARED" },
      { id: "arabic-simplified", input: "ledgerbyte-generated-arabic-simplified-invoice.input.json", invoiceType: "SIMPLIFIED_TAX_INVOICE", artifactStatus: "REPORTED" },
      { id: "credit-note", input: "ledgerbyte-generated-credit-note.input.json", invoiceType: "STANDARD_TAX_INVOICE", artifactStatus: "CLEARED" },
      { id: "debit-note", input: "ledgerbyte-generated-debit-note.input.json", invoiceType: "STANDARD_TAX_INVOICE", artifactStatus: "CLEARED" },
      { id: "allowance", input: "ledgerbyte-generated-allowance-invoice.input.json", invoiceType: "STANDARD_TAX_INVOICE", artifactStatus: "CLEARED" },
      { id: "multiline-vat", input: "ledgerbyte-generated-multiline-invoice.input.json", invoiceType: "STANDARD_TAX_INVOICE", artifactStatus: "CLEARED" },
    ] as const;

    for (const fixture of fixtures) {
    const invoice = JSON.parse(readFileSync(join(root, "packages", "zatca-core", "fixtures", fixture.input), "utf8"));
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
      invoiceType: fixture.invoiceType,
      artifactStatus: fixture.artifactStatus,
      sellerName: invoice.seller.name,
      vatNumber: invoice.seller.vatNumber,
      timestamp: new Date(invoice.issueDate).toISOString().replace(".000Z", "Z"),
      invoiceTotal: invoice.total,
      vatTotal: invoice.taxTotal,
      invoiceHashBase64: result.invoiceHashBase64,
      ecdsaSignatureDerBase64: result.signatureDerBase64,
      publicKeyDerBase64: (await provider.getPublicKey()).toString("base64"),
      authoritySignatureDerBase64: extractZatcaCertificateAuthoritySignatureDer(await provider.getCertificateDerForSigning()).toString("base64"),
    });
    const signedXmlWithQr = attachZatcaPhase2QrToSignedInvoice(result.xml, qr.base64);
    assert.equal(verifyZatcaPhase2QrSignature({ qrBase64: qr.base64, signedInfoCanonicalBytes: result.signedInfoCanonicalBytes }), true);
    assert.equal(/&(?!amp;|lt;|gt;|quot;|apos;|#\d+;|#x[0-9A-Fa-f]+;)/.test(signedXmlWithQr), false, "generated signed XML contains an unescaped ampersand");
    const validVerification = await verifyZatcaSignedArtifact({ xml: signedXmlWithQr });
    assert.equal(validVerification.valid, true, validVerification.safeErrorCodes.join(","));
    assert.equal(validVerification.status, "VALID");
    assert.equal(Object.values(validVerification.checks).every(Boolean), true);

    // This must be caught by LedgerByte, not delegated to the SDK structural oracle.
    const signedPropertiesTamper = signedXmlWithQr.replace(
      "<xades:SigningTime>2026-07-20T12:00:00Z</xades:SigningTime>",
      "<xades:SigningTime>2026-07-20T12:00:01Z</xades:SigningTime>",
    );
    const tamperVerification = await verifyZatcaSignedArtifact({
      xml: signedPropertiesTamper,
    });
    assert.equal(tamperVerification.valid, false);
    assert.equal(tamperVerification.status, "SIGNED_PROPERTIES_INVALID", tamperVerification.safeErrorCodes.join(","));
    assert.ok(tamperVerification.safeErrorCodes.includes("SIGNED_PROPERTIES_DIGEST_MISMATCH"));

    if (fixture.id === "standard") {
      const mutateQr = (mutate: (bytes: Buffer) => Buffer) => signedXmlWithQr.replace(qr.base64, mutate(Buffer.from(qr.base64, "base64")).toString("base64"));
      const tamperCases: Array<{ id: string; description: string; xml: string; expectedStatus: string; expectedFailedCheck: keyof typeof validVerification.checks; signatureReached: boolean; qrReached: boolean }> = [
        { id: "TAMPER-01", description: "invoice total", xml: signedXmlWithQr.replace(">115.00<", ">115.01<"), expectedStatus: "DIGEST_MISMATCH", expectedFailedCheck: "documentDigestValid", signatureReached: false, qrReached: false },
        { id: "TAMPER-02", description: "VAT total", xml: signedXmlWithQr.replace(">15.00<", ">15.01<"), expectedStatus: "DIGEST_MISMATCH", expectedFailedCheck: "documentDigestValid", signatureReached: false, qrReached: false },
        { id: "TAMPER-03", description: "invoice UUID", xml: signedXmlWithQr.replace("22222222-2222-4222-8222-222222222222", "33333333-3333-4333-8333-333333333333"), expectedStatus: "DIGEST_MISMATCH", expectedFailedCheck: "documentDigestValid", signatureReached: false, qrReached: false },
        { id: "TAMPER-04", description: "invoice line", xml: signedXmlWithQr.replace(">100.00<", ">100.01<"), expectedStatus: "DIGEST_MISMATCH", expectedFailedCheck: "documentDigestValid", signatureReached: false, qrReached: false },
        { id: "TAMPER-05", description: "PIH", xml: signedXmlWithQr.replace(/(<cbc:ID>PIH<\/cbc:ID>[\s\S]*?<cbc:EmbeddedDocumentBinaryObject[^>]*>)[^<]+/, "$1tampered"), expectedStatus: "DIGEST_MISMATCH", expectedFailedCheck: "documentDigestValid", signatureReached: false, qrReached: false },
        { id: "TAMPER-06", description: "ICV", xml: signedXmlWithQr.replace(/(<cbc:ID>ICV<\/cbc:ID>[\s\S]*?<cbc:UUID>)[^<]+/, "$1tampered"), expectedStatus: "DIGEST_MISMATCH", expectedFailedCheck: "documentDigestValid", signatureReached: false, qrReached: false },
        { id: "TAMPER-07", description: "SigningTime", xml: signedPropertiesTamper, expectedStatus: "SIGNED_PROPERTIES_INVALID", expectedFailedCheck: "signedPropertiesDigestValid", signatureReached: false, qrReached: false },
        { id: "TAMPER-08", description: "document DigestValue", xml: signedXmlWithQr.replace('Id="invoiceSignedData" URI=""><ds:Transforms', 'Id="invoiceSignedData" URI=""><ds:Transforms').replace(result.invoiceHashBase64, Buffer.alloc(32, 8).toString("base64")), expectedStatus: "DIGEST_MISMATCH", expectedFailedCheck: "documentDigestValid", signatureReached: false, qrReached: false },
        { id: "TAMPER-09", description: "SignedProperties DigestValue", xml: signedXmlWithQr.replace(/(URI="#xadesSignedProperties">[\s\S]*?<ds:DigestValue>)[^<]+/, `$1${Buffer.alloc(32, 9).toString("base64")}`), expectedStatus: "SIGNED_PROPERTIES_INVALID", expectedFailedCheck: "signedPropertiesDigestValid", signatureReached: false, qrReached: false },
        { id: "TAMPER-10", description: "certificate digest", xml: signedXmlWithQr.replace(/(<xades:CertDigest>[\s\S]*?<ds:DigestValue>)[^<]+/, `$1${Buffer.alloc(32, 10).toString("base64")}`), expectedStatus: "SIGNED_PROPERTIES_INVALID", expectedFailedCheck: "signedPropertiesDigestValid", signatureReached: false, qrReached: false },
        { id: "TAMPER-11", description: "signature value", xml: signedXmlWithQr.replace(/(<ds:SignatureValue>)[^<]+/, `$1${Buffer.alloc(70, 11).toString("base64")}`), expectedStatus: "SIGNATURE_INVALID", expectedFailedCheck: "signatureValid", signatureReached: true, qrReached: false },
        { id: "TAMPER-12", description: "embedded certificate", xml: signedXmlWithQr.replace(/(<ds:X509Certificate>)[^<]+/, `$1${Buffer.alloc(64, 12).toString("base64")}`), expectedStatus: "CERTIFICATE_INVALID", expectedFailedCheck: "certificateDigestValid", signatureReached: false, qrReached: false },
        { id: "TAMPER-13", description: "QR public key", xml: mutateQr((bytes) => mutateTlvValue(bytes, 8)), expectedStatus: "QR_BINDING_INVALID", expectedFailedCheck: "qrBindingValid", signatureReached: true, qrReached: true },
        { id: "TAMPER-14", description: "signature algorithm", xml: signedXmlWithQr.replace("ecdsa-sha256", "rsa-sha256"), expectedStatus: "UNSUPPORTED_ALGORITHM", expectedFailedCheck: "referencesResolved", signatureReached: false, qrReached: false },
        { id: "TAMPER-15", description: "digest algorithm", xml: signedXmlWithQr.replace("xmlenc#sha256", "xmlenc#sha512"), expectedStatus: "UNSUPPORTED_ALGORITHM", expectedFailedCheck: "referencesResolved", signatureReached: false, qrReached: false },
        { id: "TAMPER-16", description: "canonicalization algorithm", xml: signedXmlWithQr.replace("xml-c14n11", "xml-exc-c14n#"), expectedStatus: "UNSUPPORTED_ALGORITHM", expectedFailedCheck: "referencesResolved", signatureReached: false, qrReached: false },
        { id: "TAMPER-17", description: "missing signature", xml: signedXmlWithQr.replace(/<ds:Signature[^>]*>[\s\S]*?<\/ds:Signature>/, ""), expectedStatus: "SIGNATURE_MISSING", expectedFailedCheck: "referencesResolved", signatureReached: false, qrReached: false },
        { id: "TAMPER-18", description: "two signatures", xml: signedXmlWithQr.replace("</ext:ExtensionContent>", '<ds:Signature xmlns:ds="http://www.w3.org/2000/09/xmldsig#" Id="signatureTwo"/><\/ext:ExtensionContent>'.replace("\\/", "/")), expectedStatus: "MULTIPLE_SIGNATURES", expectedFailedCheck: "referencesResolved", signatureReached: false, qrReached: false },
        { id: "TAMPER-19", description: "duplicate XML ID", xml: signedXmlWithQr.replace("<cbc:ProfileID>", '<cbc:ProfileID Id="signature">'), expectedStatus: "DUPLICATE_ID", expectedFailedCheck: "uniqueIds", signatureReached: false, qrReached: false },
        { id: "TAMPER-20", description: "signature wrapping", xml: signedXmlWithQr.replace("<cbc:ProfileID>", '<ds:Signature xmlns:ds="http://www.w3.org/2000/09/xmldsig#" Id="wrapped"/><cbc:ProfileID>'), expectedStatus: "MULTIPLE_SIGNATURES", expectedFailedCheck: "referencesResolved", signatureReached: false, qrReached: false },
        { id: "TAMPER-21", description: "wrong local reference", xml: signedXmlWithQr.replace('Id="invoiceSignedData" URI=""', 'Id="invoiceSignedData" URI="#signature"'), expectedStatus: "REFERENCE_INVALID", expectedFailedCheck: "referencesResolved", signatureReached: false, qrReached: false },
        { id: "TAMPER-22", description: "HTTP reference", xml: signedXmlWithQr.replace('Id="invoiceSignedData" URI=""', 'Id="invoiceSignedData" URI="https://invalid.example/invoice"'), expectedStatus: "REFERENCE_INVALID", expectedFailedCheck: "referencesResolved", signatureReached: false, qrReached: false },
        { id: "TAMPER-23", description: "filesystem reference", xml: signedXmlWithQr.replace('Id="invoiceSignedData" URI=""', 'Id="invoiceSignedData" URI="file:///tmp/invoice.xml"'), expectedStatus: "REFERENCE_INVALID", expectedFailedCheck: "referencesResolved", signatureReached: false, qrReached: false },
        { id: "TAMPER-24", description: "missing QR tag", xml: mutateQr((bytes) => removeTlv(bytes, 6)), expectedStatus: "QR_BINDING_INVALID", expectedFailedCheck: "qrBindingValid", signatureReached: true, qrReached: true },
        { id: "TAMPER-25", description: "duplicate QR tag", xml: mutateQr((bytes) => Buffer.concat([bytes, bytes.subarray(0, tlvEnd(bytes, 0))])), expectedStatus: "QR_BINDING_INVALID", expectedFailedCheck: "qrBindingValid", signatureReached: true, qrReached: true },
        { id: "TAMPER-26", description: "QR invoice hash", xml: mutateQr((bytes) => mutateTlvValue(bytes, 6)), expectedStatus: "QR_BINDING_INVALID", expectedFailedCheck: "qrBindingValid", signatureReached: true, qrReached: true },
        { id: "TAMPER-27", description: "QR signature", xml: mutateQr((bytes) => mutateTlvValue(bytes, 7)), expectedStatus: "QR_BINDING_INVALID", expectedFailedCheck: "qrBindingValid", signatureReached: true, qrReached: true },
        { id: "TAMPER-28", description: "QR public key", xml: mutateQr((bytes) => mutateTlvValue(bytes, 8)), expectedStatus: "QR_BINDING_INVALID", expectedFailedCheck: "qrBindingValid", signatureReached: true, qrReached: true },
        { id: "TAMPER-29", description: "QR malformed length", xml: mutateQr((bytes) => { const copy = Buffer.from(bytes); copy[1] = 0xff; return copy; }), expectedStatus: "QR_BINDING_INVALID", expectedFailedCheck: "qrBindingValid", signatureReached: true, qrReached: true },
        { id: "TAMPER-30", description: "DTD entity", xml: signedXmlWithQr.replace("<?xml version=\"1.0\" encoding=\"UTF-8\"?>", "<?xml version=\"1.0\"?><!DOCTYPE Invoice [<!ENTITY xxe SYSTEM 'file:///never-read'>]>"), expectedStatus: "UNSAFE_XML", expectedFailedCheck: "safeXml", signatureReached: false, qrReached: false },
      ];
      assert.equal(tamperCases.length, 30);
      for (const testCase of tamperCases) {
        const verification = await verifyZatcaSignedArtifact({ xml: testCase.xml });
        assert.equal(verification.valid, false, testCase.id);
        assert.equal(verification.status, testCase.expectedStatus, `${testCase.id}:${verification.safeErrorCodes.join(",")}`);
        assert.equal(verification.checks[testCase.expectedFailedCheck], false, testCase.id);
        assert.equal(Object.values(verification.checks).every(Boolean), false, testCase.id);
      }
    }

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
      assert.equal(validation.status, 0, `${fixture.id}: offline SDK rejected LedgerByte signed XML: ${safe.errorCodes.join(",") || "SDK_EXIT_NONZERO"}`);
      assert.match(safe.textForInference, /PASS/i, `${fixture.id}: offline SDK did not report a passing signed-XML validation result`);
    } finally {
      rmSync(temp, { recursive: true, force: true });
      for (const cleanupPath of commandPlan.cleanupPaths ?? []) {
        rmSync(cleanupPath, { recursive: true, force: true });
      }
    }
    }
  });
});

function tlvEnd(bytes: Buffer, offset: number): number { const first = bytes[offset + 1] ?? 0; const count = first < 0x80 ? 0 : first & 0x7f; const length = count === 0 ? first : bytes.subarray(offset + 2, offset + 2 + count).reduce((total, value) => (total << 8) | value, 0); return offset + 2 + count + length; }
function removeTlv(bytes: Buffer, target: number): Buffer { for (let offset = 0; offset < bytes.length;) { const end = tlvEnd(bytes, offset); if (bytes[offset] === target) return Buffer.concat([bytes.subarray(0, offset), bytes.subarray(end)]); offset = end; } throw new Error("missing test TLV tag"); }
function mutateTlvValue(bytes: Buffer, target: number): Buffer { const copy = Buffer.from(bytes); for (let offset = 0; offset < copy.length;) { const end = tlvEnd(copy, offset); if (copy[offset] === target) { const first = copy[offset + 1] ?? 0; const valueOffset = offset + 2 + (first < 0x80 ? 0 : first & 0x7f); copy[valueOffset] ^= 1; return copy; } offset = end; } throw new Error("missing test TLV tag"); }
