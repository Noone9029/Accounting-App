import { PERMISSIONS } from "@ledgerbyte/shared";
import { REQUIRED_PERMISSIONS_KEY } from "../auth/decorators/require-permissions.decorator";
import { NumberSequenceController } from "./number-sequence.controller";

describe("NumberSequenceController permissions", () => {
  it("requires view permission for list and detail", () => {
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, NumberSequenceController.prototype.list)).toEqual([
      PERMISSIONS.numberSequences.view,
    ]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, NumberSequenceController.prototype.get)).toEqual([
      PERMISSIONS.numberSequences.view,
    ]);
  });

  it("requires manage permission for update", () => {
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, NumberSequenceController.prototype.update)).toEqual([
      PERMISSIONS.numberSequences.manage,
    ]);
  });
});
