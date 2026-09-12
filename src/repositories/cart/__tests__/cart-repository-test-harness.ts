import { Test } from "@nestjs/testing";

import { CartRepository } from "@/repositories/cart/cart.repository";
import { PrismaService } from "@/shared/services/prisma.service";

/**
 * Test doubles for every collaborator CartRepository depends on.
 * Only the methods CartRepository actually calls are stubbed.
 */
export const createCartMocks = () => ({
  prismaService: {
    cartItem: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    sKU: {
      findFirst: jest.fn(),
    },
    $transaction: jest.fn(),
  },
});

export type CartMocks = ReturnType<typeof createCartMocks>;

/** Builds CartRepository through the Nest DI container with all deps mocked. */
export const buildCartRepository = async (
  mocks: CartMocks,
): Promise<CartRepository> => {
  const moduleRef = await Test.createTestingModule({
    providers: [
      CartRepository,
      { provide: PrismaService, useValue: mocks.prismaService },
    ],
  }).compile();

  return moduleRef.get<CartRepository>(CartRepository);
};

/** Boilerplate for a fresh repository + mocks per test. */
export const setupCartRepository = async () => {
  const mocks = createCartMocks();
  const repository = await buildCartRepository(mocks);

  return { mocks, repository };
};

export const CART_ITEM_ID = "11111111-1111-4111-8111-111111111111";
export const SKU_ID = "22222222-2222-4222-8222-222222222222";
export const USER_ID = "33333333-3333-4333-8333-333333333333";
export const OTHER_USER_ID = "44444444-4444-4444-8444-444444444444";
export const PRODUCT_ID = "55555555-5555-4555-8555-555555555555";

/** A persisted cart item row as the repository returns it. */
export const makeCartItem = (overrides: Record<string, unknown> = {}) => ({
  id: CART_ITEM_ID,
  quantity: 2,
  createdAt: new Date("2026-09-01"),
  updatedAt: new Date("2026-09-01"),
  sku: {
    id: SKU_ID,
    order: 0,
    image: "https://example.com/sku.png",
    price: 19.99,
    stock: 10,
    value: "M",
    product: {
      id: PRODUCT_ID,
      name: "Test Product",
      publishedAt: new Date("2026-01-01"),
      deletedAt: null,
      createdById: "66666666-6666-4666-8666-666666666666",
    },
  },
  ...overrides,
});

/**
 * `expect.objectContaining` typed back to the shape it matches, so nesting one
 * matcher inside another stays free of `any` leaking into the assertion.
 */
export const containing = <T extends Record<string, unknown>>(shape: T): T =>
  expect.objectContaining(shape) as unknown as T;

/** `expect.any(Date)` typed as a Date, for the same reason as `containing`. */
export const anyDate = (): Date => expect.any(Date) as unknown as Date;

export const anyObject = (): Record<string, unknown> =>
  expect.any(Object) as unknown as Record<string, unknown>;
