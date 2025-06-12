import { ApiProperty } from "@nestjs/swagger";
import { Expose } from "class-transformer";

import { LanguageResponseDto } from "../language/language.dto";

export class BaseBrandTranslationDto {
  @ApiProperty({
    description: "Unique identifier for the brand translation",
    example: "123e4567-e89b-12d3-a456-426614174000",
    format: "uuid",
  })
  @Expose()
  id: string;

  @ApiProperty({
    description: "Language code for the translation",
    example: "en",
  })
  @Expose()
  name: string;

  @ApiProperty({
    description: "Name of the brand in the specified language",
    example: "Brand Name",
  })
  @Expose()
  description: string;

  constructor(data?: BaseBrandTranslationDto) {
    if (data) Object.assign(this, data);
  }
}

export class BrandTranslationWithLanguageResponseDto extends BaseBrandTranslationDto {
  @ApiProperty({
    description: "Language details for the translation",
    type: LanguageResponseDto,
  })
  @Expose()
  language: LanguageResponseDto;

  constructor(data: BrandTranslationWithLanguageResponseDto) {
    super(data);
    Object.assign(this, data);
  }
}
