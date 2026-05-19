import { createSingleFlight } from "./single-flight";

describe("createSingleFlight", () => {
  it("reuses one in-flight factory promise for concurrent callers", async () => {
    let callCount = 0;
    let resolveValue: (value: string) => void = () => undefined;
    const getValue = createSingleFlight(
      () =>
        new Promise<string>((resolve) => {
          callCount += 1;
          resolveValue = resolve;
        }),
    );

    const first = getValue();
    const second = getValue();
    resolveValue("ready");

    await expect(Promise.all([first, second])).resolves.toEqual(["ready", "ready"]);
    expect(callCount).toBe(1);
    await expect(getValue()).resolves.toBe("ready");
    expect(callCount).toBe(1);
  });

  it("clears the cached promise after a failed factory call", async () => {
    let callCount = 0;
    const getValue = createSingleFlight(async () => {
      callCount += 1;
      if (callCount === 1) {
        throw new Error("bootstrap failed");
      }
      return "ready";
    });

    await expect(getValue()).rejects.toThrow("bootstrap failed");
    await expect(getValue()).resolves.toBe("ready");
    expect(callCount).toBe(2);
  });
});
