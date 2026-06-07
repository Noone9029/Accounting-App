# DEV-12 Generated Document Download Gate Check Evidence

Date: 2026-05-30

Latest commit inspected: `6b822ff0 Preflight DEV-12 generated document download gate`

Marker: `DEV12-DOC-20260530T000000`

## 1. Approval Text Used

`I approve DEV-12 Part 8 local-only generated-document download gate checks under marker DEV12-DOC-20260530T000000. No production, no beta, no customer data, no body output.`

## 2. Local Target Proof

- Database target classification: `postgresql` on host `localhost`, port `5432`, database `accounting`.
- Local-only result: passed.
- Hosted/provider target refusal check: no Supabase, Neon, Render, Railway, RDS/AWS, DigitalOcean, Fly, Vercel, production, beta, or user-testing target was used.

## 3. Marker And Safe IDs

| Component | Safe value |
| --- | --- |
| Marker | `DEV12-DOC-20260530T000000` |
| Organization ID prefix | `a452101a` |
| Generated-document ID prefix | `663e5c68` |
| Generated-by ID prefix | `9f375f20` |
| Source id | `DEV12-DOC-20260530T000000-REPORT-TRIAL-BALANCE` |
| Document number | `DEV12-DOC-TB-0001` |
| Filename | `DEV12-DOC-trial-balance.pdf` |

## 4. Pre-Check Counts

| Count | Before |
| --- | ---: |
| Marker generated documents | 1 |
| Generated-document audit logs | 1 |

## 5. Positive Download Metadata And Hash Result

The approved Part 8 checker called `GeneratedDocumentService.download` once for the marker synthetic generated document, then computed byte length and SHA-256 in memory without printing the PDF body or base64.

| Check | Result |
| --- | --- |
| Download performed | Yes, marker local synthetic document only |
| Filename | `DEV12-DOC-trial-balance.pdf` |
| MIME type | `application/pdf` |
| Size bytes | 129 |
| Stored SHA-256 | `29bb1b32935c488bc28a21d53133b1384f9b0cd5e40d31956794e728de213f5f` |
| Downloaded SHA-256 | `29bb1b32935c488bc28a21d53133b1384f9b0cd5e40d31956794e728de213f5f` |
| Hash prefix | `29bb1b32935c488b` |
| Hash matches stored metadata | Yes |
| Size matches stored metadata | Yes |
| Filename matches stored metadata | Yes |
| MIME type matches stored metadata | Yes |
| Storage provider/key | `database` / `null` |
| Status | `GENERATED` |

## 6. No-Body-Output Handling

- PDF bytes printed: no.
- `contentBase64` printed: no.
- Response body printed: no.
- Buffer was used only in memory for byte length and SHA-256.
- Full hash was recorded because it is a one-way digest of the local synthetic fixture and is not a body value.

## 7. No Archive/Count Delta Result

| Count | Before | After | Delta |
| --- | ---: | ---: | ---: |
| Marker generated documents | 1 | 1 | 0 |
| Generated-document audit logs | 1 | 1 | 0 |

Generated-document archive delta: `0`.

## 8. Missing/Foreign Document Result

A deterministic missing document id was checked within the marker organization context.

| Check | Result |
| --- | --- |
| Missing generated-document id | `00000000-0000-4000-8000-000000000000` |
| Result | `NotFoundException` |
| Body output | No |
| Mutation | No |

## 9. Restricted Permission Result

Permission behavior was checked with token-free direct helper calls.

| Permission set | Result |
| --- | --- |
| `generatedDocuments.download` | Allowed |
| `admin.fullAccess` | Allowed |
| `generatedDocuments.view` only | `ForbiddenException` |
| Source view only (`purchaseBills.view`) | `ForbiddenException` |

Controller metadata was inspected in Part 7 and confirms `GET /generated-documents/:id/download` requires `generatedDocuments.download`.

## 10. Audit And Count Stability Result

- Archive creation audit logs were not written by the download path.
- Generated-document audit-log delta from the approved download check: `0`.
- Marker generated-document delta from the approved download check: `0`.
- Runtime mutation performed: no, except the approved local download read.

## 11. Discrepancies And Blockers

No discrepancies were found in the approved download gate check.

The first verifier launch failed before DB work because `tsx` did not load the API tsconfig decorator settings while importing the Nest service. The successful run set `TSX_TSCONFIG_PATH=apps/api/tsconfig.json` and completed without mutation or body output.

Generated-document bodies remain database/base64-backed. This evidence does not prove object-storage readiness, restore proof, malware scanning, retention/legal-hold compliance, hosted/beta/customer-data behavior, or production readiness.

## 12. No Production/Beta/Customer-Data Guarantee

- Only the local marker synthetic generated document was downloaded.
- No production, beta, hosted/shared, or customer data was used.
- No external object storage was used.

## 13. No Body/Secret Guarantee

- PDF bytes, CSV bodies, attachment bodies, signed XML, QR payloads, provider payloads, DB URLs, auth headers, cookies, tokens, secrets, and `contentBase64` were not printed.
- Evidence contains only safe metadata, counts, permission outcomes, byte length, and SHA-256 hash.

## 14. Commands Run

- `git status --short --branch`
- `git log -1 --oneline`
- Read-only prompt/source evidence inspection with `Get-Content` and `rg`.
- Failed verifier launch: `apps/api/node_modules/.bin/tsx.cmd apps/api/scripts/dev12-part8-download-check.temp.ts`
- Successful approved local verifier launch with `TSX_TSCONFIG_PATH=apps/api/tsconfig.json`: `apps/api/node_modules/.bin/tsx.cmd apps/api/scripts/dev12-part8-download-check.temp.ts`

## 15. Commands Skipped

- Non-marker generated-document downloads
- PDF byte output
- `contentBase64` output
- Response body output
- New document creation
- Archive/PDF/CSV generation
- Runtime mutations beyond approved local download read
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

## 16. Recommended Next Thread

`DEV-12 Part 9: generated-document download gate evidence verification`

## 17. Part 9 Verification Note

Part 9 read-only verification is recorded in [DEV_12_GENERATED_DOCUMENT_DOWNLOAD_GATE_EVIDENCE_VERIFICATION.md](DEV_12_GENERATED_DOCUMENT_DOWNLOAD_GATE_EVIDENCE_VERIFICATION.md). The verification confirmed the Part 8 hash/size/count evidence still matches current marker metadata, no new download was performed, and no body or secret output was found.
