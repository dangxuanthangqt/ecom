import { Injectable } from "@nestjs/common";
import { Language, User } from "@prisma/client";

import { ORDER, ORDER_BY } from "@/constants/order";
import {
  LanguageCreateRequestDto,
  LanguageCreateResponseDto,
  LanguageDeleteRequestDto,
  LanguageResponseDto,
  LanguageUpdateRequestDto,
  LanguageUpdateResponseDto,
} from "@/dtos/language/language.dto";
import { PaginationQueryDto } from "@/dtos/shared/pagination.dto";
import { LanguageRepository } from "@/repositories/language/language.repository";

@Injectable()
export class LanguageService {
  constructor(private readonly languageRepository: LanguageRepository) {}

  /**
   * Retrieves a paginated list of languages with optional filtering and sorting.
   *
   * @param pageIndex - The current page index (default is 1).
   * @param pageSize - The number of items per page (default is 10).
   * @param order - The order direction (ASC or DESC, default is ASC).
   * @param orderBy - The field to order by (default is createdAt).
   * @param keyword - A keyword to filter languages by name (default is an empty string).
   * @returns An object containing the paginated list of languages and pagination metadata.
   */
  async getLanguages({
    pageIndex = 1,
    pageSize = 10,
    order = ORDER.ASC,
    orderBy = ORDER_BY.CREATED_AT,
    keyword = "",
  }: PaginationQueryDto) {
    const skip = (pageIndex - 1) * pageSize;
    const take = pageSize;

    // Normalize order for Prisma
    const normalizedOrder = order.toLowerCase();

    const { languages, languagesCount } =
      await this.languageRepository.findManyLanguages({
        where: {
          name: {
            contains: keyword,
            mode: "insensitive", // ← Không phân biệt hoa/thường
          },
        },
        take,
        skip,
        orderBy: { [orderBy]: normalizedOrder },
      });

    const totalPages = Math.ceil(languagesCount / pageSize);

    return {
      data: languages,
      pagination: {
        pageIndex,
        pageSize,
        totalPages,
        totalItems: languagesCount,
      },
    };
  }

  /**
   * Retrieves a specific language by its ID.
   *
   * @param id - The ID of the language to retrieve.
   * @returns The language details.
   */
  async getLanguageById(id: string): Promise<LanguageResponseDto> {
    const language = await this.languageRepository.findUniqueLanguage(id);

    return language;
  }

  /**
   * Creates a new language.
   *
   * @param name - The name of the language.
   * @param id - The unique identifier for the language.
   * @param userId - The ID of the user creating the language.
   * @returns The created language details.
   */
  async createLanguage(
    { name, id }: LanguageCreateRequestDto,
    userId: User["id"],
  ): Promise<LanguageCreateResponseDto> {
    const language = await this.languageRepository.createLanguage({
      createdById: userId,
      name,
      id,
    });

    return language;
  }

  /**
   * Updates an existing language by its ID.
   *
   * @param id - The ID of the language to update.
   * @param name - The new name for the language.
   * @param userId - The ID of the user updating the language.
   * @returns The updated language details.
   */
  async updateLanguage({
    id,
    body: { name },
    userId,
  }: {
    id: Language["id"];
    userId: User["id"];
    body: LanguageUpdateRequestDto;
  }): Promise<LanguageUpdateResponseDto> {
    const language = await this.languageRepository.updateLanguageById({
      where: {
        id,
      },
      data: {
        name,
        updatedById: userId,
      },
    });

    return language;
  }

  async deleteLanguage({
    id,
    userId,
    body: { isHardDelete },
  }: {
    id: Language["id"];
    userId: User["id"];
    body: LanguageDeleteRequestDto;
  }): Promise<LanguageUpdateResponseDto> {
    const language = await this.languageRepository.deleteLanguageById({
      id,
      isHardDelete,
      userId,
    });

    return language;
  }
}
