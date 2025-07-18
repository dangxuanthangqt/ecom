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
  Product as ProductSchema,
  Language as LanguageSchema,
  User as UserSchema,
  Role as RoleSchema,
} from "@prisma/client";

import {
  ProductDetailResponseDto,
  ManageProductPaginationQueryDto,
  ProductResponseDto,
  DeleteProductResponseDto,
  CreateProductRequestDto,
  UpdateProductRequestDto,
} from "@/dtos/product/product.dto";
import { PageDto } from "@/dtos/shared/page.dto";
import ActiveUserRole from "@/shared/param-decorators/active-user-role.decorator";
import ActiveUser from "@/shared/param-decorators/active-user.decorator";
import { CurrentLang } from "@/shared/param-decorators/current-lang.decorator";
import {
  ApiAuth,
  ApiPageOkResponse,
} from "@/shared/param-decorators/http-decorator";

import { ManageProductService } from "./manage-product.service";

@ApiTags("Manage Products")
@Controller("manage-product/products")
export class ManageProductController {
  constructor(private readonly manageProductService: ManageProductService) {}

  @ApiPageOkResponse({
    type: ProductResponseDto,
    description: "Retrieve a list of products with pagination.",
    summary: "Get a list of products",
  })
  @Get()
  async getManageProducts(
    @Query()
    query: ManageProductPaginationQueryDto,
    @CurrentLang() languageId: LanguageSchema["id"],
    @ActiveUser("userId") userId: UserSchema["id"],
    @ActiveUserRole("name") roleName: RoleSchema["name"],
  ): Promise<PageDto<ProductResponseDto>> {
    const result = await this.manageProductService.getProducts({
      query,
      languageId,
      userId,
      roleName,
    });

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
  async getManageProductById(
    @Param("id", ParseUUIDPipe) productId: ProductSchema["id"],
    @CurrentLang() languageId: LanguageSchema["id"],
    @ActiveUser("userId") userId: UserSchema["id"],
    @ActiveUserRole("name") roleName: RoleSchema["name"],
  ): Promise<ProductDetailResponseDto> {
    const result = await this.manageProductService.getProductById({
      productId,
      languageId,
      userId,
      roleName,
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
    const result = await this.manageProductService.createProduct({
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
    @Param("id", ParseUUIDPipe) productId: ProductSchema["id"],
    @ActiveUser("userId") userId: UserSchema["id"],
    @ActiveUserRole("name") roleName: RoleSchema["name"],
  ): Promise<ProductDetailResponseDto> {
    const result = await this.manageProductService.updateProduct({
      productId,
      data,
      userId,
      roleName,
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
    @Param("id", ParseUUIDPipe) productId: ProductSchema["id"],
    @ActiveUser("userId") userId: UserSchema["id"],
    @ActiveUserRole("name") roleName: RoleSchema["name"],
  ): Promise<DeleteProductResponseDto> {
    const result = await this.manageProductService.deleteProduct({
      productId,
      userId,
      roleName,
    });

    return new DeleteProductResponseDto(result);
  }
}
