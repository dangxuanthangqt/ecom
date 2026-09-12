import { ReviewService } from "../review.service";

import {
  containing,
  makeReview,
  PRODUCT_ID,
  ReviewServiceMocks,
  setupReviewService,
} from "./review-service-test-harness";

describe("ReviewService - getReviews", () => {
  let service: ReviewService;
  let mocks: ReviewServiceMocks;

  beforeEach(async () => {
    ({ service, mocks } = await setupReviewService());
  });

  it("scopes the query to the requested product", async () => {
    mocks.reviewRepository.findManyReviews.mockResolvedValue({
      reviews: [],
      reviewsCount: 0,
    });

    await service.getReviews({ query: { productId: PRODUCT_ID } });

    expect(mocks.reviewRepository.findManyReviews).toHaveBeenCalledWith(
      containing({ where: { productId: PRODUCT_ID } }),
    );
  });

  it("applies pagination defaults (pageIndex 1, pageSize 10) and newest-first order", async () => {
    mocks.reviewRepository.findManyReviews.mockResolvedValue({
      reviews: [],
      reviewsCount: 0,
    });

    await service.getReviews({ query: { productId: PRODUCT_ID } });

    expect(mocks.reviewRepository.findManyReviews).toHaveBeenCalledWith(
      containing({ take: 10, skip: 0, orderBy: { createdAt: "desc" } }),
    );
  });

  it("computes skip from a custom pageIndex/pageSize", async () => {
    mocks.reviewRepository.findManyReviews.mockResolvedValue({
      reviews: [],
      reviewsCount: 0,
    });

    await service.getReviews({
      query: { productId: PRODUCT_ID, pageIndex: 3, pageSize: 20 },
    });

    expect(mocks.reviewRepository.findManyReviews).toHaveBeenCalledWith(
      containing({ take: 20, skip: 40 }),
    );
  });

  it("returns paginated reviews with computed totalPages", async () => {
    const reviews = [makeReview()];
    mocks.reviewRepository.findManyReviews.mockResolvedValue({
      reviews,
      reviewsCount: 25,
    });

    const result = await service.getReviews({
      query: { productId: PRODUCT_ID, pageIndex: 1, pageSize: 10 },
    });

    expect(result).toEqual({
      data: reviews,
      pagination: {
        pageIndex: 1,
        pageSize: 10,
        totalPages: 3,
        totalItems: 25,
      },
    });
  });

  it("propagates repository errors", async () => {
    const error = new Error("Database down");
    mocks.reviewRepository.findManyReviews.mockRejectedValue(error);

    const promise = service.getReviews({ query: { productId: PRODUCT_ID } });

    await expect(promise).rejects.toBe(error);
  });
});
