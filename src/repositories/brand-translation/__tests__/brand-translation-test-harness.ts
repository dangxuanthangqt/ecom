import { Test } from "@nestjs/testing";

import { BrandTranslationRepository } from "@/repositories/brand-translation/brand-translation.repository";
import { PrismaService } from "@/shared/services/prisma.service";

export const createBrandTranslationMocks = () => ({
  prismaService: {
    brandTranslation: {
      findMany: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    brand: {
      findUniqueOrThrow: jest.fn(),
    },
  },
});

export type BrandTranslationMocks = ReturnType<
  typeof createBrandTranslationMocks
>;

export const buildBrandTranslationRepository = async (
  mocks: BrandTranslationMocks,
): Promise<BrandTranslationRepository> => {
  const moduleRef = await Test.createTestingModule({
    providers: [
      BrandTranslationRepository,
      { provide: PrismaService, useValue: mocks.prismaService },
    ],
  }).compile();

  return moduleRef.get<BrandTranslationRepository>(BrandTranslationRepository);
};

export const setupBrandTranslationRepository = async () => {
  const mocks = createBrandTranslationMocks();
  const repository = await buildBrandTranslationRepository(mocks);

  return { mocks, repository };
};

export const BRAND_TRANSLATION_ID = "11111111-1111-4111-8111-111111111111";
export const BRAND_ID = "22222222-2222-4222-8222-222222222222";
export const LANGUAGE_ID = "33333333-3333-4333-8333-333333333333";
export const USER_ID = "44444444-4444-4444-8444-444444444444";

export const makeBrandTranslation = (
  overrides: Record<string, unknown> = {},
) => ({
  id: BRAND_TRANSLATION_ID,
  brandId: BRAND_ID,
  languageId: LANGUAGE_ID,
  name: "Brand Translation",
  description: "Description",
  deletedAt: null,
  deletedById: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const makeBrand = (overrides: Record<string, unknown> = {}) => ({
  id: BRAND_ID,
  name: "Brand",
  logo: "https://example.com/logo.png",
  deletedAt: null,
  ...overrides,
});

export const containing = <T extends Record<string, unknown>>(shape: T): T =>
  expect.objectContaining(shape) as unknown as T;

export const anyDate = (): Date => expect.any(Date) as unknown as Date;

/** String matcher typed to avoid `any` from `expect.stringContaining()`. */
export const stringContaining = (substring: string): string =>
  expect.stringContaining(substring) as unknown as string;

export const anyObject = (): Record<string, unknown> =>
  expect.any(Object) as unknown as Record<string, unknown>;
