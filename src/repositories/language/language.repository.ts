import { Injectable, Logger } from "@nestjs/common";
import { Language, User } from "@prisma/client";

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

  async findManyLanguages() {
    try {
      const languages = await this.prismaService.language.findMany({
        where: {
          deletedAt: null,
        },
        select: {
          id: true,
          name: true,
        },
      });

      return languages;
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Failed to get languages`, error.stack);
      }

      throwHttpException({
        type: "internal",
        message: `Failed to get languages.`,
      });
    }
  }

  async findUniqueLanguage(id: string) {
    try {
      const language = await this.prismaService.language.findUniqueOrThrow({
        where: {
          id,
          deletedAt: null,
        },
        select: {
          id: true,
          name: true,
        },
      });

      return language;
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Failed to get language by id`, error.stack);
      }

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
        select: {
          id: true,
          name: true,
        },
      });

      return language;
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Failed to create language`, error.stack);
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
        select: {
          id: true,
          name: true,
        },
      });

      return language;
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Failed to update language`, error.stack);
      }

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
          select: {
            id: true,
            name: true,
          },
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
        },
        select: {
          id: true,
          name: true,
        },
      });

      return result;
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Failed to delete language`, error.stack);
      }

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
