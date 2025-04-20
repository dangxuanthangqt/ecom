import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
} from "@nestjs/common";
import {
  ApiInternalServerErrorResponse,
  ApiParam,
  ApiTags,
} from "@nestjs/swagger";

import { LanguageService } from "./language.service";

import {
  LanguageCreateRequestDto,
  LanguageCreateResponseDto,
  LanguageDeleteRequestDto,
  LanguageDeleteResponseDto,
  LanguageIdParamDto,
  LanguageListResponseDto,
  LanguageResponseDto,
  LanguageUpdateRequestDto,
  LanguageUpdateResponseDto,
} from "@/dto/language/language.dto";
import ActiveUser from "@/shared/decorators/active-user.decorator";
import { ApiAuth } from "@/shared/decorators/http-decorator";

@ApiTags("Languages")
@Controller("languages")
export class LanguageController {
  constructor(private readonly languageService: LanguageService) {}

  @Get()
  @ApiAuth({
    type: LanguageListResponseDto,
    options: {
      summary: "Get a list of languages",
      description: "Retrieve a list of languages with pagination.",
    },
  })
  @ApiInternalServerErrorResponse({ description: "Internal server error." })
  async getLanguages() {
    const result = await this.languageService.getLanguages();

    return new LanguageListResponseDto(result);
  }

  @Get(":id")
  @ApiAuth({
    type: LanguageResponseDto,
    options: {
      summary: "Get a language by ID",
      description: "Retrieve a specific language by its ID.",
    },
  })
  @ApiParam({ name: "id", type: String, description: "Language ID" })
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
    @ActiveUser("userId") userId: number,
  ) {
    const result = await this.languageService.createLanguage(body, userId);

    return new LanguageCreateResponseDto(result);
  }

  @Put(":id")
  @ApiParam({ name: "id", type: String, description: "Language ID" })
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
    @ActiveUser("userId") userId: number,
  ) {
    const result = await this.languageService.updateLanguage(params.id, {
      name: body.name,
      updatedById: userId,
    });

    return new LanguageUpdateResponseDto(result);
  }

  @Delete(":id")
  @ApiParam({ name: "id", type: String, description: "Language ID" })
  @ApiAuth({
    type: LanguageDeleteResponseDto,
    options: {
      summary: "Delete a language",
      description: "Delete a specific language by its ID.",
    },
  })
  async deleteLanguage(
    @Param() params: LanguageIdParamDto,
    @Body() body: LanguageDeleteRequestDto,
    @ActiveUser("userId") userId: number,
  ) {
    const result = await this.languageService.deleteLanguage({
      id: params.id,
      userId,
      body,
    });

    return new LanguageDeleteResponseDto(result);
  }
}
