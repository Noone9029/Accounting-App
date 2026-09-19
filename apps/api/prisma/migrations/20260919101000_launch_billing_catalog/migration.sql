-- Reviewed launch prices. Provider mappings and public checkout remain disabled.
INSERT INTO "BillingPlan" (id, key, "displayName", "internalDescription", status, "publiclyVisible", sellable, "updatedAt")
VALUES ('c72b0001-0000-4000-8000-000000000001', 'STARTER', 'Starter', 'Saudi back-office monthly starter', 'ACTIVE', true, true, CURRENT_TIMESTAMP),
       ('c72b0001-0000-4000-8000-000000000002', 'GROWTH', 'Growth', 'Saudi back-office monthly growth', 'ACTIVE', true, true, CURRENT_TIMESTAMP)
ON CONFLICT (key) DO NOTHING;

INSERT INTO "BillingPlanVersion" (id, "billingPlanId", version, status, "effectiveAt", "entitlementSnapshot", "updatedAt")
SELECT CASE WHEN key = 'STARTER' THEN 'c72b0002-0000-4000-8000-000000000001'::uuid ELSE 'c72b0002-0000-4000-8000-000000000002'::uuid END,
 id, 20260919, 'DRAFT', CURRENT_TIMESTAMP,
 jsonb_build_object('core_accounting', true, 'active_member_seats', CASE WHEN key = 'STARTER' THEN 3 ELSE 10 END, 'billing_interval_month', true, 'billing_interval_year', false, 'country_ksa_module', false, 'country_uae_module', false, 'ksa_compliance_add_on', false, 'support_tier', 'STANDARD'), CURRENT_TIMESTAMP
FROM "BillingPlan" WHERE key IN ('STARTER', 'GROWTH')
ON CONFLICT ("billingPlanId", version) DO NOTHING;

INSERT INTO "BillingPlanEntitlement" (id, "planVersionId", key, "valueType", "booleanValue", "integerValue", "stringValue")
SELECT gen_random_uuid(), v.id, e.key,
 CASE jsonb_typeof(e.value) WHEN 'boolean' THEN 'BOOLEAN'::"BillingEntitlementValueType" WHEN 'number' THEN 'INTEGER'::"BillingEntitlementValueType" ELSE 'STRING'::"BillingEntitlementValueType" END,
 CASE WHEN jsonb_typeof(e.value) = 'boolean' THEN (e.value #>> '{}')::boolean END,
 CASE WHEN jsonb_typeof(e.value) = 'number' THEN (e.value #>> '{}')::integer END,
 CASE WHEN jsonb_typeof(e.value) = 'string' THEN e.value #>> '{}' END
FROM "BillingPlanVersion" v, jsonb_each(v."entitlementSnapshot") e
WHERE v.version = 20260919 ON CONFLICT ("planVersionId", key) DO NOTHING;

INSERT INTO "BillingPrice" (id, "planVersionId", provider, environment, interval, currency, "amountMinor", active, "updatedAt")
SELECT CASE WHEN p.key = 'STARTER' THEN 'c72b0003-0000-4000-8000-000000000001'::uuid ELSE 'c72b0003-0000-4000-8000-000000000002'::uuid END,
 v.id, 'STRIPE', 'TEST', 'MONTH', 'SAR', CASE WHEN p.key = 'STARTER' THEN 14900 ELSE 29900 END, false, CURRENT_TIMESTAMP
FROM "BillingPlanVersion" v JOIN "BillingPlan" p ON p.id = v."billingPlanId"
WHERE v.version = 20260919 AND p.key IN ('STARTER', 'GROWTH') ON CONFLICT (id) DO NOTHING;

-- Immutable entitlement triggers require composing the full version before activation.
UPDATE "BillingPlanVersion" SET status = 'ACTIVE', "updatedAt" = CURRENT_TIMESTAMP
WHERE version = 20260919 AND status = 'DRAFT'
  AND "billingPlanId" IN (SELECT id FROM "BillingPlan" WHERE key IN ('STARTER', 'GROWTH'));
UPDATE "BillingPlan" SET status = 'ACTIVE', "publiclyVisible" = true, sellable = true, "updatedAt" = CURRENT_TIMESTAMP
WHERE key IN ('STARTER', 'GROWTH');
