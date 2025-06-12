import { Injectable, Logger } from "@nestjs/common";
import {
  Brand as BrandSchema,
  BrandTranslation as BrandTranslationSchema,
  Prisma,
  User as UserSchema,
} from "@prisma/client";

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

  constructor(private readonly prismaService: PrismaService) {}

  async findManyBrands({
    where,
    take,
    skip,
    orderBy,
  }: Pick<Prisma.BrandFindManyArgs, "where" | "take" | "skip" | "orderBy">) {
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
        select: brandWithTranslationsSelect,
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

  async findUniqueBrand(id: BrandSchema["id"]) {
    try {
      const brand = await this.prismaService.brand.findUniqueOrThrow({
        where: { id, deletedAt: null },
        select: brandWithTranslationsSelect,
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

      throwHttpException({
        type: "internal",
        message: "Failed to fetch brand.",
      });
    }
  }

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
        select: brandWithTranslationsSelect,
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

  async updateBrand({
    id,
    data,
    brandTranslationIds,
  }: {
    id: BrandSchema["id"];
    data: Prisma.BrandUpdateArgs["data"];
    brandTranslationIds?: BrandTranslationSchema["id"][];
  }) {
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
        select: brandWithTranslationsSelect,
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
          select: brandWithTranslationsSelect,
        });
      } else {
        await this.prismaService.brand.update({
          where: { id, deletedAt: null },
          data: {
            deletedAt: new Date(),
            deletedById: userId,
            updatedById: userId,
          },
          select: brandWithTranslationsSelect,
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
