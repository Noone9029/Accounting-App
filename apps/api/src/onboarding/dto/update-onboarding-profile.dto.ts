import { IsIn, IsString } from "class-validator";
import { TYPED_ONBOARDING_ARCHETYPE_KEYS, type TypedOnboardingArchetypeKey } from "../onboarding.types";

export class UpdateOnboardingProfileDto {
  @IsString()
  @IsIn(TYPED_ONBOARDING_ARCHETYPE_KEYS)
  selectedArchetypeKey!: TypedOnboardingArchetypeKey;
}
