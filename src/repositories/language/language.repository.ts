import { Injectable, Logger } from "@nestjs/common";
import { Language, Prisma, User } from "@prisma/client";

import { languageSelect } from "@/selectors/language.selector";
import { PrismaService } from "@/shared/services/prisma.service";
import {
  isForeignKeyConstraintPrismaError,
  isRecordNotFoundPrismaError,
  isRecordToUpdateOrDeleteNotFoundPrismaError,
  isUniqueConstraintPrismaError,
} from "@/shared/utils/prisma-error";
import throwHttpException from "@/shared/utils/throw-http-exception.util";

@Injectable()
export class LanguageRepository {
  private readonly logger = new Logger(LanguageRepository.name);

  constructor(private readonly prismaService: PrismaService) {}

  /**
   * Fetches multiple languages that are not deleted.
   *
   * @param where - The filtering criteria for languages.
   * @param take - The maximum number of languages to return.
   * @param skip - The number of languages to skip.
   * @param orderBy - The ordering criteria for the languages.
   * @returns An object containing the fetched languages and their count.
   */
  async findManyLanguages({
    where,
    take,
    skip,
    orderBy,
  }: Pick<Prisma.LanguageFindManyArgs, "where" | "take" | "skip" | "orderBy">) {
    const combinedWhere: Prisma.LanguageWhereInput = {
      ...where,
      deletedAt: null,
    };

    try {
      const $languages = this.prismaService.language.findMany({
        where: combinedWhere,
        take,
        skip,
        orderBy,
        select: languageSelect,
      });

      const $languagesCount = this.prismaService.language.count({
        where: combinedWhere,
      });

      const [languagesCount, languages] = await Promise.all([
        $languagesCount,
        $languages,
      ]);

      return { languages, languagesCount };
    } catch (error) {
      this.logger.error(error);

      throwHttpException({
        type: "internal",
        message: "Failed to fetch languages.",
      });
    }
  }

  /**
   * Fetches a unique language by its ID.
   *
   * @param id - The ID of the language to fetch.
   * @returns The language with its ID and name.
   */
  async findUniqueLanguage(id: string) {
    try {
      const language = await this.prismaService.language.findUniqueOrThrow({
        where: {
          id,
          deletedAt: null,
        },
        select: languageSelect,
      });

      return language;
    } catch (error) {
      this.logger.error(error);

      if (isRecordNotFoundPrismaError(error)) {
        throwHttpException({
          type: "notFound",
          message: `Language ${id} not found.`,
        });
      }

      throwHttpException({
        type: "internal",
        message: `Failed to get language by id.`,
      });
    }
  }

  /**
   * Creates a new language.
   *
   * @param id - The ID of the language to create.
   * @param name - The name of the language.
   * @param createdById - The ID of the user creating the language.
   * @returns The created language with its ID and name.
   */
  async createLanguage({
    id,
    name,
    createdById,
  }: Pick<Language, "id" | "name"> & { createdById: User["id"] }) {
    try {
      const language = await this.prismaService.language.create({
        data: {
          id,
          name,
          createdById,
        },
        select: languageSelect,
      });

      return language;
    } catch (error) {
      this.logger.error(error);

      if (isUniqueConstraintPrismaError(error)) {
        throwHttpException({
          type: "unprocessable",
          message: `Language ${id} already exists.`,
        });
      }

      if (isForeignKeyConstraintPrismaError(error)) {
        throwHttpException({
          type: "unprocessable",
          message: `Invalid foreign key constraint.`,
        });
      }

      throwHttpException({
        type: "internal",
        message: `Failed to create language.`,
      });
    }
  }

  async updateLanguageById({
    where: { id },
    data: { name, updatedById },
  }: {
    where: { id: string };
    data: Pick<Language, "name" | "updatedById">;
  }) {
    try {
      const language = await this.prismaService.language.update({
        where: {
          id,
          deletedAt: null,
        },
        data: {
          name,
          updatedById,
        },
        select: languageSelect,
      });

      return language;
    } catch (error) {
      this.logger.error(error);

      if (isRecordToUpdateOrDeleteNotFoundPrismaError(error)) {
        throwHttpException({
          type: "notFound",
          message: `Language ${id} not found or already deleted.`,
        });
      }

      if (isUniqueConstraintPrismaError(error)) {
        throwHttpException({
          type: "unprocessable",
          message: `Language ${id} already exists.`,
        });
      }

      if (isForeignKeyConstraintPrismaError(error)) {
        throwHttpException({
          type: "unprocessable",
          message: `Invalid foreign key constraint.`,
        });
      }

      throwHttpException({
        type: "internal",
        message: `Failed to update language.`,
      });
    }
  }

  async deleteLanguageById({
    id,
    userId,
    isHardDelete = false,
  }: {
    id: string;
    userId: User["id"];
    isHardDelete?: boolean;
  }) {
    try {
      if (isHardDelete) {
        const result = await this.prismaService.language.delete({
          where: {
            id,
          },
          select: languageSelect,
        });

        return result;
      }

      const result = await this.prismaService.language.update({
        where: {
          id,
          deletedAt: null,
        },
        data: {
          deletedAt: new Date(),
          deletedById: userId,
          updatedById: userId,
        },
        select: languageSelect,
      });

      return result;
    } catch (error) {
      this.logger.error(error);

      /** Delete and Update not found record */
      if (isRecordToUpdateOrDeleteNotFoundPrismaError(error)) {
        throwHttpException({
          type: "notFound",
          message: `Language ${id} not found or already deleted.`,
        });
      }

      throwHttpException({
        type: "internal",
        message: `Language ${id} already exists.`,
      });
    }
  }
}
