import { ReviewService } from "../review.service";

import {
  containing,
  makeReview,
  ORDER_ID,
  PRODUCT_ID,
  REVIEW_ID,
  ReviewServiceMocks,
  setupReviewService,
  USER_ID,
} from "./review-service-test-harness";

describe("ReviewService - createReview", () => {
  let service: ReviewService;
  let mocks: ReviewServiceMocks;

  beforeEach(async () => {
    ({ service, mocks } = await setupReviewService());
  });

  it("rejects with 404 when the product is not visible", async () => {
    mocks.reviewRepository.findVisibleProduct.mockResolvedValue(null);

    const promise = service.createReview({
      userId: USER_ID,
      productId: PRODUCT_ID,
      rating: 5,
      content: "Great product!",
    });

    await expect(promise).rejects.toMatchObject({ status: 404 });
    expect(
      mocks.reviewRepository.findDeliveredOrderForProduct,
    ).not.toHaveBeenCalled();
    expect(mocks.reviewRepository.createReview).not.toHaveBeenCalled();
  });

  it("rejects with 403 and writes nothing when there is no delivered order for the product (BR-R01)", async () => {
    mocks.reviewRepository.findVisibleProduct.mockResolvedValue({
      id: PRODUCT_ID,
    });
    mocks.reviewRepository.findDeliveredOrderForProduct.mockResolvedValue(null);

    const promise = service.createReview({
      userId: USER_ID,
      productId: PRODUCT_ID,
      rating: 5,
      content: "Great product!",
    });

    await expect(promise).rejects.toMatchObject({ status: 403 });
    expect(mocks.reviewRepository.createReview).not.toHaveBeenCalled();
  });

  it("creates the review once eligibility is confirmed", async () => {
    const review = makeReview();
    mocks.reviewRepository.findVisibleProduct.mockResolvedValue({
      id: PRODUCT_ID,
    });
    mocks.reviewRepository.findDeliveredOrderForProduct.mockResolvedValue({
      id: ORDER_ID,
    });
    mocks.reviewRepository.createReview.mockResolvedValue(review);

    const result = await service.createReview({
      userId: USER_ID,
      productId: PRODUCT_ID,
      rating: 5,
      content: "Great product!",
    });

    expect(result).toEqual(review);
    expect(mocks.reviewRepository.createReview).toHaveBeenCalledWith(
      containing({ userId: USER_ID, productId: PRODUCT_ID, rating: 5 }),
    );
  });

  it("propagates a 409 from a duplicate review (BR-R02)", async () => {
    mocks.reviewRepository.findVisibleProduct.mockResolvedValue({
      id: PRODUCT_ID,
    });
    mocks.reviewRepository.findDeliveredOrderForProduct.mockResolvedValue({
      id: ORDER_ID,
    });
    const error = Object.assign(new Error("conflict"), { status: 409 });
    mocks.reviewRepository.createReview.mockRejectedValue(error);

    const promise = service.createReview({
      userId: USER_ID,
      productId: PRODUCT_ID,
      rating: 5,
      content: "Great product!",
    });

    await expect(promise).rejects.toBe(error);
  });
});

describe("ReviewService - updateReview", () => {
  let service: ReviewService;
  let mocks: ReviewServiceMocks;

  beforeEach(async () => {
    ({ service, mocks } = await setupReviewService());
  });

  it("passes ownership through to the repository (BR-R03)", async () => {
    const review = makeReview({ rating: 4 });
    mocks.reviewRepository.updateReview.mockResolvedValue(review);

    const result = await service.updateReview({
      reviewId: REVIEW_ID,
      userId: USER_ID,
      rating: 4,
      content: "Great product!",
    });

    expect(result).toEqual(review);
    expect(mocks.reviewRepository.updateReview).toHaveBeenCalledWith(
      containing({ reviewId: REVIEW_ID, userId: USER_ID, rating: 4 }),
    );
  });

  it("propagates a 404 for a foreign review, never a 403 (BR-R03)", async () => {
    const error = Object.assign(new Error("not found"), { status: 404 });
    mocks.reviewRepository.updateReview.mockRejectedValue(error);

    const promise = service.updateReview({
      reviewId: REVIEW_ID,
      userId: USER_ID,
      rating: 4,
      content: "Great product!",
    });

    await expect(promise).rejects.toBe(error);
  });
});

describe("ReviewService - deleteReview", () => {
  let service: ReviewService;
  let mocks: ReviewServiceMocks;

  beforeEach(async () => {
    ({ service, mocks } = await setupReviewService());
  });

  it("passes ownership through to the repository (BR-R03) and hard-deletes (BR-R06)", async () => {
    const result = { message: "Review removed successfully." };
    mocks.reviewRepository.deleteReview.mockResolvedValue(result);

    const response = await service.deleteReview({
      reviewId: REVIEW_ID,
      userId: USER_ID,
    });

    expect(response).toEqual(result);
    expect(mocks.reviewRepository.deleteReview).toHaveBeenCalledWith({
      reviewId: REVIEW_ID,
      userId: USER_ID,
    });
  });

  it("propagates a 404 for a foreign review, never a 403 (BR-R03)", async () => {
    const error = Object.assign(new Error("not found"), { status: 404 });
    mocks.reviewRepository.deleteReview.mockRejectedValue(error);

    const promise = service.deleteReview({
      reviewId: REVIEW_ID,
      userId: USER_ID,
    });

    await expect(promise).rejects.toBe(error);
  });
});
