import { Test } from "@nestjs/testing";

import { ProductRepository } from "@/repositories/product/product.repository";
import { PrismaService } from "@/shared/services/prisma.service";

/**
 * Test doubles for every collaborator ProductRepository depends on.
 * Only the methods ProductRepository actually calls are stubbed.
 */
export const createProductMocks = () => ({
  prismaService: {
    product: {
      findMany: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    category: {
      findMany: jest.fn(),
    },
    productTranslation: {
      updateMany: jest.fn(),
    },
    sKU: {
      findMany: jest.fn(),
      deleteMany: jest.fn(),
      createMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    $transaction: jest.fn(),
  },
});

export type ProductMocks = ReturnType<typeof createProductMocks>;

/** Builds ProductRepository through the Nest DI container with all deps mocked. */
export const buildProductRepository = async (
  mocks: ProductMocks,
): Promise<ProductRepository> => {
  const moduleRef = await Test.createTestingModule({
    providers: [
      ProductRepository,
      { provide: PrismaService, useValue: mocks.prismaService },
    ],
  }).compile();

  return moduleRef.get<ProductRepository>(ProductRepository);
};

/** Boilerplate for a fresh repository + mocks per test. */
export const setupProductRepository = async () => {
  const mocks = createProductMocks();
  const repository = await buildProductRepository(mocks);

  return { mocks, repository };
};

// Test IDs
export const PRODUCT_ID = "11111111-1111-4111-8111-111111111111";
export const CATEGORY_ID_1 = "22222222-2222-4222-8222-222222222222";
export const CATEGORY_ID_2 = "33333333-3333-4333-8333-333333333333";
export const LANGUAGE_ID = "44444444-4444-4444-8444-444444444444";
export const USER_ID = "55555555-5555-4555-8555-555555555555";
export const SKU_ID_1 = "66666666-6666-4666-8666-666666666666";
export const SKU_ID_2 = "77777777-7777-4777-8777-777777777777";

/** A persisted product row as the repository returns it. */
export const makeProduct = (overrides: Record<string, unknown> = {}) => ({
  id: PRODUCT_ID,
  name: "Test Product",
  basePrice: 100,
  sku: "SKU-001",
  brandId: "brand-id",
  createdById: USER_ID,
  updatedById: USER_ID,
  deletedAt: null,
  deletedById: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  publishedAt: null,
  ...overrides,
});

/** A persisted category row. */
export const makeCategory = (overrides: Record<string, unknown> = {}) => ({
  id: CATEGORY_ID_1,
  name: "Test Category",
  deletedAt: null,
  ...overrides,
});

/** A persisted SKU row. */
export const makeSKU = (overrides: Record<string, unknown> = {}) => ({
  id: SKU_ID_1,
  value: "SKU-VALUE",
  productId: PRODUCT_ID,
  price: 100,
  stock: 10,
  image: null,
  order: 0,
  deletedAt: null,
  createdById: USER_ID,
  updatedById: USER_ID,
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

export const stringContaining = (substring: string): string =>
  expect.stringContaining(substring) as unknown as string;

export const anyObject = (): Record<string, unknown> =>
  expect.any(Object) as unknown as Record<string, unknown>;
