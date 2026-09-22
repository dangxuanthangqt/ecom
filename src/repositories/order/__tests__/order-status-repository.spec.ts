import { OrderStatus } from "@/generated/prisma/client";

import { OrderStatusRepository } from "../order-status.repository";

import {
  ORDER_ID,
  OrderStatusMocks,
  USER_ID,
  makeOrder,
  setupOrderStatusRepository,
} from "./order-status-repository-test-harness";

describe("OrderStatusRepository - updateOrderStatus", () => {
  let repository: OrderStatusRepository;
  let mocks: OrderStatusMocks;

  beforeEach(async () => {
    ({ repository, mocks } = await setupOrderStatusRepository());
  });

  it("performs a conditional updateMany scoped to the observed current status (BR-O05)", async () => {
    mocks.prismaService.order.updateMany.mockResolvedValue({ count: 1 });
    mocks.prismaService.order.findUniqueOrThrow.mockResolvedValue(
      makeOrder({ status: OrderStatus.PENDING_PICKUP }),
    );

    await repository.updateOrderStatus({
      orderId: ORDER_ID,
      currentStatus: OrderStatus.PENDING_CONFIRMATION,
      nextStatus: OrderStatus.PENDING_PICKUP,
      userId: USER_ID,
    });

    expect(mocks.prismaService.order.updateMany).toHaveBeenCalledWith({
      where: {
        id: ORDER_ID,
        status: OrderStatus.PENDING_CONFIRMATION,
        deletedAt: null,
      },
      data: { status: OrderStatus.PENDING_PICKUP, updatedById: USER_ID },
    });
  });

  it("sets updatedById to the acting user on the write (BR-O08)", async () => {
    mocks.prismaService.order.updateMany.mockResolvedValue({ count: 1 });
    mocks.prismaService.order.findUniqueOrThrow.mockResolvedValue(
      makeOrder({ status: OrderStatus.PENDING_PICKUP }),
    );

    await repository.updateOrderStatus({
      orderId: ORDER_ID,
      currentStatus: OrderStatus.PENDING_CONFIRMATION,
      nextStatus: OrderStatus.PENDING_PICKUP,
      userId: USER_ID,
    });

    expect(mocks.prismaService.order.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ updatedById: USER_ID }) as unknown,
      }),
    );
  });

  it("returns the re-read, updated order on success", async () => {
    mocks.prismaService.order.updateMany.mockResolvedValue({ count: 1 });
    const updated = makeOrder({ status: OrderStatus.PENDING_PICKUP });
    mocks.prismaService.order.findUniqueOrThrow.mockResolvedValue(updated);

    const result = await repository.updateOrderStatus({
      orderId: ORDER_ID,
      currentStatus: OrderStatus.PENDING_CONFIRMATION,
      nextStatus: OrderStatus.PENDING_PICKUP,
      userId: USER_ID,
    });

    expect(result).toEqual(updated);
  });

  it("raises a conflict when the conditional update matches zero rows (concurrent modification)", async () => {
    mocks.prismaService.order.updateMany.mockResolvedValue({ count: 0 });

    const promise = repository.updateOrderStatus({
      orderId: ORDER_ID,
      currentStatus: OrderStatus.PENDING_CONFIRMATION,
      nextStatus: OrderStatus.PENDING_PICKUP,
      userId: USER_ID,
    });

    await expect(promise).rejects.toMatchObject({ status: 409 });
    expect(mocks.prismaService.order.findUniqueOrThrow).not.toHaveBeenCalled();
  });

  it("throws internal on an unexpected database failure", async () => {
    mocks.prismaService.order.updateMany.mockRejectedValue(
      new Error("db down"),
    );

    const promise = repository.updateOrderStatus({
      orderId: ORDER_ID,
      currentStatus: OrderStatus.PENDING_CONFIRMATION,
      nextStatus: OrderStatus.PENDING_PICKUP,
      userId: USER_ID,
    });

    await expect(promise).rejects.toMatchObject({ status: 500 });
  });
});
