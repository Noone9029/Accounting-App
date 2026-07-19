import { LOCAL_RUNTIME_ROLE_APPROVAL, LOCAL_RUNTIME_ROLE_APPROVAL_ENV, buildLocalRuntimeRoleProofSql, classifyLocalRoleProofTarget, planLocalRuntimeRoleProof } from "./local-runtime-role-proof";

describe("local runtime role proof", () => {
  it("refuses remote and production-looking targets", () => {
    expect(classifyLocalRoleProofTarget("postgresql://user:secret@db.example.com/ledgerbyte_arc03_local_proof").safe).toBe(false);
    expect(classifyLocalRoleProofTarget("postgresql://user:secret@localhost/ledgerbyte_production").safe).toBe(false);
  });

  it("requires an explicit local approval", () => {
    expect(planLocalRuntimeRoleProof("postgresql://user:secret@localhost/ledgerbyte_arc03_local_proof", {})).toMatchObject({ status: "LOCAL_RUNTIME_ROLE_PROOF_BLOCKED" });
    expect(planLocalRuntimeRoleProof("postgresql://user:secret@localhost/ledgerbyte_arc03_local_proof", { [LOCAL_RUNTIME_ROLE_APPROVAL_ENV]: LOCAL_RUNTIME_ROLE_APPROVAL })).toMatchObject({ status: "LOCAL_RUNTIME_ROLE_PROOF_BLOCKED", hostedMutationAttempted: false, productionRuntimeRoleProven: false });
  });

  it("defines a forced-RLS pilot with no public application-table access", () => {
    const sql = buildLocalRuntimeRoleProofSql().join("\n");
    expect(sql).toContain("FORCE ROW LEVEL SECURITY");
    expect(sql).toContain("current_setting('ledgerbyte.organization_id'");
    expect(sql).toContain("REVOKE ALL ON ALL TABLES IN SCHEMA public");
    expect(sql).toContain("GRANT SELECT ON arc03_proof.tenant_records TO ledgerbyte_arc03_readonly");
  });
});
