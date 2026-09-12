import { OrderService } from "../order.service";

import {
  ORDER_ID,
  OrderServiceMocks,
  USER_ID,
  containing,
  makeOrder,
  setupOrderService,
} from "./order-service-test-harness";

describe("OrderService - getOrders", () => {
  let service: OrderService;
  let mocks: OrderServiceMocks;

  beforeEach(async () => {
    ({ service, mocks } = await setupOrderService());
  });

  it("scopes the read to the caller's own userId (BR-O06)", async () => {
    mocks.orderRepository.findManyOrders.mockResolvedValue({
      orders: [],
      ordersCount: 0,
    });

    await service.getOrders({ query: {}, userId: USER_ID });

    expect(mocks.orderRepository.findManyOrders).toHaveBeenCalledWith(
      containing({ where: containing({ userId: USER_ID }) }),
    );
  });

  it("applies pagination defaults when the query is empty", async () => {
    mocks.orderRepository.findManyOrders.mockResolvedValue({
      orders: [makeOrder()],
      ordersCount: 1,
    });

    const result = await service.getOrders({ query: {}, userId: USER_ID });

    expect(mocks.orderRepository.findManyOrders).toHaveBeenCalledWith(
      containing({ take: 10, skip: 0 }),
    );
    expect(result.pagination).toEqual({
      pageIndex: 1,
      pageSize: 10,
      totalPages: 1,
      totalItems: 1,
    });
  });

  it("passes an explicit status filter through to the repository", async () => {
    mocks.orderRepository.findManyOrders.mockResolvedValue({
      orders: [],
      ordersCount: 0,
    });

    await service.getOrders({
      query: { status: "DELIVERED" as never },
      userId: USER_ID,
    });

    expect(mocks.orderRepository.findManyOrders).toHaveBeenCalledWith(
      containing({ where: containing({ status: "DELIVERED" }) }),
    );
  });
});

describe("OrderService - getOrderById", () => {
  let service: OrderService;
  let mocks: OrderServiceMocks;

  beforeEach(async () => {
    ({ service, mocks } = await setupOrderService());
  });

  it("scopes the read by id and userId together (BR-O06)", async () => {
    mocks.orderRepository.findUniqueOrder.mockResolvedValue(makeOrder());

    await service.getOrderById({ orderId: ORDER_ID, userId: USER_ID });

    expect(mocks.orderRepository.findUniqueOrder).toHaveBeenCalledWith({
      where: { id: ORDER_ID, userId: USER_ID },
    });
  });

  it("maps a null repository result to a 404 (a foreign order never confirms existence)", async () => {
    mocks.orderRepository.findUniqueOrder.mockResolvedValue(null);

    const promise = service.getOrderById({
      orderId: ORDER_ID,
      userId: USER_ID,
    });

    await expect(promise).rejects.toMatchObject({
      status: 404,
      response: { message: "Order not found." },
    });
  });

  it("returns the order as-is when found", async () => {
    const order = makeOrder();
    mocks.orderRepository.findUniqueOrder.mockResolvedValue(order);

    const result = await service.getOrderById({
      orderId: ORDER_ID,
      userId: USER_ID,
    });

    expect(result).toEqual(order);
  });
});
