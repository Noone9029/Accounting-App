export interface MoneyTotals {
  debitUnits: number;
  creditUnits: number;
  debit: string;
  credit: string;
  balanced: boolean;
}

export interface AmountLine {
  debit: string;
  credit: string;
}

export function parseDecimalToUnits(value: string, scale = 4): number {
  const trimmed = value.trim();
  if (!trimmed) {
    return 0;
  }

  const sign = trimmed.startsWith("-") ? -1 : 1;
  const unsigned = trimmed.replace(/^[+-]/, "");
  const [wholeRaw = "0", fractionRaw = ""] = unsigned.split(".");
  const whole = wholeRaw.replace(/\D/g, "") || "0";
  const fraction = fractionRaw.replace(/\D/g, "").padEnd(scale, "0").slice(0, scale);

  return sign * (Number.parseInt(whole, 10) * 10 ** scale + Number.parseInt(fraction || "0", 10));
}

export function formatUnits(units: number, scale = 4): string {
  const sign = units < 0 ? "-" : "";
  const absolute = Math.abs(units);
  const divisor = 10 ** scale;
  const whole = Math.floor(absolute / divisor);
  const fraction = String(absolute % divisor).padStart(scale, "0");

  return `${sign}${whole}.${fraction}`;
}

export function calculateTotals(lines: AmountLine[]): MoneyTotals {
  const debitUnits = lines.reduce((sum, line) => sum + parseDecimalToUnits(line.debit), 0);
  const creditUnits = lines.reduce((sum, line) => sum + parseDecimalToUnits(line.credit), 0);

  return {
    debitUnits,
    creditUnits,
    debit: formatUnits(debitUnits),
    credit: formatUnits(creditUnits),
    balanced: debitUnits === creditUnits && debitUnits > 0,
  };
}
