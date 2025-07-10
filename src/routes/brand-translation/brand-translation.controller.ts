import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
} from "@nestjs/common";
import { ApiParam } from "@nestjs/swagger";
import { User } from "@prisma/client";

import { BrandTranslationService } from "./brand-translation.service";

import { BrandPaginationQueryDto } from "@/dtos/brand/brand.dto";
import {
  BrandTranslationWithBrandAndLanguageResponseDto,
  CreateBrandTranslationRequestDto,
  UpdateBrandTranslationRequestDto,
} from "@/dtos/brand-translation/brand-translation.dto";
import { PageDto } from "@/dtos/shared/page.dto";
import ActiveUser from "@/shared/param-decorators/active-user.decorator";
import {
  ApiAuth,
  ApiPageOkResponse,
} from "@/shared/param-decorators/http-decorator";

@Controller("brand-translations")
export class BrandTranslationController {
  constructor(
    private readonly brandTranslationService: BrandTranslationService,
  ) {}

  @ApiPageOkResponse({
    type: BrandTranslationWithBrandAndLanguageResponseDto,
    description: "Retrieve a list of brand translations with pagination.",
    summary: "Get a list of brand translations",
  })
  @Get()
  async getBrandTranslations(@Query() query: BrandPaginationQueryDto) {
    const result =
      await this.brandTranslationService.getBrandTranslations(query);

    return new PageDto<BrandTranslationWithBrandAndLanguageResponseDto>(result);
  }

  @ApiAuth({
    type: BrandTranslationWithBrandAndLanguageResponseDto,
    options: {
      summary: "Get a brand translation by ID",
      description: "Retrieves a specific brand translation by its ID.",
    },
  })
  @ApiParam({
    name: "id",
    description: "The ID of the brand translation to retrieve",
    example: "123e4567-e89b-12d3-a456-426614174000",
    required: true,
    type: String,
  })
  @Get(":id")
  async getBrandTranslationById(@Param("id", ParseUUIDPipe) id: string) {
    const result =
      await this.brandTranslationService.getBrandTranslationById(id);

    return new BrandTranslationWithBrandAndLanguageResponseDto(result);
  }

  @ApiAuth({
    type: CreateBrandTranslationRequestDto,
    options: {
      summary: "Create a new brand translation",
      description: "Creates a new brand translation.",
    },
  })
  @Post()
  async createBrandTranslation(
    @ActiveUser("userId") userId: User["id"],
    @Body() data: CreateBrandTranslationRequestDto,
  ) {
    const result = await this.brandTranslationService.createBrandTranslation({
      data,
      userId,
    });

    return new BrandTranslationWithBrandAndLanguageResponseDto(result);
  }

  @ApiAuth({
    type: UpdateBrandTranslationRequestDto,
    options: {
      summary: "Update a brand translation",
      description: "Updates an existing brand translation.",
    },
  })
  @Put(":id")
  async updateBrandTranslation(
    @Param("id", ParseUUIDPipe) id: string,
    @ActiveUser("userId") userId: User["id"],
    @Body() data: UpdateBrandTranslationRequestDto,
  ) {
    const result = await this.brandTranslationService.updateBrandTranslation({
      id,
      data,
      userId,
    });

    return new BrandTranslationWithBrandAndLanguageResponseDto(result);
  }

  @ApiAuth({
    type: BrandTranslationWithBrandAndLanguageResponseDto,
    options: {
      summary: "Delete a brand translation",
      description: "Deletes an existing brand translation.",
    },
  })
  @Delete(":id")
  async deleteBrandTranslation(
    @Param("id", ParseUUIDPipe) id: string,
    @ActiveUser("userId") userId: User["id"],
  ) {
    const result = await this.brandTranslationService.deleteBrandTranslation({
      id,
      userId,
    });

    return new BrandTranslationWithBrandAndLanguageResponseDto(result);
  }
}
