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
    "^@ledgerbyte/uae-peppol-pint-ae$": "<rootDir>/../../packages/uae-peppol-pint-ae/src/index.ts",
    "^@ledgerbyte/zatca-core$": "<rootDir>/../../packages/zatca-core/src/index.ts",
    "^\\./(currencies|permissions|zatca-readiness)\\.js$": "<rootDir>/../../packages/shared/src/$1.ts",
    "^\\./(compliance-checklist|xml-mapping|xml-validation|signing-provider|local-pih-icv-chain|xades-signing|phase2-qr)\\.js$": "<rootDir>/../../packages/zatca-core/src/$1.ts",
  },
  testEnvironment: "node",
};
