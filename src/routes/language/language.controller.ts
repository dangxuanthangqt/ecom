import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  ValidationPipe,
} from "@nestjs/common";
import {
  ApiTags,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiParam,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiUnprocessableEntityResponse,
  ApiInternalServerErrorResponse,
} from "@nestjs/swagger";

import { LanguageService } from "./language.service";

import {
  LanguageCreateRequestDto,
  LanguageCreateResponseDto,
  LanguageDeleteRequestDto,
  LanguageIdParamDto,
  LanguageListResponseDto,
  LanguageResponseDto,
  LanguageUpdateRequestDto,
  LanguageUpdateResponseDto,
  LanguageDeleteResponseDto,
} from "@/dto/language/language.dto";
import ActiveUser from "@/shared/decorators/active-user.decorator";

@ApiTags("languages")
@Controller("languages")
export class LanguageController {
  constructor(private readonly languageService: LanguageService) {}

  @Get()
  @ApiOkResponse({
    description: "Successfully retrieved the list of languages.",
    type: LanguageListResponseDto,
  })
  @ApiInternalServerErrorResponse({ description: "Internal server error." })
  async getLanguages() {
    const result = await this.languageService.getLanguages();

    return new LanguageListResponseDto(result);
  }

  @Get(":id")
  @ApiParam({ name: "id", type: String, description: "Language ID" })
  @ApiOkResponse({
    description: "Successfully retrieved the language.",
    type: LanguageResponseDto,
  })
  @ApiNotFoundResponse({ description: "Language not found." })
  @ApiInternalServerErrorResponse({ description: "Internal server error." })
  async getLanguageById(
    @Param(new ValidationPipe({ transform: true })) params: LanguageIdParamDto,
  ) {
    const result = await this.languageService.getLanguageById(params.id);

    return new LanguageResponseDto(result);
  }

  @Post("create")
  @ApiCreatedResponse({
    description: "Successfully created the language.",
    type: LanguageCreateResponseDto,
  })
  @ApiBadRequestResponse({ description: "Bad request." })
  @ApiUnprocessableEntityResponse({
    description: "Language already exists or invalid user ID.",
  })
  @ApiInternalServerErrorResponse({ description: "Internal server error." })
  async createLanguage(
    @Body() body: LanguageCreateRequestDto,
    @ActiveUser("userId") userId: number,
  ) {
    const result = await this.languageService.createLanguage(body, userId);

    return new LanguageCreateResponseDto(result);
  }

  @Put(":id")
  @ApiParam({ name: "id", type: String, description: "Language ID" })
  @ApiOkResponse({
    description: "Successfully updated the language.",
    type: LanguageUpdateResponseDto,
  })
  @ApiBadRequestResponse({ description: "Bad request." })
  @ApiNotFoundResponse({ description: "Language not found." })
  @ApiUnprocessableEntityResponse({
    description: "Language already exists or invalid user ID.",
  })
  @ApiInternalServerErrorResponse({ description: "Internal server error." })
  async updateLanguage(
    @Param(new ValidationPipe({ transform: true })) params: LanguageIdParamDto,
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
  @ApiOkResponse({
    description: "Successfully deleted the language.",
    type: LanguageDeleteResponseDto,
  })
  @ApiNotFoundResponse({
    description: "Language not found or already deleted.",
  })
  @ApiInternalServerErrorResponse({ description: "Internal server error." })
  async deleteLanguage(
    @Param(new ValidationPipe({ transform: true })) params: LanguageIdParamDto,
    @Body() body: LanguageDeleteRequestDto,
    @ActiveUser("userId") userId: number,
  ) {
    const result = await this.languageService.deleteLanguage(
      params.id,
      body,
      userId,
    );

    return new LanguageDeleteResponseDto(result);
  }
}
