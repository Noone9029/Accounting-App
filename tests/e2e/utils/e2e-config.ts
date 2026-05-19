interface TestCredentialOptions {
  label: string;
  targetUrls: string[];
  emailVar: string;
  passwordVar: string;
}

interface TestCredentialResult {
  email: string;
  password: string;
}

const { isLocalTargetUrl, resolveTestCredentials } = require("../../../scripts/test-credential-env.cjs") as {
  isLocalTargetUrl(value: string): boolean;
  resolveTestCredentials(options: TestCredentialOptions): TestCredentialResult;
};

const webUrl = process.env.LEDGERBYTE_WEB_URL ?? "http://localhost:3000";
const apiUrl = (process.env.LEDGERBYTE_API_URL ?? "http://localhost:4000").replace(/\/$/, "");
const credentials = resolveTestCredentials({
  label: "E2E",
  targetUrls: [webUrl, apiUrl],
  emailVar: "LEDGERBYTE_E2E_EMAIL",
  passwordVar: "LEDGERBYTE_E2E_PASSWORD",
});

export const e2eConfig = {
  webUrl,
  apiUrl,
  email: credentials.email,
  password: credentials.password,
  organizationId: process.env.LEDGERBYTE_E2E_ORGANIZATION_ID ?? "00000000-0000-0000-0000-000000000001",
};

export function isLocalApiUrl(value: string) {
  return isLocalTargetUrl(value);
}
