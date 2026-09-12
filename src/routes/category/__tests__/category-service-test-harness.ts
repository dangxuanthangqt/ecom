import { Test } from "@nestjs/testing";

import { CategoryRepository } from "@/repositories/category/category.repository";

import { CategoryService } from "../category.service";

/**
 * Test doubles for every collaborator CategoryService depends on.
 * Only the methods CategoryService actually calls are stubbed.
 */
export const createCategoryServiceMocks = () => ({
  categoryRepository: {
    findAllCategories: jest.fn(),
    findCategoryById: jest.fn(),
    createCategory: jest.fn(),
    updateCategory: jest.fn(),
    deleteCategory: jest.fn(),
  },
});

export type CategoryServiceMocks = ReturnType<
  typeof createCategoryServiceMocks
>;

/** Builds CategoryService through the Nest DI container with all deps mocked. */
export const buildCategoryService = async (
  mocks: CategoryServiceMocks,
): Promise<CategoryService> => {
  const moduleRef = await Test.createTestingModule({
    providers: [
      CategoryService,
      {
        provide: CategoryRepository,
        useValue: mocks.categoryRepository,
      },
    ],
  }).compile();

  return moduleRef.get<CategoryService>(CategoryService);
};

/** Boilerplate for a fresh service + mocks per test. */
export const setupCategoryService = async () => {
  const mocks = createCategoryServiceMocks();
  const service = await buildCategoryService(mocks);

  return { mocks, service };
};

export const CATEGORY_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
export const LANGUAGE_ID = "en";
export const PARENT_CATEGORY_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
export const USER_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
export const TRANSLATION_ID = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";

/** A persisted category row as the repository returns it. */
export const makeCategory = (overrides: Record<string, unknown> = {}) => ({
  id: CATEGORY_ID,
  name: "Electronics",
  logo: "https://example.com/electronics.jpg",
  parentCategoryId: null,
  createdById: USER_ID,
  updatedById: null,
  deletedById: null,
  deletedAt: null,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
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
