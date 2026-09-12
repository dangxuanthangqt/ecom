import "reflect-metadata";

import { AUTHORIZATION_HEADER_KEY } from "@/constants/auth.constant";

import { ReviewController } from "../review.controller";

import {
  ACTIVE_USER_ID,
  containing,
  makeReviewResponse,
  PRODUCT_ID,
  ReviewControllerMocks,
  REVIEW_ID,
  setupReviewController,
} from "./review-controller-test-harness";

describe("ReviewController - getReviews", () => {
  let controller: ReviewController;
  let mocks: ReviewControllerMocks;

  beforeEach(async () => {
    ({ controller, mocks } = await setupReviewController());
  });

  it("is marked public (BR-R05) — no active user required", () => {
    // Read via `getOwnPropertyDescriptor` (never a bare property access) so
    // no unbound method reference is created — this only inspects decorator
    // metadata and never invokes the method.
    const descriptor = Object.getOwnPropertyDescriptor(
      ReviewController.prototype,
      "getReviews",
    );
    const metadata = Reflect.getMetadata(
      AUTHORIZATION_HEADER_KEY,
      descriptor?.value as object,
    ) as { authorizationTypes: string[] } | undefined;

    expect(metadata?.authorizationTypes).toEqual(["None"]);
  });

  it("passes the query through and wraps the result in a page", async () => {
    const review = makeReviewResponse();
    const response = {
      data: [review],
      pagination: { pageIndex: 1, pageSize: 10, totalPages: 1, totalItems: 1 },
    };
    mocks.reviewService.getReviews.mockResolvedValue(response);

    const query = { productId: PRODUCT_ID };

    const result = await controller.getReviews(query);

    expect(mocks.reviewService.getReviews).toHaveBeenCalledWith({ query });
    expect(result.data).toEqual([review]);
    expect(result.pagination).toEqual(response.pagination);
  });

  it("propagates service errors", async () => {
    const error = new Error("Database down");
    mocks.reviewService.getReviews.mockRejectedValue(error);

    await expect(controller.getReviews({ productId: PRODUCT_ID })).rejects.toBe(
      error,
    );
  });
});

describe("ReviewController - createReview", () => {
  let controller: ReviewController;
  let mocks: ReviewControllerMocks;

  beforeEach(async () => {
    ({ controller, mocks } = await setupReviewController());
  });

  it("passes the body and active user through to the service", async () => {
    const review = makeReviewResponse();
    mocks.reviewService.createReview.mockResolvedValue(review);

    const body = {
      productId: PRODUCT_ID,
      rating: 5,
      content: "Great product!",
    };

    const result = await controller.createReview(body, ACTIVE_USER_ID);

    expect(mocks.reviewService.createReview).toHaveBeenCalledWith(
      containing({ ...body, userId: ACTIVE_USER_ID }),
    );
    expect(result).toEqual(review);
  });

  it("propagates a 403 when the caller has no delivered order (BR-R01)", async () => {
    const error = Object.assign(new Error("forbidden"), { status: 403 });
    mocks.reviewService.createReview.mockRejectedValue(error);

    const body = {
      productId: PRODUCT_ID,
      rating: 5,
      content: "Great product!",
    };

    await expect(controller.createReview(body, ACTIVE_USER_ID)).rejects.toBe(
      error,
    );
  });

  it("propagates a 409 for a duplicate review (BR-R02)", async () => {
    const error = Object.assign(new Error("conflict"), { status: 409 });
    mocks.reviewService.createReview.mockRejectedValue(error);

    const body = {
      productId: PRODUCT_ID,
      rating: 5,
      content: "Great product!",
    };

    await expect(controller.createReview(body, ACTIVE_USER_ID)).rejects.toBe(
      error,
    );
  });
});

describe("ReviewController - updateReview", () => {
  let controller: ReviewController;
  let mocks: ReviewControllerMocks;

  beforeEach(async () => {
    ({ controller, mocks } = await setupReviewController());
  });

  it("passes reviewId, body, and active user through to the service", async () => {
    const review = makeReviewResponse({ rating: 4 });
    mocks.reviewService.updateReview.mockResolvedValue(review);

    const body = { rating: 4, content: "Still great!" };

    const result = await controller.updateReview(
      REVIEW_ID,
      body,
      ACTIVE_USER_ID,
    );

    expect(mocks.reviewService.updateReview).toHaveBeenCalledWith(
      containing({
        reviewId: REVIEW_ID,
        userId: ACTIVE_USER_ID,
        ...body,
      }),
    );
    expect(result).toEqual(review);
  });

  it("propagates a 404 for another user's review, never a 403 (BR-R03)", async () => {
    const error = Object.assign(new Error("not found"), { status: 404 });
    mocks.reviewService.updateReview.mockRejectedValue(error);

    const body = { rating: 4 };

    await expect(
      controller.updateReview(REVIEW_ID, body, ACTIVE_USER_ID),
    ).rejects.toBe(error);
  });
});

describe("ReviewController - deleteReview", () => {
  let controller: ReviewController;
  let mocks: ReviewControllerMocks;

  beforeEach(async () => {
    ({ controller, mocks } = await setupReviewController());
  });

  it("passes reviewId and active user through to the service", async () => {
    const result = { message: "Review removed successfully." };
    mocks.reviewService.deleteReview.mockResolvedValue(result);

    const response = await controller.deleteReview(REVIEW_ID, ACTIVE_USER_ID);

    expect(mocks.reviewService.deleteReview).toHaveBeenCalledWith({
      reviewId: REVIEW_ID,
      userId: ACTIVE_USER_ID,
    });
    expect(response).toEqual(result);
  });

  it("propagates a 404 for another user's review, never a 403 (BR-R03)", async () => {
    const error = Object.assign(new Error("not found"), { status: 404 });
    mocks.reviewService.deleteReview.mockRejectedValue(error);

    await expect(
      controller.deleteReview(REVIEW_ID, ACTIVE_USER_ID),
    ).rejects.toBe(error);
  });
});
