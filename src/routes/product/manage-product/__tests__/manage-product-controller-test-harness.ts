import { ScopeType } from "@/constants/permission.constant";

import type { ManageProductService } from "../manage-product.service";

/**
 * Test doubles for every collaborator ManageProductController depends on.
 * Only the methods ManageProductController actually calls are stubbed.
 */
export const createManageProductControllerMocks = () => ({
  manageProductService: {
    getProducts: jest.fn(),
    getProductById: jest.fn(),
    createProduct: jest.fn(),
    updateProduct: jest.fn(),
    deleteProduct: jest.fn(),
  },
});

export type ManageProductControllerMocks = ReturnType<
  typeof createManageProductControllerMocks
>;

/** Boilerplate for a fresh controller + mocks per test. */
export const setupManageProductController = async () => {
  const mocks = createManageProductControllerMocks();
  const { ManageProductController } = await import(
    "../manage-product.controller"
  );
  const controller = new ManageProductController(
    mocks.manageProductService as unknown as ManageProductService,
  );

  return { mocks, controller };
};

export const PRODUCT_ID = "11111111-1111-4111-8111-111111111111";
export const LANGUAGE_ID = "22222222-2222-4222-8222-222222222222";
export const ACTIVE_USER_ID = "33333333-3333-4333-8333-333333333333";
export const ADMIN_SCOPE: ScopeType = "any";
export const SELLER_SCOPE: ScopeType = "own";

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
  brandId: "44444444-4444-4444-8444-444444444444",
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
