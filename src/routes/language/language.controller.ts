import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { User } from "@prisma/client";

import { LanguageService } from "./language.service";

import {
  LanguageCreateRequestDto,
  LanguageCreateResponseDto,
  LanguageDeleteResponseDto,
  LanguageIdParamDto,
  LanguageResponseDto,
  LanguageUpdateRequestDto,
  LanguageUpdateResponseDto,
} from "@/dtos/language/language.dto";
import { PageDto } from "@/dtos/shared/page.dto";
import { PaginationQueryDto } from "@/dtos/shared/pagination.dto";
import ActiveUser from "@/shared/decorators/active-user.decorator";
import { ApiAuth, ApiPageOkResponse } from "@/shared/decorators/http-decorator";

@ApiTags("Languages")
@Controller("languages")
export class LanguageController {
  constructor(private readonly languageService: LanguageService) {}

  @Get()
  @ApiPageOkResponse({
    type: LanguageResponseDto,
    description: "Retrieve a list of languages with pagination.",
    summary: "Get a list of languages",
  })
  async getLanguages(
    @Query()
    query: PaginationQueryDto,
  ) {
    const result = await this.languageService.getLanguages(query);

    return new PageDto<LanguageResponseDto>(result);
  }

  @Get(":id")
  @ApiAuth({
    type: LanguageResponseDto,
    options: {
      summary: "Get a language by ID",
      description: "Retrieve a specific language by its ID.",
    },
  })
  async getLanguageById(@Param() params: LanguageIdParamDto) {
    const result = await this.languageService.getLanguageById(params.id);

    return new LanguageResponseDto(result);
  }

  @Post("create")
  @ApiAuth({
    type: LanguageCreateResponseDto,
    options: {
      summary: "Create a new language",
      description: "Create a new language.",
    },
  })
  async createLanguage(
    @Body() body: LanguageCreateRequestDto,
    @ActiveUser("userId") userId: User["id"],
  ) {
    const result = await this.languageService.createLanguage(body, userId);

    return new LanguageCreateResponseDto(result);
  }

  @Put(":id")
  @ApiAuth({
    type: LanguageUpdateResponseDto,
    options: {
      summary: "Update a language",
      description: "Update an existing language.",
    },
  })
  async updateLanguage(
    @Param() params: LanguageIdParamDto,
    @Body() body: LanguageUpdateRequestDto,
    @ActiveUser("userId") userId: User["id"],
  ) {
    const result = await this.languageService.updateLanguage({
      id: params.id,
      body,
      userId,
    });

    return new LanguageUpdateResponseDto(result);
  }

  @Delete(":id")
  @ApiAuth({
    type: LanguageDeleteResponseDto,
    options: {
      summary: "Delete a language",
      description: "Delete a specific language by its ID.",
    },
  })
  async deleteLanguage(@Param() params: LanguageIdParamDto) {
    const result = await this.languageService.deleteLanguage({
      id: params.id,
    });

    return new LanguageDeleteResponseDto(result);
  }
}
