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
import { CartItem as CartItemSchema, User as UserSchema } from "@prisma/client";

import {
  AddCartItemRequestDto,
  CartItemDetailResponseDto,
  CartPaginationQueryDto,
  DeleteCartItemResponseDto,
  UpdateCartItemRequestDto,
} from "@/dtos/cart/cart.dto";
import { PageDto } from "@/dtos/shared/page.dto";
import ActiveUser from "@/shared/param-decorators/active-user.decorator";
import {
  ApiAuth,
  ApiPageOkResponse,
} from "@/shared/param-decorators/http-decorator";

import { CartService } from "./cart.service";

@ApiTags("Cart")
@Controller("cart")
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @ApiPageOkResponse({
    type: CartItemDetailResponseDto,
    description: "Retrieve the caller's own cart lines with pagination.",
    summary: "Get my cart",
  })
  @Get()
  async getCartItems(
    @Query() query: CartPaginationQueryDto,
    @ActiveUser("userId") userId: UserSchema["id"],
  ): Promise<PageDto<CartItemDetailResponseDto>> {
    const result = await this.cartService.getCartItems({ query, userId });

    return new PageDto<CartItemDetailResponseDto>(result);
  }

  @ApiAuth({
    type: CartItemDetailResponseDto,
    options: {
      summary: "Add a SKU to the cart",
      description:
        "Adds a SKU to the caller's cart, incrementing the quantity of an existing line for the same SKU.",
    },
  })
  @Post()
  async addCartItem(
    @Body() body: AddCartItemRequestDto,
    @ActiveUser("userId") userId: UserSchema["id"],
  ): Promise<CartItemDetailResponseDto> {
    const result = await this.cartService.addCartItem({
      skuId: body.skuId,
      quantity: body.quantity,
      userId,
    });

    return new CartItemDetailResponseDto(result);
  }

  @ApiAuth({
    type: CartItemDetailResponseDto,
    options: {
      summary: "Set the quantity of a cart line",
      description: "Sets the quantity of one own cart line.",
    },
  })
  @ApiParam({
    name: "cartItemId",
    description: "The unique identifier of the cart line to update.",
    format: "uuid",
  })
  @Put(":cartItemId")
  async updateCartItemQuantity(
    @Param("cartItemId", ParseUUIDPipe) cartItemId: CartItemSchema["id"],
    @Body() body: UpdateCartItemRequestDto,
    @ActiveUser("userId") userId: UserSchema["id"],
  ): Promise<CartItemDetailResponseDto> {
    const result = await this.cartService.updateCartItemQuantity({
      cartItemId,
      quantity: body.quantity,
      userId,
    });

    return new CartItemDetailResponseDto(result);
  }

  @ApiAuth({
    type: DeleteCartItemResponseDto,
    options: {
      summary: "Remove a cart line",
      description: "Removes one own cart line.",
    },
  })
  @ApiParam({
    name: "cartItemId",
    description: "The unique identifier of the cart line to remove.",
    format: "uuid",
  })
  @Delete(":cartItemId")
  async deleteCartItem(
    @Param("cartItemId", ParseUUIDPipe) cartItemId: CartItemSchema["id"],
    @ActiveUser("userId") userId: UserSchema["id"],
  ): Promise<DeleteCartItemResponseDto> {
    const result = await this.cartService.deleteCartItem({
      cartItemId,
      userId,
    });

    return new DeleteCartItemResponseDto(result);
  }
}
