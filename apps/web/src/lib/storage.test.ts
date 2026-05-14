import { formatStorageBytes, s3ConfigRows, storageProviderLabel, storageReadinessLabel, storageReadinessTone } from "./storage";

describe("storage helpers", () => {
  it("labels storage providers and readiness", () => {
    expect(storageProviderLabel("database")).toBe("Database storage");
    expect(storageProviderLabel("s3")).toBe("S3-compatible object storage");
    expect(storageReadinessLabel({ ready: true })).toBe("Ready");
    expect(storageReadinessLabel({ ready: false })).toBe("Not ready");
    expect(storageReadinessTone({ ready: true })).toBe("success");
    expect(storageReadinessTone({ ready: false })).toBe("warning");
  });

  it("formats migration plan byte totals", () => {
    expect(formatStorageBytes(0)).toBe("0 B");
    expect(formatStorageBytes(512)).toBe("512 B");
    expect(formatStorageBytes(2048)).toBe("2 KB");
    expect(formatStorageBytes(1_572_864)).toBe("1.5 MB");
    expect(formatStorageBytes(-1)).toBe("-");
  });

  it("renders S3 config rows without secret values", () => {
    const rows = s3ConfigRows({
      endpointConfigured: true,
      regionConfigured: false,
      bucketConfigured: true,
      accessKeyConfigured: true,
      secretConfigured: true,
      forcePathStyle: true,
      publicBaseUrlConfigured: false,
    });

    expect(rows).toContainEqual({ label: "Secret key", configured: true });
    expect(JSON.stringify(rows)).not.toContain("secret=");
  });
});
