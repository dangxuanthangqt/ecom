import { Test } from "@nestjs/testing";

import { ReviewRepository } from "@/repositories/review/review.repository";

import { ReviewService } from "../review.service";

/**
 * Test doubles for every collaborator ReviewService depends on.
 * Only the methods ReviewService actually calls are stubbed.
 */
export const createReviewServiceMocks = () => ({
  reviewRepository: {
    findManyReviews: jest.fn(),
    findVisibleProduct: jest.fn(),
    findDeliveredOrderForProduct: jest.fn(),
    createReview: jest.fn(),
    updateReview: jest.fn(),
    deleteReview: jest.fn(),
  },
});

export type ReviewServiceMocks = ReturnType<typeof createReviewServiceMocks>;

/** Builds ReviewService through the Nest DI container with all deps mocked. */
export const buildReviewService = async (
  mocks: ReviewServiceMocks,
): Promise<ReviewService> => {
  const moduleRef = await Test.createTestingModule({
    providers: [
      ReviewService,
      { provide: ReviewRepository, useValue: mocks.reviewRepository },
    ],
  }).compile();

  return moduleRef.get<ReviewService>(ReviewService);
};

/** Boilerplate for a fresh service + mocks per test. */
export const setupReviewService = async () => {
  const mocks = createReviewServiceMocks();
  const service = await buildReviewService(mocks);

  return { mocks, service };
};

export const REVIEW_ID = "11111111-1111-4111-8111-111111111111";
export const PRODUCT_ID = "22222222-2222-4222-8222-222222222222";
export const USER_ID = "33333333-3333-4333-8333-333333333333";
export const ORDER_ID = "55555555-5555-4555-8555-555555555555";

/** A review as ReviewRepository returns it (selector-shaped). */
export const makeReview = (overrides: Record<string, unknown> = {}) => ({
  id: REVIEW_ID,
  content: "Great product!",
  rating: 5,
  productId: PRODUCT_ID,
  userId: USER_ID,
  createdAt: new Date("2026-09-01"),
  updatedAt: new Date("2026-09-01"),
  user: {
    id: USER_ID,
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
