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
    "^@ledgerbyte/shared$": "<rootDir>/../../packages/shared/src/index.ts",
  },
  testEnvironment: "node",
};
