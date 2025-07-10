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
import { ApiParam, ApiTags } from "@nestjs/swagger";
import { ProductTranslation, User } from "@prisma/client";

import { ProductTranslationService } from "./product-translation.service";

import {
  CreateProductTranslationRequestDto,
  ProductTranslationPaginationQueryDto,
  ProductTranslationResponseDto,
  UpdateProductTranslationRequestDto,
} from "@/dtos/product-translation/product-translation.dto";
import { PageDto } from "@/dtos/shared/page.dto";
import ActiveUser from "@/shared/param-decorators/active-user.decorator";
import {
  ApiAuth,
  ApiPageOkResponse,
} from "@/shared/param-decorators/http-decorator";

@ApiTags("Product Translations")
@Controller("product-translations")
export class ProductTranslationController {
  constructor(
    private readonly productTranslationService: ProductTranslationService,
  ) {}

  @ApiPageOkResponse({
    type: ProductTranslationResponseDto,
    description: "Retrieve a list of product translations with pagination.",
    summary: "Get a list of product translations",
  })
  @Get()
  async getProductTranslations(
    @Query() query: ProductTranslationPaginationQueryDto,
  ) {
    const result =
      await this.productTranslationService.getProductTranslations(query);

    return new PageDto<ProductTranslationResponseDto>(result);
  }

  @ApiAuth({
    type: ProductTranslationResponseDto,
    options: {
      summary: "Get a product translation by ID",
      description: "Retrieves a specific product translation by its ID.",
    },
  })
  @ApiParam({
    name: "id",
    description: "The ID of the product translation to retrieve",
    example: "123e4567-e89b-12d3-a456-426614174000",
    required: true,
    type: String,
  })
  @Get(":id")
  async getProductTranslationById(
    @Param("id", ParseUUIDPipe) id: ProductTranslation["id"],
  ) {
    const result =
      await this.productTranslationService.getProductTranslationById(id);

    return new ProductTranslationResponseDto(result);
  }

  @ApiAuth({
    type: ProductTranslationResponseDto,
    options: {
      summary: "Create a new product translation",
      description: "Creates a new product translation.",
    },
  })
  @Post()
  async createProductTranslation(
    @ActiveUser("userId") userId: User["id"],
    @Body() body: CreateProductTranslationRequestDto,
  ) {
    const result =
      await this.productTranslationService.createProductTranslation({
        data: body,
        userId,
      });

    return new ProductTranslationResponseDto(result);
  }

  @ApiAuth({
    type: ProductTranslationResponseDto,
    options: {
      summary: "Update a product translation",
      description: "Updates an existing product translation.",
    },
  })
  @ApiParam({
    name: "id",
    description: "The ID of the product translation to update",
    example: "123e4567-e89b-12d3-a456-426614174000",
    required: true,
    type: String,
  })
  @Put(":id")
  async updateProductTranslation(
    @Param("id", ParseUUIDPipe) id: ProductTranslation["id"],
    @ActiveUser("userId") userId: User["id"],
    @Body() body: UpdateProductTranslationRequestDto,
  ) {
    const result =
      await this.productTranslationService.updateProductTranslation({
        id,
        data: body,
        userId,
      });

    return new ProductTranslationResponseDto(result);
  }

  @ApiAuth({
    type: ProductTranslationResponseDto,
    options: {
      summary: "Delete a product translation",
      description: "Deletes an existing product translation.",
    },
  })
  @ApiParam({
    name: "id",
    description: "The ID of the product translation to delete",
    example: "123e4567-e89b-12d3-a456-426614174000",
    required: true,
    type: String,
  })
  @Delete(":id")
  async deleteProductTranslation(
    @Param("id", ParseUUIDPipe) id: ProductTranslation["id"],
    @ActiveUser("userId") userId: User["id"],
  ) {
    const result =
      await this.productTranslationService.deleteProductTranslation({
        id,
        userId,
      });

    return new ProductTranslationResponseDto(result);
  }
}
