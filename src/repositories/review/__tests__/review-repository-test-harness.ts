import { Test } from "@nestjs/testing";

import { ReviewRepository } from "@/repositories/review/review.repository";
import { PrismaService } from "@/shared/services/prisma.service";

/**
 * Test doubles for every collaborator ReviewRepository depends on.
 * Only the methods ReviewRepository actually calls are stubbed.
 */
export const createReviewMocks = () => ({
  prismaService: {
    review: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    product: {
      findFirst: jest.fn(),
    },
    order: {
      findFirst: jest.fn(),
    },
    $transaction: jest.fn(),
  },
});

export type ReviewMocks = ReturnType<typeof createReviewMocks>;

/** Builds ReviewRepository through the Nest DI container with all deps mocked. */
export const buildReviewRepository = async (
  mocks: ReviewMocks,
): Promise<ReviewRepository> => {
  const moduleRef = await Test.createTestingModule({
    providers: [
      ReviewRepository,
      { provide: PrismaService, useValue: mocks.prismaService },
    ],
  }).compile();

  return moduleRef.get<ReviewRepository>(ReviewRepository);
};

/** Boilerplate for a fresh repository + mocks per test. */
export const setupReviewRepository = async () => {
  const mocks = createReviewMocks();
  const repository = await buildReviewRepository(mocks);

  return { mocks, repository };
};

export const REVIEW_ID = "11111111-1111-4111-8111-111111111111";
export const PRODUCT_ID = "22222222-2222-4222-8222-222222222222";
export const USER_ID = "33333333-3333-4333-8333-333333333333";
export const OTHER_USER_ID = "44444444-4444-4444-8444-444444444444";
export const ORDER_ID = "55555555-5555-4555-8555-555555555555";

/** A persisted review row as the repository returns it (selector-shaped). */
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
