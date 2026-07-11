import { AccountType } from "@prisma/client";

export const FX_ACCOUNT_READINESS_ACCOUNT_SELECT = {
  id: true,
  code: true,
  name: true,
  type: true,
  isActive: true,
  allowPosting: true,
} as const;

export const FX_ACCOUNT_READINESS_CONFIG_INCLUDE = {
  realizedGainAccount: { select: FX_ACCOUNT_READINESS_ACCOUNT_SELECT },
  realizedLossAccount: { select: FX_ACCOUNT_READINESS_ACCOUNT_SELECT },
  unrealizedGainAccount: { select: FX_ACCOUNT_READINESS_ACCOUNT_SELECT },
  unrealizedLossAccount: { select: FX_ACCOUNT_READINESS_ACCOUNT_SELECT },
} as const;

type ReadinessAccount = {
  code?: string;
  type: AccountType;
  isActive: boolean;
  allowPosting: boolean;
} | null;

export interface FxAccountReadinessInput {
  configuration: {
    realizedGainAccount: ReadinessAccount;
    realizedLossAccount: ReadinessAccount;
    unrealizedGainAccount: ReadinessAccount;
    unrealizedLossAccount: ReadinessAccount;
  } | null;
  controlAccounts: ReadinessAccount[];
}

export function evaluateFxAccountReadiness(input: FxAccountReadinessInput) {
  const configuration = input.configuration;
  const accountConfigurationComplete = Boolean(
    configuration &&
      readyAccount(configuration.realizedGainAccount, AccountType.REVENUE) &&
      readyAccount(configuration.realizedLossAccount, AccountType.EXPENSE) &&
      readyAccount(configuration.unrealizedGainAccount, AccountType.REVENUE) &&
      readyAccount(configuration.unrealizedLossAccount, AccountType.EXPENSE),
  );
  const controlAccountsComplete =
    input.controlAccounts.some((account) => account?.code === "120" && readyAccount(account, AccountType.ASSET)) &&
    input.controlAccounts.some((account) => account?.code === "210" && readyAccount(account, AccountType.LIABILITY));
  return { accountConfigurationComplete, controlAccountsComplete };
}

function readyAccount(account: ReadinessAccount, expectedType: AccountType): boolean {
  return Boolean(account && account.type === expectedType && account.isActive && account.allowPosting);
}
