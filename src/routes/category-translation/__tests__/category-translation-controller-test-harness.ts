import type { CategoryTranslationService } from "../category-translation.service";

/**
 * Test doubles for every collaborator CategoryTranslationController depends on.
 * Only the methods CategoryTranslationController actually calls are stubbed.
 */
export const createCategoryTranslationControllerMocks = () => ({
  categoryTranslationService: {
    getCategoryTranslations: jest.fn(),
    getCategoryTranslationById: jest.fn(),
    createCategoryTranslation: jest.fn(),
    updateCategoryTranslation: jest.fn(),
    deleteCategoryTranslation: jest.fn(),
  },
});

export type CategoryTranslationControllerMocks = ReturnType<
  typeof createCategoryTranslationControllerMocks
>;

/** Boilerplate for a fresh controller + mocks per test. */
export const setupCategoryTranslationController = async () => {
  const mocks = createCategoryTranslationControllerMocks();
  const { CategoryTranslationController } = await import(
    "../category-translation.controller"
  );
  const controller = new CategoryTranslationController(
    mocks.categoryTranslationService as unknown as CategoryTranslationService,
  );

  return { mocks, controller };
};

export const CATEGORY_TRANSLATION_ID = "11111111-1111-4111-8111-111111111111";
export const ACTIVE_USER_ID = "22222222-2222-4222-8222-222222222222";

/** A category translation response as the service returns it. */
export const makeCategoryTranslationResponse = (
  overrides: Record<string, unknown> = {},
) => ({
  id: CATEGORY_TRANSLATION_ID,
  categoryId: "33333333-3333-4333-8333-333333333333",
  languageId: "44444444-4444-4444-8444-444444444444",
  name: "Category Translation",
  description: "Test description",
  createdById: ACTIVE_USER_ID,
  updatedById: null,
  deletedAt: null,
  deletedById: null,
  createdAt: new Date("2025-09-01"),
  updatedAt: new Date("2025-09-01"),
  category: {},
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
