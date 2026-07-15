import { Decimal } from "decimal.js";

const MONEY_SCALE = 4;

export interface FixedAssetRuleInput {
  baseAcquisitionCost: Decimal;
  baseSalvageValue: Decimal;
  usefulLifeMonths: number;
}

export interface ScheduleLineRuleResult {
  periodStart: Date;
  periodEnd: Date;
  depreciationDate: Date;
  openingCarryingAmount: string;
  depreciationAmount: string;
  accumulatedDepreciationAfter: string;
  closingCarryingAmount: string;
}

export function validateFixedAssetInput(input: FixedAssetRuleInput): void {
  if (!input.baseAcquisitionCost.isFinite() || input.baseAcquisitionCost.lte(0)) {
    throw new Error("Acquisition cost must be greater than zero.");
  }
  if (!input.baseSalvageValue.isFinite() || input.baseSalvageValue.lt(0)) {
    throw new Error("Salvage value cannot be negative.");
  }
  if (input.baseSalvageValue.gt(input.baseAcquisitionCost)) {
    throw new Error("Salvage value cannot exceed acquisition cost.");
  }
  if (!Number.isInteger(input.usefulLifeMonths) || input.usefulLifeMonths <= 0) {
    throw new Error("Useful life must be a positive whole number of months.");
  }
}

export function buildStraightLineSchedule(input: FixedAssetRuleInput & { inServiceDate: Date }): ScheduleLineRuleResult[] {
  validateFixedAssetInput(input);
  const acquisitionCost = money(input.baseAcquisitionCost);
  const salvageValue = money(input.baseSalvageValue);
  let accumulatedDepreciation = new Decimal(0);
  let carryingAmount = acquisitionCost;
  const depreciableResidual = acquisitionCost.minus(salvageValue);
  if (depreciableResidual.lte(0)) {
    return [];
  }

  const monthlyAmount = depreciableResidual.div(input.usefulLifeMonths).toDecimalPlaces(MONEY_SCALE, Decimal.ROUND_HALF_UP);
  const firstDepreciationDate = firstDayOfMonth(addMonths(input.inServiceDate, 1));
  const lines: ScheduleLineRuleResult[] = [];

  for (let index = 0; index < input.usefulLifeMonths; index += 1) {
    const depreciationDate = firstDayOfMonth(addMonths(firstDepreciationDate, index));
    const periodStart = depreciationDate;
    const periodEnd = lastDayOfMonth(depreciationDate);
    const openingCarryingAmount = carryingAmount;
    const remaining = depreciableResidual.minus(accumulatedDepreciation);
    const depreciationAmount = Decimal.min(monthlyAmount, remaining).toDecimalPlaces(MONEY_SCALE, Decimal.ROUND_HALF_UP);
    accumulatedDepreciation = accumulatedDepreciation.plus(depreciationAmount).toDecimalPlaces(MONEY_SCALE, Decimal.ROUND_HALF_UP);
    carryingAmount = Decimal.max(salvageValue, acquisitionCost.minus(accumulatedDepreciation)).toDecimalPlaces(MONEY_SCALE, Decimal.ROUND_HALF_UP);

    lines.push({
      periodStart,
      periodEnd,
      depreciationDate,
      openingCarryingAmount: fixed(openingCarryingAmount),
      depreciationAmount: fixed(depreciationAmount),
      accumulatedDepreciationAfter: fixed(accumulatedDepreciation),
      closingCarryingAmount: fixed(carryingAmount),
    });

    if (remaining.lte(0) || carryingAmount.eq(salvageValue)) {
      break;
    }
  }

  return lines;
}

export function calculateDisposal(input: {
  baseAcquisitionCost: Decimal;
  accumulatedDepreciation: Decimal;
  proceeds: Decimal;
}): { carryingAmount: string; gain: string; loss: string } {
  const carryingAmount = money(input.baseAcquisitionCost.minus(input.accumulatedDepreciation));
  const result = money(input.proceeds.minus(carryingAmount));
  return {
    carryingAmount: fixed(carryingAmount),
    gain: fixed(Decimal.max(0, result)),
    loss: fixed(Decimal.max(0, result.negated())),
  };
}

function money(value: Decimal): Decimal {
  return value.toDecimalPlaces(MONEY_SCALE, Decimal.ROUND_HALF_UP);
}

function fixed(value: Decimal): string {
  return money(value).toFixed(MONEY_SCALE);
}

function addMonths(value: Date, months: number): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + months, value.getUTCDate()));
}

function firstDayOfMonth(value: Date): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), 1));
}

function lastDayOfMonth(value: Date): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + 1, 0));
}
