import { Test } from "@nestjs/testing";
import { I18nService } from "nestjs-i18n";

import { BrandRepository } from "@/repositories/brand/brand.repository";
import { PrismaService } from "@/shared/services/prisma.service";

/**
 * Test doubles for every collaborator BrandRepository depends on.
 * Only the methods BrandRepository actually calls are stubbed.
 */
export const createBrandMocks = () => ({
  prismaService: {
    brand: {
      findMany: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    brandTranslation: {
      findMany: jest.fn(),
    },
  },
  i18n: {
    t: jest.fn((key, _options) => `translated-${key}`),
  },
});

export type BrandMocks = ReturnType<typeof createBrandMocks>;

/** Builds BrandRepository through the Nest DI container with all deps mocked. */
export const buildBrandRepository = async (
  mocks: BrandMocks,
): Promise<BrandRepository> => {
  const moduleRef = await Test.createTestingModule({
    providers: [
      BrandRepository,
      { provide: PrismaService, useValue: mocks.prismaService },
      { provide: I18nService, useValue: mocks.i18n },
    ],
  }).compile();

  return moduleRef.get<BrandRepository>(BrandRepository);
};

/** Boilerplate for a fresh repository + mocks per test. */
export const setupBrandRepository = async () => {
  const mocks = createBrandMocks();
  const repository = await buildBrandRepository(mocks);

  return { mocks, repository };
};

// Test IDs
export const BRAND_ID = "11111111-1111-4111-8111-111111111111";
export const LANGUAGE_ID = "22222222-2222-4222-8222-222222222222";
export const USER_ID = "33333333-3333-4333-8333-333333333333";
export const BRAND_TRANSLATION_ID_1 = "44444444-4444-4444-8444-444444444444";
export const BRAND_TRANSLATION_ID_2 = "55555555-5555-4555-8555-555555555555";

/** A persisted brand row as the repository returns it. */
export const makeBrand = (overrides: Record<string, unknown> = {}) => ({
  id: BRAND_ID,
  name: "Test Brand",
  logo: "https://example.com/logo.png",
  createdById: USER_ID,
  updatedById: USER_ID,
  deletedAt: null,
  deletedById: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

/** A persisted brand translation row. */
export const makeBrandTranslation = (
  overrides: Record<string, unknown> = {},
) => ({
  id: BRAND_TRANSLATION_ID_1,
  brandId: BRAND_ID,
  languageId: LANGUAGE_ID,
  name: "Test Brand Translation",
  description: "Description",
  deletedAt: null,
  deletedById: null,
  createdAt: new Date(),
  updatedAt: new Date(),
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

/** String matcher typed to avoid `any` from `expect.stringContaining()`. */
export const stringContaining = (substring: string): string =>
  expect.stringContaining(substring) as unknown as string;

export const anyObject = (): Record<string, unknown> =>
  expect.any(Object) as unknown as Record<string, unknown>;
