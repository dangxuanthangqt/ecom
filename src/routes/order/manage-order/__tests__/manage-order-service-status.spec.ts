import { OrderStatus } from "@prisma/client";

import { ManageOrderService } from "../manage-order.service";

import {
  ADMIN_ID,
  ADMIN_SCOPE,
  ManageOrderServiceMocks,
  ORDER_ID,
  SELLER_ID,
  SELLER_SCOPE,
  containing,
  makeOrder,
  setupManageOrderService,
} from "./manage-order-service-test-harness";

describe("ManageOrderService - updateOrderStatus (BR-O05 legal transitions)", () => {
  let service: ManageOrderService;
  let mocks: ManageOrderServiceMocks;

  beforeEach(async () => {
    ({ service, mocks } = await setupManageOrderService());
  });

  const legalTransitions: [OrderStatus, OrderStatus][] = [
    [OrderStatus.PENDING_CONFIRMATION, OrderStatus.PENDING_PICKUP],
    [OrderStatus.PENDING_PICKUP, OrderStatus.PENDING_DELIVERY],
    [OrderStatus.PENDING_DELIVERY, OrderStatus.DELIVERED],
    [OrderStatus.DELIVERED, OrderStatus.RETURNED],
  ];

  it.each(legalTransitions)(
    "allows %s -> %s and writes through the status repository",
    async (from, to) => {
      mocks.orderRepository.findUniqueOrder.mockResolvedValue(
        makeOrder({ status: from }),
      );
      mocks.orderStatusRepository.updateOrderStatus.mockResolvedValue(
        makeOrder({ status: to }),
      );

      const result = await service.updateOrderStatus({
        orderId: ORDER_ID,
        status: to,
        userId: SELLER_ID,
        scope: SELLER_SCOPE,
      });

      expect(result).toEqual(makeOrder({ status: to }));
      expect(
        mocks.orderStatusRepository.updateOrderStatus,
      ).toHaveBeenCalledWith(
        containing({
          orderId: ORDER_ID,
          currentStatus: from,
          nextStatus: to,
          userId: SELLER_ID,
        }),
      );
    },
  );

  const illegalTransitions: [OrderStatus, OrderStatus][] = [
    [OrderStatus.PENDING_PICKUP, OrderStatus.PENDING_CONFIRMATION], // backwards
    [OrderStatus.PENDING_CONFIRMATION, OrderStatus.PENDING_DELIVERY], // skip a step
    [OrderStatus.PENDING_CONFIRMATION, OrderStatus.DELIVERED], // skip further
    [OrderStatus.RETURNED, OrderStatus.PENDING_PICKUP], // out of terminal state
    [OrderStatus.DELIVERED, OrderStatus.PENDING_PICKUP], // out of DELIVERED except RETURNED
  ];

  it.each(illegalTransitions)(
    "rejects %s -> %s with 400 naming both statuses, never writing",
    async (from, to) => {
      mocks.orderRepository.findUniqueOrder.mockResolvedValue(
        makeOrder({ status: from }),
      );

      const promise = service.updateOrderStatus({
        orderId: ORDER_ID,
        status: to,
        userId: SELLER_ID,
        scope: SELLER_SCOPE,
      });

      await expect(promise).rejects.toMatchObject({ status: 400 });
      const error = (await promise.catch((caught: unknown) => caught)) as {
        response: { message: string; details: unknown[] };
      };
      // The rejected transition is not scoped to a field, so it is stated in
      // `message` and `details` stays empty — assert exactly that, rather than
      // searching both for the status names.
      expect(error.response.message).toContain(from);
      expect(error.response.message).toContain(to);
      expect(error.response.details).toEqual([]);
      expect(
        mocks.orderStatusRepository.updateOrderStatus,
      ).not.toHaveBeenCalled();
    },
  );
});

describe("ManageOrderService - updateOrderStatus (BR-O05 actor rule)", () => {
  let service: ManageOrderService;
  let mocks: ManageOrderServiceMocks;

  beforeEach(async () => {
    ({ service, mocks } = await setupManageOrderService());
  });

  it.each([
    ["seller", SELLER_ID, SELLER_SCOPE],
    ["admin", ADMIN_ID, ADMIN_SCOPE],
  ])(
    "rejects CANCELLED from a %s with 400, never writing",
    async (_label, userId, scope) => {
      const promise = service.updateOrderStatus({
        orderId: ORDER_ID,
        status: OrderStatus.CANCELLED,
        userId,
        scope,
      });

      await expect(promise).rejects.toMatchObject({ status: 400 });
      expect(mocks.orderRepository.findUniqueOrder).not.toHaveBeenCalled();
      expect(
        mocks.orderStatusRepository.updateOrderStatus,
      ).not.toHaveBeenCalled();
    },
  );
});

describe("ManageOrderService - updateOrderStatus (BR-O06 visibility)", () => {
  let service: ManageOrderService;
  let mocks: ManageOrderServiceMocks;

  beforeEach(async () => {
    ({ service, mocks } = await setupManageOrderService());
  });

  it("raises 404 for a seller acting on an order holding none of their products", async () => {
    mocks.orderRepository.findUniqueOrder.mockResolvedValue(null);

    const promise = service.updateOrderStatus({
      orderId: ORDER_ID,
      status: OrderStatus.PENDING_PICKUP,
      userId: SELLER_ID,
      scope: SELLER_SCOPE,
    });

    await expect(promise).rejects.toMatchObject({ status: 404 });
    expect(
      mocks.orderStatusRepository.updateOrderStatus,
    ).not.toHaveBeenCalled();
  });
});

describe("ManageOrderService - updateOrderStatus (concurrency passthrough)", () => {
  let service: ManageOrderService;
  let mocks: ManageOrderServiceMocks;

  beforeEach(async () => {
    ({ service, mocks } = await setupManageOrderService());
  });

  it("propagates the repository's conflict error rather than swallowing it", async () => {
    mocks.orderRepository.findUniqueOrder.mockResolvedValue(
      makeOrder({ status: OrderStatus.PENDING_CONFIRMATION }),
    );
    const conflictError = Object.assign(new Error("conflict"), {
      status: 409,
    });
    mocks.orderStatusRepository.updateOrderStatus.mockRejectedValue(
      conflictError,
    );

    const promise = service.updateOrderStatus({
      orderId: ORDER_ID,
      status: OrderStatus.PENDING_PICKUP,
      userId: SELLER_ID,
      scope: SELLER_SCOPE,
    });

    await expect(promise).rejects.toBe(conflictError);
  });
});
