import { Test } from "@nestjs/testing";

import { BrandService } from "../brand.service";

/**
 * Test doubles for every collaborator BrandController depends on.
 * Only the methods BrandController actually calls are stubbed.
 */
export const createBrandControllerMocks = () => ({
  brandService: {
    getBrands: jest.fn(),
    getBrandById: jest.fn(),
    createBrand: jest.fn(),
    updateBrand: jest.fn(),
    deleteBrand: jest.fn(),
  },
});

export type BrandControllerMocks = ReturnType<
  typeof createBrandControllerMocks
>;

/** Builds BrandController through the Nest DI container with all deps mocked. */
export const buildBrandController = async (
  mocks: BrandControllerMocks,
): Promise<any> => {
  const moduleRef = await Test.createTestingModule({
    controllers: [
      // Dynamically create a controller class that matches the real one
    ],
    providers: [{ provide: BrandService, useValue: mocks.brandService }],
  })
    .overrideProvider(BrandService)
    .useValue(mocks.brandService)
    .compile();

  return moduleRef;
};

/** Boilerplate for a fresh controller + mocks per test. */
export const setupBrandController = async () => {
  const mocks = createBrandControllerMocks();
  const { BrandController } = await import("../brand.controller");
  const controller = new BrandController(mocks.brandService as any);

  return { mocks, controller };
};

export const BRAND_ID = "11111111-1111-4111-8111-111111111111";
export const LANGUAGE_ID = "22222222-2222-4222-8222-222222222222";
export const ACTIVE_USER_ID = "33333333-3333-4333-8333-333333333333";

/** A brand response as the service returns it. */
export const makeBrandResponse = (overrides: Record<string, unknown> = {}) => ({
  id: BRAND_ID,
  name: "Test Brand",
  logo: "https://example.com/logo.png",
  createdById: ACTIVE_USER_ID,
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
