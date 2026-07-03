const assert = require("node:assert/strict");
const test = require("node:test");

const { buildReview, formatMarkdown } = require("./security-tenant-index-review.cjs");

test("separates tenant-scoped unique constraints from risky business uniqueness", () => {
  const review = buildReview(`
model Customer {
  id String @id
  organizationId String
  email String
  externalCode String @unique
  @@unique([organizationId, email])
}
`);
  const risky = review.reviewNeeded.find((item) => item.raw === "externalCode @unique");
  assert.ok(risky);
  assert.equal(risky.scope, "tenant-sensitive-review");
  assert.ok(review.constraints.some((item) => item.raw === "@@unique([organizationId, email])" && item.scope === "tenant-scoped"));
});

test("treats global-reference uniqueness separately", () => {
  const review = buildReview(`
model OnboardingTemplateVersion {
  id String @id
  version String
  archetypeKey String
  @@unique([version, archetypeKey])
}
`);
  assert.equal(review.reviewNeededCount, 0);
  assert.equal(review.constraints.find((item) => item.kind === "@@unique").scope, "global-or-system");
});

test("recognizes parent-scoped unique constraints on indirect models", () => {
  const review = buildReview(`
model Organization {
  id String @id
}

model Checklist {
  id String @id
  organizationId String
}

model ChecklistItem {
  id String @id
  checklistId String
  itemKey String
  checklist Checklist @relation(fields: [checklistId], references: [id])
  @@unique([checklistId, itemKey])
}
`);
  assert.equal(review.reviewNeededCount, 0);
  assert.equal(review.constraints.find((item) => item.model === "ChecklistItem" && item.kind === "@@unique").scope, "parent-scoped");
});

test("markdown omits secret-shaped values", () => {
  const review = buildReview(`
model Customer {
  id String @id
  organizationId String
  email String @unique
}
`);
  const markdown = formatMarkdown(review);
  assert.match(markdown, /Tenant Index Review Evidence/);
  assert.doesNotMatch(markdown, /LEDGERBYTE_TEST_DATABASE_URL_PLACEHOLDER/);
});
