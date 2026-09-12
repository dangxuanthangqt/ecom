import { Test } from "@nestjs/testing";

import { ProductTranslationRepository } from "@/repositories/product-translation/product-translation.repository";

import { ProductTranslationService } from "../product-translation.service";

/**
 * Test doubles for every collaborator ProductTranslationService depends on.
 * Only the methods ProductTranslationService actually calls are stubbed.
 */
export const createProductTranslationServiceMocks = () => ({
  productTranslationRepository: {
    findManyProductTranslations: jest.fn(),
    findProductTranslationById: jest.fn(),
    createProductTranslation: jest.fn(),
    updateProductTranslation: jest.fn(),
    deleteProductTranslation: jest.fn(),
    validateProduct: jest.fn(),
  },
});

export type ProductTranslationServiceMocks = ReturnType<
  typeof createProductTranslationServiceMocks
>;

/** Builds ProductTranslationService through the Nest DI container with all deps mocked. */
export const buildProductTranslationService = async (
  mocks: ProductTranslationServiceMocks,
): Promise<ProductTranslationService> => {
  const moduleRef = await Test.createTestingModule({
    providers: [
      ProductTranslationService,
      {
        provide: ProductTranslationRepository,
        useValue: mocks.productTranslationRepository,
      },
    ],
  }).compile();

  return moduleRef.get<ProductTranslationService>(ProductTranslationService);
};

/** Boilerplate for a fresh service + mocks per test. */
export const setupProductTranslationService = async () => {
  const mocks = createProductTranslationServiceMocks();
  const service = await buildProductTranslationService(mocks);

  return { mocks, service };
};

// Fixture IDs
export const PRODUCT_ID = "product-123";
export const TRANSLATION_ID = "translation-456";
export const LANGUAGE_ID = "lang-en-us";
export const USER_ID = "user-789";

/** A persisted product translation as the repository returns it. */
export const makeProductTranslation = (
  overrides: Record<string, unknown> = {},
) => ({
  id: TRANSLATION_ID,
  productId: PRODUCT_ID,
  languageId: LANGUAGE_ID,
  name: "Product Name",
  description: "Product Description",
  createdById: USER_ID,
  updatedById: null,
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
  ...overrides,
});

/** Typed matcher for nested objects. */
export const containing = <T extends Record<string, unknown>>(shape: T): T =>
  expect.objectContaining(shape) as unknown as T;

/** Typed matcher for any Date. */
export const anyDate = (): Date => expect.any(Date) as unknown as Date;

export const stringContaining = (substring: string): string =>
  expect.stringContaining(substring) as unknown as string;

export const anyObject = (): Record<string, unknown> =>
  expect.any(Object) as unknown as Record<string, unknown>;

/**
 * Stub validateProduct to succeed by default.
 * Use in beforeEach to enable product validation.
 */
export const stubProductValidation = (
  mocks: ProductTranslationServiceMocks,
) => {
  mocks.productTranslationRepository.validateProduct.mockResolvedValue(
    undefined,
  );
};
