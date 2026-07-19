#!/usr/bin/env tsx
import { executeLocalRuntimeRoleProof } from "../src/database-security/local-runtime-role-proof";

const result = executeLocalRuntimeRoleProof(process.env.LEDGERBYTE_LOCAL_RUNTIME_ROLE_PROOF_DATABASE_URL, process.env);
console.log(JSON.stringify(result, null, 2));
if (result.status !== "LOCAL_RUNTIME_ROLE_PROOF_PASSED") process.exitCode = 1;
