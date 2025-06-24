import { Injectable, Logger } from "@nestjs/common";
import {
  Brand as BrandSchema,
  BrandTranslation as BrandTranslationSchema,
  Language as LanguageSchema,
  Prisma,
} from "@prisma/client";

import { brandTranslationSelect } from "@/selectors/brand-translation.selector";
import { PrismaService } from "@/shared/services/prisma.service";
import {
  isForeignKeyConstraintPrismaError,
  isRecordNotFoundPrismaError,
  isUniqueConstraintPrismaError,
} from "@/shared/utils/prisma-error";
import throwHttpException from "@/shared/utils/throw-http-exception.util";

@Injectable()
export class BrandTranslationRepository {
  private logger = new Logger(BrandTranslationRepository.name);

  constructor(private readonly prismaService: PrismaService) {}

  /**
   * Fetches multiple brand translations based on the provided criteria.
   *
   * @param where - The filtering criteria for brand translations.
   * @param take - The maximum number of brand translations to return.
   * @param skip - The number of brand translations to skip.
   * @param orderBy - The ordering criteria for the brand translations.
   * @returns An object containing the fetched brand translations and their count.
   */
  async findManyBrandTranslations({
    where,
    take,
    skip,
    orderBy,
  }: Pick<
    Prisma.BrandTranslationFindManyArgs,
    "where" | "take" | "skip" | "orderBy"
  >) {
    const combinedWhere: Prisma.BrandTranslationWhereInput = {
      ...where,
      deletedAt: null,
    };

    try {
      const $brandTranslations = this.prismaService.brandTranslation.findMany({
        where: combinedWhere,
        take,
        skip,
        orderBy,
        select: brandTranslationSelect,
      });

      const $brandTranslationsCount = this.prismaService.brandTranslation.count(
        {
          where: combinedWhere,
        },
      );

      const [brandTranslationsCount, brandTranslations] = await Promise.all([
        $brandTranslationsCount,
        $brandTranslations,
      ]);

      return { brandTranslations, brandTranslationsCount };
    } catch (error) {
      this.logger.error(error);

      throwHttpException({
        type: "internal",
        message: "Failed to fetch brand translations.",
      });
    }
  }

  /**
   * Fetches a unique brand translation by its ID.
   *
   * @param id - The ID of the brand translation to fetch.
   * @returns The fetched brand translation.
   */
  async findUniqueBrandTranslation(id: BrandTranslationSchema["id"]) {
    try {
      const brandTranslation =
        await this.prismaService.brandTranslation.findUniqueOrThrow({
          where: { id, deletedAt: null },
          select: brandTranslationSelect,
        });

      return brandTranslation;
    } catch (error) {
      this.logger.error(error);

      if (isRecordNotFoundPrismaError(error)) {
        throwHttpException({
          type: "notFound",
          message: `Brand translation with ID ${id} not found.`,
        });
      }

      throwHttpException({
        type: "internal",
        message: `Failed to fetch brand translation by ID ${id}.`,
      });
    }
  }

  /**
   * Validates the existence of a brand by its ID.
   *
   * @param id - The ID of the brand to validate.
   * @returns The validated brand object.
   */
  async validateBrand(id: BrandSchema["id"]) {
    try {
      const brand = await this.prismaService.brand.findUniqueOrThrow({
        where: { id, deletedAt: null },
        select: { id: true },
      });

      return brand;
    } catch (error) {
      this.logger.error(error);

      if (isRecordNotFoundPrismaError(error)) {
        throwHttpException({
          type: "notFound",
          message: `Brand with ID ${id} not found.`,
        });
      }

      throwHttpException({
        type: "internal",
        message: `Failed to validate brand with ID ${id}.`,
      });
    }
  }

  /**
   * Validates the existence of a language by its ID.
   *
   * @param id - The ID of the language to validate.
   * @returns The validated language object.
   */
  async validateLanguage(id: LanguageSchema["id"]) {
    try {
      const language = await this.prismaService.language.findUniqueOrThrow({
        where: { id, deletedAt: null },
        select: { id: true },
      });

      return language;
    } catch (error) {
      this.logger.error(error);

      if (isRecordNotFoundPrismaError(error)) {
        throwHttpException({
          type: "notFound",
          message: `Language with ID ${id} not found.`,
        });
      }

      throwHttpException({
        type: "internal",
        message: `Failed to validate language with ID ${id}.`,
      });
    }
  }

  /**
   * Creates a new brand translation.
   *
   * @param data - The data for the new brand translation.
   * @returns The created brand translation.
   */
  async createBrandTranslation({
    data,
  }: {
    data: Prisma.BrandTranslationCreateArgs["data"];
  }) {
    try {
      const brandTranslation = await this.prismaService.brandTranslation.create(
        {
          data,
          select: brandTranslationSelect,
        },
      );

      return brandTranslation;
    } catch (error) {
      this.logger.error(error);

      if (isUniqueConstraintPrismaError(error)) {
        throwHttpException({
          type: "unprocessable",
          message: `Brand translation with name "${data.name}" already exists.`,
          field: "brandTranslation",
        });
      }

      if (isForeignKeyConstraintPrismaError(error)) {
        throwHttpException({
          type: "unprocessable",
          message:
            "Failed to create brand translation due to foreign key constraint.",
          field: "brandTranslation",
        });
      }

      throwHttpException({
        type: "internal",
        message: "Failed to create brand translation.",
      });
    }
  }

  /**
   * Updates an existing brand translation.
   *
   * @param id - The ID of the brand translation to update.
   * @param data - The data to update the brand translation with.
   * @returns The updated brand translation.
   */
  async updateBrandTranslation({
    id,
    data,
  }: {
    id: BrandTranslationSchema["id"];
    data: Prisma.BrandTranslationUpdateArgs["data"];
  }) {
    try {
      const brandTranslation = await this.prismaService.brandTranslation.update(
        {
          where: { id, deletedAt: null },
          data,
          select: brandTranslationSelect,
        },
      );

      return brandTranslation;
    } catch (error) {
      this.logger.error(error);

      if (isRecordNotFoundPrismaError(error)) {
        throwHttpException({
          type: "notFound",
          message: `Brand translation with ID ${id} not found.`,
        });
      }

      if (isUniqueConstraintPrismaError(error)) {
        throwHttpException({
          type: "unprocessable",
          message: `Brand translation already exists.`,
          field: "brandTranslation",
        });
      }

      if (isForeignKeyConstraintPrismaError(error)) {
        throwHttpException({
          type: "unprocessable",
          message:
            "Failed to update brand translation due to foreign key constraint.",
          field: "brandTranslation",
        });
      }

      throwHttpException({
        type: "internal",
        message: `Failed to update brand translation with ID ${id}.`,
      });
    }
  }

  /**
   * Deletes a brand translation by its ID.
   *
   * @param id - The ID of the brand translation to delete.
   * @param userId - The ID of the user performing the deletion.
   * @returns The deleted brand translation.
   */
  async deleteBrandTranslation({
    id,
    userId,
  }: {
    id: BrandTranslationSchema["id"];
    userId: BrandTranslationSchema["updatedById"];
  }) {
    try {
      const brandTranslation = await this.prismaService.brandTranslation.update(
        {
          where: { id, deletedAt: null },
          data: {
            deletedAt: new Date(),
            deletedById: userId,
            updatedById: userId,
          },
          select: brandTranslationSelect,
        },
      );

      return brandTranslation;
    } catch (error) {
      this.logger.error(error);

      if (isRecordNotFoundPrismaError(error)) {
        throwHttpException({
          type: "notFound",
          message: `Brand translation with ID ${id} not found.`,
        });
      }

      throwHttpException({
        type: "internal",
        message: `Failed to delete brand translation with ID ${id}.`,
      });
    }
  }
}
