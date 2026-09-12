import {
  BaseOrderResponseDto,
  CancelOrderResponseDto,
  OrderDetailResponseDto,
} from "@/dtos/order/order.dto";
import { PageDto } from "@/dtos/shared/page.dto";

import {
  ACTIVE_USER_ID,
  CART_ITEM_ID,
  ORDER_ID,
  containing,
  makeOrderResponse,
  setupOrderController,
} from "./order-controller-test-harness";

describe("OrderController - getOrders", () => {
  it("wraps the service result in a PageDto (BR-O06: userId comes from @ActiveUser)", async () => {
    const { controller, mocks } = await setupOrderController();
    const result = {
      data: [makeOrderResponse()],
      pagination: { pageIndex: 1, pageSize: 10, totalPages: 1, totalItems: 1 },
    };
    mocks.orderService.getOrders.mockResolvedValue(result);

    const response = await controller.getOrders({}, ACTIVE_USER_ID);

    expect(mocks.orderService.getOrders).toHaveBeenCalledWith({
      query: {},
      userId: ACTIVE_USER_ID,
    });
    expect(response).toEqual(new PageDto<BaseOrderResponseDto>(result));
  });
});

describe("OrderController - getOrderById", () => {
  it("passes the path param and active user through, wraps in OrderDetailResponseDto", async () => {
    const { controller, mocks } = await setupOrderController();
    const order = makeOrderResponse();
    mocks.orderService.getOrderById.mockResolvedValue(order);

    const response = await controller.getOrderById(ORDER_ID, ACTIVE_USER_ID);

    expect(mocks.orderService.getOrderById).toHaveBeenCalledWith({
      orderId: ORDER_ID,
      userId: ACTIVE_USER_ID,
    });
    expect(response).toEqual(new OrderDetailResponseDto(order));
  });

  it("propagates a 404 thrown by the service", async () => {
    const { controller, mocks } = await setupOrderController();
    const error = { status: 404 };
    mocks.orderService.getOrderById.mockRejectedValue(error);

    await expect(
      controller.getOrderById(ORDER_ID, ACTIVE_USER_ID),
    ).rejects.toBe(error);
  });
});

describe("OrderController - checkout", () => {
  it("returns the array of created orders, each wrapped in OrderDetailResponseDto (BR-O01)", async () => {
    const { controller, mocks } = await setupOrderController();
    const orders = [makeOrderResponse(), makeOrderResponse({ id: "order-2" })];
    mocks.orderService.checkout.mockResolvedValue(orders);

    const response = await controller.checkout(
      { cartItemIds: [CART_ITEM_ID] },
      ACTIVE_USER_ID,
    );

    expect(mocks.orderService.checkout).toHaveBeenCalledWith({
      cartItemIds: [CART_ITEM_ID],
      userId: ACTIVE_USER_ID,
    });
    expect(response).toEqual(
      orders.map((order) => new OrderDetailResponseDto(order)),
    );
  });

  it("propagates a 400 thrown by the service (e.g. insufficient stock)", async () => {
    const { controller, mocks } = await setupOrderController();
    const error = { status: 400 };
    mocks.orderService.checkout.mockRejectedValue(error);

    await expect(
      controller.checkout({ cartItemIds: [CART_ITEM_ID] }, ACTIVE_USER_ID),
    ).rejects.toBe(error);
  });
});

describe("OrderController - cancelOrder", () => {
  it("passes the path param and active user through, wraps in CancelOrderResponseDto (BR-O04)", async () => {
    const { controller, mocks } = await setupOrderController();
    const cancelled = makeOrderResponse({ status: "CANCELLED" });
    mocks.orderService.cancelOrder.mockResolvedValue(cancelled);

    const response = await controller.cancelOrder(ORDER_ID, ACTIVE_USER_ID);

    expect(mocks.orderService.cancelOrder).toHaveBeenCalledWith(
      containing({ orderId: ORDER_ID, userId: ACTIVE_USER_ID }),
    );
    expect(response).toEqual(new CancelOrderResponseDto(cancelled));
  });
});
