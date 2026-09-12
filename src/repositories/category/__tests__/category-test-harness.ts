import { Test } from "@nestjs/testing";

import { CategoryRepository } from "@/repositories/category/category.repository";
import { PrismaService } from "@/shared/services/prisma.service";

export const createCategoryMocks = () => ({
  prismaService: {
    category: {
      findMany: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    categoryTranslation: {
      findMany: jest.fn(),
    },
  },
});

export type CategoryMocks = ReturnType<typeof createCategoryMocks>;

export const buildCategoryRepository = async (
  mocks: CategoryMocks,
): Promise<CategoryRepository> => {
  const moduleRef = await Test.createTestingModule({
    providers: [
      CategoryRepository,
      { provide: PrismaService, useValue: mocks.prismaService },
    ],
  }).compile();

  return moduleRef.get<CategoryRepository>(CategoryRepository);
};

export const setupCategoryRepository = async () => {
  const mocks = createCategoryMocks();
  const repository = await buildCategoryRepository(mocks);

  return { mocks, repository };
};

export const CATEGORY_ID = "11111111-1111-4111-8111-111111111111";
export const PARENT_CATEGORY_ID = "22222222-2222-4222-8222-222222222222";
export const CATEGORY_TRANSLATION_ID = "33333333-3333-4333-8333-333333333333";
export const LANGUAGE_ID = "44444444-4444-4444-8444-444444444444";
export const USER_ID = "55555555-5555-4555-8555-555555555555";

export const makeCategory = (overrides: Record<string, unknown> = {}) => ({
  id: CATEGORY_ID,
  name: "Test Category",
  parentCategoryId: null,
  deletedAt: null,
  deletedById: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

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

export const containing = <T extends Record<string, unknown>>(shape: T): T =>
  expect.objectContaining(shape) as unknown as T;

export const anyDate = (): Date => expect.any(Date) as unknown as Date;

export const stringContaining = (substring: string): string =>
  expect.stringContaining(substring) as unknown as string;


export const anyObject = (): Record<string, unknown> =>
  expect.any(Object) as unknown as Record<string, unknown>;
