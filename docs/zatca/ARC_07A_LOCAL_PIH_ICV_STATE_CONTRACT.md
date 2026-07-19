# ARC-07A local PIH/ICV state contract

This contract is a deterministic in-memory proof component in `@ledgerbyte/zatca-core`. It has no Prisma, network, clearance, reporting, or production-state adapter.

| State | Entry condition | Result | Durable production state |
| --- | --- | --- | --- |
| `LOCAL_PROVISIONAL_ONLY` | Chain begins | ICV is `0`; PIH is the official initial value | Never changed |
| Reserved | Next ICV and previous accepted canonical hash match | One local issuance holds the ICV | Never changed |
| `COMMITTED_LOCALLY` | Signing, local validation, and local conformance all succeed | ICV/hash advance within this in-memory proof only | Never changed |
| `ROLLED_BACK_LOCALLY` | Signing, validation, or conformance fails/rejects | Reservation is released; ICV/hash do not advance | Never changed |

The component accepts only Base64-encoded 32-byte canonical invoice hashes. A raw XML diagnostic hash or arbitrary string cannot advance the chain. It rejects duplicate or skipped ICVs, duplicate invoice IDs/hashes, reused or wrong PIHs, and concurrent reservations for the same ICV.

ARC-07A local commits are not ZATCA clearance/reporting acceptance. A future approved persistence design must use a transactional source of truth and must not advance durable chain state until the corresponding signing and local conformance requirements are satisfied; sandbox and production transitions remain outside this local-only phase.
