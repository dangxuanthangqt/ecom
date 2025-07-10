import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Expose } from "class-transformer";
import { IsBoolean, IsIn, IsOptional, IsString, Length } from "class-validator";

import { PaginationQueryDto } from "../shared/pagination.dto";

import { LanguageOrderByFields, LanguageOrderByFieldsType } from "./constants";

export class LanguagePaginationQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: "Field to order by",
    example: LanguageOrderByFields.CREATED_AT,
    enum: Object.values(LanguageOrderByFields),
  })
  @IsIn(Object.values(LanguageOrderByFields), {
    message: `orderBy must be one of: ${Object.values(LanguageOrderByFields).join(", ")}`,
  })
  @IsOptional()
  orderBy?: LanguageOrderByFieldsType;
}

export class LanguageCreateRequestDto {
  @ApiProperty({
    description: "Language name",
    example: "English",
    minLength: 2,
    maxLength: 500,
  })
  @IsString()
  @Length(2, 500, {
    message: "Language name must be between 2 and 500 characters.",
  })
  name: string;

  @ApiProperty({
    description: "Language code (ISO 639-1)",
    example: "en",
    minLength: 2,
    maxLength: 2,
  })
  @IsString()
  @Length(2, 2, { message: "Language code must be exactly 2 characters." })
  id: string;
}

export class LanguageUpdateRequestDto {
  @ApiProperty({
    description: "Language name",
    example: "Vietnamese",
    minLength: 2,
    maxLength: 500,
  })
  @IsString()
  @Length(2, 500, {
    message: "Language name must be between 2 and 500 characters.",
  })
  name: string;
}

export class LanguageDeleteRequestDto {
  @ApiPropertyOptional({
    description: "Whether to hard delete the language",
    example: false,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  isHardDelete?: boolean;
}

export class LanguageResponseDto {
  @ApiProperty({
    description: "Language code (ISO 639-1)",
    example: "en",
  })
  @Expose()
  id: string;

  @ApiProperty({
    description: "Language name",
    example: "English",
  })
  @Expose()
  name: string;

  constructor(partial: Partial<LanguageResponseDto>) {
    Object.assign(this, partial);
  }
}

export class LanguageIdParamDto {
  @ApiProperty({
    description: "Language ID (ISO 639-1)",
    example: "en",
    minLength: 2,
    maxLength: 2,
  })
  @IsString()
  @Length(2, 2, { message: "Language ID must be exactly 2 characters long." })
  id: string;
}

export class LanguageCreateResponseDto extends LanguageResponseDto {
  constructor(partial: Partial<LanguageCreateResponseDto>) {
    super(partial);
  }
}

export class LanguageUpdateResponseDto extends LanguageResponseDto {
  constructor(partial: Partial<LanguageUpdateResponseDto>) {
    super(partial);
  }
}

export class LanguageDeleteResponseDto extends LanguageResponseDto {
  constructor(partial: Partial<LanguageDeleteResponseDto>) {
    super(partial);
  }
}
