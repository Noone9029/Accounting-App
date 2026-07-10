import { BadRequestException, ValidationPipe } from "@nestjs/common";
import { UpdateProjectDto } from "./dto/update-project.dto";

describe("UpdateProjectDto validation", () => {
  const validationPipe = new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
  });

  function validateUpdate(payload: Record<string, unknown>) {
    return validationPipe.transform(payload, { type: "body", metatype: UpdateProjectDto });
  }

  it.each(["code", "name", "status"])("rejects null %s with an HTTP 400 validation error", async (field) => {
    const error = await validateUpdate({ [field]: null }).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(BadRequestException);
    expect((error as BadRequestException).getStatus()).toBe(400);
  });

  it("keeps description nullable so it can be cleared", async () => {
    await expect(validateUpdate({ description: null })).resolves.toMatchObject({ description: null });
  });
});
