import {
  runSandboxSdkCsrOracleCli,
  type SandboxSdkCsrOracleCliOptions,
} from "../src/zatca/custody/sandbox-sdk-csr-oracle-cli";
import { executeSandboxSdkCsrOracleRuntime } from "../src/zatca/custody/sandbox-sdk-csr-oracle-runtime";

async function execute(options: SandboxSdkCsrOracleCliOptions) {
  const result = await executeSandboxSdkCsrOracleRuntime(options);
  if (result.status === "SKIPPED_EXTERNAL_ORACLE") {
    return {
      arc: "ARC-07B-06H",
      status: "SKIPPED_EXTERNAL_ORACLE",
      officialSdkTier2Executed: false,
      networkCallsMade: false,
      otpUsed: false,
      csidRequested: false,
      productionExecution: false,
      sensitiveBodiesReturned: false,
    };
  }
  if (result.status !== "PASSED" || result.evidence === null) {
    throw new Error("ZATCA SDK CSR oracle failed.");
  }
  return result.evidence;
}

void runSandboxSdkCsrOracleCli(process.argv.slice(2), execute, {
  output: process.stdout,
  error: process.stderr,
}).then((exitCode) => {
  process.exitCode = exitCode;
});
