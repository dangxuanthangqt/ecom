import { NotFoundException } from "@nestjs/common";

import { Scope } from "@/constants/permission.constant";
import {
  CreateProductRequestDto,
  UpdateProductRequestDto,
} from "@/dtos/product/product.dto";

import { ManageProductService } from "../manage-product.service";

import {
  ADMIN_USER_ID,
  BRAND_ID,
  CATEGORY_ID,
  containing,
  CREATOR_USER_ID,
  expectForbiddenPermission,
  makeProduct,
  ManageProductServiceMocks,
  PRODUCT_ID,
  SELLER_USER_ID,
  setupManageProductService,
  stubCategoryValidation,
} from "./manage-product-service-test-harness";

/** `expect.any(Date)` typed as a Date, to keep `any` out of assertions. */
const anyDate = (): Date => expect.any(Date) as unknown as Date;

describe("ManageProductService - createProduct", () => {
  let service: ManageProductService;
  let mocks: ManageProductServiceMocks;

  const makeCreateBody = (
    overrides: Partial<CreateProductRequestDto> = {},
  ): CreateProductRequestDto =>
    ({
      name: "New Product",
      description: "A new product",
      basePrice: 100,
      virtualPrice: 150,
      brandId: BRAND_ID,
      categoryIds: [CATEGORY_ID],
      images: ["https://example.com/img.jpg"],
      variants: [],
      publishedAt: new Date("2024-06-01"),
      skus: [
        {
          value: "SKU-001",
          stock: 50,
          price: 25,
          image: "https://example.com/sku.jpg",
        },
      ],
      ...overrides,
    }) as CreateProductRequestDto;

  beforeEach(async () => {
    ({ service, mocks } = await setupManageProductService());
    stubCategoryValidation(mocks);
    mocks.productRepository.createProduct.mockResolvedValue(makeProduct());
  });

  it("validates categories before creating", async () => {
    // Arrange
    const body = makeCreateBody({ categoryIds: [CATEGORY_ID] });

    // Act
    await service.createProduct({
      data: body,
      userId: SELLER_USER_ID,
    });

    // Assert
    expect(mocks.productRepository.validateCategories).toHaveBeenCalledWith([
      CATEGORY_ID,
    ]);
  });

  it("creates product with correct structure including SKU ordering", async () => {
    // Arrange
    const body = makeCreateBody({
      skus: [
        {
          value: "SKU-1",
          stock: 50,
          price: 25,
          image: "https://example.com/sku1.jpg",
        },
        {
          value: "SKU-2",
          stock: 30,
          price: 30,
          image: "https://example.com/sku2.jpg",
        },
      ],
    });

    // Act
    await service.createProduct({
      data: body,
      userId: SELLER_USER_ID,
    });

    // Assert
    expect(mocks.productRepository.createProduct).toHaveBeenCalledWith(
      containing({
        data: containing({
          name: "New Product",
          basePrice: 100,
          virtualPrice: 150,
          brandId: BRAND_ID,
          publishedAt: anyDate(),
          createdById: SELLER_USER_ID,
          skus: containing({
            createMany: containing({
              data: [
                containing({ value: "SKU-1", stock: 50, price: 25, order: 0 }),
                containing({ value: "SKU-2", stock: 30, price: 30, order: 1 }),
              ],
            }),
          }),
        }),
      }),
    );
  });

  it("connects categories via category ids", async () => {
    // Arrange
    const categoryIds = [CATEGORY_ID, "category-002"];
    const body = makeCreateBody({ categoryIds });

    // Act
    await service.createProduct({
      data: body,
      userId: SELLER_USER_ID,
    });

    // Assert
    expect(mocks.productRepository.createProduct).toHaveBeenCalledWith(
      containing({
        data: containing({
          categories: containing({
            connect: [{ id: CATEGORY_ID }, { id: "category-002" }],
          }),
        }),
      }),
    );
  });

  it("stamps the creator user id", async () => {
    // Arrange
    const body = makeCreateBody();

    // Act
    await service.createProduct({
      data: body,
      userId: SELLER_USER_ID,
    });

    // Assert
    expect(mocks.productRepository.createProduct).toHaveBeenCalledWith(
      containing({
        data: containing({
          createdById: SELLER_USER_ID,
        }),
      }),
    );
  });

  it("returns the created product unchanged", async () => {
    // Arrange
    const created = makeProduct({ name: "Created Product" });
    mocks.productRepository.createProduct.mockResolvedValue(created);

    // Act
    const result = await service.createProduct({
      data: makeCreateBody(),
      userId: SELLER_USER_ID,
    });

    // Assert
    expect(result).toBe(created);
  });

  it("propagates category validation errors", async () => {
    // Arrange
    const validationError = new NotFoundException("Category not found");
    mocks.productRepository.validateCategories.mockRejectedValue(
      validationError,
    );

    // Act
    const promise = service.createProduct({
      data: makeCreateBody(),
      userId: SELLER_USER_ID,
    });

    // Assert
    await expect(promise).rejects.toBe(validationError);
    expect(mocks.productRepository.createProduct).not.toHaveBeenCalled();
  });

  it("handles empty SKU list", async () => {
    // Arrange
    const body = makeCreateBody({ skus: [] });

    // Act
    await service.createProduct({
      data: body,
      userId: SELLER_USER_ID,
    });

    // Assert
    expect(mocks.productRepository.createProduct).toHaveBeenCalledWith(
      containing({
        data: containing({
          skus: containing({
            createMany: containing({
              data: [],
            }),
          }),
        }),
      }),
    );
  });
});

describe("ManageProductService - updateProduct", () => {
  let service: ManageProductService;
  let mocks: ManageProductServiceMocks;

  const makeUpdateBody = (
    overrides: Partial<UpdateProductRequestDto> = {},
  ): UpdateProductRequestDto =>
    ({
      name: "Updated Product",
      categoryIds: [CATEGORY_ID],
      ...overrides,
    }) as UpdateProductRequestDto;

  beforeEach(async () => {
    ({ service, mocks } = await setupManageProductService());
    stubCategoryValidation(mocks);
    mocks.productRepository.findUniqueProduct.mockResolvedValue(
      makeProduct({ createdById: SELLER_USER_ID }),
    );
    mocks.productRepository.updateProduct.mockResolvedValue(makeProduct());
  });

  it("lets creator update their own product", async () => {
    // Arrange
    const body = makeUpdateBody({ name: "My Updated Product" });

    // Act
    await service.updateProduct({
      productId: PRODUCT_ID,
      data: body,
      userId: SELLER_USER_ID,
      scope: Scope.OWN,
    });

    // Assert
    expect(mocks.productRepository.updateProduct).toHaveBeenCalledWith(
      containing({
        productId: PRODUCT_ID,
        data: containing({ name: "My Updated Product" }),
        userId: SELLER_USER_ID,
      }),
    );
  });

  it("lets admin update any product", async () => {
    // Arrange
    const body = makeUpdateBody();

    // Act
    await service.updateProduct({
      productId: PRODUCT_ID,
      data: body,
      userId: ADMIN_USER_ID,
      scope: Scope.ANY,
    });

    // Assert
    expect(mocks.productRepository.updateProduct).toHaveBeenCalled();
  });

  it("forbids a seller from updating another user's product", async () => {
    // Arrange
    mocks.productRepository.findUniqueProduct.mockResolvedValue(
      makeProduct({ createdById: CREATOR_USER_ID }),
    );

    // Act
    const promise = service.updateProduct({
      productId: PRODUCT_ID,
      data: makeUpdateBody(),
      userId: SELLER_USER_ID,
      scope: Scope.OWN,
    });

    // Assert
    await expectForbiddenPermission(promise);
    expect(mocks.productRepository.updateProduct).not.toHaveBeenCalled();
  });

  it("validates categories when provided", async () => {
    // Arrange
    const body = makeUpdateBody({
      categoryIds: [CATEGORY_ID, "category-003"],
    });

    // Act
    await service.updateProduct({
      productId: PRODUCT_ID,
      data: body,
      userId: SELLER_USER_ID,
      scope: Scope.OWN,
    });

    // Assert
    expect(mocks.productRepository.validateCategories).toHaveBeenCalledWith([
      CATEGORY_ID,
      "category-003",
    ]);
  });

  it("skips category validation when categoryIds is undefined", async () => {
    // Arrange
    const body = makeUpdateBody();
    delete body.categoryIds;

    // Act
    await service.updateProduct({
      productId: PRODUCT_ID,
      data: body,
      userId: SELLER_USER_ID,
      scope: Scope.OWN,
    });

    // Assert
    expect(mocks.productRepository.validateCategories).not.toHaveBeenCalled();
  });

  it("propagates product not found from fetch", async () => {
    // Arrange
    const error = new NotFoundException("Product not found");
    mocks.productRepository.findUniqueProduct.mockRejectedValue(error);

    // Act
    const promise = service.updateProduct({
      productId: "non-existent",
      data: makeUpdateBody(),
      userId: SELLER_USER_ID,
      scope: Scope.OWN,
    });

    // Assert
    await expect(promise).rejects.toBe(error);
    expect(mocks.productRepository.updateProduct).not.toHaveBeenCalled();
  });

  it("returns the updated product unchanged", async () => {
    // Arrange
    const updated = makeProduct({ name: "Updated Name" });
    mocks.productRepository.updateProduct.mockResolvedValue(updated);

    // Act
    const result = await service.updateProduct({
      productId: PRODUCT_ID,
      data: makeUpdateBody(),
      userId: SELLER_USER_ID,
      scope: Scope.OWN,
    });

    // Assert
    expect(result).toBe(updated);
  });
});

describe("ManageProductService - deleteProduct", () => {
  let service: ManageProductService;
  let mocks: ManageProductServiceMocks;

  beforeEach(async () => {
    ({ service, mocks } = await setupManageProductService());
    mocks.productRepository.findUniqueProduct.mockResolvedValue(
      makeProduct({ createdById: SELLER_USER_ID }),
    );
    mocks.productRepository.deleteProduct.mockResolvedValue({ id: PRODUCT_ID });
  });

  it("lets creator delete their own product", async () => {
    // Arrange & Act
    await service.deleteProduct({
      productId: PRODUCT_ID,
      userId: SELLER_USER_ID,
      scope: Scope.OWN,
    });

    // Assert
    expect(mocks.productRepository.deleteProduct).toHaveBeenCalledWith(
      containing({
        productId: PRODUCT_ID,
        userId: SELLER_USER_ID,
      }),
    );
  });

  it("lets admin delete any product", async () => {
    // Arrange & Act
    await service.deleteProduct({
      productId: PRODUCT_ID,
      userId: ADMIN_USER_ID,
      scope: Scope.ANY,
    });

    // Assert
    expect(mocks.productRepository.deleteProduct).toHaveBeenCalled();
  });

  it("forbids a seller from deleting another user's product", async () => {
    // Arrange
    mocks.productRepository.findUniqueProduct.mockResolvedValue(
      makeProduct({ createdById: CREATOR_USER_ID }),
    );

    // Act
    const promise = service.deleteProduct({
      productId: PRODUCT_ID,
      userId: SELLER_USER_ID,
      scope: Scope.OWN,
    });

    // Assert
    await expectForbiddenPermission(promise);
    expect(mocks.productRepository.deleteProduct).not.toHaveBeenCalled();
  });

  it("returns the deletion result unchanged", async () => {
    // Arrange
    const result = { id: PRODUCT_ID, deletedAt: new Date() };
    mocks.productRepository.deleteProduct.mockResolvedValue(result);

    // Act
    const output = await service.deleteProduct({
      productId: PRODUCT_ID,
      userId: SELLER_USER_ID,
      scope: Scope.OWN,
    });

    // Assert
    expect(output).toBe(result);
  });

  it("propagates repository errors", async () => {
    // Arrange
    const error = new Error("Database error");
    mocks.productRepository.deleteProduct.mockRejectedValue(error);

    // Act
    const promise = service.deleteProduct({
      productId: PRODUCT_ID,
      userId: SELLER_USER_ID,
      scope: Scope.OWN,
    });

    // Assert
    await expect(promise).rejects.toBe(error);
  });

  it("checks permission before attempting deletion", async () => {
    // Arrange
    mocks.productRepository.findUniqueProduct.mockResolvedValue(
      makeProduct({ createdById: CREATOR_USER_ID }),
    );

    // Act
    const promise = service.deleteProduct({
      productId: PRODUCT_ID,
      userId: SELLER_USER_ID,
      scope: Scope.OWN,
    });

    // Assert
    await expectForbiddenPermission(promise);
    expect(mocks.productRepository.deleteProduct).not.toHaveBeenCalled();
  });
});
