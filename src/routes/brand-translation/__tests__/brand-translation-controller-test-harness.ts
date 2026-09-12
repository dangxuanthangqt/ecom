import { BrandTranslationService } from "../brand-translation.service";

/**
 * Test doubles for every collaborator BrandTranslationController depends on.
 * Only the methods BrandTranslationController actually calls are stubbed.
 */
export const createBrandTranslationControllerMocks = () => ({
  brandTranslationService: {
    getBrandTranslations: jest.fn(),
    getBrandTranslationById: jest.fn(),
    createBrandTranslation: jest.fn(),
    updateBrandTranslation: jest.fn(),
    deleteBrandTranslation: jest.fn(),
  },
});

export type BrandTranslationControllerMocks = ReturnType<
  typeof createBrandTranslationControllerMocks
>;

/** Boilerplate for a fresh controller + mocks per test. */
export const setupBrandTranslationController = async () => {
  const mocks = createBrandTranslationControllerMocks();
  const { BrandTranslationController } = await import(
    "../brand-translation.controller"
  );
  const controller = new BrandTranslationController(
    mocks.brandTranslationService as any,
  );

  return { mocks, controller };
};

export const BRAND_TRANSLATION_ID = "11111111-1111-4111-8111-111111111111";
export const ACTIVE_USER_ID = "22222222-2222-4222-8222-222222222222";

/** A brand translation response as the service returns it. */
export const makeBrandTranslationResponse = (
  overrides: Record<string, unknown> = {},
) => ({
  id: BRAND_TRANSLATION_ID,
  brandId: "33333333-3333-4333-8333-333333333333",
  languageId: "44444444-4444-4444-8444-444444444444",
  name: "Brand Translation",
  description: "Test description",
  createdById: ACTIVE_USER_ID,
  updatedById: null,
  deletedAt: null,
  deletedById: null,
  createdAt: new Date("2025-09-01"),
  updatedAt: new Date("2025-09-01"),
  brand: {},
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
