import { ReviewService } from "../review.service";

/**
 * Test doubles for every collaborator ReviewController depends on.
 * Only the methods ReviewController actually calls are stubbed.
 */
export const createReviewControllerMocks = () => ({
  reviewService: {
    getReviews: jest.fn(),
    createReview: jest.fn(),
    updateReview: jest.fn(),
    deleteReview: jest.fn(),
  },
});

export type ReviewControllerMocks = ReturnType<
  typeof createReviewControllerMocks
>;

/** Boilerplate for a fresh controller + mocks per test (bypasses the DI container). */
export const setupReviewController = async () => {
  const mocks = createReviewControllerMocks();
  const { ReviewController } = await import("../review.controller");
  const controller = new ReviewController(
    mocks.reviewService as unknown as ReviewService,
  );

  return { mocks, controller };
};

export const REVIEW_ID = "11111111-1111-4111-8111-111111111111";
export const PRODUCT_ID = "22222222-2222-4222-8222-222222222222";
export const ACTIVE_USER_ID = "33333333-3333-4333-8333-333333333333";

/** A review response as the service returns it. */
export const makeReviewResponse = (
  overrides: Record<string, unknown> = {},
) => ({
  id: REVIEW_ID,
  content: "Great product!",
  rating: 5,
  productId: PRODUCT_ID,
  userId: ACTIVE_USER_ID,
  createdAt: new Date("2026-09-01"),
  updatedAt: new Date("2026-09-01"),
  user: {
    id: ACTIVE_USER_ID,
    name: "Test Author",
    avatar: "https://example.com/avatar.png",
  },
  ...overrides,
});

/**
 * `expect.objectContaining` typed back to the shape it matches, so nesting one
 * matcher inside another stays free of `any` leaking into the assertion.
 */
export const containing = <T extends Record<string, unknown>>(shape: T): T =>
  expect.objectContaining(shape) as unknown as T;
