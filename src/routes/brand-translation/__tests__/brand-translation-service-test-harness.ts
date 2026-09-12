import { Test } from "@nestjs/testing";

import { BrandTranslationRepository } from "@/repositories/brand-translation/brand-translation.repository";

import { BrandTranslationService } from "../brand-translation.service";

/**
 * Test doubles for every collaborator BrandTranslationService depends on.
 * Only the methods BrandTranslationService actually calls are stubbed.
 */
export const createBrandTranslationServiceMocks = () => ({
  brandTranslationRepository: {
    validateBrand: jest.fn(),
    createBrandTranslation: jest.fn(),
    findUniqueBrandTranslation: jest.fn(),
    findManyBrandTranslations: jest.fn(),
    updateBrandTranslation: jest.fn(),
    deleteBrandTranslation: jest.fn(),
  },
});

export type BrandTranslationServiceMocks = ReturnType<
  typeof createBrandTranslationServiceMocks
>;

/** Builds BrandTranslationService through the Nest DI container with all deps mocked. */
export const buildBrandTranslationService = async (
  mocks: BrandTranslationServiceMocks,
): Promise<BrandTranslationService> => {
  const moduleRef = await Test.createTestingModule({
    providers: [
      BrandTranslationService,
      {
        provide: BrandTranslationRepository,
        useValue: mocks.brandTranslationRepository,
      },
    ],
  }).compile();

  return moduleRef.get<BrandTranslationService>(BrandTranslationService);
};

/** Boilerplate for a fresh service + mocks per test. */
export const setupBrandTranslationService = async () => {
  const mocks = createBrandTranslationServiceMocks();
  const service = await buildBrandTranslationService(mocks);

  return { mocks, service };
};

export const BRAND_TRANSLATION_ID = "11111111-1111-4111-8111-111111111111";
export const BRAND_ID = "22222222-2222-4222-8222-222222222222";
export const LANGUAGE_ID = "en";
export const CREATED_BY_USER_ID = "33333333-3333-4333-8333-333333333333";
export const UPDATED_BY_USER_ID = "44444444-4444-4444-8444-444444444444";

/** A persisted brand translation row as the repository returns it. */
export const makeBrandTranslation = (
  overrides: Record<string, unknown> = {},
) => ({
  id: BRAND_TRANSLATION_ID,
  brandId: BRAND_ID,
  languageId: LANGUAGE_ID,
  name: "Test Brand Translation",
  description: "A test brand translation description",
  createdById: CREATED_BY_USER_ID,
  updatedById: null,
  deletedAt: null,
  deletedById: null,
  createdAt: new Date("2025-09-01"),
  updatedAt: new Date("2025-09-01"),
  brand: {
    id: BRAND_ID,
    name: "Test Brand",
    logo: "https://example.com/logo.png",
  },
  language: {
    id: LANGUAGE_ID,
    code: "EN",
    name: "English",
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
