import { OrderRepository } from "../order.repository";

import {
  OrderMocks,
  USER_ID,
  containing,
  makeOrder,
  setupOrderRepository,
} from "./order-repository-test-harness";

describe("OrderRepository - findManyOrders", () => {
  let repository: OrderRepository;
  let mocks: OrderMocks;

  beforeEach(async () => {
    ({ repository, mocks } = await setupOrderRepository());
  });

  it("always filters deletedAt: null in addition to the caller's where (BR-O08)", async () => {
    mocks.prismaService.$transaction.mockResolvedValue([[makeOrder()], 1]);

    await repository.findManyOrders({
      where: { userId: USER_ID },
      take: 10,
      skip: 0,
      orderBy: { createdAt: "asc" },
    });

    expect(mocks.prismaService.order.findMany).toHaveBeenCalledWith(
      containing({ where: { userId: USER_ID, deletedAt: null } }),
    );
    expect(mocks.prismaService.order.count).toHaveBeenCalledWith(
      containing({ where: { userId: USER_ID, deletedAt: null } }),
    );
  });

  it("returns { orders, ordersCount } from the transactional read", async () => {
    mocks.prismaService.$transaction.mockResolvedValue([[makeOrder()], 3]);

    const result = await repository.findManyOrders({
      where: { userId: USER_ID },
      take: 10,
      skip: 0,
      orderBy: { createdAt: "asc" },
    });

    expect(result).toEqual({ orders: [makeOrder()], ordersCount: 3 });
  });

  it("throws internal error on an unexpected database failure", async () => {
    mocks.prismaService.$transaction.mockRejectedValue(new Error("db down"));

    const promise = repository.findManyOrders({
      where: { userId: USER_ID },
      take: 10,
      skip: 0,
      orderBy: { createdAt: "asc" },
    });

    await expect(promise).rejects.toMatchObject({ status: 500 });
  });
});

describe("OrderRepository - findUniqueOrder", () => {
  let repository: OrderRepository;
  let mocks: OrderMocks;

  beforeEach(async () => {
    ({ repository, mocks } = await setupOrderRepository());
  });

  it("resolves null (not a throw) when the where clause matches nothing (BR-O06)", async () => {
    mocks.prismaService.order.findFirst.mockResolvedValue(null);

    const result = await repository.findUniqueOrder({
      where: { id: "foreign-order-id", userId: USER_ID },
    });

    expect(result).toBeNull();
  });

  it("passes the caller-supplied where through, plus deletedAt: null", async () => {
    mocks.prismaService.order.findFirst.mockResolvedValue(makeOrder());

    await repository.findUniqueOrder({
      where: { id: "order-id", userId: USER_ID },
    });

    expect(mocks.prismaService.order.findFirst).toHaveBeenCalledWith(
      containing({
        where: { id: "order-id", userId: USER_ID, deletedAt: null },
      }),
    );
  });

  it("throws internal error on an unexpected database failure", async () => {
    mocks.prismaService.order.findFirst.mockRejectedValue(new Error("db down"));

    const promise = repository.findUniqueOrder({ where: { id: "order-id" } });

    await expect(promise).rejects.toMatchObject({ status: 500 });
  });
});
