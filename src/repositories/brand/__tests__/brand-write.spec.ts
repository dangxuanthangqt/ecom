import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

import { BrandRepository } from "@/repositories/brand/brand.repository";

import {
  BRAND_ID,
  BRAND_TRANSLATION_ID_1,
  BRAND_TRANSLATION_ID_2,
  USER_ID,
  anyDate,
  containing,
  makeBrand,
  makeBrandTranslation,
  setupBrandRepository,
  BrandMocks,
} from "./brand-test-harness";

describe("BrandRepository - createBrand", () => {
  let repository: BrandRepository;
  let mocks: BrandMocks;

  beforeEach(async () => {
    ({ repository, mocks } = await setupBrandRepository());
  });

  describe("happy path", () => {
    it("creates a brand with provided data and no translations", async () => {
      // Arrange
      const brand = makeBrand();
      const data = {
        name: "New Brand",
        logo: "https://example.com/logo.png",
        createdById: USER_ID,
      };
      mocks.prismaService.brand.create.mockResolvedValue(brand);

      // Act
      const result = await repository.createBrand({ data });

      // Assert
      expect(result).toEqual(brand);
      expect(mocks.prismaService.brand.create).toHaveBeenCalledWith(
        containing({
          data: containing(data),
        }),
      );
    });

    it("creates a brand with translations when IDs are provided", async () => {
      // Arrange
      const brand = makeBrand();
      const data = {
        name: "New Brand",
        logo: "https://example.com/logo.png",
        createdById: USER_ID,
      };
      mocks.prismaService.brandTranslation.findMany.mockResolvedValue([
        makeBrandTranslation({ id: BRAND_TRANSLATION_ID_1 }),
        makeBrandTranslation({ id: BRAND_TRANSLATION_ID_2 }),
      ]);
      mocks.prismaService.brand.create.mockResolvedValue(brand);

      // Act
      const result = await repository.createBrand({
        data,
        brandTranslationIds: [BRAND_TRANSLATION_ID_1, BRAND_TRANSLATION_ID_2],
      });

      // Assert
      expect(result).toEqual(brand);
      expect(mocks.prismaService.brand.create).toHaveBeenCalledWith(
        containing({
          data: containing({
            ...data,
            brandTranslations: {
              connect: [
                { id: BRAND_TRANSLATION_ID_1 },
                { id: BRAND_TRANSLATION_ID_2 },
              ],
            },
          }),
        }),
      );
    });

    it("validates brand translations before creating", async () => {
      // Arrange
      const brand = makeBrand();
      const data = {
        name: "New Brand",
        logo: "https://example.com/logo.png",
        createdById: USER_ID,
      };
      mocks.prismaService.brandTranslation.findMany.mockResolvedValue([
        makeBrandTranslation({ id: BRAND_TRANSLATION_ID_1 }),
      ]);
      mocks.prismaService.brand.create.mockResolvedValue(brand);

      // Act
      await repository.createBrand({
        data,
        brandTranslationIds: [BRAND_TRANSLATION_ID_1],
      });

      // Assert
      expect(
        mocks.prismaService.brandTranslation.findMany,
      ).toHaveBeenCalledWith(
        containing({
          where: {
            id: { in: [BRAND_TRANSLATION_ID_1] },
            deletedAt: null,
          },
        }),
      );
    });
  });

  describe("error handling - translation validation", () => {
    it("throws badRequest error when some translations do not exist", async () => {
      // Arrange
      mocks.prismaService.brandTranslation.findMany.mockResolvedValue([
        makeBrandTranslation({ id: BRAND_TRANSLATION_ID_1 }),
      ]);

      // Act
      const promise = repository.createBrand({
        data: {
          name: "Brand",
          logo: "https://example.com/logo.png",
          createdById: USER_ID,
        },
        brandTranslationIds: [BRAND_TRANSLATION_ID_1, BRAND_TRANSLATION_ID_2],
      });

      // Assert
      // The exception body carries `message` as an array of `{ field, message }`
      // detail objects, not a bare string.
      await expect(promise).rejects.toMatchObject({
        status: 400,
        response: {
          message: [{ message: "Some brand translations do not exist." }],
        },
      });
    });
  });

  describe("error handling - unique constraint", () => {
    it("throws unprocessable error on duplicate brand", async () => {
      // Arrange
      const error = new PrismaClientKnownRequestError(
        "Unique constraint failed on the fields: `name`",
        {
          code: "P2002",
          clientVersion: "6.0.0",
        },
      );
      mocks.prismaService.brand.create.mockRejectedValue(error);

      // Act
      const promise = repository.createBrand({
        data: {
          name: "Duplicate",
          logo: "https://example.com/logo.png",
          createdById: USER_ID,
        },
      });

      // Assert
      await expect(promise).rejects.toMatchObject({
        status: 422,
        response: {
          message: "Brand is already exists.",
          field: "brand.",
        },
      });
    });
  });

  describe("error handling - foreign key constraint", () => {
    it("throws unprocessable error on invalid foreign key", async () => {
      // Arrange
      const error = new PrismaClientKnownRequestError(
        "Foreign key constraint failed",
        {
          code: "P2003",
          clientVersion: "6.0.0",
        },
      );
      mocks.prismaService.brand.create.mockRejectedValue(error);

      // Act
      const promise = repository.createBrand({
        data: {
          name: "Brand",
          logo: "https://example.com/logo.png",
          createdById: "invalid-user",
        },
      });

      // Assert
      await expect(promise).rejects.toMatchObject({
        status: 422,
        response: {
          message: "Failed to create brand.",
          field: "brand",
        },
      });
    });
  });

  describe("error handling - internal error", () => {
    it("throws internal error on unexpected database failure", async () => {
      // Arrange
      const error = new Error("Database error");
      mocks.prismaService.brand.create.mockRejectedValue(error);

      // Act
      const promise = repository.createBrand({
        data: {
          name: "Brand",
          logo: "https://example.com/logo.png",
          createdById: USER_ID,
        },
      });

      // Assert
      await expect(promise).rejects.toMatchObject({
        status: 500,
        response: { message: "Failed to create brand." },
      });
    });
  });
});

describe("BrandRepository - updateBrand", () => {
  let repository: BrandRepository;
  let mocks: BrandMocks;

  beforeEach(async () => {
    ({ repository, mocks } = await setupBrandRepository());
  });

  describe("happy path", () => {
    it("updates a brand with provided data and no translations", async () => {
      // Arrange
      const brand = makeBrand({ name: "Updated Brand" });
      const data = { name: "Updated Brand" };
      mocks.prismaService.brand.update.mockResolvedValue(brand);

      // Act
      const result = await repository.updateBrand({
        id: BRAND_ID,
        data,
      });

      // Assert
      expect(result).toEqual(brand);
      expect(mocks.prismaService.brand.update).toHaveBeenCalledWith(
        containing({
          where: { id: BRAND_ID, deletedAt: null },
          data: containing(data),
        }),
      );
    });

    it("updates a brand with new translations", async () => {
      // Arrange
      const brand = makeBrand();
      const data = { name: "Updated" };
      mocks.prismaService.brandTranslation.findMany.mockResolvedValue([
        makeBrandTranslation({ id: BRAND_TRANSLATION_ID_1 }),
      ]);
      mocks.prismaService.brand.update.mockResolvedValue(brand);

      // Act
      const result = await repository.updateBrand({
        id: BRAND_ID,
        data,
        brandTranslationIds: [BRAND_TRANSLATION_ID_1],
      });

      // Assert
      expect(result).toEqual(brand);
      expect(mocks.prismaService.brand.update).toHaveBeenCalledWith(
        containing({
          where: { id: BRAND_ID, deletedAt: null },
          data: containing({
            ...data,
            brandTranslations: {
              connect: [{ id: BRAND_TRANSLATION_ID_1 }],
            },
          }),
        }),
      );
    });
  });

  describe("error handling - record not found", () => {
    it("throws notFound error when brand does not exist", async () => {
      // Arrange
      const error = new PrismaClientKnownRequestError(
        "An operation failed because it depends on one or more records that were required but not found.",
        {
          code: "P2025",
          clientVersion: "6.0.0",
        },
      );
      mocks.prismaService.brand.update.mockRejectedValue(error);

      // Act
      const promise = repository.updateBrand({
        id: "non-existent",
        data: { name: "Updated" },
      });

      // Assert
      await expect(promise).rejects.toMatchObject({
        status: 404,
        response: { message: "Brand not found." },
      });
    });
  });

  describe("error handling - unique constraint", () => {
    it("throws unprocessable error on duplicate brand name", async () => {
      // Arrange
      const error = new PrismaClientKnownRequestError(
        "Unique constraint failed on the fields: `name`",
        {
          code: "P2002",
          clientVersion: "6.0.0",
        },
      );
      mocks.prismaService.brand.update.mockRejectedValue(error);

      // Act
      const promise = repository.updateBrand({
        id: BRAND_ID,
        data: { name: "Existing Brand Name" },
      });

      // Assert
      await expect(promise).rejects.toMatchObject({
        status: 422,
        response: {
          message: "Brand is already exists.",
          field: "brand.",
        },
      });
    });
  });

  describe("error handling - foreign key constraint", () => {
    it("throws unprocessable error on invalid foreign key", async () => {
      // Arrange
      const error = new PrismaClientKnownRequestError(
        "Foreign key constraint failed",
        {
          code: "P2003",
          clientVersion: "6.0.0",
        },
      );
      mocks.prismaService.brand.update.mockRejectedValue(error);

      // Act
      const promise = repository.updateBrand({
        id: BRAND_ID,
        data: { name: "Updated" },
      });

      // Assert
      await expect(promise).rejects.toMatchObject({
        status: 422,
        response: {
          message: "Failed to update brand.",
          field: "brand",
        },
      });
    });
  });
});

describe("BrandRepository - deleteBrand", () => {
  let repository: BrandRepository;
  let mocks: BrandMocks;

  beforeEach(async () => {
    ({ repository, mocks } = await setupBrandRepository());
  });

  describe("happy path - soft delete", () => {
    it("soft deletes a brand by default", async () => {
      // Arrange
      const brand = makeBrand({ deletedAt: new Date() });
      mocks.prismaService.brand.update.mockResolvedValue(brand);

      // Act
      const result = await repository.deleteBrand({
        id: BRAND_ID,
        userId: USER_ID,
      });

      // Assert
      expect(result).toEqual({ message: "Brand deleted successfully." });
      expect(mocks.prismaService.brand.update).toHaveBeenCalledWith(
        containing({
          where: { id: BRAND_ID, deletedAt: null },
          data: containing({
            deletedAt: anyDate(),
            deletedById: USER_ID,
            updatedById: USER_ID,
          }),
        }),
      );
    });
  });

  describe("happy path - hard delete", () => {
    it("hard deletes a brand when isHardDelete is true", async () => {
      // Arrange
      const brand = makeBrand();
      mocks.prismaService.brand.delete.mockResolvedValue(brand);

      // Act
      const result = await repository.deleteBrand({
        id: BRAND_ID,
        userId: USER_ID,
        isHardDelete: true,
      });

      // Assert
      expect(result).toEqual({ message: "Brand deleted successfully." });
      expect(mocks.prismaService.brand.delete).toHaveBeenCalledWith(
        containing({
          where: { id: BRAND_ID, deletedAt: null },
        }),
      );
    });
  });

  describe("error handling - record not found", () => {
    it("throws notFound error when brand does not exist", async () => {
      // Arrange
      const error = new PrismaClientKnownRequestError(
        "An operation failed because it depends on one or more records that were required but not found.",
        {
          code: "P2025",
          clientVersion: "6.0.0",
        },
      );
      mocks.prismaService.brand.update.mockRejectedValue(error);

      // Act
      const promise = repository.deleteBrand({
        id: "non-existent",
        userId: USER_ID,
      });

      // Assert
      await expect(promise).rejects.toMatchObject({
        status: 404,
        response: { message: "Brand not found." },
      });
    });
  });

  describe("error handling - internal error", () => {
    it("throws internal error on unexpected database failure", async () => {
      // Arrange
      const error = new Error("Database error");
      mocks.prismaService.brand.update.mockRejectedValue(error);

      // Act
      const promise = repository.deleteBrand({
        id: BRAND_ID,
        userId: USER_ID,
      });

      // Assert
      await expect(promise).rejects.toMatchObject({
        status: 500,
        response: { message: "Failed to delete brand." },
      });
    });
  });
});
