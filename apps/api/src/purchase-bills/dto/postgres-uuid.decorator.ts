import { Matches, type ValidationOptions } from "class-validator";

const POSTGRES_UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function IsPostgresUuid(validationOptions?: ValidationOptions): PropertyDecorator {
  return Matches(POSTGRES_UUID_PATTERN, {
    message: "$property must be a PostgreSQL UUID",
    ...validationOptions,
  });
}
