# ARC-03 Local Runtime Role and RLS Pilot Evidence

- Source commit: `42443be6`
- Target classification: local and disposable (`ledgerbyte_arc03_local_proof`)
- Result: `LOCAL_RUNTIME_ROLE_PROOF_PASSED`
- Hosted mutation attempted: `false`
- Production runtime role proven: `false`
- RLS status: disposable local pilot only

## Passed checks

| Check | Result |
| --- | --- |
| Runtime cannot create schema objects | PASS |
| Runtime cannot create or administer roles | PASS |
| Runtime cannot access public application tables | PASS |
| Tenant A reads its twelve representative domain records | PASS |
| Tenant A cannot read Tenant B rows by guessed identifier scope | PASS |
| Tenant A cannot insert Tenant B rows | PASS |
| Read-only role cannot write | PASS |
| Teardown is scoped to the disposable proof database and roles | PASS |

## Teardown verification

Immediately after the command completed, the local admin connection returned `0` proof roles and `0` proof databases. The local PostgreSQL server remains separate from LedgerByte application data and will be stopped after this evidence pass.

## Non-claims and gate

This proof does not create a hosted runtime role, alter LedgerByte application tables, enable hosted RLS, inspect Supabase Data API settings, change deployment secrets, or prove a production role split. Those steps require `APPROVE NON-PRODUCTION HOSTED PROOF` and a separately approved maintenance/proof window.
