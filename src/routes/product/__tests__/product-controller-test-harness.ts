import { ProductService } from "../product.service";

/**
 * Test doubles for every collaborator ProductController depends on.
 * Only the methods ProductController actually calls are stubbed.
 */
export const createProductControllerMocks = () => ({
  productService: {
    getProducts: jest.fn(),
    getProductById: jest.fn(),
  },
});

export type ProductControllerMocks = ReturnType<
  typeof createProductControllerMocks
>;

/** Boilerplate for a fresh controller + mocks per test. */
export const setupProductController = async () => {
  const mocks = createProductControllerMocks();
  const { ProductController } = await import("../product.controller");
  const controller = new ProductController(mocks.productService as any);

  return { mocks, controller };
};

export const PRODUCT_ID = "11111111-1111-4111-8111-111111111111";
export const LANGUAGE_ID = "22222222-2222-4222-8222-222222222222";

/** A product response as the service returns it. */
export const makeProductResponse = (
  overrides: Record<string, unknown> = {},
) => ({
  id: PRODUCT_ID,
  name: "Test Product",
  description: "Test description",
  sku: "SKU123",
  price: 100,
  quantity: 10,
  isPublic: true,
  brandId: "33333333-3333-4333-8333-333333333333",
  createdAt: new Date("2025-09-01"),
  updatedAt: new Date("2025-09-01"),
  deletedAt: null,
  productTranslations: [],
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

export const stringContaining = (substring: string): string =>
  expect.stringContaining(substring) as unknown as string;

export const anyObject = (): Record<string, unknown> =>
  expect.any(Object) as unknown as Record<string, unknown>;
