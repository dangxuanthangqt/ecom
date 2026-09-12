import {
  ApiProperty,
  ApiPropertyOptional,
  IntersectionType,
  PartialType,
  PickType,
} from "@nestjs/swagger";
import { Expose, Type } from "class-transformer";
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from "class-validator";

import { PaginationQueryDto } from "@/dtos/shared/pagination.dto";

import { ReviewOrderByFields, ReviewOrderByFieldsType } from "./constant";

export class ReviewAuthorResponseDto {
  @ApiProperty({
    description: "Unique identifier of the review author",
    format: "uuid",
  })
  @Expose()
  id: string;

  @ApiProperty({ description: "Display name of the review author" })
  @Expose()
  name: string;

  @ApiProperty({
    description: "Avatar URL of the review author",
    nullable: true,
  })
  @Expose()
  avatar: string | null;

  constructor(data?: ReviewAuthorResponseDto) {
    if (data) Object.assign(this, data);
  }
}

export class BaseReviewResponseDto {
  @ApiProperty({
    description: "Unique identifier of the review",
    format: "uuid",
  })
  @Expose()
  id: string;

  @ApiProperty({ description: "Review text content" })
  @Expose()
  content: string;

  @ApiProperty({ description: "Rating from 1 to 5", minimum: 1, maximum: 5 })
  @Expose()
  rating: number;

  @ApiProperty({ description: "Reviewed product identifier", format: "uuid" })
  @Expose()
  productId: string;

  @ApiProperty({ description: "Review author identifier", format: "uuid" })
  @Expose()
  userId: string;

  @ApiProperty({ description: "When the review was created" })
  @Expose()
  createdAt: Date;

  @ApiProperty({ description: "When the review was last updated" })
  @Expose()
  updatedAt: Date;

  constructor(data?: BaseReviewResponseDto) {
    if (data) Object.assign(this, data);
  }
}

export class ReviewWithAuthorResponseDto extends BaseReviewResponseDto {
  @ApiProperty({ type: ReviewAuthorResponseDto })
  @Expose()
  @Type(() => ReviewAuthorResponseDto)
  user: ReviewAuthorResponseDto;

  constructor(data?: ReviewWithAuthorResponseDto) {
    super(data);
    if (data) Object.assign(this, data);
  }
}

export class CreateReviewRequestDto {
  @ApiProperty({ description: "The product being reviewed", format: "uuid" })
  @IsUUID("4", { message: "Product ID must be a valid UUID." })
  productId: string;

  @ApiProperty({
    description: "Rating from 1 to 5",
    example: 5,
    minimum: 1,
    maximum: 5,
  })
  @IsInt({ message: "Rating must be an integer." })
  @Min(1, { message: "Rating must be at least 1." })
  @Max(5, { message: "Rating must be at most 5." })
  rating: number;

  @ApiProperty({
    description: "Review text content",
    example: "Great product!",
  })
  @IsString({ message: "Content must be a string." })
  @IsNotEmpty({ message: "Content must not be empty." })
  content: string;
}

export class UpdateReviewRequestDto extends PartialType(
  PickType(CreateReviewRequestDto, ["rating", "content"] as const),
) {}

export class ReviewQueryDto {
  @ApiProperty({
    description: "The product to list reviews for",
    format: "uuid",
  })
  @IsUUID("4", { message: "Product ID must be a valid UUID." })
  productId: string;
}

export class ReviewPaginationQueryDto extends IntersectionType(
  PaginationQueryDto,
  ReviewQueryDto,
) {
  @ApiPropertyOptional({
    description: "Field to order by",
    example: ReviewOrderByFields.CREATED_AT,
    enum: Object.values(ReviewOrderByFields),
  })
  @IsIn(Object.values(ReviewOrderByFields), {
    message: `orderBy must be one of: ${Object.values(ReviewOrderByFields).join(", ")}`,
  })
  @IsOptional()
  orderBy?: ReviewOrderByFieldsType;
}

export class DeleteReviewResponseDto {
  @ApiProperty({ example: "Review removed successfully." })
  @Expose()
  message: string;

  constructor(data: DeleteReviewResponseDto) {
    Object.assign(this, data);
  }
}
