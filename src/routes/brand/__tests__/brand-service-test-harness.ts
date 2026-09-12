import { Test } from "@nestjs/testing";

import { BrandRepository } from "@/repositories/brand/brand.repository";

import { BrandService } from "../brand.service";

/**
 * Test doubles for every collaborator BrandService depends on.
 * Only the methods BrandService actually calls are stubbed.
 */
export const createBrandServiceMocks = () => ({
  brandRepository: {
    findManyBrands: jest.fn(),
    findUniqueBrand: jest.fn(),
    createBrand: jest.fn(),
    updateBrand: jest.fn(),
    deleteBrand: jest.fn(),
  },
});

export type BrandServiceMocks = ReturnType<typeof createBrandServiceMocks>;

/** Builds BrandService through the Nest DI container with all deps mocked. */
export const buildBrandService = async (
  mocks: BrandServiceMocks,
): Promise<BrandService> => {
  const moduleRef = await Test.createTestingModule({
    providers: [
      BrandService,
      { provide: BrandRepository, useValue: mocks.brandRepository },
    ],
  }).compile();

  return moduleRef.get<BrandService>(BrandService);
};

/** Boilerplate for a fresh service + mocks per test. */
export const setupBrandService = async () => {
  const mocks = createBrandServiceMocks();
  const service = await buildBrandService(mocks);

  return { mocks, service };
};

export const BRAND_ID = "11111111-1111-4111-8111-111111111111";
export const LANGUAGE_ID = "22222222-2222-4222-8222-222222222222";
export const CREATED_BY_USER_ID = "33333333-3333-4333-8333-333333333333";
export const UPDATED_BY_USER_ID = "44444444-4444-4444-8444-444444444444";

/** A persisted brand row as the repository returns it. */
export const makeBrand = (overrides: Record<string, unknown> = {}) => ({
  id: BRAND_ID,
  name: "Test Brand",
  logo: "https://example.com/logo.png",
  createdById: CREATED_BY_USER_ID,
  updatedById: null,
  deletedAt: null,
  deletedById: null,
  createdAt: new Date("2025-09-01"),
  updatedAt: new Date("2025-09-01"),
  brandTranslations: [],
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
