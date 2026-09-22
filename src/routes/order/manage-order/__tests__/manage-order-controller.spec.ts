import { OrderStatus } from "@/generated/prisma/client";

import { ManageOrderController } from "../manage-order.controller";

import {
  ACTIVE_USER_ID,
  ADMIN_SCOPE,
  ManageOrderControllerMocks,
  ORDER_ID,
  SELLER_SCOPE,
  containing,
  makeOrderResponse,
  setupManageOrderController,
} from "./manage-order-controller-test-harness";

describe("ManageOrderController - getManageOrders", () => {
  let controller: ManageOrderController;
  let mocks: ManageOrderControllerMocks;

  beforeEach(async () => {
    ({ controller, mocks } = await setupManageOrderController());
  });

  it("calls the service with query, userId, and scope and returns wrapped result", async () => {
    const order = makeOrderResponse();
    const response = {
      data: [order],
      pagination: { page: 1, pageSize: 10, totalPages: 1, totalItems: 1 },
    };
    mocks.manageOrderService.getOrders.mockResolvedValue(response);

    const query = { page: 1, pageSize: 10 };

    const result = await controller.getManageOrders(
      query,
      ACTIVE_USER_ID,
      SELLER_SCOPE,
    );

    expect(mocks.manageOrderService.getOrders).toHaveBeenCalledWith(
      containing({
        query,
        userId: ACTIVE_USER_ID,
        scope: SELLER_SCOPE,
      }),
    );
    expect(result.data).toEqual([order]);
    expect(result.pagination).toEqual(response.pagination);
  });

  it("propagates service errors", async () => {
    const error = new Error("boom");
    mocks.manageOrderService.getOrders.mockRejectedValue(error);

    await expect(
      controller.getManageOrders(
        { page: 1, pageSize: 10 },
        ACTIVE_USER_ID,
        SELLER_SCOPE,
      ),
    ).rejects.toBe(error);
  });
});

describe("ManageOrderController - getManageOrderById", () => {
  let controller: ManageOrderController;
  let mocks: ManageOrderControllerMocks;

  beforeEach(async () => {
    ({ controller, mocks } = await setupManageOrderController());
  });

  it("calls the service with orderId, userId, and scope", async () => {
    const order = makeOrderResponse();
    mocks.manageOrderService.getOrderById.mockResolvedValue(order);

    const result = await controller.getManageOrderById(
      ORDER_ID,
      ACTIVE_USER_ID,
      ADMIN_SCOPE,
    );

    expect(mocks.manageOrderService.getOrderById).toHaveBeenCalledWith(
      containing({
        orderId: ORDER_ID,
        userId: ACTIVE_USER_ID,
        scope: ADMIN_SCOPE,
      }),
    );
    expect(result).toEqual(order);
  });

  it("propagates service errors", async () => {
    const error = new Error("not found");
    mocks.manageOrderService.getOrderById.mockRejectedValue(error);

    await expect(
      controller.getManageOrderById(ORDER_ID, ACTIVE_USER_ID, SELLER_SCOPE),
    ).rejects.toBe(error);
  });
});

describe("ManageOrderController - updateOrderStatus", () => {
  let controller: ManageOrderController;
  let mocks: ManageOrderControllerMocks;

  beforeEach(async () => {
    ({ controller, mocks } = await setupManageOrderController());
  });

  it("passes the body's status through to the service alongside orderId/userId/scope", async () => {
    const order = makeOrderResponse({ status: OrderStatus.PENDING_PICKUP });
    mocks.manageOrderService.updateOrderStatus.mockResolvedValue(order);

    const result = await controller.updateOrderStatus(
      { status: OrderStatus.PENDING_PICKUP },
      ORDER_ID,
      ACTIVE_USER_ID,
      SELLER_SCOPE,
    );

    expect(mocks.manageOrderService.updateOrderStatus).toHaveBeenCalledWith(
      containing({
        orderId: ORDER_ID,
        status: OrderStatus.PENDING_PICKUP,
        userId: ACTIVE_USER_ID,
        scope: SELLER_SCOPE,
      }),
    );
    expect(result).toEqual(order);
  });

  it("propagates service errors", async () => {
    const error = new Error("illegal transition");
    mocks.manageOrderService.updateOrderStatus.mockRejectedValue(error);

    await expect(
      controller.updateOrderStatus(
        { status: OrderStatus.CANCELLED },
        ORDER_ID,
        ACTIVE_USER_ID,
        SELLER_SCOPE,
      ),
    ).rejects.toBe(error);
  });
});
