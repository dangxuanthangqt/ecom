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

import { BrandService } from "./brand.service";

import {
  BrandIdParamDto,
  BrandWithBrandTranslationsResponseDto,
  CreateBrandRequestDto,
  CreateBrandResponseDto,
  DeleteBrandRequestDto,
  DeleteBrandResponseDto,
  UpdateBrandRequestDto,
  UpdateBrandResponseDto,
} from "@/dtos/brand/brand.dto";
import { PageDto } from "@/dtos/shared/page.dto";
import { PaginationQueryDto } from "@/dtos/shared/pagination.dto";
import ActiveUser from "@/shared/decorators/active-user.decorator";
import { IsPublicApi } from "@/shared/decorators/auth-api.decorator";
import { CurrentLang } from "@/shared/decorators/current-lang.decorator";
import {
  ApiAuth,
  ApiPageOkResponse,
  ApiPublic,
} from "@/shared/decorators/http-decorator";

@ApiTags("Brands")
@Controller("brands")
export class BrandController {
  constructor(private readonly brandService: BrandService) {}

  @ApiPageOkResponse({
    type: BrandWithBrandTranslationsResponseDto,
    description: "Retrieve a list of brands with pagination.",
    summary: "Get a list of brands",
    isPublic: true,
  })
  @Get()
  @IsPublicApi()
  async getBrands(
    @Query()
    query: PaginationQueryDto,
    @CurrentLang() lang: string, // default language is English
  ) {
    const result = await this.brandService.getBrands(query, lang);

    return new PageDto<BrandWithBrandTranslationsResponseDto>(result);
  }

  @ApiPublic({
    type: BrandWithBrandTranslationsResponseDto,
    options: {
      summary: "Get a brand by ID",
      description: "Retrieves a specific brand by its ID.",
    },
  })
  @Get(":id")
  async getBrandById(
    @Param() param: BrandIdParamDto,
    @CurrentLang() lang: string,
  ): Promise<BrandWithBrandTranslationsResponseDto> {
    const result = await this.brandService.getBrandById(param.id, lang);

    return new BrandWithBrandTranslationsResponseDto(result);
  }

  @Post()
  @ApiAuth({
    type: CreateBrandResponseDto,
    options: {
      summary: "Create a new brand",
      description: "Creates a new brand with the provided details.",
    },
  })
  async createBrand(
    @Body() body: CreateBrandRequestDto,
    @ActiveUser("userId") userId: string,
  ) {
    const result = await this.brandService.createBrand({
      body,
      userId,
    });

    return new CreateBrandResponseDto(result);
  }

  @Put(":id")
  async updateBrand(
    @Param() param: BrandIdParamDto,
    @Body() body: UpdateBrandRequestDto,
    @ActiveUser("userId") userId: string,
  ) {
    const result = await this.brandService.updateBrand({
      id: param.id,
      body,
      userId,
    });

    return new UpdateBrandResponseDto(result);
  }

  @Delete(":id")
  async deleteBrand(
    @Param() param: BrandIdParamDto,
    @ActiveUser("userId") userId: string,
    @Body() body: DeleteBrandRequestDto,
  ) {
    const { isHardDelete = false } = body;

    const result = await this.brandService.deleteBrand({
      id: param.id,
      userId,
      isHardDelete,
    });

    return new DeleteBrandResponseDto(result);
  }
}
