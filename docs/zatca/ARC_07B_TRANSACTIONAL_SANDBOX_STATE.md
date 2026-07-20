# ARC-07B transactional sandbox submission state

## Scope

ARC-07B-04 adds a metadata-only, tenant-scoped transaction boundary for synthetic local sandbox proofs. It does not enable a ZATCA adapter, create a network target, read a credential, or update the existing `ZatcaEgsUnit` issuance chain.

## Added state

- `ZatcaSandboxProofRun` owns a disposable, synthetic proof-run boundary.
- `ZatcaSandboxSubmissionState` records reservation, uncertainty, rejection, and acceptance metadata.
- `ZatcaSandboxSubmissionAttempt` records safe response codes, hashes, retry classification, and correlation metadata.

The models reuse the existing organization, EGS unit, and optional invoice-metadata relations. They intentionally do not reuse `ZatcaSubmissionLog`, which has legacy raw payload columns and is not a safe persistence target for this proof boundary.

## Invariants

- Every proof-run lookup is scoped by organization and EGS unit.
- ICV allocation runs in a serializable transaction with unique organization/EGS/ICV and source-identity constraints.
- Reservation conflicts retry only for database serialization or uniqueness races; an exact replay returns the existing logical reservation and a changed payload is rejected.
- The PIH for a new reservation must equal the prior accepted canonical hash in the same proof run.
- Acceptance is a distinct state transition and can happen once only.
- A timeout is represented by `UNCERTAIN`; it never advances an accepted chain.
- Releasing a pre-send reservation deletes it, preventing a synthetic ICV gap.
- Cleanup deletes only a verified synthetic proof run and relies on foreign-key cascade for its synthetic rows.
- `ZatcaEgsUnit.lastIcv` and `lastInvoiceHash` are not written by this service.

## Secret and body boundary

The public service accepts hashes and reference aliases only. It rejects raw XML, signed XML, QR bodies, certificate bodies, private keys, OTPs, tokens, authorization data, raw requests, and raw responses before a transaction begins. Database columns contain no field for these bodies.

## Local proof

The integration test is opt-in and refuses any non-local or non-disposable target. With `LEDGERBYTE_ZATCA_SANDBOX_STATE_DB_INTEGRATION=1`, it uses `LEDGERBYTE_TEST_DATABASE_URL` only when the host is loopback and the database name begins `ledgerbyte_arc07b_`.

The authorized local Docker PostgreSQL run proved concurrent allocation, tenant isolation, replay/conflict behavior, PIH linkage, one-time acceptance, unchanged production EGS chain fields, and proof-run-only cleanup. It created no hosted state and made no ZATCA or application network call.

## Rollback

The migration is additive. Rollback consists of removing the three sandbox proof tables and their four enums only after confirming no synthetic proof run remains; it must never be applied against a hosted environment as part of ARC-07B local preparation.

## Remaining blockers

Official ZATCA sandbox host, endpoint methods, authentication construction, API version, payload/response contracts, retry semantics, onboarding sequence, clearance routing, reporting routing, and real non-production custody remain unconfirmed. Authenticated sandbox execution remains disabled.
