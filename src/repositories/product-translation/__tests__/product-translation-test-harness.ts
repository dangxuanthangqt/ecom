import { Test } from "@nestjs/testing";

import { ProductTranslationRepository } from "@/repositories/product-translation/product-translation.repository";
import { PrismaService } from "@/shared/services/prisma.service";

export const createProductTranslationMocks = () => ({
  prismaService: {
    productTranslation: {
      findMany: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    product: {
      findUniqueOrThrow: jest.fn(),
    },
  },
});

export type ProductTranslationMocks = ReturnType<
  typeof createProductTranslationMocks
>;

export const buildProductTranslationRepository = async (
  mocks: ProductTranslationMocks,
): Promise<ProductTranslationRepository> => {
  const moduleRef = await Test.createTestingModule({
    providers: [
      ProductTranslationRepository,
      { provide: PrismaService, useValue: mocks.prismaService },
    ],
  }).compile();

  return moduleRef.get<ProductTranslationRepository>(
    ProductTranslationRepository,
  );
};

export const setupProductTranslationRepository = async () => {
  const mocks = createProductTranslationMocks();
  const repository = await buildProductTranslationRepository(mocks);

  return { mocks, repository };
};

export const PRODUCT_TRANSLATION_ID = "11111111-1111-4111-8111-111111111111";
export const PRODUCT_ID = "22222222-2222-4222-8222-222222222222";
export const LANGUAGE_ID = "33333333-3333-4333-8333-333333333333";
export const USER_ID = "44444444-4444-4444-8444-444444444444";

export const makeProductTranslation = (
  overrides: Record<string, unknown> = {},
) => ({
  id: PRODUCT_TRANSLATION_ID,
  productId: PRODUCT_ID,
  languageId: LANGUAGE_ID,
  name: "Product Translation",
  description: "Description",
  seoTitle: "SEO Title",
  seoDescription: "SEO Description",
  seoKeywords: "keywords",
  deletedAt: null,
  deletedById: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  createdById: USER_ID,
  updatedById: USER_ID,
  ...overrides,
});

export const makeProduct = (overrides: Record<string, unknown> = {}) => ({
  id: PRODUCT_ID,
  name: "Product",
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
