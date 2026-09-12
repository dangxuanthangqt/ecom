import { Test } from "@nestjs/testing";

import { ProductRepository } from "@/repositories/product/product.repository";

import { ManageProductService } from "../manage-product.service";

/**
 * Test doubles for every collaborator ManageProductService depends on.
 * Only the methods ManageProductService actually calls are stubbed.
 */
export const createManageProductServiceMocks = () => ({
  productRepository: {
    findManyProducts: jest.fn(),
    findUniqueProduct: jest.fn(),
    validateCategories: jest.fn(),
    updateProduct: jest.fn(),
    createProduct: jest.fn(),
    deleteProduct: jest.fn(),
  },
});

export type ManageProductServiceMocks = ReturnType<
  typeof createManageProductServiceMocks
>;

/** Builds ManageProductService through the Nest DI container with all deps mocked. */
export const buildManageProductService = async (
  mocks: ManageProductServiceMocks,
): Promise<ManageProductService> => {
  const moduleRef = await Test.createTestingModule({
    providers: [
      ManageProductService,
      { provide: ProductRepository, useValue: mocks.productRepository },
    ],
  }).compile();

  return moduleRef.get<ManageProductService>(ManageProductService);
};

/** Boilerplate for a fresh service + mocks per test. */
export const setupManageProductService = async () => {
  const mocks = createManageProductServiceMocks();
  const service = await buildManageProductService(mocks);

  return { mocks, service };
};

// Fixture IDs
export const LANGUAGE_ID = "lang-en-us";
export const PRODUCT_ID = "product-123";
export const BRAND_ID = "brand-001";
export const CATEGORY_ID = "category-001";
export const ADMIN_USER_ID = "admin-user-123";
export const SELLER_USER_ID = "seller-user-456";
export const CREATOR_USER_ID = "creator-user-789";

/** A persisted product as the repository returns it. */
export const makeProduct = (overrides: Record<string, unknown> = {}) => ({
  id: PRODUCT_ID,
  name: "Managed Product",
  description: "A managed product",
  basePrice: 100,
  virtualPrice: 150,
  images: ["https://example.com/image1.jpg"],
  publishedAt: new Date("2024-01-01"),
  deletedAt: null,
  createdAt: new Date("2023-12-01"),
  updatedAt: new Date("2024-01-01"),
  createdById: CREATOR_USER_ID,
  ...overrides,
});

/** A SKU fixture. */
export const makeSku = (overrides: Record<string, unknown> = {}) => ({
  id: "sku-001",
  name: "SKU-001",
  productId: PRODUCT_ID,
  quantity: 100,
  order: 0,
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
 * Stub validateCategories to succeed by default.
 * Use in beforeEach to enable category validation.
 */
export const stubCategoryValidation = (mocks: ManageProductServiceMocks) => {
  mocks.productRepository.validateCategories.mockResolvedValue(undefined);
};

/**
 * Expect a ForbiddenException with the standard permission message.
 */
export const expectForbiddenPermission = async (promise: Promise<unknown>) => {
  await expect(promise).rejects.toMatchObject({
    status: 403,
    response: {
      message: "You do not have permission to interact with this product.",
    },
  });
};
