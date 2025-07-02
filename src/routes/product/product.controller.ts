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
import {
  Language,
  Product as ProductSchema,
  User as UserSchema,
} from "@prisma/client";

import { ProductService } from "./product.service";

import {
  CreateProductRequestDto,
  DeleteProductResponseDto,
  ProductDetailResponseDto,
  ProductResponseDto,
  UpdateProductRequestDto,
} from "@/dtos/product/product.dto";
import { PageDto } from "@/dtos/shared/page.dto";
import { PaginationQueryDto } from "@/dtos/shared/pagination.dto";
import ActiveUser from "@/shared/param-decorators/active-user.decorator";
import { CurrentLang } from "@/shared/param-decorators/current-lang.decorator";
import {
  ApiAuth,
  ApiPageOkResponse,
} from "@/shared/param-decorators/http-decorator";

@ApiTags("Products")
@Controller("products")
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @ApiPageOkResponse({
    type: ProductResponseDto,
    description: "Retrieve a list of products with pagination.",
    summary: "Get a list of products",
  })
  @Get()
  async getProducts(
    @Query()
    query: PaginationQueryDto,
    @CurrentLang() lang: string, // default language is English
  ): Promise<PageDto<ProductResponseDto>> {
    const result = await this.productService.findManyProducts(query, lang);

    return new PageDto<ProductResponseDto>(result);
  }

  @ApiAuth({
    options: {
      description: "Retrieve a product by its ID.",
      summary: "Get product by ID",
    },
    type: ProductDetailResponseDto,
  })
  @ApiParam({
    name: "id",
    description: "The unique identifier of the product to retrieve.",
    format: "uuid",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @Get(":id")
  async getProductById(
    @Param("id", ParseUUIDPipe) id: ProductSchema["id"],
    @CurrentLang() languageId: Language["id"],
  ): Promise<ProductDetailResponseDto> {
    const result = await this.productService.findUniqueProduct({
      id,
      languageId,
    });

    return new ProductDetailResponseDto(result);
  }

  @ApiAuth({
    options: {
      description: "Create a new product.",
      summary: "Create a new product",
    },
    type: ProductDetailResponseDto,
  })
  @Post()
  async createProduct(
    @Body() data: CreateProductRequestDto,
    @ActiveUser("userId") userId: UserSchema["id"],
  ) {
    const result = await this.productService.createProduct({
      data,
      userId,
    });

    return new ProductDetailResponseDto(result);
  }

  @ApiAuth({
    options: {
      description: "Update an existing product by its ID.",
      summary: "Update product by ID",
    },
    type: ProductDetailResponseDto,
  })
  @Put(":id")
  async updateProduct(
    @Body() data: UpdateProductRequestDto,
    @Param("id", ParseUUIDPipe) id: ProductSchema["id"],
    @ActiveUser("userId") userId: UserSchema["id"],
  ): Promise<ProductDetailResponseDto> {
    const result = await this.productService.updateProduct({
      id,
      data,
      userId,
    });

    return new ProductDetailResponseDto(result);
  }

  @ApiAuth({
    options: {
      description: "Delete a product by its ID.",
      summary: "Delete product by ID",
    },
    type: DeleteProductResponseDto,
  })
  @ApiParam({
    name: "id",
    description: "The unique identifier of the product to delete.",
    format: "uuid",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @Delete(":id")
  async deleteProduct(
    @Param("id", ParseUUIDPipe) id: ProductSchema["id"],
    @ActiveUser("userId") userId: string,
  ): Promise<DeleteProductResponseDto> {
    const result = await this.productService.deleteProduct({
      id,
      userId,
    });

    return new DeleteProductResponseDto(result);
  }
}
