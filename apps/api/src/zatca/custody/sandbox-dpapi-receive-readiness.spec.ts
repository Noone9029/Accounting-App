import {
  access,
  mkdir,
  mkdtemp,
  readdir,
  rename,
  rm,
  symlink,
  unlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { SandboxLocalDpapiProtector } from "./compliance-csid-secret-custody.provider";
import {
  __testOnlyProveSandboxDpapiReceiveCustodyReadiness,
  proveSandboxDpapiReceiveCustodyReadiness,
} from "./sandbox-dpapi-receive-readiness";

function disposableDirectoryPrefix(): string {
  return join(tmpdir(), "ledgerbyte-zatca-custody-proof-");
}

function localTestProcessEnvironment(): NodeJS.ProcessEnv {
  return {
    APP_ENV: "TEST",
    ZATCA_CSID_CUSTODY_PROVIDER: "sandbox-local-dpapi",
    ZATCA_SANDBOX_LOCAL_CUSTODY_ENABLED: "true",
    ZATCA_SANDBOX_LOCAL_EXECUTION_CLASSIFICATION: "LOCAL_TEST",
  };
}

function reversibleTestProtector(): SandboxLocalDpapiProtector {
  return {
    protect: jest.fn(async (value) => Buffer.from(`protected:${value.toString("base64")}`, "utf8")),
    unprotect: jest.fn(async (value) => {
      const serialized = value.toString("utf8");
      if (!serialized.startsWith("protected:")) {
        throw new Error("synthetic protector rejected ciphertext");
      }
      return Buffer.from(serialized.slice("protected:".length), "base64");
    }),
  };
}

async function expectMissing(path: string): Promise<void> {
  await expect(access(path)).rejects.toMatchObject({ code: "ENOENT" });
}

async function withProcessEnvironment<T>(
  values: Record<string, string | undefined>,
  operation: () => Promise<T>,
): Promise<T> {
  const previous = Object.fromEntries(
    Object.keys(values).map((key) => [key, process.env[key]]),
  );
  try {
    for (const [key, value] of Object.entries(values)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
    return await operation();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

describe("sandbox DPAPI receive-custody readiness proof", () => {
  it("proves token, secret, and certificate receive behavior with metadata-only output and cleanup", async () => {
    const storageDirectory = await mkdtemp(disposableDirectoryPrefix());
    const protector = reversibleTestProtector();

    const result = await __testOnlyProveSandboxDpapiReceiveCustodyReadiness({
      storageDirectory,
      environmentIdentity: "FATOORA_SIMULATION",
      processEnvironment: localTestProcessEnvironment(),
      protector,
    });

    expect(result).toEqual({
      status: "BEHAVIORAL_TEST_PASSED",
      safeErrorCodes: [],
      environmentIdentity: "FATOORA_SIMULATION",
      internalCustodyEnvironment: "SANDBOX",
      provider: "SANDBOX_LOCAL_DPAPI",
      actualDpapiUsed: false,
      tokenReceiveReady: true,
      secretReceiveReady: true,
      certificateReceiveReady: true,
      revokeReady: true,
      deleteReady: true,
      cleanupReady: true,
      receiveCustodyReady: false,
      ciphertextDiffersFromPlaintext: true,
      systemBinaryPathsPinned: false,
      childProcessEnvironmentScrubbed: false,
      syntheticMaterialOnly: true,
      networkCallsMade: null,
      networkIsolationProven: false,
      sensitiveBodiesRetained: false,
      bodyReturned: false,
      productionCompliance: false,
    });
    expect(protector.protect).toHaveBeenCalledTimes(3);
    expect(protector.unprotect).toHaveBeenCalledTimes(3);
    expect(JSON.stringify(result)).not.toMatch(
      /protected:|receive-proof-|00000000-0000-4000|certificate body|secret body|token body|private key|BEGIN /iu,
    );
    await expectMissing(storageDirectory);
  });

  it("rejects every environment identity except the reviewed FATOORA Simulation identity before custody use", async () => {
    const storageDirectory = await mkdtemp(disposableDirectoryPrefix());
    const protector = reversibleTestProtector();

    const result = await __testOnlyProveSandboxDpapiReceiveCustodyReadiness({
      storageDirectory,
      environmentIdentity: "DEVELOPER_PORTAL" as never,
      processEnvironment: localTestProcessEnvironment(),
      protector,
    });

    expect(result.status).toBe("FAILED");
    expect(result.environmentIdentity).toBe("INVALID");
    expect(result.internalCustodyEnvironment).toBe("UNMAPPED");
    expect(result.safeErrorCodes).toEqual(["ZATCA_DPAPI_RECEIVE_PROOF_TARGET_INVALID"]);
    expect(result.cleanupReady).toBe(true);
    expect(result.receiveCustodyReady).toBe(false);
    expect(protector.protect).not.toHaveBeenCalled();
    expect(protector.unprotect).not.toHaveBeenCalled();
    await expectMissing(storageDirectory);
  });

  it("rejects an identity transform instead of counting a plaintext round trip as DPAPI proof", async () => {
    const storageDirectory = await mkdtemp(disposableDirectoryPrefix());
    const result = await __testOnlyProveSandboxDpapiReceiveCustodyReadiness({
      storageDirectory,
      environmentIdentity: "FATOORA_SIMULATION",
      processEnvironment: localTestProcessEnvironment(),
      protector: {
        protect: async (value) => Buffer.from(value),
        unprotect: async (value) => Buffer.from(value),
      },
    });

    expect(result.status).toBe("FAILED");
    expect(result.safeErrorCodes).toEqual([
      "ZATCA_DPAPI_RECEIVE_PROOF_TOKEN_FAILED",
    ]);
    expect(result.ciphertextDiffersFromPlaintext).toBe(false);
    expect(result.actualDpapiUsed).toBe(false);
    expect(result.receiveCustodyReady).toBe(false);
    expect(result.networkIsolationProven).toBe(false);
    await expectMissing(storageDirectory);
  });

  it("cleans all proof-owned material when a custody operation fails and returns no raw error", async () => {
    const storageDirectory = await mkdtemp(disposableDirectoryPrefix());
    let protectCalls = 0;
    const protector: SandboxLocalDpapiProtector = {
      protect: async (value) => {
        protectCalls += 1;
        if (protectCalls === 2) {
          throw new Error("raw synthetic protector failure must not escape");
        }
        return Buffer.from(`protected:${value.toString("base64")}`, "utf8");
      },
      unprotect: async (value) =>
        Buffer.from(value.toString("utf8").replace("protected:", ""), "base64"),
    };

    const result = await __testOnlyProveSandboxDpapiReceiveCustodyReadiness({
      storageDirectory,
      environmentIdentity: "FATOORA_SIMULATION",
      processEnvironment: localTestProcessEnvironment(),
      protector,
    });

    expect(result.status).toBe("FAILED");
    expect(result.safeErrorCodes).toEqual(["ZATCA_DPAPI_RECEIVE_PROOF_SECRET_FAILED"]);
    expect(result.tokenReceiveReady).toBe(true);
    expect(result.secretReceiveReady).toBe(false);
    expect(result.certificateReceiveReady).toBe(false);
    expect(result.cleanupReady).toBe(true);
    expect(result.receiveCustodyReady).toBe(false);
    expect(JSON.stringify(result)).not.toContain("raw synthetic protector failure");
    await expectMissing(storageDirectory);
  });

  it("does not remove a nonempty or non-disposable caller directory", async () => {
    const storageDirectory = await mkdtemp(disposableDirectoryPrefix());
    const retainedFile = join(storageDirectory, "caller-owned.txt");
    await writeFile(retainedFile, "caller-owned", "utf8");

    const result = await __testOnlyProveSandboxDpapiReceiveCustodyReadiness({
      storageDirectory,
      environmentIdentity: "FATOORA_SIMULATION",
      processEnvironment: localTestProcessEnvironment(),
      protector: reversibleTestProtector(),
    });

    expect(result.status).toBe("FAILED");
    expect(result.safeErrorCodes).toEqual([
      "ZATCA_DPAPI_RECEIVE_PROOF_STORAGE_NOT_DISPOSABLE",
    ]);
    expect(result.cleanupReady).toBe(false);
    expect(result.receiveCustodyReady).toBe(false);
    expect(await readdir(storageDirectory)).toEqual(["caller-owned.txt"]);

    await rm(storageDirectory, { recursive: true, force: true });
  });

  it("rejects the real production-looking process environment before custody use", async () => {
    const storageDirectory = await mkdtemp(disposableDirectoryPrefix());
    const result = await withProcessEnvironment(
      {
        APP_ENV: "PRODUCTION",
        ZATCA_CSID_CUSTODY_PROVIDER: "sandbox-local-dpapi",
        ZATCA_SANDBOX_LOCAL_CUSTODY_ENABLED: "true",
        ZATCA_SANDBOX_LOCAL_EXECUTION_CLASSIFICATION: "LOCAL_TEST",
      },
      () =>
        proveSandboxDpapiReceiveCustodyReadiness({
          storageDirectory,
          environmentIdentity: "FATOORA_SIMULATION",
        }),
    );

    expect(result.status).toBe("FAILED");
    expect(result.safeErrorCodes).toEqual([
      "ZATCA_DPAPI_RECEIVE_PROOF_RUNTIME_NOT_LOCAL_TEST",
    ]);
    expect(result.receiveCustodyReady).toBe(false);
    await expectMissing(storageDirectory);
  });

  it("guards the injectable behavioral seam with the real test runtime", async () => {
    const storageDirectory = await mkdtemp(disposableDirectoryPrefix());
    const previousNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    try {
      await expect(
        __testOnlyProveSandboxDpapiReceiveCustodyReadiness({
          storageDirectory,
          environmentIdentity: "FATOORA_SIMULATION",
          processEnvironment: localTestProcessEnvironment(),
          protector: reversibleTestProtector(),
        }),
      ).rejects.toThrow("test-only");
      expect(await readdir(storageDirectory)).toEqual([]);
    } finally {
      process.env.NODE_ENV = previousNodeEnv;
      await rm(storageDirectory, { recursive: true, force: true });
    }
  });

  it("retains a concurrent foreign entry and removes only exact proof-owned files", async () => {
    const storageDirectory = await mkdtemp(disposableDirectoryPrefix());
    const foreignFile = join(storageDirectory, "foreign-entry.txt");
    let protectCalls = 0;
    const baseProtector = reversibleTestProtector();
    const protector: SandboxLocalDpapiProtector = {
      protect: async (value) => {
        protectCalls += 1;
        if (protectCalls === 1) {
          await writeFile(foreignFile, "foreign", "utf8");
        }
        return baseProtector.protect(value);
      },
      unprotect: (value) => baseProtector.unprotect(value),
    };

    const result = await __testOnlyProveSandboxDpapiReceiveCustodyReadiness({
      storageDirectory,
      environmentIdentity: "FATOORA_SIMULATION",
      processEnvironment: localTestProcessEnvironment(),
      protector,
    });

    expect(result.status).toBe("FAILED");
    expect(result.safeErrorCodes).toContain(
      "ZATCA_DPAPI_RECEIVE_PROOF_CLEANUP_FAILED",
    );
    expect(result.cleanupReady).toBe(false);
    expect(await readdir(storageDirectory)).toEqual(["foreign-entry.txt"]);

    await rm(storageDirectory, { recursive: true, force: true });
  });

  it("does not delete a replacement directory after an ownership-swap race", async () => {
    const storageDirectory = await mkdtemp(disposableDirectoryPrefix());
    const displacedDirectory = `${storageDirectory}-displaced`;
    const foreignFile = join(storageDirectory, "foreign-entry.txt");
    let swapped = false;
    const baseProtector = reversibleTestProtector();
    const protector: SandboxLocalDpapiProtector = {
      protect: async (value) => {
        if (!swapped) {
          swapped = true;
          await rename(storageDirectory, displacedDirectory);
          await mkdir(storageDirectory);
          await writeFile(foreignFile, "foreign", "utf8");
        }
        return baseProtector.protect(value);
      },
      unprotect: (value) => baseProtector.unprotect(value),
    };

    const result = await __testOnlyProveSandboxDpapiReceiveCustodyReadiness({
      storageDirectory,
      environmentIdentity: "FATOORA_SIMULATION",
      processEnvironment: localTestProcessEnvironment(),
      protector,
    });

    expect(result.status).toBe("FAILED");
    expect(result.safeErrorCodes).toContain(
      "ZATCA_DPAPI_RECEIVE_PROOF_CLEANUP_FAILED",
    );
    expect(result.cleanupReady).toBe(false);
    expect(await readdir(storageDirectory)).toContain("foreign-entry.txt");

    await rm(storageDirectory, { recursive: true, force: true });
    await rm(displacedDirectory, { recursive: true, force: true });
  });

  it("rejects a symlink or junction without deleting its target", async () => {
    const targetDirectory = await mkdtemp(disposableDirectoryPrefix());
    const linkDirectory = `${targetDirectory}-link`;
    await symlink(
      targetDirectory,
      linkDirectory,
      process.platform === "win32" ? "junction" : "dir",
    );

    try {
      const result = await __testOnlyProveSandboxDpapiReceiveCustodyReadiness({
        storageDirectory: linkDirectory,
        environmentIdentity: "FATOORA_SIMULATION",
        processEnvironment: localTestProcessEnvironment(),
        protector: reversibleTestProtector(),
      });

      expect(result.status).toBe("FAILED");
      expect(result.safeErrorCodes).toEqual([
        "ZATCA_DPAPI_RECEIVE_PROOF_STORAGE_NOT_DISPOSABLE",
      ]);
      expect(result.cleanupReady).toBe(false);
      expect(await readdir(targetDirectory)).toEqual([]);
    } finally {
      await unlink(linkDirectory);
      await rm(targetDirectory, { recursive: true, force: true });
    }
  });

  (process.platform === "win32" ? it : it.skip)(
    "proves all three receive capabilities with current-user Windows DPAPI",
    async () => {
      const storageDirectory = await mkdtemp(disposableDirectoryPrefix());

      const result = await withProcessEnvironment(
        localTestProcessEnvironment(),
        () =>
          proveSandboxDpapiReceiveCustodyReadiness({
            storageDirectory,
            environmentIdentity: "FATOORA_SIMULATION",
          }),
      );

      expect(result.status).toBe("DPAPI_PROOF_PASSED");
      expect(result.actualDpapiUsed).toBe(true);
      expect(result.tokenReceiveReady).toBe(true);
      expect(result.secretReceiveReady).toBe(true);
      expect(result.certificateReceiveReady).toBe(true);
      expect(result.revokeReady).toBe(true);
      expect(result.deleteReady).toBe(true);
      expect(result.cleanupReady).toBe(true);
      expect(result.receiveCustodyReady).toBe(true);
      expect(result.ciphertextDiffersFromPlaintext).toBe(true);
      expect(result.systemBinaryPathsPinned).toBe(true);
      expect(result.childProcessEnvironmentScrubbed).toBe(true);
      expect(result.networkCallsMade).toBe(false);
      expect(result.networkIsolationProven).toBe(false);
      expect(result.sensitiveBodiesRetained).toBe(false);
      await expectMissing(storageDirectory);
    },
    30_000,
  );
});
