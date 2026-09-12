import { Test } from "@nestjs/testing";

import { CategoryTranslationRepository } from "@/repositories/category-translation/category-translation.repository";

import { CategoryTranslationService } from "../category-translation.service";

/**
 * Test doubles for every collaborator CategoryTranslationService depends on.
 * Only the methods CategoryTranslationService actually calls are stubbed.
 */
export const createCategoryTranslationServiceMocks = () => ({
  categoryTranslationRepository: {
    findManyCategoryTranslations: jest.fn(),
    findUniqueCategoryTranslation: jest.fn(),
    validateCategory: jest.fn(),
    createCategoryTranslation: jest.fn(),
    updateCategoryTranslation: jest.fn(),
    deleteCategoryTranslation: jest.fn(),
  },
});

export type CategoryTranslationServiceMocks = ReturnType<
  typeof createCategoryTranslationServiceMocks
>;

/** Builds CategoryTranslationService through the Nest DI container with all deps mocked. */
export const buildCategoryTranslationService = async (
  mocks: CategoryTranslationServiceMocks,
): Promise<CategoryTranslationService> => {
  const moduleRef = await Test.createTestingModule({
    providers: [
      CategoryTranslationService,
      {
        provide: CategoryTranslationRepository,
        useValue: mocks.categoryTranslationRepository,
      },
    ],
  }).compile();

  return moduleRef.get<CategoryTranslationService>(CategoryTranslationService);
};

/** Boilerplate for a fresh service + mocks per test. */
export const setupCategoryTranslationService = async () => {
  const mocks = createCategoryTranslationServiceMocks();
  const service = await buildCategoryTranslationService(mocks);

  return { mocks, service };
};

export const TRANSLATION_ID = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
export const CATEGORY_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
export const LANGUAGE_ID = "en";
export const USER_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

/** A persisted category translation row as the repository returns it. */
export const makeCategoryTranslation = (
  overrides: Record<string, unknown> = {},
) => ({
  id: TRANSLATION_ID,
  name: "Electronics",
  description: "Electronic devices and gadgets",
  languageId: LANGUAGE_ID,
  categoryId: CATEGORY_ID,
  createdById: USER_ID,
  updatedById: null,
  deletedById: null,
  deletedAt: null,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
  language: { id: LANGUAGE_ID, name: "English" },
  category: {
    id: CATEGORY_ID,
    name: "Electronics",
    logo: null,
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

export const stringContaining = (substring: string): string =>
  expect.stringContaining(substring) as unknown as string;

export const anyObject = (): Record<string, unknown> =>
  expect.any(Object) as unknown as Record<string, unknown>;
