import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { Language, User } from "@prisma/client";

import { PrismaService } from "@/shared/services/prisma.service";
import {
  isForeignKeyConstraintPrismaError,
  isRecordToUpdateOrDeleteNotFoundPrismaError,
  isUniqueConstraintPrismaError,
} from "@/shared/utils/prisma-error";

@Injectable()
export class LanguageRepository {
  private readonly logger = new Logger(LanguageRepository.name);

  constructor(private readonly prismaService: PrismaService) {}

  async getAllLanguages() {
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

      throw new InternalServerErrorException([
        {
          message: `Failed to get languages.`,
          path: `languages`,
        },
      ]);
    }
  }

  async getLanguageById(id: string) {
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

      if (isRecordToUpdateOrDeleteNotFoundPrismaError(error)) {
        throw new NotFoundException([
          {
            message: `Language ${id} not found.`,
            path: `language`,
          },
        ]);
      }

      throw new InternalServerErrorException([
        {
          message: `Failed to get language by id.`,
          path: `language`,
        },
      ]);
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
        throw new UnprocessableEntityException([
          {
            message: `Language ${id} already exists.`,
            path: "language",
          },
        ]);
      }

      if (isForeignKeyConstraintPrismaError(error)) {
        throw new UnprocessableEntityException([
          {
            message: "Invalid user ID.",
            path: "userId",
          },
        ]);
      }

      throw new InternalServerErrorException([
        {
          message: "Failed to create language.",
          path: "language",
        },
      ]);
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
        throw new NotFoundException([
          {
            message: "Language not found.",
            path: "language",
          },
        ]);
      }

      if (isUniqueConstraintPrismaError(error)) {
        throw new UnprocessableEntityException([
          {
            message: "Language already exists.",
            path: "language",
          },
        ]);
      }

      if (isForeignKeyConstraintPrismaError(error)) {
        const prismaError = error;
        const meta = prismaError.meta;
        const target = meta?.target as string[];
        const errorDetails = target.map((field) => {
          return {
            message: `Invalid ${field} ID.`,
            path: field,
          };
        });

        throw new UnprocessableEntityException(errorDetails);
      }

      throw new InternalServerErrorException([
        {
          message: "Failed to update language.",
          path: "language",
        },
      ]);
    }
  }

  async deleteLanguageById({
    where: { id },
    data: { updatedById },
    isHardDelete = false,
  }: {
    where: { id: string };
    data: Pick<Language, "updatedById">;
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
          updatedById,
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
        throw new NotFoundException([
          {
            message: `Language ${id} not found or already deleted.`,
            path: "language",
          },
        ]);
      }

      throw new InternalServerErrorException([
        {
          message: "Failed to delete language.",
          path: "language",
        },
      ]);
    }
  }
}
