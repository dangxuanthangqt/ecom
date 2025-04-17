import { Injectable } from "@nestjs/common";
import { Language, User } from "@prisma/client";

import {
  LanguageCreateRequestDto,
  LanguageCreateResponseDto,
  LanguageDeleteRequestDto,
  LanguageListResponseDto,
  LanguageResponseDto,
  LanguageUpdateRequestDto,
  LanguageUpdateResponseDto,
} from "@/dto/language/language.dto";
import { LanguageRepository } from "@/repositories/language/language.repository";

@Injectable()
export class LanguageService {
  constructor(private readonly languageRepository: LanguageRepository) {}

  async getLanguages(): Promise<LanguageListResponseDto> {
    const languages = await this.languageRepository.findManyLanguages();

    return {
      languages: languages,
      total: languages.length,
    };
  }

  async getLanguageById(id: string): Promise<LanguageResponseDto> {
    const language = await this.languageRepository.findUniqueLanguage(id);

    return language;
  }

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

  async updateLanguage(
    id: Language["id"],
    {
      name,
      updatedById,
    }: LanguageUpdateRequestDto & { updatedById: User["id"] },
  ): Promise<LanguageUpdateResponseDto> {
    const language = await this.languageRepository.updateLanguageById({
      where: {
        id,
      },
      data: {
        name,
        updatedById,
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
    body: LanguageDeleteRequestDto;
    userId: User["id"];
  }): Promise<LanguageUpdateResponseDto> {
    const language = await this.languageRepository.deleteLanguageById({
      id,
      isHardDelete,
      userId,
    });

    return language;
  }
}
