import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
} from "@nestjs/common";
import { ApiParam, ApiTags } from "@nestjs/swagger";

import {
  CreateReviewRequestDto,
  DeleteReviewResponseDto,
  ReviewPaginationQueryDto,
  ReviewWithAuthorResponseDto,
  UpdateReviewRequestDto,
} from "@/dtos/review/review.dto";
import { PageDto } from "@/dtos/shared/page.dto";
import {
  Review as ReviewSchema,
  User as UserSchema,
} from "@/generated/prisma/client";
import ActiveUser from "@/shared/param-decorators/active-user.decorator";
import { IsPublicApi } from "@/shared/param-decorators/auth-api.decorator";
import {
  ApiAuth,
  ApiPageOkResponse,
} from "@/shared/param-decorators/http-decorator";
import { RequirePermission } from "@/shared/param-decorators/require-permission.decorator";

import { ReviewService } from "./review.service";

@ApiTags("Reviews")
@Controller("reviews")
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @ApiPageOkResponse({
    type: ReviewWithAuthorResponseDto,
    description: "Retrieve reviews for one product, newest first.",
    summary: "Get reviews",
    isPublic: true,
  })
  @IsPublicApi()
  @Get()
  async getReviews(
    @Query() query: ReviewPaginationQueryDto,
  ): Promise<PageDto<ReviewWithAuthorResponseDto>> {
    const result = await this.reviewService.getReviews({ query });

    return new PageDto<ReviewWithAuthorResponseDto>(result);
  }

  @ApiAuth({
    type: ReviewWithAuthorResponseDto,
    options: {
      summary: "Create a review",
      description:
        "Creates a review for a delivered order's product (BR-R01). One review per product per user (BR-R02).",
    },
  })
  @RequirePermission("review:create:own")
  @Post()
  async createReview(
    @Body() body: CreateReviewRequestDto,
    @ActiveUser("userId") userId: UserSchema["id"],
  ): Promise<ReviewWithAuthorResponseDto> {
    const result = await this.reviewService.createReview({
      productId: body.productId,
      rating: body.rating,
      content: body.content,
      userId,
    });

    return new ReviewWithAuthorResponseDto(result);
  }

  @ApiAuth({
    type: ReviewWithAuthorResponseDto,
    options: {
      summary: "Edit own review",
      description:
        "Edits one own review. Another user's review is a 404 (BR-R03).",
    },
  })
  @ApiParam({
    name: "reviewId",
    description: "The unique identifier of the review to update.",
    format: "uuid",
  })
  @RequirePermission("review:update:own")
  @Put(":reviewId")
  async updateReview(
    @Param("reviewId", ParseUUIDPipe) reviewId: ReviewSchema["id"],
    @Body() body: UpdateReviewRequestDto,
    @ActiveUser("userId") userId: UserSchema["id"],
  ): Promise<ReviewWithAuthorResponseDto> {
    const result = await this.reviewService.updateReview({
      reviewId,
      rating: body.rating,
      content: body.content,
      userId,
    });

    return new ReviewWithAuthorResponseDto(result);
  }

  @ApiAuth({
    type: DeleteReviewResponseDto,
    options: {
      summary: "Delete own review",
      description:
        "Removes one own review. Another user's review is a 404 (BR-R03).",
    },
  })
  @ApiParam({
    name: "reviewId",
    description: "The unique identifier of the review to remove.",
    format: "uuid",
  })
  @RequirePermission("review:delete:own")
  @Delete(":reviewId")
  async deleteReview(
    @Param("reviewId", ParseUUIDPipe) reviewId: ReviewSchema["id"],
    @ActiveUser("userId") userId: UserSchema["id"],
  ): Promise<DeleteReviewResponseDto> {
    const result = await this.reviewService.deleteReview({
      reviewId,
      userId,
    });

    return new DeleteReviewResponseDto(result);
  }
}
