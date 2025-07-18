import { Controller, Get, Param, ParseUUIDPipe, Query } from "@nestjs/common";
import { ApiParam, ApiTags } from "@nestjs/swagger";
import {
  Language as LanguageSchema,
  Product as ProductSchema,
} from "@prisma/client";

import {
  ProductDetailResponseDto,
  ProductPaginationQueryDto,
  ProductResponseDto,
} from "@/dtos/product/product.dto";
import { PageDto } from "@/dtos/shared/page.dto";
import { IsPublicApi } from "@/shared/param-decorators/auth-api.decorator";
import { CurrentLang } from "@/shared/param-decorators/current-lang.decorator";
import {
  ApiPageOkResponse,
  ApiPublic,
} from "@/shared/param-decorators/http-decorator";

import { ProductService } from "./product.service";

@ApiTags("Products")
@Controller("products")
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @ApiPageOkResponse({
    type: ProductResponseDto,
    description: "Retrieve a list of products with pagination.",
    summary: "Get a list of products",
    isPublic: true,
  })
  @IsPublicApi()
  @Get()
  async getProducts(
    @Query()
    query: ProductPaginationQueryDto,
    @CurrentLang() languageId: LanguageSchema["id"],
  ): Promise<PageDto<ProductResponseDto>> {
    const result = await this.productService.getProducts({ query, languageId });

    return new PageDto<ProductResponseDto>(result);
  }

  @ApiPublic({
    options: {
      description: "Retrieve a product by its ID.",
      summary: "Get product by ID",
    },
    type: ProductDetailResponseDto,
  })
  @IsPublicApi()
  @ApiParam({
    name: "id",
    description: "The unique identifier of the product to retrieve.",
    format: "uuid",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @Get(":id")
  async getProductById(
    @Param("id", ParseUUIDPipe) productId: ProductSchema["id"],
    @CurrentLang() languageId: LanguageSchema["id"],
  ): Promise<ProductDetailResponseDto> {
    const result = await this.productService.getProductById({
      productId,
      languageId,
    });

    return new ProductDetailResponseDto(result);
  }
}
