-- RLS staging policy template for LedgerByte.
--
-- DO NOT APPLY TO PRODUCTION.
-- Template only. Not a Prisma migration. Not executable as-is.
-- Review and adapt in an isolated staging/proof database only.
-- Requires a reviewed Prisma transaction helper that sets:
--   SET LOCAL app.current_organization_id = '<uuid>';
--   SET LOCAL app.current_user_id = '<uuid>';

-- Placeholder names used below:
--   {{APP_SCHEMA}}
--   {{TENANT_TABLE}}
--   {{API_RUNTIME_ROLE}}

-- 1. Example tenant-owned table policy.
--    Replace {{TENANT_TABLE}} with a reviewed table such as "SalesInvoice" only in staging.
/*
ALTER TABLE {{APP_SCHEMA}}.{{TENANT_TABLE}} ENABLE ROW LEVEL SECURITY;
ALTER TABLE {{APP_SCHEMA}}.{{TENANT_TABLE}} FORCE ROW LEVEL SECURITY;

CREATE POLICY "{{TENANT_TABLE}}_tenant_select"
ON {{APP_SCHEMA}}.{{TENANT_TABLE}}
FOR SELECT
TO {{API_RUNTIME_ROLE}}
USING (
  "organizationId" = NULLIF(current_setting('app.current_organization_id', true), '')::uuid
);

CREATE POLICY "{{TENANT_TABLE}}_tenant_insert"
ON {{APP_SCHEMA}}.{{TENANT_TABLE}}
FOR INSERT
TO {{API_RUNTIME_ROLE}}
WITH CHECK (
  "organizationId" = NULLIF(current_setting('app.current_organization_id', true), '')::uuid
);

CREATE POLICY "{{TENANT_TABLE}}_tenant_update"
ON {{APP_SCHEMA}}.{{TENANT_TABLE}}
FOR UPDATE
TO {{API_RUNTIME_ROLE}}
USING (
  "organizationId" = NULLIF(current_setting('app.current_organization_id', true), '')::uuid
)
WITH CHECK (
  "organizationId" = NULLIF(current_setting('app.current_organization_id', true), '')::uuid
);
*/

-- 2. Membership-based Organization visibility sketch.
--    This table is root/global and needs user membership checks instead of direct organizationId.
/*
ALTER TABLE {{APP_SCHEMA}}."Organization" ENABLE ROW LEVEL SECURITY;
ALTER TABLE {{APP_SCHEMA}}."Organization" FORCE ROW LEVEL SECURITY;

CREATE POLICY "Organization_member_select"
ON {{APP_SCHEMA}}."Organization"
FOR SELECT
TO {{API_RUNTIME_ROLE}}
USING (
  EXISTS (
    SELECT 1
    FROM {{APP_SCHEMA}}."OrganizationMember" member
    WHERE member."organizationId" = "Organization"."id"
      AND member."userId" = NULLIF(current_setting('app.current_user_id', true), '')::uuid
      AND member."status" = 'ACTIVE'
  )
);
*/

-- 3. Membership row visibility sketch.
/*
ALTER TABLE {{APP_SCHEMA}}."OrganizationMember" ENABLE ROW LEVEL SECURITY;
ALTER TABLE {{APP_SCHEMA}}."OrganizationMember" FORCE ROW LEVEL SECURITY;

CREATE POLICY "OrganizationMember_current_org_or_user_select"
ON {{APP_SCHEMA}}."OrganizationMember"
FOR SELECT
TO {{API_RUNTIME_ROLE}}
USING (
  "organizationId" = NULLIF(current_setting('app.current_organization_id', true), '')::uuid
  OR "userId" = NULLIF(current_setting('app.current_user_id', true), '')::uuid
);
*/

-- 4. AuditLog append-only sketch.
/*
ALTER TABLE {{APP_SCHEMA}}."AuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE {{APP_SCHEMA}}."AuditLog" FORCE ROW LEVEL SECURITY;

CREATE POLICY "AuditLog_tenant_select"
ON {{APP_SCHEMA}}."AuditLog"
FOR SELECT
TO {{API_RUNTIME_ROLE}}
USING (
  "organizationId" = NULLIF(current_setting('app.current_organization_id', true), '')::uuid
);

CREATE POLICY "AuditLog_tenant_insert"
ON {{APP_SCHEMA}}."AuditLog"
FOR INSERT
TO {{API_RUNTIME_ROLE}}
WITH CHECK (
  "organizationId" = NULLIF(current_setting('app.current_organization_id', true), '')::uuid
);

-- Do not create UPDATE or DELETE policies for ordinary runtime.
*/

-- 5. Staging-only rollback sketch.
--    Use only in the same isolated staging/proof database after review.
/*
DROP POLICY IF EXISTS "{{TENANT_TABLE}}_tenant_select" ON {{APP_SCHEMA}}.{{TENANT_TABLE}};
DROP POLICY IF EXISTS "{{TENANT_TABLE}}_tenant_insert" ON {{APP_SCHEMA}}.{{TENANT_TABLE}};
DROP POLICY IF EXISTS "{{TENANT_TABLE}}_tenant_update" ON {{APP_SCHEMA}}.{{TENANT_TABLE}};
ALTER TABLE {{APP_SCHEMA}}.{{TENANT_TABLE}} NO FORCE ROW LEVEL SECURITY;
ALTER TABLE {{APP_SCHEMA}}.{{TENANT_TABLE}} DISABLE ROW LEVEL SECURITY;
*/
