import { Prisma } from "@/generated/prisma/client";
import { ReviewRepository } from "@/repositories/review/review.repository";

import {
  containing,
  makeReview,
  ORDER_ID,
  OTHER_USER_ID,
  PRODUCT_ID,
  REVIEW_ID,
  ReviewMocks,
  setupReviewRepository,
  USER_ID,
} from "./review-repository-test-harness";

const notFoundError = () =>
  new Prisma.PrismaClientKnownRequestError("Record not found.", {
    code: "P2025",
    clientVersion: "6.0.0",
  });

const uniqueConstraintError = () =>
  new Prisma.PrismaClientKnownRequestError("Unique constraint failed.", {
    code: "P2002",
    clientVersion: "6.0.0",
  });

describe("ReviewRepository - findManyReviews", () => {
  it("lists reviews newest-first for the given where clause", async () => {
    const { repository, mocks } = await setupReviewRepository();
    const reviews = [makeReview()];
    mocks.prismaService.$transaction.mockResolvedValue([1, reviews]);

    const result = await repository.findManyReviews({
      where: { productId: PRODUCT_ID },
      take: 10,
      skip: 0,
      orderBy: { createdAt: "desc" },
    });

    expect(result).toEqual({ reviews, reviewsCount: 1 });
  });

  it("throws internal error on an unexpected database failure", async () => {
    const { repository, mocks } = await setupReviewRepository();
    mocks.prismaService.$transaction.mockRejectedValue(
      new Error("Database down"),
    );

    const promise = repository.findManyReviews({
      where: { productId: PRODUCT_ID },
      take: 10,
      skip: 0,
      orderBy: { createdAt: "desc" },
    });

    await expect(promise).rejects.toMatchObject({ status: 500 });
  });
});

describe("ReviewRepository - findVisibleProduct", () => {
  it("resolves a published, non-deleted product", async () => {
    const { repository, mocks } = await setupReviewRepository();
    mocks.prismaService.product.findFirst.mockResolvedValue({ id: PRODUCT_ID });

    const result = await repository.findVisibleProduct({
      productId: PRODUCT_ID,
    });

    expect(result).toEqual({ id: PRODUCT_ID });
    expect(mocks.prismaService.product.findFirst).toHaveBeenCalledWith(
      containing({
        where: containing({ id: PRODUCT_ID, deletedAt: null }),
      }),
    );
  });

  it("throws internal error on an unexpected database failure", async () => {
    const { repository, mocks } = await setupReviewRepository();
    mocks.prismaService.product.findFirst.mockRejectedValue(
      new Error("Database down"),
    );

    const promise = repository.findVisibleProduct({ productId: PRODUCT_ID });

    await expect(promise).rejects.toMatchObject({ status: 500 });
  });
});

describe("ReviewRepository - findDeliveredOrderForProduct", () => {
  it("queries a DELIVERED, non-deleted order connected to the product (BR-R01)", async () => {
    const { repository, mocks } = await setupReviewRepository();
    mocks.prismaService.order.findFirst.mockResolvedValue({ id: ORDER_ID });

    const result = await repository.findDeliveredOrderForProduct({
      userId: USER_ID,
      productId: PRODUCT_ID,
    });

    expect(result).toEqual({ id: ORDER_ID });
    expect(mocks.prismaService.order.findFirst).toHaveBeenCalledWith(
      containing({
        where: containing({
          userId: USER_ID,
          status: "DELIVERED",
          deletedAt: null,
          products: { some: { id: PRODUCT_ID } },
        }),
      }),
    );
  });

  it("throws internal error on an unexpected database failure", async () => {
    const { repository, mocks } = await setupReviewRepository();
    mocks.prismaService.order.findFirst.mockRejectedValue(
      new Error("Database down"),
    );

    const promise = repository.findDeliveredOrderForProduct({
      userId: USER_ID,
      productId: PRODUCT_ID,
    });

    await expect(promise).rejects.toMatchObject({ status: 500 });
  });
});

describe("ReviewRepository - createReview", () => {
  let repository: ReviewRepository;
  let mocks: ReviewMocks;

  beforeEach(async () => {
    ({ repository, mocks } = await setupReviewRepository());
  });

  it("creates a review for the caller", async () => {
    const review = makeReview();
    mocks.prismaService.review.create.mockResolvedValue(review);

    const result = await repository.createReview({
      userId: USER_ID,
      productId: PRODUCT_ID,
      rating: 5,
      content: "Great product!",
    });

    expect(result).toEqual(review);
    expect(mocks.prismaService.review.create).toHaveBeenCalledWith(
      containing({
        data: {
          userId: USER_ID,
          productId: PRODUCT_ID,
          rating: 5,
          content: "Great product!",
        },
      }),
    );
  });

  it("maps a unique constraint violation to a 409 (BR-R02, never a silent overwrite)", async () => {
    mocks.prismaService.review.create.mockRejectedValue(
      uniqueConstraintError(),
    );

    const promise = repository.createReview({
      userId: USER_ID,
      productId: PRODUCT_ID,
      rating: 5,
      content: "Great product!",
    });

    await expect(promise).rejects.toMatchObject({
      status: 409,
      response: { message: "You have already reviewed this product." },
    });
  });

  it("throws internal error on an unexpected database failure", async () => {
    mocks.prismaService.review.create.mockRejectedValue(
      new Error("Database down"),
    );

    const promise = repository.createReview({
      userId: USER_ID,
      productId: PRODUCT_ID,
      rating: 5,
      content: "Great product!",
    });

    await expect(promise).rejects.toMatchObject({ status: 500 });
  });
});

describe("ReviewRepository - updateReview", () => {
  it("updates by id and userId together (ownership baked into where, BR-R03)", async () => {
    const { repository, mocks } = await setupReviewRepository();
    const review = makeReview({ rating: 4 });
    mocks.prismaService.review.update.mockResolvedValue(review);

    const result = await repository.updateReview({
      reviewId: REVIEW_ID,
      userId: USER_ID,
      rating: 4,
      content: "Great product!",
    });

    expect(result).toEqual(review);
    expect(mocks.prismaService.review.update).toHaveBeenCalledWith(
      containing({
        where: { id: REVIEW_ID, userId: USER_ID },
        data: { rating: 4, content: "Great product!" },
      }),
    );
  });

  it("maps a record-not-found error to a 404, never a 403 (BR-R03)", async () => {
    const { repository, mocks } = await setupReviewRepository();
    mocks.prismaService.review.update.mockRejectedValue(notFoundError());

    const promise = repository.updateReview({
      reviewId: REVIEW_ID,
      userId: OTHER_USER_ID,
      rating: 4,
      content: "Great product!",
    });

    await expect(promise).rejects.toMatchObject({
      status: 404,
      response: { message: "Review not found." },
    });
  });

  it("throws internal error on an unexpected database failure", async () => {
    const { repository, mocks } = await setupReviewRepository();
    mocks.prismaService.review.update.mockRejectedValue(
      new Error("Database down"),
    );

    const promise = repository.updateReview({
      reviewId: REVIEW_ID,
      userId: USER_ID,
      rating: 4,
      content: "Great product!",
    });

    await expect(promise).rejects.toMatchObject({ status: 500 });
  });
});

describe("ReviewRepository - deleteReview", () => {
  it("hard-deletes the row (BR-R06: Review has no deletedAt)", async () => {
    const { repository, mocks } = await setupReviewRepository();
    mocks.prismaService.review.delete.mockResolvedValue(makeReview());

    const result = await repository.deleteReview({
      reviewId: REVIEW_ID,
      userId: USER_ID,
    });

    expect(result).toEqual({ message: "Review removed successfully." });
    expect(mocks.prismaService.review.delete).toHaveBeenCalledWith(
      containing({ where: { id: REVIEW_ID, userId: USER_ID } }),
    );
    expect(mocks.prismaService.review.update).not.toHaveBeenCalled();
  });

  it("maps a record-not-found error to a 404, never a 403 (BR-R03)", async () => {
    const { repository, mocks } = await setupReviewRepository();
    mocks.prismaService.review.delete.mockRejectedValue(notFoundError());

    const promise = repository.deleteReview({
      reviewId: REVIEW_ID,
      userId: OTHER_USER_ID,
    });

    await expect(promise).rejects.toMatchObject({
      status: 404,
      response: { message: "Review not found." },
    });
  });

  it("throws internal error on an unexpected database failure", async () => {
    const { repository, mocks } = await setupReviewRepository();
    mocks.prismaService.review.delete.mockRejectedValue(
      new Error("Database down"),
    );

    const promise = repository.deleteReview({
      reviewId: REVIEW_ID,
      userId: USER_ID,
    });

    await expect(promise).rejects.toMatchObject({ status: 500 });
  });
});
