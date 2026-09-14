import { ApiProperty } from "@nestjs/swagger";

/** One failed constraint on one field. */
export class ErrorDetailDto {
  @ApiProperty({
    example: "address.city",
    description:
      "Dotted path to the offending field. Nested DTO failures flatten into this path.",
  })
  field: string;

  @ApiProperty({
    example: "isNotEmpty",
    description:
      "The class-validator constraint name. Stable and never localized — branch on this, not on `message`.",
  })
  code: string;

  @ApiProperty({
    example: "city should not be empty",
    description: "Human-facing text for this one constraint.",
  })
  message: string;
}
