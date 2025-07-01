import { ApiProperty } from "@nestjs/swagger";
import { Expose } from "class-transformer";

import { LanguageResponseDto } from "../language/language.dto";

export class ProductTranslationResponseDto {
  @ApiProperty({
    description: "The unique identifier of the product translation.",
    example: "123e4567-e89b-12d3-a456-426614174000",
    format: "uuid",
  })
  @Expose()
  id: string;

  @ApiProperty({
    description: "The name of the product in the specified language.",
    example: "Product Name",
  })
  @Expose()
  name: string;

  @ApiProperty({
    description: "The description of the product in the specified language.",
    example: "This is a product description.",
  })
  @Expose()
  description: string;

  @ApiProperty({
    description: "The language of the product translation.",
    type: () => LanguageResponseDto,
  })
  @Expose()
  language: LanguageResponseDto;
}
