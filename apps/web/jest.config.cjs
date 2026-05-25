/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: "jsdom",
  moduleFileExtensions: ["ts", "tsx", "js"],
  transform: {
    "^.+\\.(t|j)sx?$": ["ts-jest", { tsconfig: { jsx: "react-jsx" } }],
  },
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^@ledgerbyte/shared$": "<rootDir>/../../packages/shared/src/index.ts",
    "^\\./(currencies|permissions|zatca-readiness)\\.js$": "<rootDir>/../../packages/shared/src/$1.ts",
  },
};
