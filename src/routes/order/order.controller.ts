import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
} from "@nestjs/common";
import { ApiParam, ApiTags } from "@nestjs/swagger";
import { Order as OrderSchema, User as UserSchema } from "@prisma/client";

import {
  BaseOrderResponseDto,
  CancelOrderResponseDto,
  CreateOrderRequestDto,
  OrderDetailResponseDto,
  OrderPaginationQueryDto,
} from "@/dtos/order/order.dto";
import { PageDto } from "@/dtos/shared/page.dto";
import ActiveUser from "@/shared/param-decorators/active-user.decorator";
import {
  ApiAuth,
  ApiPageOkResponse,
} from "@/shared/param-decorators/http-decorator";
import { RequirePermission } from "@/shared/param-decorators/require-permission.decorator";

import { OrderService } from "./order.service";

@ApiTags("Orders")
@Controller("orders")
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @ApiPageOkResponse({
    type: BaseOrderResponseDto,
    description: "Retrieve the caller's own orders with pagination.",
    summary: "Get my orders",
  })
  @RequirePermission("order:read:own")
  @Get()
  async getOrders(
    @Query() query: OrderPaginationQueryDto,
    @ActiveUser("userId") userId: UserSchema["id"],
  ): Promise<PageDto<BaseOrderResponseDto>> {
    const result = await this.orderService.getOrders({ query, userId });

    return new PageDto<BaseOrderResponseDto>(result);
  }

  @ApiAuth({
    type: OrderDetailResponseDto,
    options: {
      summary: "Get one of my orders",
      description: "Retrieves the caller's own order with its snapshot items.",
    },
  })
  @ApiParam({
    name: "orderId",
    description: "The unique identifier of the order.",
    format: "uuid",
  })
  @RequirePermission("order:read:own")
  @Get(":orderId")
  async getOrderById(
    @Param("orderId", ParseUUIDPipe) orderId: OrderSchema["id"],
    @ActiveUser("userId") userId: UserSchema["id"],
  ): Promise<OrderDetailResponseDto> {
    const result = await this.orderService.getOrderById({ orderId, userId });

    return new OrderDetailResponseDto(result);
  }

  @ApiAuth({
    type: OrderDetailResponseDto,
    options: {
      summary: "Checkout the cart",
      description:
        "Creates one order per seller from the given cart lines, freezing product/SKU snapshots and decrementing stock in one transaction.",
    },
  })
  @RequirePermission("order:create:own")
  @Post()
  async checkout(
    @Body() body: CreateOrderRequestDto,
    @ActiveUser("userId") userId: UserSchema["id"],
  ): Promise<OrderDetailResponseDto[]> {
    const result = await this.orderService.checkout({
      cartItemIds: body.cartItemIds,
      userId,
    });

    return result.map((order) => new OrderDetailResponseDto(order));
  }

  @ApiAuth({
    type: CancelOrderResponseDto,
    options: {
      summary: "Cancel my order",
      description:
        "Cancels the caller's own order while it is still pending confirmation, restoring stock.",
    },
  })
  @ApiParam({
    name: "orderId",
    description: "The unique identifier of the order to cancel.",
    format: "uuid",
  })
  @RequirePermission("order:cancel:own")
  @Put(":orderId/cancel")
  async cancelOrder(
    @Param("orderId", ParseUUIDPipe) orderId: OrderSchema["id"],
    @ActiveUser("userId") userId: UserSchema["id"],
  ): Promise<CancelOrderResponseDto> {
    const result = await this.orderService.cancelOrder({ orderId, userId });

    return new CancelOrderResponseDto(result);
  }
}
