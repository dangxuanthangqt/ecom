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

describe("ManageOrderService - getOrders (BR-O06)", () => {
  let service: ManageOrderService;
  let mocks: ManageOrderServiceMocks;

  beforeEach(async () => {
    ({ service, mocks } = await setupManageOrderService());
    mocks.orderRepository.findManyOrders.mockResolvedValue({
      orders: [makeOrder()],
      ordersCount: 1,
    });
  });

  it("folds the seller's own products scope into `where`", async () => {
    await service.getOrders({
      query: {},
      userId: SELLER_ID,
      scope: SELLER_SCOPE,
    });

    expect(mocks.orderRepository.findManyOrders).toHaveBeenCalledWith(
      containing({
        where: containing({
          AND: expect.arrayContaining([
            containing({
              products: containing({
                some: containing({ createdById: SELLER_ID }),
              }),
            }),
          ]) as unknown,
        }),
      }),
    );
  });

  it("does not scope by products for an admin caller", async () => {
    await service.getOrders({
      query: {},
      userId: ADMIN_ID,
      scope: ADMIN_SCOPE,
    });

    const calls = mocks.orderRepository.findManyOrders.mock
      .calls as unknown as {
      where: { AND: Record<string, unknown>[] };
    }[][];
    const call = calls[0][0];
    const hasProductsScope = call.where.AND.some(
      (clause) => "products" in clause,
    );

    expect(hasProductsScope).toBe(false);
  });

  it("returns paginated data shaped for the controller", async () => {
    const result = await service.getOrders({
      query: { pageIndex: 1, pageSize: 10 },
      userId: ADMIN_ID,
      scope: ADMIN_SCOPE,
    });

    expect(result.data).toEqual([makeOrder()]);
    expect(result.pagination).toEqual(
      containing({ pageIndex: 1, pageSize: 10, totalItems: 1 }),
    );
  });
});

describe("ManageOrderService - getOrderById (BR-O06)", () => {
  let service: ManageOrderService;
  let mocks: ManageOrderServiceMocks;

  beforeEach(async () => {
    ({ service, mocks } = await setupManageOrderService());
  });

  it("returns the order when it is within the caller's scope", async () => {
    mocks.orderRepository.findUniqueOrder.mockResolvedValue(makeOrder());

    const result = await service.getOrderById({
      orderId: ORDER_ID,
      userId: SELLER_ID,
      scope: SELLER_SCOPE,
    });

    expect(result).toEqual(makeOrder());
    expect(mocks.orderRepository.findUniqueOrder).toHaveBeenCalledWith(
      containing({
        where: containing({ id: ORDER_ID }),
      }),
    );
  });

  it("raises a 404, not a 403, for an order holding none of the seller's products", async () => {
    mocks.orderRepository.findUniqueOrder.mockResolvedValue(null);

    const promise = service.getOrderById({
      orderId: ORDER_ID,
      userId: SELLER_ID,
      scope: SELLER_SCOPE,
    });

    await expect(promise).rejects.toMatchObject({ status: 404 });
  });

  it("lets an admin read any order", async () => {
    mocks.orderRepository.findUniqueOrder.mockResolvedValue(makeOrder());

    await service.getOrderById({
      orderId: ORDER_ID,
      userId: ADMIN_ID,
      scope: ADMIN_SCOPE,
    });

    const calls = mocks.orderRepository.findUniqueOrder.mock
      .calls as unknown as {
      where: Record<string, unknown>;
    }[][];
    const call = calls[0][0];

    expect(call.where.products).toBeUndefined();
  });
});
