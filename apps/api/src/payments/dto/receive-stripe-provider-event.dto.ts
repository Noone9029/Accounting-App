import { IsObject, IsOptional, IsString } from "class-validator";

export class ReceiveStripeProviderEventDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  type!: string;

  @IsOptional()
  @IsObject()
  data?: Record<string, unknown>;
}
