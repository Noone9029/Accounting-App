# ZATCA SDK CI Runner Plan

Date: 2026-06-06

LedgerByte remains controlled beta/user-testing only. This plan covers a no-network SDK CI readiness guard and runner design only. It does not enable signing, OTP/CSID, clearance/reporting, PDF/A-3, production credentials, real ZATCA network calls, or production compliance.

## Purpose

Define whether the local official SDK validation path can become repeatable in CI, and add a metadata-only guard that reports whether the path is CI-ready, blocked, or local-only. The guard is `corepack pnpm zatca:sdk-ci-readiness -- --plan --no-network --json`.

PR CI remains non-ZATCA for now. SDK CI validation is not enabled yet.

## Repo Reconciliation

- Latest commit inspected: `6db215e5 Validate generated ZATCA XML fixtures locally`.
- Previous generated-fixture files were present, including the local SDK wrapper, generated fixture script, fixture registry, evidence format, generated-fixture evidence JSON, closure doc, and the two generated fixture input/snapshot pairs.
- `package.json` contained `zatca:sdk-validate-local`, `zatca:generate-local-xml-fixtures`, and `test:zatca-sdk-validate-local`; this sprint adds `zatca:sdk-ci-readiness` and `test:zatca-sdk-ci-readiness`.
- `.github/workflows/pr-verification.yml` remains a non-mutating non-ZATCA gate.
- `.github/workflows/deployed-e2e.yml` remains manual deployed Playwright smoke and does not run ZATCA SDK validation.

## Official References Inspected

- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Readme/readme.md`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Configuration/usage.txt`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Apps/`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Configuration/`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Rules/`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Schemas/`

Local LedgerByte files inspected:

- `docs/zatca/OFFICIAL_SDK_VALIDATION_READINESS.md`
- `docs/zatca/SDK_VALIDATION_WRAPPER.md`
- `docs/zatca/ZATCA_SDK_FIXTURE_REGISTRY.md`
- `docs/zatca/ZATCA_SDK_VALIDATION_EVIDENCE_FORMAT.md`
- `docs/zatca/evidence/generated-xml-fixture-validation-20260606.json`
- `docs/development/ZATCA_LOCAL_GENERATED_XML_FIXTURE_VALIDATION_SPRINT_CLOSURE.md`
- `.github/workflows/pr-verification.yml`
- `.github/workflows/deployed-e2e.yml`
- `package.json`

## Current Status

Current guard status: `CI_BLOCKED_MISSING_SDK_REFERENCE`.

Reasons:

- The official SDK files are physically present under `reference/` on this workstation.
- `reference/` is ignored by `.gitignore`, and `git ls-files` does not show the SDK app/config files, so a fresh GitHub Actions checkout cannot reproduce the local SDK validation run from repo contents alone.
- Default Java is OpenJDK `17.0.16`, which is outside the official SDK range `>=11 <15`.
- Previous local evidence showed Java `11.0.26` worked when explicitly selected through `ZATCA_SDK_JAVA_BIN`.
- Metadata-only evidence is proven locally, but CI artifact retention/redaction approval is not yet recorded.

## Java Policy

- CI must use Java 11 through Java 14.
- Local developers may set `ZATCA_SDK_JAVA_BIN` to a compatible Java binary.
- Machine-specific Java paths must not be committed as defaults.
- Java 17 must remain blocked and must not be documented as supported.

## Runner Options

| Option | Summary | Current decision |
| --- | --- | --- |
| GitHub Actions `setup-java` plus repo-local SDK reference | Uses a pinned Java 11-14 runtime and the same no-network wrapper in CI. | Preferred future direction, but blocked until SDK reference/acquisition and artifact retention policies are approved. |
| Docker/pinned SDK runner | Runs SDK validation in a pinned local container with no network and no secrets mounted. | Viable fallback if Java/runtime drift remains hard to control, but not needed for the current local workstation and not enabled in CI. |
| Local-only workstation validation | Uses `ZATCA_SDK_JAVA_BIN`, local ignored `reference/`, and metadata-only evidence. | Current working path. It is not CI-repeatable yet. |
| Manual artifact upload | Uploads generated XML or raw SDK output for review. | Rejected unless a future policy proves it is metadata-only; XML bodies must not be uploaded as CI artifacts. |

## Recommended Approach

Keep PR CI non-ZATCA. Use the new guard locally and, later, as a non-executing CI readiness check only after deciding how official SDK reference material is acquired in CI.

Future executable SDK CI should:

- Use GitHub Actions `setup-java` with Java 11-14.
- Acquire the official SDK through an approved repo/reference policy.
- Run only `fatoora -validate -invoice` through the existing no-network wrapper.
- Use generated deterministic fixtures only.
- Persist metadata-only evidence only after artifact retention/redaction policy is approved.
- Never upload XML bodies, QR payloads, signed XML, private keys, certificates, OTPs, CSID material, tokens, auth headers, request/response bodies, customer/vendor payloads, or raw unsafe stdout/stderr.

## Documentation-Only Workflow Sketch

Do not add this workflow until the blockers are resolved.

```yaml
name: ZATCA SDK No-Network Validation

on:
  workflow_dispatch:

jobs:
  zatca-sdk-no-network:
    runs-on: ubuntu-latest
    permissions:
      contents: read
    env:
      CI: "true"
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: "11"
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: corepack enable
      - run: corepack pnpm install --frozen-lockfile
      - run: corepack pnpm zatca:sdk-ci-readiness -- --plan --no-network --json --strict
      # Future approved step only:
      # - run: corepack pnpm zatca:sdk-validate-local -- --fixture ledgerbyte-generated-standard-invoice --fixture ledgerbyte-generated-credit-note --no-network --json
```

## Exclusions

- No real ZATCA network calls.
- No OTP or CSID request.
- No signing or signed XML generation.
- No Phase 2 QR generation.
- No clearance/reporting.
- No PDF/A-3.
- No production credentials.
- No email.
- No deploy.
- No migrations, seed, reset, delete, backup, or restore.
- No production/beta/customer data mutation.

## Next Implementation Ticket

Resolve the CI blocker before enabling SDK validation in GitHub Actions:

1. Decide the approved SDK reference/acquisition policy for CI.
2. Approve metadata-only evidence artifact retention.
3. Add a GitHub Actions workflow that runs the guard first.
4. Only then consider enabling no-network SDK validation in CI.

Next prompt title: `ZATCA local signed XML validation plan`.

## 2026-06-06 Follow-Up

The follow-up local signed XML validation plan is now documented in `LOCAL_SIGNED_XML_VALIDATION_PLAN.md`, with a metadata-only guard at:

```bash
corepack pnpm zatca:local-signed-xml-plan -- --plan --no-network --json
```

This does not change the CI posture: PR CI remains non-ZATCA, SDK validation is not enabled in GitHub Actions, XML/signed XML/QR bodies must not be uploaded as artifacts, and SDK CI remains blocked until SDK reference/acquisition and artifact retention policy are approved.

## 2026-06-06 Dummy Signing Guard Follow-Up

`LOCAL_DUMMY_SIGNING_DRY_RUN_GUARD.md` adds a local-only disabled command-plan guard for future dummy signing experiments. It is not part of PR CI and does not run SDK signing, QR, hash, or signed XML validation. The current CI blocker remains unchanged because the official SDK reference is still local/ignored and artifact retention policy is not approved.

## 2026-06-06 Approved Dummy Signing Plan Follow-Up

`APPROVED_LOCAL_DUMMY_SIGNING_EXECUTION_PLAN.md` defines a future local execution runbook and approval phrase, but it does not make SDK execution CI-ready. PR CI remains non-ZATCA; no workflow uploads XML, signed XML, QR payloads, SDK logs, private keys, certificates, or approval output artifacts.

## 2026-06-06 Approved Dummy Signing Execution Follow-Up

The approved local dummy-material SDK run passed for both generated fixtures under explicit Java `11.0.26`, with metadata-only evidence at `docs/zatca/evidence/local-dummy-signing-execution-20260606.json`.

This does not change the CI status. SDK CI remains blocked because the official SDK reference is local/ignored and not available from a fresh checkout, artifact retention policy is not approved, and PR CI remains non-ZATCA.

## 2026-06-06 Dummy Signing Review Follow-Up

`docs/zatca/DUMMY_SIGNING_RESULT_REVIEW.md` and `docs/zatca/PHASE_2_QR_GAP_ANALYSIS.md` are documentation-only follow-ups to the local dummy run. They do not add SDK validation to CI, do not create a GitHub Actions workflow, and do not approve uploading XML, signed XML, QR payloads, SDK logs, private keys, certificates, or metadata evidence artifacts.

CI status remains `CI_BLOCKED_MISSING_SDK_REFERENCE`.
