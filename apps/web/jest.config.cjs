/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: "jsdom",
  moduleFileExtensions: ["ts", "tsx", "js"],
  transform: {
    "^.+\\.(t|j)sx?$": ["ts-jest", { tsconfig: "tsconfig.json" }],
  },
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^@ledgerbyte/shared$": "<rootDir>/../../packages/shared/src/index.ts",
    "^\\./permissions\\.js$": "<rootDir>/../../packages/shared/src/permissions.ts",
  },
};
