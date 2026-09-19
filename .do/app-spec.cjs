"use strict";
// Emits a review template only. It never talks to DigitalOcean or reads secrets.
const origin = "https://app.ledgerbyte.io";
const env = (key, value, type = "GENERAL") => ({ key, value, type, scope: "RUN_TIME" });
const secret = (key) => env(key, "", "SECRET");
const backend = () => [
  env("NODE_ENV", "production"), env("APP_ENV", "production"),
  env("DATABASE_URL", "${database.DATABASE_URL}", "SECRET"),
  secret("JWT_SECRET"), secret("AUTH_SESSION_PEPPER"),
  env("APP_WEB_URL", origin), env("CORS_ORIGIN", origin),
  env("AUTH_COOKIE_SECURE", "true"), env("AUTH_COOKIE_SAME_SITE", "lax"),
  env("PRISMA_CONNECTION_LIMIT", "3"), env("PRISMA_TRANSACTION_MAX_WAIT_MS", "10000"), env("PRISMA_TRANSACTION_TIMEOUT_MS", "20000"),
  env("ATTACHMENT_STORAGE_PROVIDER", "database"), env("GENERATED_DOCUMENT_STORAGE_PROVIDER", "database"),
  env("S3_ENDPOINT", "https://fra1.digitaloceanspaces.com"), env("S3_REGION", "fra1"),
  env("S3_BUCKET", "REPLACE_WITH_REVIEWED_PRIVATE_BUCKET"), env("S3_FORCE_PATH_STYLE", "false"),
  secret("S3_ACCESS_KEY_ID"), secret("S3_SECRET_ACCESS_KEY"),
  env("EMAIL_PROVIDER", "smtp-disabled"), env("SMTP_HOST", "smtp.resend.com"), env("SMTP_PORT", "465"),
  env("SMTP_SECURE", "true"), env("SMTP_USER", "resend"), secret("SMTP_PASSWORD"),
  env("EMAIL_FROM", "info@ledgerbyte.io"),
  env("LEDGERBYTE_EMAIL_RETRY_PROCESSOR_ENABLED", "false"), env("LEDGERBYTE_EMAIL_RETRY_WORKER_ENABLED", "false"),
  env("LEDGERBYTE_EMAIL_RETRY_WORKER_SCHEDULER_PROVIDER", "DATABASE_POLL"),
  env("LEDGERBYTE_BILLING_PROVIDER", "DISABLED"), env("LEDGERBYTE_BILLING_WORKER_ENABLED", "false"),
  env("LEDGERBYTE_SELF_SERVICE_ENABLED", "false"), env("BILLING_ENFORCEMENT_MODE", "DISABLED"),
  env("BILLING_SELLER_LEGAL_NAME", ""), env("BILLING_STRIPE_PORTAL_CONFIGURATION", ""),
  env("BILLING_STRIPE_STARTER_MONTHLY_PRICE_ID", ""), env("BILLING_STRIPE_GROWTH_MONTHLY_PRICE_ID", ""),
  env("LEDGERBYTE_STRIPE_TEST_MODE_ENABLED", "false"), secret("BILLING_STRIPE_SECRET_KEY"), secret("BILLING_STRIPE_WEBHOOK_SECRET"),
];
const source = () => ({ github: { repo: "Noone9029/Accounting-App", branch: "main", deploy_on_push: false }, source_dir: "/" });
const appSpec = {
  name: "ledgerbyte-production", region: "fra",
  domains: [{ domain: "app.ledgerbyte.io", type: "PRIMARY" }],
  alerts: [{ rule: "DEPLOYMENT_FAILED" }, { rule: "DOMAIN_FAILED" }],
  ingress: { rules: [
    { match: { path: { prefix: "/api/locale" } }, component: { name: "web", preserve_path_prefix: true } },
    { match: { path: { prefix: "/api" } }, component: { name: "api", preserve_path_prefix: false } },
    { match: { path: { prefix: "/" } }, component: { name: "web" } },
  ] },
  databases: [{ name: "database", engine: "PG", production: true,
    cluster_name: "REPLACE_WITH_REVIEWED_PRODUCTION_CLUSTER", db_name: "ledgerbyte", db_user: "ledgerbyte_runtime" }],
  services: [
    { name: "web", ...source(), dockerfile_path: "infra/docker/web.Dockerfile", instance_count: 1,
      instance_size_slug: "apps-s-1vcpu-1gb-fixed", http_port: 3000,
      health_check: { http_path: "/login", initial_delay_seconds: 30, period_seconds: 10 },
      envs: [{ key: "NEXT_PUBLIC_API_URL", value: "/api", scope: "BUILD_TIME", type: "GENERAL" }] },
    { name: "api", ...source(), dockerfile_path: "infra/docker/api.Dockerfile", instance_count: 1,
      instance_size_slug: "apps-s-1vcpu-1gb", http_port: 4000,
      health_check: { http_path: "/health", initial_delay_seconds: 30, period_seconds: 10 },
      envs: [...backend(), env("API_PORT", "4000")] },
  ],
  workers: [{ name: "outbox", ...source(), dockerfile_path: "infra/docker/api.Dockerfile", instance_count: 1,
    instance_size_slug: "apps-s-1vcpu-0.5gb", run_command: "node dist/apps/api/src/worker.js",
    envs: [...backend(), env("NODE_OPTIONS", "--max-old-space-size=256"), env("PRISMA_CONNECTION_LIMIT", "2"),
      env("LEDGERBYTE_WORKER_INTERVAL_MS", "5000"), env("LEDGERBYTE_WORKER_ORGANIZATIONS_PER_TICK", "10"), env("LEDGERBYTE_WORKER_EMAIL_BATCH_SIZE", "1")] }],
};
// Avoid duplicate env keys when a component narrows a shared default.
for (const component of [...appSpec.services, ...appSpec.workers]) component.envs = [...new Map(component.envs.map((item) => [item.key, item])).values()];
module.exports = { appSpec };
if (require.main === module) process.stdout.write(JSON.stringify(appSpec, null, 2) + "\n");
