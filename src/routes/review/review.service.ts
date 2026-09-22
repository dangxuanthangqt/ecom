import { Injectable } from "@nestjs/common";
import { Review as ReviewSchema, User as UserSchema } from "@prisma/client";

import { ErrorCode } from "@/constants/error-codes";
import { ReviewPaginationQueryDto } from "@/dtos/review/review.dto";
import { ReviewRepository } from "@/repositories/review/review.repository";
import throwHttpException from "@/shared/utils/throw-http-exception.util";

@Injectable()
export class ReviewService {
  constructor(private readonly reviewRepository: ReviewRepository) {}

  /** BR-R05: public, newest-first, scoped to one product. */
  async getReviews({ query }: { query: ReviewPaginationQueryDto }) {
    const { productId, page = 1, pageSize = 10 } = query;
    const skip = (page - 1) * pageSize;
    const take = pageSize;

    const { reviews, reviewsCount } =
      await this.reviewRepository.findManyReviews({
        where: { productId },
        take,
        skip,
        orderBy: { createdAt: "desc" },
      });

    const totalPages = Math.ceil(reviewsCount / pageSize);

    return {
      data: reviews,
      pagination: {
        page,
        pageSize,
        totalPages,
        totalItems: reviewsCount,
      },
    };
  }

  /**
   * Sequenced to produce the spec's exact status codes: product invisible
   * (404) → not eligible (BR-R01, 403) → duplicate (BR-R02, 409 from the DB
   * unique constraint, remapped by the repository).
   */
  async createReview({
    userId,
    productId,
    rating,
    content,
  }: {
    userId: UserSchema["id"];
    productId: ReviewSchema["productId"];
    rating: number;
    content: string;
  }) {
    const product = await this.reviewRepository.findVisibleProduct({
      productId,
    });

    if (!product) {
      throwHttpException({
        type: "notFound",
        code: ErrorCode.PRODUCT_NOT_FOUND,
        message: "Product not found.",
      });
    }

    const deliveredOrder =
      await this.reviewRepository.findDeliveredOrderForProduct({
        userId,
        productId,
      });

    if (!deliveredOrder) {
      throwHttpException({
        type: "forbidden",
        code: ErrorCode.REVIEW_NOT_PURCHASED,
        message: "You can only review a product you have received.",
      });
    }

    return this.reviewRepository.createReview({
      userId,
      productId,
      rating,
      content,
    });
  }

  /** BR-R03: ownership is enforced in the repository's `where` clause. */
  async updateReview({
    reviewId,
    userId,
    rating,
    content,
  }: {
    reviewId: ReviewSchema["id"];
    userId: UserSchema["id"];
    rating?: number;
    content?: string;
  }) {
    return this.reviewRepository.updateReview({
      reviewId,
      userId,
      rating,
      content,
    });
  }

  /** BR-R03 (ownership) and BR-R06 (hard delete) — enforced in the repository. */
  async deleteReview({
    reviewId,
    userId,
  }: {
    reviewId: ReviewSchema["id"];
    userId: UserSchema["id"];
  }) {
    return this.reviewRepository.deleteReview({ reviewId, userId });
  }
}
