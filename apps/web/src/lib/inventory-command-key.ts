/** Persist only a digest and random key, so retrying after a lost response cannot duplicate stock. */
export async function inventoryCommandKey(scope: string, payload: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify({ scope, payload }));
  const digest = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)), (byte) => byte.toString(16).padStart(2, "0")).join("");
  const storageKey = `ledgerbyte:inventory-command:${digest}`;
  const existing = sessionStorage.getItem(storageKey);
  if (existing) return existing;
  const key = crypto.randomUUID();
  sessionStorage.setItem(storageKey, key);
  return key;
}

export function completeInventoryCommandKey(key: string) {
  for (let index = sessionStorage.length - 1; index >= 0; index -= 1) {
    const name = sessionStorage.key(index);
    if (name?.startsWith("ledgerbyte:inventory-command:") && sessionStorage.getItem(name) === key) sessionStorage.removeItem(name);
  }
}
