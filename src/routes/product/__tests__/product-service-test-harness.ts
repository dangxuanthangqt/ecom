import { Test } from "@nestjs/testing";

import { ProductRepository } from "@/repositories/product/product.repository";

import { ProductService } from "../product.service";

/**
 * Test doubles for every collaborator ProductService depends on.
 * Only the methods ProductService actually calls are stubbed.
 */
export const createProductServiceMocks = () => ({
  productRepository: {
    findManyProducts: jest.fn(),
    findUniqueProduct: jest.fn(),
  },
});

export type ProductServiceMocks = ReturnType<typeof createProductServiceMocks>;

/** Builds ProductService through the Nest DI container with all deps mocked. */
export const buildProductService = async (
  mocks: ProductServiceMocks,
): Promise<ProductService> => {
  const moduleRef = await Test.createTestingModule({
    providers: [
      ProductService,
      { provide: ProductRepository, useValue: mocks.productRepository },
    ],
  }).compile();

  return moduleRef.get<ProductService>(ProductService);
};

/** Boilerplate for a fresh service + mocks per test. */
export const setupProductService = async () => {
  const mocks = createProductServiceMocks();
  const service = await buildProductService(mocks);

  return { mocks, service };
};

// Fixture IDs
export const LANGUAGE_ID = "lang-en-us";
export const PRODUCT_ID = "product-123";
export const PRODUCT_ID_2 = "product-456";
export const BRAND_ID = "brand-001";
export const CATEGORY_ID = "category-001";

/** A persisted product as the repository returns it. */
export const makeProduct = (overrides: Record<string, unknown> = {}) => ({
  id: PRODUCT_ID,
  name: "Sample Product",
  description: "A sample product",
  basePrice: 100,
  virtualPrice: 150,
  images: ["https://example.com/image1.jpg"],
  publishedAt: new Date("2024-01-01"),
  deletedAt: null,
  createdAt: new Date("2023-12-01"),
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
