# ZATCA SDK Validation Wrapper

This is a working engineering checklist. Official ZATCA/FATOORA documentation must be verified before production. Do not treat current mock implementation as legal compliance.

## Purpose

LedgerByte has a test-only wrapper scaffold for the official ZATCA Java SDK files stored under `reference/`. The wrapper is for local XML/hash validation planning only. It does not call ZATCA APIs, does not sign invoices, does not embed XML into PDF/A-3, and does not make the app production compliant.

## Readiness Check

`GET /zatca-sdk/readiness` checks local SDK prerequisites and returns safe booleans:

- `referenceFolderFound`
- `sdkJarFound`
- `fatooraLauncherFound`
- `jqFound`
- `javaFound`
- `javaVersion`
- `javaVersionSupported`
- `projectPathHasSpaces`
- `canAttemptSdkValidation`
- `warnings`
- `suggestedFixes`

The endpoint requires authentication and `x-organization-id`. It does not read or return private keys, CSIDs, OTPs, XML content, or certificate material.

## Dry-Run Command Planning

`POST /zatca-sdk/validate-xml-dry-run` accepts:

```json
{
  "invoiceId": "<invoice id>",
  "mode": "dry-run"
}
```

or:

```json
{
  "xmlBase64": "<base64 xml>",
  "mode": "dry-run"
}
```

It loads or validates the local XML payload, builds a temporary XML path and command plan, and returns warnings. It does not write the temp file, execute Java, call the SDK, sign anything, or make network calls.

## Local Execution Gate

`POST /zatca-sdk/validate-xml-local` is blocked by default:

```env
ZATCA_SDK_EXECUTION_ENABLED=false
```

When the flag is false or unset, the endpoint returns:

`Local SDK execution is disabled. Set ZATCA_SDK_EXECUTION_ENABLED=true to enable local-only validation.`

Even when enabled, real execution is intentionally not implemented yet because the SDK command format still needs verification in this repo path and runtime environment.

## Java Version Warning

The SDK readme states that Java must be `>=11` and `<15`. The local machine previously reported Java 17.0.16, which is outside that range. Future execution should use a pinned Java 11-14 runtime, preferably through a Docker wrapper or an explicitly configured JRE path.

## Windows Path-With-Spaces Issue

The repo path is `E:\Accounting App`, which contains a space. Earlier SDK launcher attempts failed because the Windows batch script did not quote all derived paths. Dry-run command plans therefore prefer argument-array execution and warn when paths contain spaces.

## Future Enablement Steps

1. Pin Java 11-14 in CI or Docker.
2. Verify whether the SDK should be invoked through the launcher or direct JAR call.
3. Run SDK validation against official sample XML only in isolated test tooling.
4. Add timeout, output-length limits, and XML/temp-file cleanup around execution.
5. Compare SDK hash output to LedgerByte hash output before changing app hash logic.
6. Keep signing, real API calls, production CSID, clearance/reporting, and PDF/A-3 out of scope until the earlier validation steps pass.

## Compliance Warning

SDK readiness and dry-run command planning are engineering tools only. Passing local SDK validation in the future would still not be legal certification or production ZATCA compliance without official sandbox onboarding, valid CSIDs, signing, API validation, PDF/A-3/archive decisions, and legal/operational review.
