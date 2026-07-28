import { resolveSafeLocalAbsolutePath } from "./sandbox-sdk-csr-oracle-runtime";

describe("sandbox SDK CSR local path boundary", () => {
  it.each([
    "\\\\host\\share\\sdk",
    "//host/share/sdk",
    "\\\\?\\C:\\sdk",
    "\\\\.\\C:\\sdk",
    "\\??\\C:\\sdk",
  ])("rejects remote or device namespace path %s without filesystem access", (path) => {
    expect(() => resolveSafeLocalAbsolutePath(path)).toThrow(
      "ZATCA SDK CSR runtime path rejected.",
    );
  });
});
