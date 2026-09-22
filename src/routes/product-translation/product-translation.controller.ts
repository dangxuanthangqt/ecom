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

import { ScopeType } from "@/constants/permission.constant";
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
import { PermissionScope } from "@/shared/param-decorators/permission-scope.decorator";
import { RequirePermission } from "@/shared/param-decorators/require-permission.decorator";

import { ProductTranslationService } from "./product-translation.service";

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
  @RequirePermission("product-translation:read:own")
  @Get()
  async getProductTranslations(
    @Query() query: ProductTranslationPaginationQueryDto,
    @ActiveUser("userId") userId: User["id"],
    @PermissionScope(["product-translation", "read"]) scope: ScopeType,
  ) {
    const result = await this.productTranslationService.getProductTranslations({
      query,
      userId,
      scope,
    });

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
  @RequirePermission("product-translation:read:own")
  @Get(":id")
  async getProductTranslationById(
    @Param("id", ParseUUIDPipe) id: ProductTranslation["id"],
    @ActiveUser("userId") userId: User["id"],
    @PermissionScope(["product-translation", "read"]) scope: ScopeType,
  ) {
    const result =
      await this.productTranslationService.getProductTranslationById({
        id,
        userId,
        scope,
      });

    return new ProductTranslationResponseDto(result);
  }

  @ApiAuth({
    type: ProductTranslationResponseDto,
    options: {
      summary: "Create a new product translation",
      description: "Creates a new product translation.",
    },
  })
  @RequirePermission("product-translation:create:own")
  @Post()
  async createProductTranslation(
    @ActiveUser("userId") userId: User["id"],
    @Body() body: CreateProductTranslationRequestDto,
    @PermissionScope(["product-translation", "create"]) scope: ScopeType,
  ) {
    const result =
      await this.productTranslationService.createProductTranslation({
        data: body,
        userId,
        scope,
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
  @RequirePermission("product-translation:update:own")
  @Put(":id")
  async updateProductTranslation(
    @Param("id", ParseUUIDPipe) id: ProductTranslation["id"],
    @ActiveUser("userId") userId: User["id"],
    @Body() body: UpdateProductTranslationRequestDto,
    @PermissionScope(["product-translation", "update"]) scope: ScopeType,
  ) {
    const result =
      await this.productTranslationService.updateProductTranslation({
        id,
        data: body,
        userId,
        scope,
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
  @RequirePermission("product-translation:delete:own")
  @Delete(":id")
  async deleteProductTranslation(
    @Param("id", ParseUUIDPipe) id: ProductTranslation["id"],
    @ActiveUser("userId") userId: User["id"],
    @PermissionScope(["product-translation", "delete"]) scope: ScopeType,
  ) {
    const result =
      await this.productTranslationService.deleteProductTranslation({
        id,
        userId,
        scope,
      });

    return new ProductTranslationResponseDto(result);
  }
}
