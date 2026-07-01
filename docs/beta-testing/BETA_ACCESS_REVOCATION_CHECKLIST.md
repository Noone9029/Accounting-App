# Beta Access Revocation Checklist

Date: 2026-07-01

Status: Checklist only. Do not execute access mutations from this document.

## CONTROLLED-BETA-PROVISION-01 Current Status

No tester access was provisioned in this pass, so no revocation action was required or executed. The revocation plan is captured in `CONTROLLED_BETA_ACCESS_REVOCATION_PLAN.md` for the first approved cohort.

## Revoke Access

- [ ] Disable or suspend tester account.
- [ ] Remove tester from active beta organization membership if the access model requires it.
- [ ] Rotate shared demo credential if a shared credential was ever used.
- [ ] Confirm tester can no longer access the test organization.
- [ ] Record revocation date.
- [ ] Record revocation reason.

## Preserve Evidence

- [ ] Archive feedback entries.
- [ ] Export or preserve issue log metadata.
- [ ] Preserve redacted screenshots/videos needed for triage.
- [ ] Preserve evidence artifacts needed for reproduction.
- [ ] Do not preserve secrets, tokens, raw bank files, signed XML, QR payloads, PDF bodies, attachment bodies, or sensitive production data.

## Data Review

- [ ] Confirm no production data was entered.
- [ ] Confirm no sensitive documents were uploaded.
- [ ] Confirm no prohibited provider, payment, email, storage, signed-URL, backup/restore, seed/reset/delete, migration, ZATCA, UAE, Peppol, ASP, or tax authority action was run.
- [ ] Record any suspected sensitive-data issue in the triage log.

## Cleanup

- [ ] Clean up demo data only if safe, reviewed, and approved.
- [ ] Do not delete data needed for bug investigation.
- [ ] Do not reset, seed, or delete non-disposable data.
- [ ] Keep audit history unless a reviewed deletion policy says otherwise.

## Closeout

- [ ] Tester notified that access is ended.
- [ ] Support owner confirms no open blocker from this tester.
- [ ] Triage owner confirms remaining issues are categorized.
- [ ] Owner decides whether tester may be invited to a later round.
