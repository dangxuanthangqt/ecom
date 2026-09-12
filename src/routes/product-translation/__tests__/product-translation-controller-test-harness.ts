import { ProductTranslationService } from "../product-translation.service";

/**
 * Test doubles for every collaborator ProductTranslationController depends on.
 * Only the methods ProductTranslationController actually calls are stubbed.
 */
export const createProductTranslationControllerMocks = () => ({
  productTranslationService: {
    getProductTranslations: jest.fn(),
    getProductTranslationById: jest.fn(),
    createProductTranslation: jest.fn(),
    updateProductTranslation: jest.fn(),
    deleteProductTranslation: jest.fn(),
  },
});

export type ProductTranslationControllerMocks = ReturnType<
  typeof createProductTranslationControllerMocks
>;

/** Boilerplate for a fresh controller + mocks per test. */
export const setupProductTranslationController = async () => {
  const mocks = createProductTranslationControllerMocks();
  const { ProductTranslationController } = await import(
    "../product-translation.controller"
  );
  const controller = new ProductTranslationController(
    mocks.productTranslationService as any,
  );

  return { mocks, controller };
};

export const PRODUCT_TRANSLATION_ID = "11111111-1111-4111-8111-111111111111";
export const ACTIVE_USER_ID = "22222222-2222-4222-8222-222222222222";

/** A product translation response as the service returns it. */
export const makeProductTranslationResponse = (
  overrides: Record<string, unknown> = {},
) => ({
  id: PRODUCT_TRANSLATION_ID,
  productId: "33333333-3333-4333-8333-333333333333",
  languageId: "44444444-4444-4444-8444-444444444444",
  name: "Product Translation",
  description: "Test description",
  createdById: ACTIVE_USER_ID,
  updatedById: null,
  deletedAt: null,
  deletedById: null,
  createdAt: new Date("2025-09-01"),
  updatedAt: new Date("2025-09-01"),
  product: {},
  language: {},
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
