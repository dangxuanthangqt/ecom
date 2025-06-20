import { Injectable, Logger } from "@nestjs/common";
import {
  Brand as BrandSchema,
  BrandTranslation as BrandTranslationSchema,
  Prisma,
  User as UserSchema,
} from "@prisma/client";
import { I18nService } from "nestjs-i18n";

import { brandWithTranslationsSelect } from "@/selectors/brand.selector";
import { PrismaService } from "@/shared/services/prisma.service";
import {
  isForeignKeyConstraintPrismaError,
  isRecordNotFoundPrismaError,
  isUniqueConstraintPrismaError,
} from "@/shared/utils/prisma-error";
import throwHttpException from "@/shared/utils/throw-http-exception.util";

@Injectable()
export class BrandRepository {
  private logger = new Logger(BrandRepository.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly i18n: I18nService,
  ) {}

  private translateMessage(
    languageId: string,
    key: string,
    args?: Record<string, any>,
  ): string {
    return this.i18n.t(key, {
      lang: languageId,
      args,
    });
  }

  /**
   * Fetches multiple brands based on the provided criteria.
   *
   * @param where - The filtering criteria for brands.
   * @param take - The maximum number of brands to return.
   * @param skip - The number of brands to skip.
   * @param orderBy - The ordering criteria for the brands.
   * @returns An object containing the fetched brands and their count.
   */
  async findManyBrands(
    {
      where,
      take,
      skip,
      orderBy,
    }: Pick<Prisma.BrandFindManyArgs, "where" | "take" | "skip" | "orderBy">,
    languageId: string,
  ) {
    const combinedWhere: Prisma.BrandWhereInput = {
      ...where,
      deletedAt: null,
    };

    try {
      const $brands = this.prismaService.brand.findMany({
        where: combinedWhere,
        take,
        skip,
        orderBy,
        select: brandWithTranslationsSelect({ languageId }),
      });

      const $brandsCount = this.prismaService.brand.count({
        where: combinedWhere,
      });

      const [brandsCount, brands] = await Promise.all([$brandsCount, $brands]);

      return { brands, brandsCount };
    } catch (error) {
      this.logger.error(error);

      throwHttpException({
        type: "internal",
        message: "Failed to fetch brands.",
      });
    }
  }

  /**
   *
   * @param id - The ID of the brand to find.
   * @param languageId - The ID of the language for translations.
   *
   * Finds a unique brand by its ID and includes translations based on the provided language ID.
   * @returns The found brand with translations.
   */
  async findUniqueBrand(id: BrandSchema["id"], languageId: string) {
    try {
      const brand = await this.prismaService.brand.findUniqueOrThrow({
        where: { id, deletedAt: null },
        select: brandWithTranslationsSelect({ languageId }),
      });

      return brand;
    } catch (error) {
      this.logger.error(error);

      if (isRecordNotFoundPrismaError(error)) {
        const message = this.translateMessage(languageId, "message.NOT_FOUND");

        throwHttpException({
          type: "notFound",
          message,
        });
      }

      throwHttpException({
        type: "internal",
        message: "Failed to fetch brand.",
      });
    }
  }

  /**
   * Creates a new brand with optional translations.
   *
   * @param data - The data for the new brand.
   * @param brandTranslationIds - Optional array of brand translation IDs to connect.
   * @returns The created brand with translations.
   */
  async createBrand({
    data,
    brandTranslationIds,
  }: {
    data: Prisma.BrandCreateArgs["data"];
    brandTranslationIds?: BrandSchema["id"][];
  }) {
    if (brandTranslationIds && brandTranslationIds.length > 0) {
      await this.validateBrandTranslations(brandTranslationIds);
    }

    try {
      const result = await this.prismaService.brand.create({
        data: {
          ...data,
          brandTranslations: {
            connect: brandTranslationIds?.map((id) => ({ id })),
          },
        },
        select: brandWithTranslationsSelect(),
      });

      return result;
    } catch (error) {
      this.logger.error(error);

      if (isUniqueConstraintPrismaError(error)) {
        throwHttpException({
          type: "unprocessable",
          message: "Brand is already exists.",
          field: "brand.",
        });
      }

      if (isForeignKeyConstraintPrismaError(error)) {
        throwHttpException({
          type: "unprocessable",
          message: "Failed to create brand.",
          field: "brand",
        });
      }

      throwHttpException({
        type: "internal",
        message: "Failed to create brand.",
      });
    }
  }

  /**
   * Validates the provided brand translation IDs.
   *
   * @param brandTranslationIds - The array of brand translation IDs to validate.
   * @throws HttpException if any of the IDs are invalid.
   */
  private async validateBrandTranslations(
    brandTranslationIds: BrandSchema["id"][],
  ) {
    const validBrandTranslations =
      await this.prismaService.brandTranslation.findMany({
        where: {
          id: { in: brandTranslationIds },
          deletedAt: null,
        },
        select: { id: true },
      });

    if (validBrandTranslations.length !== brandTranslationIds.length) {
      throwHttpException({
        type: "unprocessable",
        message: "Invalid brand translations.",
        field: "brandTranslationIds",
      });
    }
  }

  /**
   * Updates an existing brand with optional translations.
   *
   * @param id - The ID of the brand to update.
   * @param data - The data to update the brand with.
   * @param brandTranslationIds - Optional array of brand translation IDs to connect.
   * @returns The updated brand with translations.
   */
  async updateBrand({
    id,
    data,
    brandTranslationIds,
  }: {
    id: BrandSchema["id"];
    data: Prisma.BrandUpdateArgs["data"];
    brandTranslationIds?: BrandTranslationSchema["id"][];
  }) {
    // Validate brand translation IDs if provided
    // This is to ensure that the brand translations exist before updating the brand
    if (brandTranslationIds && brandTranslationIds.length > 0) {
      await this.validateBrandTranslations(brandTranslationIds);
    }

    try {
      const brand = await this.prismaService.brand.update({
        where: { id, deletedAt: null },
        data: {
          ...data,
          brandTranslations: {
            connect: brandTranslationIds?.map((id) => ({ id })),
          },
        },
        select: brandWithTranslationsSelect(),
      });

      return brand;
    } catch (error) {
      this.logger.error(error);

      if (isRecordNotFoundPrismaError(error)) {
        throwHttpException({
          type: "notFound",
          message: "Brand not found.",
        });
      }

      if (isUniqueConstraintPrismaError(error)) {
        throwHttpException({
          type: "unprocessable",
          message: "Brand is already exists.",
          field: "brand.",
        });
      }

      if (isForeignKeyConstraintPrismaError(error)) {
        throwHttpException({
          type: "unprocessable",
          message: "Failed to update brand.",
          field: "brand",
        });
      }

      throwHttpException({
        type: "internal",
        message: "Failed to update brand.",
      });
    }
  }

  /**
   * Deletes a brand by its ID, either soft or hard delete.
   *
   * @param id - The ID of the brand to delete.
   * @param userId - The ID of the user performing the deletion.
   * @param isHardDelete - Whether to perform a hard delete (default: false).
   * @returns A message indicating the result of the deletion.
   */
  async deleteBrand({
    id,
    userId,
    isHardDelete = false,
  }: {
    id: BrandSchema["id"];
    userId: UserSchema["id"];
    isHardDelete?: boolean;
  }) {
    try {
      if (isHardDelete) {
        await this.prismaService.brand.delete({
          where: { id, deletedAt: null },
          select: brandWithTranslationsSelect(),
        });
      } else {
        await this.prismaService.brand.update({
          where: { id, deletedAt: null },
          data: {
            deletedAt: new Date(),
            deletedById: userId,
            updatedById: userId,
          },
          select: brandWithTranslationsSelect(),
        });
      }

      return { message: "Brand deleted successfully." };
    } catch (error) {
      this.logger.error(error);

      if (isRecordNotFoundPrismaError(error)) {
        throwHttpException({
          type: "notFound",
          message: "Brand not found.",
        });
      }

      throwHttpException({
        type: "internal",
        message: "Failed to delete brand.",
      });
    }
  }
}
