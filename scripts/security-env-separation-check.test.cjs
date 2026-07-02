const assert = require("node:assert/strict");
const test = require("node:test");

const { buildCheck, formatMarkdown } = require("./security-env-separation-check.cjs");

test("reports environment variable names only", () => {
  const report = buildCheck({
    DATABASE_URL: "LEDGERBYTE_TEST_DATABASE_URL_PLACEHOLDER",
    DIRECT_URL: "LEDGERBYTE_DIRECT_URL_PLACEHOLDER",
    UAE_ASP_API_KEY: "LEDGERBYTE_ASP_API_KEY_PLACEHOLDER",
    SMTP_PASSWORD: "LEDGERBYTE_SMTP_PASSWORD_PLACEHOLDER",
  });
  const serialized = JSON.stringify(report);

  assert.ok(report.presentNames.includes("DATABASE_URL"));
  assert.ok(report.presentNames.includes("DIRECT_URL"));
  assert.ok(report.presentNames.includes("UAE_ASP_API_KEY"));
  assert.equal(report.valuesPrinted, false);
  assert.doesNotMatch(
    serialized,
    /LEDGERBYTE_TEST_DATABASE_URL_PLACEHOLDER|LEDGERBYTE_DIRECT_URL_PLACEHOLDER|LEDGERBYTE_ASP_API_KEY_PLACEHOLDER|LEDGERBYTE_SMTP_PASSWORD_PLACEHOLDER/,
  );
});

test("warns when runtime database URL has no separate migration/admin variable name", () => {
  const report = buildCheck({ DATABASE_URL: "LEDGERBYTE_TEST_DATABASE_URL_PLACEHOLDER" });

  assert.equal(report.status, "REVIEW_REQUIRED");
  assert.match(report.warnings.join("\n"), /no separate DIRECT_URL or MIGRATION_DATABASE_URL/);
});

test("markdown redacts scary dummy secrets", () => {
  const report = buildCheck({
    SUPABASE_SERVICE_ROLE_KEY: "LEDGERBYTE_SERVICE_ROLE_PLACEHOLDER",
    ZATCA_PRIVATE_KEY: "LEDGERBYTE_PRIVATE_KEY_PLACEHOLDER",
  });
  const markdown = formatMarkdown(report);

  assert.match(markdown, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(markdown, /ZATCA_PRIVATE_KEY/);
  assert.doesNotMatch(markdown, /LEDGERBYTE_SERVICE_ROLE_PLACEHOLDER|LEDGERBYTE_PRIVATE_KEY_PLACEHOLDER/);
});
