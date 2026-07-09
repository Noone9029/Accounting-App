# Wio-Shaped Bank Integration Readiness

This branch adds readiness groundwork only. LedgerByte does not connect to Wio, store bank credentials, fetch live bank feeds, create real beneficiaries, or move money.

## What Exists

- Provider-neutral schema for bank connections, feed accounts, feed sync runs, feed transactions, provider events, beneficiary mappings, and vendor payment requests.
- Provider adapter boundary with `NONE`, `MOCK_WIO`, and `WIO_DISABLED_PLACEHOLDER`.
- Guarded API readiness endpoints under `/bank-integrations`.
- Local/test-only mock sync recording for fixture data.
- Vendor payment request lifecycle metadata from draft through approval, release-blocked, manual external release, and reconciliation.
- Settings UI at `/settings/bank-integrations` that displays readiness, blockers, and safety claims.

## Safety Matrix

| Capability | Current status |
| --- | --- |
| Real Wio API connection | Not implemented |
| Live bank feed sync | Not implemented |
| Bank credential storage | Not implemented |
| Beneficiary bank secret storage | Not implemented |
| Vendor payment release | Blocked |
| Manual statement import | Still supported |
| Mock Wio fixture sync | Local/test only |

`MOCK_WIO` must not be enabled in production-like modes. Production config validation blocks it. The Wio placeholder remains future-only and must not be described as production integration proof.

## Data Rules

Persisted integration records may contain tenant scope, status, timestamps, nullable `requestId`, masked external references, and redacted metadata. They must not contain raw account numbers, IBANs, credentials, tokens, provider secrets, full provider payloads, document bodies, PDFs, XML, or bank API responses.

## Future Real Wio Requirements

Before enabling a real provider, LedgerByte still needs provider documentation review, credential custody design, webhook/signature validation, bank account ownership checks, approval workflow controls, reconciliation evidence, audit coverage, incident runbooks, and explicit production approval.

Hosted production recovery, hosted PITR, object-storage recovery, UAE/ZATCA compliance, and real provider integrations are not proven by this readiness work.
