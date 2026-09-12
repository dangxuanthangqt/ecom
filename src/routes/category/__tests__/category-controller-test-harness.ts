import type { CategoryService } from "../category.service";

/**
 * Test doubles for every collaborator CategoryController depends on.
 * Only the methods CategoryController actually calls are stubbed.
 */
export const createCategoryControllerMocks = () => ({
  categoryService: {
    getAllCategories: jest.fn(),
    getCategoryById: jest.fn(),
    createCategory: jest.fn(),
    updateCategory: jest.fn(),
    deleteCategory: jest.fn(),
  },
});

export type CategoryControllerMocks = ReturnType<
  typeof createCategoryControllerMocks
>;

/** Boilerplate for a fresh controller + mocks per test. */
export const setupCategoryController = async () => {
  const mocks = createCategoryControllerMocks();
  const { CategoryController } = await import("../category.controller");
  const controller = new CategoryController(
    mocks.categoryService as unknown as CategoryService,
  );

  return { mocks, controller };
};

export const CATEGORY_ID = "11111111-1111-4111-8111-111111111111";
export const LANGUAGE_ID = "22222222-2222-4222-8222-222222222222";
export const ACTIVE_USER_ID = "33333333-3333-4333-8333-333333333333";

/** A category response as the service returns it. */
export const makeCategoryResponse = (
  overrides: Record<string, unknown> = {},
) => ({
  id: CATEGORY_ID,
  name: "Test Category",
  description: "Test description",
  icon: "folder",
  parentCategoryId: null,
  createdById: ACTIVE_USER_ID,
  updatedById: null,
  deletedAt: null,
  deletedById: null,
  createdAt: new Date("2025-09-01"),
  updatedAt: new Date("2025-09-01"),
  children: [],
  categoryTranslations: [],
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
