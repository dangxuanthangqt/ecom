import { CartService } from "../cart.service";

/**
 * Test doubles for every collaborator CartController depends on.
 * Only the methods CartController actually calls are stubbed.
 */
export const createCartControllerMocks = () => ({
  cartService: {
    getCartItems: jest.fn(),
    addCartItem: jest.fn(),
    updateCartItemQuantity: jest.fn(),
    deleteCartItem: jest.fn(),
  },
});

export type CartControllerMocks = ReturnType<typeof createCartControllerMocks>;

/** Boilerplate for a fresh controller + mocks per test (bypasses the DI container). */
export const setupCartController = async () => {
  const mocks = createCartControllerMocks();
  const { CartController } = await import("../cart.controller");
  const controller = new CartController(
    mocks.cartService as unknown as CartService,
  );

  return { mocks, controller };
};

export const CART_ITEM_ID = "11111111-1111-4111-8111-111111111111";
export const SKU_ID = "22222222-2222-4222-8222-222222222222";
export const ACTIVE_USER_ID = "33333333-3333-4333-8333-333333333333";

/** A cart item response as the service returns it. */
export const makeCartItemResponse = (
  overrides: Record<string, unknown> = {},
) => ({
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
    product: { id: "product-id", name: "Test Product" },
  },
  ...overrides,
});

/**
 * `expect.objectContaining` typed back to the shape it matches, so nesting one
 * matcher inside another stays free of `any` leaking into the assertion.
 */
export const containing = <T extends Record<string, unknown>>(shape: T): T =>
  expect.objectContaining(shape) as unknown as T;
