# ARC-07B-06H Official SDK Simulation CSR Oracle

Date: 2026-07-28
Status: **PASSED LOCAL OFFLINE ORACLE / STATIC ONBOARDING READY / DYNAMIC EXECUTION BLOCKED**

## Scope and claim boundary

ARC-07B-06H proves that the authorized official SDK `238-R3.4.8` can generate its own synthetic FATOORA Simulation private key and PKCS#10 CSR under Microsoft OpenJDK `11.0.26`, and that LedgerByte can independently inspect and place that SDK-generated key into disposable local DPAPI custody.

The SDK does not document validation of an existing CSR or ingestion of an existing private key. Therefore, this proof does not claim that the SDK validated the independent ARC-07B-06C CSR. It does not compare the two CSR byte strings, CSR hashes, public-key fingerprints, or private keys for equality. The two proofs use independently generated key material and establish different facts:

| Proof | Established fact |
| --- | --- |
| ARC-07B-06C | LedgerByte can generate a structurally and cryptographically valid synthetic secp256k1 CSR while keeping its key in the local custody boundary. |
| ARC-07B-06H | The official SDK can generate its own Simulation CSR, LedgerByte can independently verify that artifact, and the SDK-generated key can be moved into disposable DPAPI custody and matched back to that same SDK CSR. |

## Authorized local Tier-2 run

The metadata-only command was:

```text
corepack pnpm zatca:sandbox-csr-sdk-oracle -- --simulation --no-network --metadata-json
```

The run required the explicit local execution gate, an exact SDK/JDK allowlist, the `-sim` SDK option, and only these CSR-generation arguments: `-csr`, `-csrConfig`, `-privateKey`, `-generatedCsr`, `-pem`, and `-sim`.

Verified inputs:

- SDK version: `238-R3.4.8`
- SDK JAR SHA-256: `48ABEB828D453EF6FAFBA792FDDBBB2701DA5C7018C24BDE918853E80FF5D530`
- SDK `Configuration/config.json` SHA-256: `5ECA6FFE95659F58319C9B7F831D54EB71860E9434595798628F42E4C3495408`
- Java vendor/version: Microsoft OpenJDK `11.0.26`
- Target profile: FATOORA Simulation
- CSR template value: exactly `PREZATCA-Code-Signing`

The Java pin is not inferred from `java -version` alone. The runtime requires these exact Microsoft OpenJDK `11.0.26` components before launching Java:

| JDK component | Bytes | SHA-256 |
| --- | ---: | --- |
| `bin/java.exe` | 49,696 | `821E8A51DEA921D444BB366BC19747A92F55711251486CF0BB530A55D66FC76C` |
| `bin/server/jvm.dll` | 12,119,096 | `E74495C828B767809D994CF4E7BF60577033FEB97D098D21D748028BB6F41938` |
| `bin/java.dll` | 158,264 | `23F02A226FF1C5C1DE8E4638E5057196A502546E2FEDFB4000519BCC81EDDEB5` |
| `bin/jli.dll` | 89,136 | `4296B7396036006F37D7694A59D998246BE0515D65012165E8BE368B3BF67570` |
| `lib/modules` | 141,348,230 | `96A1716CDD6D50205F34E3BF5B7F807DB66900E8BF038FA1BAC76E19EE414C58` |

The SDK emitted the exact Simulation template as an ASN.1 `UTF8String` (`0x0c`). The independent inspector accepts that exact value only when encoded as `UTF8String` or `PrintableString`; it does not relax or normalize the template value.

The local runtime also failed closed around its own execution boundary:

- Windows system executables were resolved from a hard-pinned canonical system directory, not from inherited `SystemRoot` or `WINDIR` trust.
- Workspace and custody ACLs were granted to the current Windows token SID obtained from the pinned `System32\whoami.exe`, plus `SYSTEM`; the runtime does not trust mutable `USERNAME` text to choose an ACL principal.
- The five pinned JDK components were opened through a read-only Windows handle lease before Java inspection and remained leased through the network-guard self-test and SDK execution. Exact size/checksum verification ran before and after Java use.
- The official SDK configuration was checksum-verified at its external source, copied to the private workspace, verified again, and supplied through `SDK_CONFIG` from that staged copy. The reviewed launcher, staged SDK JAR, staged SDK configuration, and CSR configuration were then held together by a read-only handle lease across the guard self-test and SDK execution.
- The staged JAR and SDK configuration, and their external sources, were checksum-verified again after the run.
- Workspace and custody directory handles prevented replacement of the task-owned directory while it was active. Directory ACLs limited access without being described as the immutability mechanism.
- The Java security manager denied write and delete permissions outside the canonical disposable workspace. Its guard self-test attempted a real outside-workspace `FileOutputStream` write, required a security denial, and confirmed that no probe file remained.
- Private-key PEM and DER validation used mutable buffers only; no private-key body was converted into an immutable JavaScript string.
- Timeout or output-limit termination first requests child termination and then escalates through the pinned `System32\taskkill.exe /PID ... /T /F`; a successful result requires confirmed process-tree termination.
- Loss of a JDK, workspace, or staged-input handle lease publishes compromise immediately, aborts the active Java operation, and settles every monitored lease before the oracle returns. Confirmed close or pinned process-tree termination is required for each failed helper. Path-lease and DPAPI helpers use the same fail-closed termination rule; an unconfirmed helper preserves its task state and prevents passing evidence.
- The fixed Java launcher performed a local socket-denial self-test before invoking the SDK. The SDK request accepts no URL, OTP, CSID, production, or inherited credential arguments.

## Independent LedgerByte inspection

LedgerByte parsed the generated PKCS#10 object with bounded DER handling and verified:

- the CSR signature;
- ECDSA with SHA-256;
- a secp256k1 subject public key;
- all required synthetic subject fields;
- the required requested extensions;
- the exact `PREZATCA-Code-Signing` Simulation template;
- equality between the SDK CSR public key and the public key derived from the SDK-generated private key.

That final equality is internal to the single SDK-generated artifact. It is not an equality claim about the separate 06C LedgerByte CSR or key.

## Disposable key custody and cleanup

After inspection, the SDK-generated private key was imported through the local-test sandbox DPAPI provider. Before any custody re-derivation, the in-memory plaintext buffer was zeroed and the expected plaintext key file was securely removed. The key was then re-derived only inside the bounded custody callback. The custody-derived public key matched the same SDK CSR. The disposable reference was then revoked and the custody store was confirmed empty.

Task-created files are deleted only when their canonical identity, single-link state, expected byte length, and expected SHA-256 match. The Windows helper opens the expected file handle without delete sharing, compares the digest in fixed time, overwrites and truncates through that handle, and marks that same handle for deletion. Directory cleanup is `rmdir`-only and never recursively deletes or follows an unexpected artifact, directory, junction, or reparse point. An unexpected entry therefore prevents `cleanupComplete` and leaves the directory for controlled investigation rather than deleting material the task did not create.

The successful run removed the CSR, CSR configuration, staged SDK configuration, plaintext key, staged JAR, launcher, workspace, raw process output, and disposable custody metadata. The source SDK JAR and configuration checksums remained unchanged, and no Java or SDK process remained. No generated body was retained in Git or in metadata evidence.

If a child or helper process cannot be proven terminated, the oracle returns the safe unconfirmed-termination failure, emits no passing evidence, and does not claim complete cleanup. It may preserve the task workspace because deleting files while a process might still hold them would be unsafe. `PASSED` is possible only when process termination is confirmed and every expected file, disposable custody reference, and task-owned empty directory is removed.

## Result

The configured Tier-2 oracle passed:

- `officialSdkTier2Executed: true`
- `sdkChecksumMatch: true`
- `sdkConfigChecksumMatch: true`
- `jdkRuntimeChecksumsVerified: true`
- `simulationFlagVerified: true`
- `csrSignatureVerified: true`
- `csrAlgorithmVerified: true`
- `csrCurveVerified: true`
- `csrSubjectVerified: true`
- `requestedExtensionsVerified: true`
- `csrTemplateVerified: true`
- `privateKeyMatchesCsr: true`
- `custodyPublicKeyMatchesCsr: true`
- `plaintextKeyRemovedBeforeCustodyVerification: true`
- `plaintextKeyFileRemoved: true`
- `sdkConfigFileRemoved: true`
- `cleanupComplete: true`
- `networkGuardMarkersPresent: true`
- `networkIsolationVerified: true`
- `networkCallsMade: false`
- `otpUsed: false`
- `csidRequested: false`
- `sensitiveBodiesReturned: false`
- `productionExecution: false`

Normal repository CI does not require or redistribute the licensed SDK and reports `SKIPPED_EXTERNAL_ORACLE` when the authorized local SDK/JDK inputs are absent. That status is not treated as a pass.

## Preflight consequence

The onboarding preflight combines the two independent proofs:

```text
csrReady = csrLocalProofReady && csrTier2SdkReady
```

With both proofs present, `COMPLIANCE_CSID_ONBOARDING` is statically ready and does not require a compliance certificate to pre-exist. `requestSequenceReady` is true while `executionAllowed` remains false because standalone owner approval, a fresh human-controlled OTP, and network enablement are intentionally absent.

## Non-claims

No ZATCA hostname was contacted. No OTP was generated, accepted, or retained. No compliance CSID or production CSID was requested. No compliance document, clearance, reporting, production credential, customer data, public API, Prisma migration, or hosted resource was involved. This is not ZATCA approval, completed onboarding, production certificate trust, KMS/HSM custody, or production-compliance evidence.
