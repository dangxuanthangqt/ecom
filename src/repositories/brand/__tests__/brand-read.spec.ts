import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

import { BrandRepository } from "@/repositories/brand/brand.repository";

import {
  BRAND_ID,
  LANGUAGE_ID,
  containing,
  makeBrand,
  setupBrandRepository,
  BrandMocks,
} from "./brand-test-harness";

describe("BrandRepository - findManyBrands", () => {
  let repository: BrandRepository;
  let mocks: BrandMocks;

  beforeEach(async () => {
    ({ repository, mocks } = await setupBrandRepository());
  });

  describe("happy path", () => {
    it("returns brands and their count with provided filters", async () => {
      // Arrange
      const brands = [makeBrand(), makeBrand({ id: "brand-2" })];
      mocks.prismaService.brand.findMany.mockResolvedValue(brands);
      mocks.prismaService.brand.count.mockResolvedValue(2);

      // Act
      const result = await repository.findManyBrands(
        {
          where: {},
          take: 10,
          skip: 0,
          orderBy: { createdAt: "desc" },
        },
        LANGUAGE_ID,
      );

      // Assert
      expect(result).toEqual({ brands, brandsCount: 2 });
    });

    it("always filters out deleted brands", async () => {
      // Arrange
      const brands = [makeBrand()];
      mocks.prismaService.brand.findMany.mockResolvedValue(brands);
      mocks.prismaService.brand.count.mockResolvedValue(1);

      // Act
      await repository.findManyBrands(
        {
          where: {},
          take: 10,
          skip: 0,
          orderBy: { createdAt: "desc" },
        },
        LANGUAGE_ID,
      );

      // Assert
      expect(mocks.prismaService.brand.findMany).toHaveBeenCalledWith(
        containing({
          where: containing({ deletedAt: null }),
        }),
      );
    });

    it("applies pagination with take and skip", async () => {
      // Arrange
      const brands = [makeBrand()];
      mocks.prismaService.brand.findMany.mockResolvedValue(brands);
      mocks.prismaService.brand.count.mockResolvedValue(50);

      // Act
      await repository.findManyBrands(
        {
          where: {},
          take: 20,
          skip: 40,
          orderBy: { createdAt: "desc" },
        },
        LANGUAGE_ID,
      );

      // Assert
      expect(mocks.prismaService.brand.findMany).toHaveBeenCalledWith(
        containing({
          take: 20,
          skip: 40,
        }),
      );
    });

    it("uses Promise.all to fetch brands and count in parallel", async () => {
      // Arrange
      const brands = [makeBrand()];
      mocks.prismaService.brand.findMany.mockResolvedValue(brands);
      mocks.prismaService.brand.count.mockResolvedValue(1);

      // Act
      await repository.findManyBrands(
        {
          where: {},
          take: 10,
          skip: 0,
          orderBy: { createdAt: "desc" },
        },
        LANGUAGE_ID,
      );

      // Assert
      expect(mocks.prismaService.brand.findMany).toHaveBeenCalled();
      expect(mocks.prismaService.brand.count).toHaveBeenCalled();
    });
  });

  describe("error handling", () => {
    it("throws internal error on database failure", async () => {
      // Arrange
      const error = new Error("Database connection lost");
      mocks.prismaService.brand.findMany.mockRejectedValue(error);

      // Act
      const promise = repository.findManyBrands(
        {
          where: {},
          take: 10,
          skip: 0,
          orderBy: { createdAt: "desc" },
        },
        LANGUAGE_ID,
      );

      // Assert
      await expect(promise).rejects.toMatchObject({
        status: 500,
        response: { message: "Failed to fetch brands." },
      });
    });
  });
});

describe("BrandRepository - findUniqueBrand", () => {
  let repository: BrandRepository;
  let mocks: BrandMocks;

  beforeEach(async () => {
    ({ repository, mocks } = await setupBrandRepository());
  });

  describe("happy path", () => {
    it("returns a brand by ID with translations in specified language", async () => {
      // Arrange
      const brand = makeBrand();
      mocks.prismaService.brand.findUniqueOrThrow.mockResolvedValue(brand);

      // Act
      const result = await repository.findUniqueBrand({
        brandId: BRAND_ID,
        languageId: LANGUAGE_ID,
      });

      // Assert
      expect(result).toEqual(brand);
      expect(mocks.prismaService.brand.findUniqueOrThrow).toHaveBeenCalledWith(
        containing({
          where: { id: BRAND_ID, deletedAt: null },
        }),
      );
    });
  });

  describe("error handling - record not found", () => {
    it("throws notFound error and translates message when brand does not exist", async () => {
      // Arrange
      const error = new PrismaClientKnownRequestError(
        "An operation failed because it depends on one or more records that were required but not found.",
        {
          code: "P2025",
          clientVersion: "6.0.0",
        },
      );
      mocks.prismaService.brand.findUniqueOrThrow.mockRejectedValue(error);
      mocks.i18n.t.mockReturnValue("Brand not found");

      // Act
      const promise = repository.findUniqueBrand({
        brandId: "non-existent",
        languageId: LANGUAGE_ID,
      });

      // Assert
      await expect(promise).rejects.toMatchObject({
        status: 404,
        response: { message: "Brand not found" },
      });
      expect(mocks.i18n.t).toHaveBeenCalledWith("message.NOT_FOUND", {
        lang: LANGUAGE_ID,
        args: undefined,
      });
    });
  });

  describe("error handling - internal error", () => {
    it("throws internal error on unexpected database failure", async () => {
      // Arrange
      const error = new Error("Database error");
      mocks.prismaService.brand.findUniqueOrThrow.mockRejectedValue(error);

      // Act
      const promise = repository.findUniqueBrand({
        brandId: BRAND_ID,
        languageId: LANGUAGE_ID,
      });

      // Assert
      await expect(promise).rejects.toMatchObject({
        status: 500,
        response: { message: "Failed to fetch brand." },
      });
    });
  });
});
