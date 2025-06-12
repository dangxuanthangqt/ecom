import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { Expose } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Length,
} from "class-validator";

import { BrandTranslationWithLanguageResponseDto } from "../brand-translation/brand-translation.dto";

export class BaseBrandResponseDto {
  @ApiProperty({
    description: "Unique identifier for the brand",
    example: "123e4567-e89b-12d3-a456-426614174000",
    format: "uuid",
  })
  @Expose()
  id: string;

  @ApiProperty({
    description: "URL to the brand's logo image",
    example: "https://example.com/logos/brand-logo.png",
    format: "url",
    type: String,
  })
  @Expose()
  logo: string;

  @ApiProperty({
    description: "Name of the brand",
    example: "Brand Name",
    type: String,
  })
  @Expose()
  name: string;

  constructor(data?: BaseBrandResponseDto) {
    if (data) Object.assign(this, data);
  }
}

export class BrandItemResponseDto extends BaseBrandResponseDto {
  @ApiProperty({
    description: "Translations of the brand in different languages",
    type: [BrandTranslationWithLanguageResponseDto],
  })
  @Expose()
  brandTranslations: BrandTranslationWithLanguageResponseDto[];

  constructor(data?: BrandItemResponseDto) {
    super(data);
    if (data) Object.assign(this, data);
  }
}

export class BrandRequestDto {
  @ApiProperty({
    description: "URL to the brand's logo image",
    example: "https://example.com/logos/brand-logo.png",
    type: String,
  })
  @IsString()
  @IsUrl({}, { message: "Logo must be a valid URL" })
  logo: string;

  @ApiProperty({
    description: "Name of the brand",
    example: "Brand Name",
    type: String,
  })
  @IsString()
  @Length(1, 100, {
    message: "Brand name must be between 1 and 100 characters",
  })
  name: string;

  @ApiPropertyOptional({
    description: "brandTranslationIds",
    example: [
      "123e4567-e89b-12d3-a456-426614174000",
      "223e4567-e89b-12d3-a456-426614174001",
    ],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsUUID("4", {
    each: true,
    message: "Permissions must be an array of valid UUIDs",
  })
  brandTranslationIds?: string[];
}

export class CreateBrandRequestDto extends BrandRequestDto {}

export class UpdateBrandRequestDto extends PartialType(BrandRequestDto) {}

export class CreateBrandResponseDto extends BaseBrandResponseDto {
  @ApiProperty({
    description: "Translations of the brand in different languages",
    type: [BrandTranslationWithLanguageResponseDto],
  })
  @Expose()
  brandTranslations: BrandTranslationWithLanguageResponseDto[];

  constructor(data: BaseBrandResponseDto) {
    super();

    Object.assign(this, data);
  }
}

export class UpdateBrandResponseDto extends BaseBrandResponseDto {
  @ApiProperty({
    description: "Translations of the brand in different languages",
    type: [BrandTranslationWithLanguageResponseDto],
  })
  @Expose()
  brandTranslations: BrandTranslationWithLanguageResponseDto[];

  constructor(data: BaseBrandResponseDto) {
    super();
    Object.assign(this, data);
  }
}

export class DeleteBrandRequestDto {
  @ApiPropertyOptional({
    description: "Whether to hard delete the brand",
    example: false,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  isHardDelete?: boolean;
}

export class DeleteBrandResponseDto {
  @ApiProperty({
    description: "Message indicating the result of the deletion",
    example: "Brand deleted successfully",
  })
  @Expose()
  message: string;
  constructor(data: DeleteBrandResponseDto) {
    Object.assign(this, data);
  }
}

export class BrandIdParamDto {
  @ApiProperty({
    description: "Unique identifier for the brand",
    example: "123e4567-e89b-12d3-a456-426614174000",
    format: "uuid",
  })
  @IsString()
  @IsUUID("4", { message: "Brand ID must be a valid UUID" })
  id: string;
}
