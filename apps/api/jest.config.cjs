/** @type {import('jest').Config} */
module.exports = {
  moduleFileExtensions: ["js", "json", "ts"],
  rootDir: ".",
  testRegex: ".*\\.spec\\.ts$",
  transform: {
    "^.+\\.(t|j)s$": ["ts-jest", { tsconfig: "tsconfig.json" }],
  },
  moduleNameMapper: {
    "^@ledgerbyte/accounting-core$": "<rootDir>/../../packages/accounting-core/src/index.ts",
    "^@ledgerbyte/pdf-core$": "<rootDir>/../../packages/pdf-core/src/index.ts",
    "^@ledgerbyte/shared$": "<rootDir>/../../packages/shared/src/index.ts",
    "^@ledgerbyte/zatca-core$": "<rootDir>/../../packages/zatca-core/src/index.ts",
    "^\\./(compliance-checklist|xml-mapping|xml-validation)\\.js$": "<rootDir>/../../packages/zatca-core/src/$1.ts",
  },
  testEnvironment: "node",
};
