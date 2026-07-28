import {
  createHash,
  createPublicKey,
  generateKeyPairSync,
} from "node:crypto";
import {
  link,
  mkdtemp,
  readFile,
  readdir,
  rm,
  rmdir,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  SandboxLocalDpapiComplianceCsidCustodyProvider,
  type SandboxLocalDpapiProtector,
} from "./compliance-csid-secret-custody.provider";

const organizationId = "11111111-1111-1111-1111-111111111111";
const egsUnitId = "22222222-2222-2222-2222-222222222222";
const referenceId = "sdk-csr-synthetic-private-key";
const reference = {
  organizationId,
  egsUnitId,
  referenceId,
  environment: "SANDBOX" as const,
};

function generateSyntheticSecp256k1Material() {
  const pair = generateKeyPairSync("ec", { namedCurve: "secp256k1" });
  const exported = pair.privateKey.export({ format: "pem", type: "sec1" });
  const privateKey = Buffer.from(exported);
  const publicKey = Buffer.from(
    createPublicKey(pair.privateKey).export({ format: "der", type: "spki" }),
  );
  return { privateKey, publicKey };
}

function reversibleProtector(
  onProtect?: (plaintext: Buffer) => void,
): SandboxLocalDpapiProtector {
  const prefix = Buffer.from("synthetic-protected:");
  return {
    protect: async (plaintext) => {
      onProtect?.(plaintext);
      return Buffer.concat([prefix, Buffer.from(plaintext)]);
    },
    unprotect: async (ciphertext) =>
      Buffer.from(ciphertext.subarray(prefix.length)),
  };
}

describe("sandbox SDK CSR private-key custody seam", () => {
  it.each([
    ["hardlink", link],
    ["symbolic link", symlink],
  ] as const)(
    "fails closed without overwriting an external file when the custody temp path is a pre-existing %s",
    async (_description, createLink) => {
      const storageDirectory = await mkdtemp(
        join(tmpdir(), "ledgerbyte-zatca-sdk-csr-custody-"),
      );
      const externalDirectory = await mkdtemp(
        join(tmpdir(), "ledgerbyte-zatca-sdk-csr-external-"),
      );
      const { privateKey, publicKey } =
        generateSyntheticSecp256k1Material();
      const provider =
        new SandboxLocalDpapiComplianceCsidCustodyProvider({
          environment: "LOCAL_TEST",
          storageDirectory,
          disposableStorage: true,
          protector: reversibleProtector(),
        });
      const referenceDigest = createHash("sha256")
        .update(
          `${organizationId}\u0000${egsUnitId}\u0000SANDBOX\u0000${referenceId}`,
        )
        .digest("hex");
      const externalPath = join(externalDirectory, "preserve.txt");
      const temporaryPath = join(
        storageDirectory,
        `${referenceDigest}.json.tmp`,
      );
      const preserved = "preserve-external-content";

      try {
        await writeFile(externalPath, preserved, "utf8");
        try {
          await createLink(externalPath, temporaryPath);
        } catch (error) {
          if (
            _description === "symbolic link" &&
            ["EPERM", "EACCES", "ENOSYS"].includes(
              (error as NodeJS.ErrnoException).code ?? "",
            )
          ) {
            return;
          }
          throw error;
        }

        await expect(
          provider.importSyntheticPrivateKeyForOperation({
            ...reference,
            privateKey,
          }),
        ).rejects.toThrow(
          "CSID secret custody provider operation failed",
        );
        expect(await readFile(externalPath, "utf8")).toBe(preserved);
      } finally {
        privateKey.fill(0);
        publicKey.fill(0);
        await rm(storageDirectory, { recursive: true, force: true });
        await rm(externalDirectory, { recursive: true, force: true });
      }
    },
  );

  it.each([
    ["hardlink", link],
    ["symbolic link", symlink],
  ] as const)(
    "rejects a post-publication custody entry replaced by an external %s without reading it as trusted material",
    async (_description, createLink) => {
      const storageDirectory = await mkdtemp(
        join(tmpdir(), "ledgerbyte-zatca-sdk-csr-custody-"),
      );
      const externalDirectory = await mkdtemp(
        join(tmpdir(), "ledgerbyte-zatca-sdk-csr-external-"),
      );
      const { privateKey, publicKey } =
        generateSyntheticSecp256k1Material();
      const unprotect = jest.fn(async (ciphertext: Buffer) =>
        Buffer.from(
          ciphertext.subarray(
            Buffer.byteLength("synthetic-protected:"),
          ),
        ),
      );
      const provider =
        new SandboxLocalDpapiComplianceCsidCustodyProvider({
          environment: "LOCAL_TEST",
          storageDirectory,
          disposableStorage: true,
          protector: {
            ...reversibleProtector(),
            unprotect,
          },
        });
      const referenceDigest = createHash("sha256")
        .update(
          `${organizationId}\u0000${egsUnitId}\u0000SANDBOX\u0000${referenceId}`,
        )
        .digest("hex");
      const targetPath = join(
        storageDirectory,
        `${referenceDigest}.json`,
      );
      const externalPath = join(externalDirectory, "preserve.json");

      try {
        await provider.importSyntheticPrivateKeyForOperation({
          ...reference,
          privateKey,
        });
        const storedCiphertext = await readFile(targetPath);
        await writeFile(externalPath, storedCiphertext);
        await rm(targetPath);
        try {
          await createLink(externalPath, targetPath);
        } catch (error) {
          storedCiphertext.fill(0);
          if (
            _description === "symbolic link" &&
            ["EPERM", "EACCES", "ENOSYS"].includes(
              (error as NodeJS.ErrnoException).code ?? "",
            )
          ) {
            return;
          }
          throw error;
        }
        const externalSnapshot = await readFile(externalPath);
        unprotect.mockClear();

        await expect(
          provider.deriveSpkiPublicKeyForOperation(reference),
        ).rejects.toThrow(
          "CSID secret custody provider operation failed",
        );
        expect(unprotect).not.toHaveBeenCalled();
        expect(
          (await readFile(externalPath)).equals(externalSnapshot),
        ).toBe(true);

        storedCiphertext.fill(0);
        externalSnapshot.fill(0);
      } finally {
        privateKey.fill(0);
        publicKey.fill(0);
        await rm(storageDirectory, { recursive: true, force: true });
        await rm(externalDirectory, { recursive: true, force: true });
      }
    },
  );

  it("imports only a Buffer into an explicitly disposable store and preserves fixed-purpose SPKI derivation", async () => {
    const storageDirectory = await mkdtemp(
      join(tmpdir(), "ledgerbyte-zatca-sdk-csr-custody-"),
    );
    const { privateKey, publicKey } = generateSyntheticSecp256k1Material();
    const callerSnapshot = Buffer.from(privateKey);
    let protectorPlaintext: Buffer | undefined;
    let protectedValue: Buffer | undefined;
    let unprotectedValue: Buffer | undefined;
    const prefix = Buffer.from("synthetic-protected:");
    const provider = new SandboxLocalDpapiComplianceCsidCustodyProvider({
      environment: "LOCAL_TEST",
      storageDirectory,
      disposableStorage: true,
      protector: {
        protect: async (plaintext) => {
          protectorPlaintext = plaintext;
          protectedValue = Buffer.concat([prefix, Buffer.from(plaintext)]);
          return protectedValue;
        },
        unprotect: async (ciphertext) => {
          unprotectedValue = Buffer.from(ciphertext.subarray(prefix.length));
          return unprotectedValue;
        },
      },
    });

    try {
      await expect(
        provider.importSyntheticPrivateKeyForOperation({
          ...reference,
          privateKey,
        }),
      ).resolves.toEqual(
        expect.objectContaining({
          provider: "SANDBOX_LOCAL_DPAPI",
          bodyReturned: false,
          productionCompliance: false,
        }),
      );

      expect(privateKey.equals(callerSnapshot)).toBe(true);
      expect(protectorPlaintext).toBeDefined();
      expect(protectorPlaintext?.every((value) => value === 0)).toBe(true);
      expect(protectedValue?.every((value) => value === 0)).toBe(true);

      const custodyPublicKey =
        await provider.deriveSpkiPublicKeyForOperation(reference);
      expect(custodyPublicKey.equals(publicKey)).toBe(true);
      expect(unprotectedValue?.every((value) => value === 0)).toBe(true);
      custodyPublicKey.fill(0);

      const [storedName] = await readdir(storageDirectory);
      const storedCiphertext = await readFile(
        join(storageDirectory, storedName!),
        "utf8",
      );
      expect(storedCiphertext).not.toContain("BEGIN EC PRIVATE KEY");

      privateKey.fill(0);
      expect(privateKey.every((value) => value === 0)).toBe(true);
    } finally {
      privateKey.fill(0);
      callerSnapshot.fill(0);
      publicKey.fill(0);
      await rm(storageDirectory, { recursive: true, force: true });
    }
  });

  it("zeros its internal copy when protection fails while leaving the caller-owned Buffer available for caller cleanup", async () => {
    const storageDirectory = await mkdtemp(
      join(tmpdir(), "ledgerbyte-zatca-sdk-csr-custody-"),
    );
    const { privateKey, publicKey } = generateSyntheticSecp256k1Material();
    const callerSnapshot = Buffer.from(privateKey);
    let protectorPlaintext: Buffer | undefined;
    const provider = new SandboxLocalDpapiComplianceCsidCustodyProvider({
      environment: "LOCAL_TEST",
      storageDirectory,
      disposableStorage: true,
      protector: {
        protect: async (plaintext) => {
          protectorPlaintext = plaintext;
          throw new Error("synthetic protector failure with sensitive detail");
        },
        unprotect: async () => Buffer.alloc(0),
      },
    });

    try {
      await expect(
        provider.importSyntheticPrivateKeyForOperation({
          ...reference,
          privateKey,
        }),
      ).rejects.toThrow("CSID secret custody provider operation failed");
      expect(privateKey.equals(callerSnapshot)).toBe(true);
      expect(protectorPlaintext?.every((value) => value === 0)).toBe(true);
    } finally {
      privateKey.fill(0);
      callerSnapshot.fill(0);
      publicKey.fill(0);
      await rm(storageDirectory, { recursive: true, force: true });
    }
  });

  it("rejects non-secp256k1 material and refuses the fixed-purpose import on a non-disposable provider", async () => {
    const storageDirectory = await mkdtemp(
      join(tmpdir(), "ledgerbyte-zatca-sdk-csr-custody-"),
    );
    const rsaPair = generateKeyPairSync("rsa", { modulusLength: 2048 });
    const rsaPrivateKey = Buffer.from(
      rsaPair.privateKey.export({ format: "pem", type: "pkcs8" }),
    );
    const { privateKey, publicKey } = generateSyntheticSecp256k1Material();
    const protect = jest.fn(async (plaintext: Buffer) =>
      Buffer.from(plaintext),
    );
    const nonDisposableProvider =
      new SandboxLocalDpapiComplianceCsidCustodyProvider({
        environment: "LOCAL_TEST",
        storageDirectory,
        protector: { protect, unprotect: async (value) => Buffer.from(value) },
      });
    const disposableProvider =
      new SandboxLocalDpapiComplianceCsidCustodyProvider({
        environment: "LOCAL_TEST",
        storageDirectory,
        disposableStorage: true,
        protector: { protect, unprotect: async (value) => Buffer.from(value) },
      });

    try {
      await expect(
        nonDisposableProvider.importSyntheticPrivateKeyForOperation({
          ...reference,
          privateKey,
        }),
      ).rejects.toThrow("CSID secret custody provider operation failed");
      await expect(
        nonDisposableProvider.assertDisposableStoreEmptyForOperation(),
      ).rejects.toThrow("CSID secret custody provider operation failed");
      await expect(
        disposableProvider.importSyntheticPrivateKeyForOperation({
          ...reference,
          privateKey: rsaPrivateKey,
        }),
      ).rejects.toThrow("CSID secret custody provider operation failed");
      await expect(
        disposableProvider.importSyntheticPrivateKeyForOperation({
          ...reference,
          privateKey: "not-a-buffer" as never,
        }),
      ).rejects.toThrow("CSID secret custody provider operation failed");
      expect(protect).not.toHaveBeenCalled();
    } finally {
      privateKey.fill(0);
      publicKey.fill(0);
      rsaPrivateKey.fill(0);
      await rm(storageDirectory, { recursive: true, force: true });
    }
  });

  it("strictly proves a disposable store is empty and propagates missing-directory and leftover-file failures", async () => {
    const storageDirectory = await mkdtemp(
      join(tmpdir(), "ledgerbyte-zatca-sdk-csr-custody-"),
    );
    const { privateKey, publicKey } = generateSyntheticSecp256k1Material();
    const provider = new SandboxLocalDpapiComplianceCsidCustodyProvider({
      environment: "LOCAL_TEST",
      storageDirectory,
      disposableStorage: true,
      protector: reversibleProtector(),
    });

    try {
      await expect(
        provider.assertDisposableStoreEmptyForOperation(),
      ).resolves.toBe(true);

      await provider.importSyntheticPrivateKeyForOperation({
        ...reference,
        privateKey,
      });
      await expect(
        provider.assertDisposableStoreEmptyForOperation(),
      ).rejects.toThrow("CSID secret custody provider operation failed");

      await provider.revokeReference(reference);
      await provider.deleteReference(reference);
      await expect(
        provider.assertDisposableStoreEmptyForOperation(),
      ).resolves.toBe(true);

      await writeFile(join(storageDirectory, "orphan.tmp"), "synthetic");
      await expect(
        provider.assertDisposableStoreEmptyForOperation(),
      ).rejects.toThrow("CSID secret custody provider operation failed");
      await rm(join(storageDirectory, "orphan.tmp"));

      await rmdir(storageDirectory);
      await expect(
        provider.assertDisposableStoreEmptyForOperation(),
      ).rejects.toThrow("CSID secret custody provider operation failed");
    } finally {
      privateKey.fill(0);
      publicKey.fill(0);
      await rm(storageDirectory, { recursive: true, force: true });
    }
  });

  it("does not add a plaintext read or arbitrary plaintext callback surface", async () => {
    const storageDirectory = await mkdtemp(
      join(tmpdir(), "ledgerbyte-zatca-sdk-csr-custody-"),
    );
    const provider = new SandboxLocalDpapiComplianceCsidCustodyProvider({
      environment: "LOCAL_TEST",
      storageDirectory,
      disposableStorage: true,
      protector: reversibleProtector(),
    });

    try {
      expect(
        (
          provider as unknown as {
            readSyntheticPrivateKeyForOperation?: unknown;
            withSyntheticPrivateKeyPlaintext?: unknown;
            withSecretPlaintext?: unknown;
          }
        ).readSyntheticPrivateKeyForOperation,
      ).toBeUndefined();
      expect(
        (
          provider as unknown as {
            withSyntheticPrivateKeyPlaintext?: unknown;
          }
        ).withSyntheticPrivateKeyPlaintext,
      ).toBeUndefined();
      expect(
        (
          provider as unknown as {
            withSecretPlaintext?: unknown;
          }
        ).withSecretPlaintext,
      ).toBeUndefined();
    } finally {
      await rm(storageDirectory, { recursive: true, force: true });
    }
  });
});
