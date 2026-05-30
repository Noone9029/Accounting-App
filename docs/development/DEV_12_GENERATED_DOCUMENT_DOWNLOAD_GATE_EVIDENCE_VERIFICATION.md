# DEV-12 Generated Document Download Gate Evidence Verification

Date: 2026-05-30

Latest commit inspected: `aac198d3 Check DEV-12 generated document download gate`

Marker: `DEV12-DOC-20260530T000000`

## 1. Purpose And Scope

This Part 9 document verifies the DEV-12 Part 8 generated-document download gate evidence using read-only checks only. It confirms that the Part 8 hash/size evidence matches current stored metadata, marker counts remain stable, and the Part 8 evidence did not record body or secret output.

No runtime mutation, fixture creation, new archive/PDF generation, new generated-document download, body output, storage migration, retention mutation, E2E, smoke, full test, full build, migration, seed/reset/delete, deploy, environment change, ZATCA, email, backup, restore, production/beta/customer-data access, or app behavior change was performed.

## 2. Local Target Proof

- Database target classification: `postgresql` on host `localhost`, port `5432`, database `accounting`.
- Local-only result: passed.
- Hosted/provider target refusal check: no Supabase, Neon, Render, Railway, RDS/AWS, DigitalOcean, Fly, Vercel, production, beta, or user-testing target was used.

## 3. Source Evidence Inspected

- `CODEX_HANDOFF.md`
- `docs/development/DEV_12_GENERATED_DOCUMENT_DOWNLOAD_GATE_CHECK_EVIDENCE.md`
- `docs/development/DEV_12_GENERATED_DOCUMENT_DOWNLOAD_GATE_PREFLIGHT.md`
- `docs/development/DEV_12_GENERATED_DOCUMENT_METADATA_EVIDENCE_VERIFICATION.md`
- `docs/development/DEV_12_GENERATED_DOCUMENT_FIXTURE_EVIDENCE_VERIFICATION.md`
- `BUG_AUDIT.md`
- `README.md`

## 4. Read-Only Verification Method

- Proved the database target from `.env` without printing the database URL.
- Queried marker generated-document metadata with an explicit safe field allowlist that excluded `contentBase64`.
- Did not call `GeneratedDocumentService.download`.
- Compared Part 8 evidence hash and size text against current stored `contentHash` and `sizeBytes`.
- Counted marker generated documents and generated-document audit logs.
- Checked for unrelated `DEV12-DOC-` marker pollution.
- Scanned the Part 8 evidence for long base64-like values, DB URLs, auth headers, bearer tokens, private-key markers, and secret assignments.

## 5. Download Metadata And Hash Verification

| Check | Verified value |
| --- | --- |
| Safe generated-document ID prefix | `663e5c68` |
| Safe organization ID prefix | `a452101a` |
| Document type | `REPORT_TRIAL_BALANCE` |
| Source type/id | `AccountingReport` / `DEV12-DOC-20260530T000000-REPORT-TRIAL-BALANCE` |
| Document number | `DEV12-DOC-TB-0001` |
| Filename | `DEV12-DOC-trial-balance.pdf` |
| MIME type | `application/pdf` |
| Storage provider/key | `database` / `null` |
| Status | `GENERATED` |
| Stored SHA-256 | `29bb1b32935c488bc28a21d53133b1384f9b0cd5e40d31956794e728de213f5f` |
| Stored hash prefix | `29bb1b32935c488b` |
| Size bytes | 129 |

Part 8 evidence contains the stored hash, downloaded hash, size `129`, archive delta `0`, and audit delta `0`.

## 6. Count And Audit Stability Verification

| Count | Current value | Stable from Part 8 |
| --- | ---: | --- |
| Marker generated documents | 1 | Yes |
| Generated-document audit logs | 1 | Yes |
| Marker pollution count | 0 | Yes |

No generated-document count delta from Part 8 was found.

## 7. No-Body-Output Verification

- New download performed in Part 9: no.
- `contentBase64` selected in Part 9: no.
- PDF bytes printed in Part 9: no.
- Part 8 evidence long base64-like value count: `0`.
- Part 8 evidence secret/connection/auth pattern matches: none.
- Reserved body-risk terms in Part 8 evidence appear only in safety text, not as values.

## 8. Discrepancies And Blockers

No evidence discrepancies or verification blockers were found.

Production gaps remain: generated-document bodies are still database/base64-backed; object storage, signed URLs, lifecycle/retention policy, legal hold, purge/cleanup, malware scanning, restore proof, hosted/beta/customer-data behavior, load/concurrency, and production readiness remain unproven.

## 9. No-Mutation/No-Output/No-Secret Guarantee

- Runtime mutation performed: no.
- New generated-document download performed: no.
- Output body printed: no.
- Storage migration/retention action performed: no.
- DB URLs, auth headers, cookies, tokens, secrets, PDF bytes, CSV bodies, attachment bodies, signed XML, QR payloads, and `contentBase64` values were not printed.

## 10. Commands Run

- `git status --short --branch`
- `git log -1 --oneline`
- Read-only prompt/source evidence inspection with `Get-Content` and `rg`.
- Temporary read-only verifier through `apps/api/node_modules/.bin/tsx.cmd apps/api/scripts/dev12-part9-download-evidence-verify.temp.ts`

## 11. Commands Skipped

- Runtime mutations
- Fixture creation
- New generated-document downloads
- `contentBase64` selection/output
- PDF byte output
- Archive/PDF/CSV generation
- Storage migration
- Retention mutation
- E2E
- Smoke
- Full tests
- Full build
- Migrations
- Seed/reset/delete
- Deploys
- Environment changes
- Production/beta/customer-data access
- ZATCA
- Email
- Backup/restore

## 12. Recommended Next Thread

`DEV-12 Part 10: storage readiness and migration dry-run preflight`
