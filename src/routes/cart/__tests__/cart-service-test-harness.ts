import { Test } from "@nestjs/testing";

import { CartRepository } from "@/repositories/cart/cart.repository";

import { CartService } from "../cart.service";

/**
 * Test doubles for every collaborator CartService depends on.
 * Only the methods CartService actually calls are stubbed.
 */
export const createCartServiceMocks = () => ({
  cartRepository: {
    findManyCartItems: jest.fn(),
    findUniqueCartItem: jest.fn(),
    findAddableSku: jest.fn(),
    upsertCartItem: jest.fn(),
    updateCartItem: jest.fn(),
    deleteCartItem: jest.fn(),
  },
});

export type CartServiceMocks = ReturnType<typeof createCartServiceMocks>;

/** Builds CartService through the Nest DI container with all deps mocked. */
export const buildCartService = async (
  mocks: CartServiceMocks,
): Promise<CartService> => {
  const moduleRef = await Test.createTestingModule({
    providers: [
      CartService,
      { provide: CartRepository, useValue: mocks.cartRepository },
    ],
  }).compile();

  return moduleRef.get<CartService>(CartService);
};

/** Boilerplate for a fresh service + mocks per test. */
export const setupCartService = async () => {
  const mocks = createCartServiceMocks();
  const service = await buildCartService(mocks);

  return { mocks, service };
};

export const CART_ITEM_ID = "11111111-1111-4111-8111-111111111111";
export const SKU_ID = "22222222-2222-4222-8222-222222222222";
export const USER_ID = "33333333-3333-4333-8333-333333333333";
export const PRODUCT_ID = "55555555-5555-4555-8555-555555555555";

/** A cart item as CartRepository returns it (selector-shaped). */
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

/** An addable SKU as `findAddableSku` returns it. */
export const makeAddableSku = (overrides: Record<string, unknown> = {}) => ({
  id: SKU_ID,
  stock: 10,
  cartItems: [],
  ...overrides,
});

/**
 * `expect.objectContaining` typed back to the shape it matches, so nesting one
 * matcher inside another stays free of `any` leaking into the assertion.
 */
export const containing = <T extends Record<string, unknown>>(shape: T): T =>
  expect.objectContaining(shape) as unknown as T;

export const anyObject = (): Record<string, unknown> =>
  expect.any(Object) as unknown as Record<string, unknown>;
