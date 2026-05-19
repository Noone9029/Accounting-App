export const createSingleFlight = <T>(factory: () => Promise<T>): (() => Promise<T>) => {
  let cachedPromise: Promise<T> | null = null;

  return () => {
    cachedPromise ??= factory().catch((error: unknown) => {
      cachedPromise = null;
      throw error;
    });
    return cachedPromise;
  };
};
