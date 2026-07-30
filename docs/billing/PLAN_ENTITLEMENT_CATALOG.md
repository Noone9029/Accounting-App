# Plan and Entitlement Catalog Contract

Status: design contract and synthetic-test catalog only. It creates no public catalog, price, checkout, or provider object.

## Registry ownership

The entitlement registry is code-defined in PAID-SAAS-02 and rejects unknown keys. Durable plan-version records contain only validated snapshots from that registry. A UI must never be the only gate.

Initial registry shape:

| Key | Type | Meaning | Source of truth | Initial availability |
| --- | --- | --- | --- | --- |
| `core_accounting` | boolean | Baseline LedgerByte accounting workspace | local subscription/legacy-beta compatibility | controlled beta, Starter, Growth |
| `active_member_seats` | positive integer | Maximum active organization members | current active organization-member query | plan-specific |
| `country_ksa_module` | boolean | KSA module visibility candidate only | entitlement plus operational/compliance gate | controlled beta; no authority action implied |
| `country_uae_module` | boolean | UAE module visibility candidate only | entitlement plus operational/compliance gate | disabled for sale |
| `support_tier` | enum | Bounded support metadata | plan-version snapshot | plan-specific |
| `billing_interval_month` | boolean | Whether a monthly catalog price may be selected | active reviewed price mapping | plan-specific |
| `billing_interval_year` | boolean | Whether an annual catalog price may be selected | active reviewed price mapping | plan-specific |
| `ksa_compliance_add_on` | boolean | Future KSA add-on representation | additional operational and country-compliance gates | disabled/not sellable |

The v1 registry deliberately excludes metered usage, storage quotas, monthly invoice quotas, arbitrary custom fields, and payment processing fees. Those have no approved source-of-truth measurement or commercial policy.

## Internal plan keys and visibility

| Stable key | Intended role | Public | Sellable | Checkout enabled |
| --- | --- | ---: | ---: | ---: |
| `CONTROLLED_BETA` | Existing invited beta compatibility | no | no | no |
| `STARTER` | Future small-SME recurring plan | no until catalog approval | no until catalog approval | no |
| `GROWTH` | Future multi-user recurring plan | no until catalog approval | no until catalog approval | no |
| `KSA_COMPLIANCE` | Future add-on model only | no | no | no |

There is no sellable UAE compliance plan. `KSA_COMPLIANCE` remains unavailable and blocked from authority submission even when represented in a future catalog. A plan entitlement alone never proves operational or regulatory readiness.

## Versioning rules

1. A plan key is stable; all benefit, price, entitlement, or display-impacting changes create a new `BillingPlanVersion`.
2. A version receives a monotonic version number per plan and a single effective timestamp.
3. Activation freezes that version and its entitlement snapshot. Attempted mutation is rejected.
4. Retirement prevents new selection but does not alter subscriptions that already reference the version.
5. Existing subscriptions retain their referenced version until a valid scheduled change or reactivation selects another one.
6. A price references exactly one plan version, not just a plan key.
7. Provider product and price references are mappings with unique `(provider, environment, externalId)` constraints; they are never domain identifiers.

## Price contract

Only fixed recurring monthly and annual prices are supported in v1. A price contains interval (`MONTH` or `YEAR`), ISO currency, non-negative amount in minor units, active state, provider mapping, and test/live classification.

Synthetic local fixtures may use non-public values such as `TEST_MONTHLY_MINOR = 12345` and `TEST_ANNUAL_MINOR = 123450` solely to exercise interval and mapping validation. They are not proposed market prices, must be hidden/draft, and must not appear in production-visible UI.

A price is selectable only when all conditions hold:

```text
plan version active
AND plan publicly approved and sellable
AND price active
AND requested interval enabled by entitlement/catalog policy
AND environment classification matches the provider boundary
AND no compliance-unavailability rule blocks it
```

Real amounts, currencies, discounts, tax treatment, public wording, and refunds require a later owner-approved commercial/legal catalog decision.

## Entitlement evaluation order

1. Resolve active organization and tenant ownership.
2. Check the caller's local permission.
3. Resolve enforcement mode and local subscription/legacy-beta compatibility.
4. Resolve the referenced immutable plan-version snapshot.
5. Validate entitlement key/type and bounded usage or seat count.
6. Apply operational-readiness and country-compliance gates.
7. Return one safe decision code; persist only bounded observe/audit metadata.

For seat limits, the only initial source of truth is the active organization-member relation. Invitations must reserve/check capacity within a transaction or equivalent database lock so concurrent invitations cannot oversubscribe.

## Required catalog tests in PAID-SAAS-02/03

- Unknown or type-incompatible entitlement values reject.
- Activated plan versions reject mutation.
- Retired plans and inactive prices are not offered.
- Monthly and annual mapping selects only the reviewed interval.
- Provider price collisions reject.
- A duplicate organization subscription rejects.
- Controlled-beta missing billing state preserves access only while enforcement is disabled.
- KSA compliance add-on and every UAE compliance capability remain unavailable without their independent readiness gates.
