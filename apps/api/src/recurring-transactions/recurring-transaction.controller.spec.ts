import { PERMISSIONS } from "@ledgerbyte/shared";
import { REQUIRED_PERMISSIONS_KEY } from "../auth/decorators/require-permissions.decorator";
import { RecurringTransactionController } from "./recurring-transaction.controller";

function permissions(method: keyof RecurringTransactionController) {
  return Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, RecurringTransactionController.prototype[method]);
}

describe("RecurringTransactionController permissions", () => {
  it.each([
    ["list", PERMISSIONS.recurringTransactions.read],
    ["get", PERMISSIONS.recurringTransactions.read],
    ["runs", PERMISSIONS.recurringTransactions.read],
    ["run", PERMISSIONS.recurringTransactions.run],
    ["create", PERMISSIONS.recurringTransactions.manage],
    ["update", PERMISSIONS.recurringTransactions.manage],
    ["activate", PERMISSIONS.recurringTransactions.manage],
    ["pause", PERMISSIONS.recurringTransactions.manage],
    ["resume", PERMISSIONS.recurringTransactions.manage],
    ["archive", PERMISSIONS.recurringTransactions.manage],
    ["reviewExpenseProposal", PERMISSIONS.recurringTransactions.review],
    ["readiness", PERMISSIONS.recurringTransactions.read],
  ] as const)("protects %s with its dedicated permission", (method, permission) => {
    expect(permissions(method)).toEqual([permission]);
  });
});
