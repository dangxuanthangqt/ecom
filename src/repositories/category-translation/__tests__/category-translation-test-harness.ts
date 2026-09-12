import { Test } from "@nestjs/testing";

import { CategoryTranslationRepository } from "@/repositories/category-translation/category-translation.repository";
import { PrismaService } from "@/shared/services/prisma.service";

export const createCategoryTranslationMocks = () => ({
  prismaService: {
    categoryTranslation: {
      findMany: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    category: {
      findUniqueOrThrow: jest.fn(),
    },
  },
});

export type CategoryTranslationMocks = ReturnType<
  typeof createCategoryTranslationMocks
>;

export const buildCategoryTranslationRepository = async (
  mocks: CategoryTranslationMocks,
): Promise<CategoryTranslationRepository> => {
  const moduleRef = await Test.createTestingModule({
    providers: [
      CategoryTranslationRepository,
      { provide: PrismaService, useValue: mocks.prismaService },
    ],
  }).compile();

  return moduleRef.get<CategoryTranslationRepository>(
    CategoryTranslationRepository,
  );
};

export const setupCategoryTranslationRepository = async () => {
  const mocks = createCategoryTranslationMocks();
  const repository = await buildCategoryTranslationRepository(mocks);

  return { mocks, repository };
};

export const CATEGORY_TRANSLATION_ID = "11111111-1111-4111-8111-111111111111";
export const CATEGORY_ID = "22222222-2222-4222-8222-222222222222";
export const LANGUAGE_ID = "33333333-3333-4333-8333-333333333333";
export const USER_ID = "44444444-4444-4444-8444-444444444444";

export const makeCategoryTranslation = (
  overrides: Record<string, unknown> = {},
) => ({
  id: CATEGORY_TRANSLATION_ID,
  categoryId: CATEGORY_ID,
  languageId: LANGUAGE_ID,
  name: "Category Translation",
  description: "Description",
  deletedAt: null,
  deletedById: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const makeCategory = (overrides: Record<string, unknown> = {}) => ({
  id: CATEGORY_ID,
  name: "Category",
  deletedAt: null,
  ...overrides,
});

export const containing = <T extends Record<string, unknown>>(shape: T): T =>
  expect.objectContaining(shape) as unknown as T;

export const anyDate = (): Date => expect.any(Date) as unknown as Date;

export const stringContaining = (substring: string): string =>
  expect.stringContaining(substring) as unknown as string;

export const anyObject = (): Record<string, unknown> =>
  expect.any(Object) as unknown as Record<string, unknown>;
