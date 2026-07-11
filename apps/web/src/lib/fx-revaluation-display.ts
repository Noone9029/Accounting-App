const MONEY_SCALE = 4;
const MONEY_PATTERN = /^(-?)(\d+)(?:\.(\d{1,4}))?$/;

function toScaledInteger(value: string): bigint {
  const match = MONEY_PATTERN.exec(value.trim());
  if (!match) throw new Error("FX money evidence must be an exact decimal with at most four fractional places.");
  const [, sign, whole, fraction = ""] = match;
  const scaled = BigInt(`${whole}${fraction.padEnd(MONEY_SCALE, "0")}`);
  return sign === "-" ? -scaled : scaled;
}

function fromScaledInteger(value: bigint): string {
  const zero = BigInt(0);
  const sign = value < zero ? "-" : "";
  const digits = (value < zero ? -value : value).toString().padStart(MONEY_SCALE + 1, "0");
  return `${sign}${digits.slice(0, -MONEY_SCALE)}.${digits.slice(-MONEY_SCALE)}`;
}

export function exactFxMoney(value: string): string {
  return fromScaledInteger(toScaledInteger(value));
}

export function formatFxMoney(currency: string, value: string): string {
  return `${currency} ${exactFxMoney(value)}`;
}

export function sumFxMoney(values: readonly string[]): string {
  return fromScaledInteger(values.reduce((total, value) => total + toScaledInteger(value), BigInt(0)));
}
