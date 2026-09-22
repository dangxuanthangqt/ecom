import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Put,
  Query,
} from "@nestjs/common";
import { ApiParam, ApiTags } from "@nestjs/swagger";
import { Order as OrderSchema, User as UserSchema } from "@prisma/client";

import { ScopeType } from "@/constants/permission.constant";
import {
  ManageOrderDetailResponseDto,
  ManageOrderPaginationQueryDto,
  UpdateOrderStatusRequestDto,
} from "@/dtos/order/manage-order.dto";
import { BaseOrderResponseDto } from "@/dtos/order/order.dto";
import { PageDto } from "@/dtos/shared/page.dto";
import ActiveUser from "@/shared/param-decorators/active-user.decorator";
import {
  ApiAuth,
  ApiPageOkResponse,
} from "@/shared/param-decorators/http-decorator";
import { PermissionScope } from "@/shared/param-decorators/permission-scope.decorator";
import { RequirePermission } from "@/shared/param-decorators/require-permission.decorator";

import { ManageOrderService } from "./manage-order.service";

@ApiTags("Manage Orders")
@Controller("manage-order/orders")
export class ManageOrderController {
  constructor(private readonly manageOrderService: ManageOrderService) {}

  @ApiPageOkResponse({
    type: BaseOrderResponseDto,
    description:
      "Retrieve orders visible to the caller (own products for a seller, all for an admin) with pagination.",
    summary: "Get a list of orders (seller/admin)",
  })
  @RequirePermission("order-fulfilment:read:own")
  @Get()
  async getManageOrders(
    @Query() query: ManageOrderPaginationQueryDto,
    @ActiveUser("userId") userId: UserSchema["id"],
    @PermissionScope(["order-fulfilment", "read"]) scope: ScopeType,
  ): Promise<PageDto<BaseOrderResponseDto>> {
    const result = await this.manageOrderService.getOrders({
      query,
      userId,
      scope,
    });

    return new PageDto<BaseOrderResponseDto>(result);
  }

  @ApiAuth({
    options: {
      description: "Retrieve one order visible to the caller by its ID.",
      summary: "Get order by ID (seller/admin)",
    },
    type: ManageOrderDetailResponseDto,
  })
  @ApiParam({
    name: "orderId",
    description: "The unique identifier of the order to retrieve.",
    format: "uuid",
  })
  @RequirePermission("order-fulfilment:read:own")
  @Get(":orderId")
  async getManageOrderById(
    @Param("orderId", ParseUUIDPipe) orderId: OrderSchema["id"],
    @ActiveUser("userId") userId: UserSchema["id"],
    @PermissionScope(["order-fulfilment", "read"]) scope: ScopeType,
  ): Promise<ManageOrderDetailResponseDto> {
    const result = await this.manageOrderService.getOrderById({
      orderId,
      userId,
      scope,
    });

    return new ManageOrderDetailResponseDto(result);
  }

  @ApiAuth({
    options: {
      description:
        "Advances the order along the legal status flow (BR-O05); rejects an illegal transition with 400.",
      summary: "Advance order status (seller/admin)",
    },
    type: ManageOrderDetailResponseDto,
  })
  @ApiParam({
    name: "orderId",
    description: "The unique identifier of the order to update.",
    format: "uuid",
  })
  @RequirePermission("order-fulfilment:update:own")
  @Put(":orderId/status")
  async updateOrderStatus(
    @Body() body: UpdateOrderStatusRequestDto,
    @Param("orderId", ParseUUIDPipe) orderId: OrderSchema["id"],
    @ActiveUser("userId") userId: UserSchema["id"],
    @PermissionScope(["order-fulfilment", "update"]) scope: ScopeType,
  ): Promise<ManageOrderDetailResponseDto> {
    const result = await this.manageOrderService.updateOrderStatus({
      orderId,
      status: body.status,
      userId,
      scope,
    });

    return new ManageOrderDetailResponseDto(result);
  }
}
