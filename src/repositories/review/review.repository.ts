import { Injectable, Logger } from "@nestjs/common";

import { ErrorCode } from "@/constants/error-codes";
import { publishedProductWhere } from "@/constants/product-visibility.constant";
import { OrderStatus, Prisma } from "@/generated/prisma/client";
import { createReviewSelect } from "@/selectors/review.selector";
import { PrismaService } from "@/shared/services/prisma.service";
import {
  isRecordNotFoundPrismaError,
  isUniqueConstraintPrismaError,
} from "@/shared/utils/prisma-error";
import throwHttpException from "@/shared/utils/throw-http-exception.util";

@Injectable()
export class ReviewRepository {
  private logger = new Logger(ReviewRepository.name);

  constructor(private readonly prismaService: PrismaService) {}

  /** Public listing (BR-R05) — callers must pass `productId` inside `where`. */
  async findManyReviews({
    where,
    take,
    skip,
    orderBy,
  }: Pick<Prisma.ReviewFindManyArgs, "where" | "take" | "skip" | "orderBy">) {
    try {
      const $reviews = this.prismaService.review.findMany({
        where,
        take,
        skip,
        orderBy,
        select: createReviewSelect(),
      });
      const $reviewsCount = this.prismaService.review.count({ where });

      const [reviewsCount, reviews] = await this.prismaService.$transaction([
        $reviewsCount,
        $reviews,
      ]);

      return { reviews, reviewsCount };
    } catch (error) {
      this.logger.error(error);

      throwHttpException({
        type: "internal",
        message: "Failed to fetch reviews.",
      });
    }
  }

  /** Product must be visible (published, non-deleted) to be reviewable. */
  async findVisibleProduct({ productId }: { productId: string }) {
    try {
      return await this.prismaService.product.findFirst({
        where: { id: productId, ...publishedProductWhere() },
        select: { id: true },
      });
    } catch (error) {
      this.logger.error(error);

      throwHttpException({
        type: "internal",
        message: "Failed to fetch product.",
      });
    }
  }

  /** BR-R01: one existence query against `Order.products` (connected at
   * checkout, phase 03) — never a walk through `ProductSKUSnapshot`, which
   * has no supporting index for this check. */
  async findDeliveredOrderForProduct({
    userId,
    productId,
  }: {
    userId: string;
    productId: string;
  }) {
    try {
      return await this.prismaService.order.findFirst({
        where: {
          userId,
          status: OrderStatus.DELIVERED,
          deletedAt: null,
          products: { some: { id: productId } },
        },
        select: { id: true },
      });
    } catch (error) {
      this.logger.error(error);

      throwHttpException({
        type: "internal",
        message: "Failed to fetch order.",
      });
    }
  }

  /** BR-R02: the `@@unique([userId, productId])` index is the authority — a
   * P2002 here is remapped to a 409, never a silent overwrite. */
  async createReview({
    userId,
    productId,
    rating,
    content,
  }: {
    userId: string;
    productId: string;
    rating: number;
    content: string;
  }) {
    try {
      return await this.prismaService.review.create({
        data: { userId, productId, rating, content },
        select: createReviewSelect(),
      });
    } catch (error) {
      this.logger.error(error);

      if (isUniqueConstraintPrismaError(error)) {
        throwHttpException({
          type: "conflict",
          code: ErrorCode.REVIEW_ALREADY_EXISTS,
          message: "You have already reviewed this product.",
        });
      }

      throwHttpException({
        type: "internal",
        message: "Failed to create review.",
      });
    }
  }

  /** Ownership baked into `where` (BR-R03) — a miss remaps P2025 to a 404. */
  async updateReview({
    reviewId,
    userId,
    rating,
    content,
  }: {
    reviewId: string;
    userId: string;
    rating?: number;
    content?: string;
  }) {
    try {
      return await this.prismaService.review.update({
        where: { id: reviewId, userId },
        data: { rating, content },
        select: createReviewSelect(),
      });
    } catch (error) {
      this.logger.error(error);

      if (isRecordNotFoundPrismaError(error)) {
        throwHttpException({
          type: "notFound",
          code: ErrorCode.REVIEW_NOT_FOUND,
          message: "Review not found.",
        });
      }

      throwHttpException({
        type: "internal",
        message: "Failed to update review.",
      });
    }
  }

  /** BR-R06: `Review` has no `deletedAt` — removal is always a hard delete. */
  async deleteReview({
    reviewId,
    userId,
  }: {
    reviewId: string;
    userId: string;
  }) {
    try {
      await this.prismaService.review.delete({
        where: { id: reviewId, userId },
      });

      return { message: "Review removed successfully." };
    } catch (error) {
      this.logger.error(error);

      if (isRecordNotFoundPrismaError(error)) {
        throwHttpException({
          type: "notFound",
          code: ErrorCode.REVIEW_NOT_FOUND,
          message: "Review not found.",
        });
      }

      throwHttpException({
        type: "internal",
        message: "Failed to remove review.",
      });
    }
  }
}
