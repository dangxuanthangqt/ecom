import { OrderService } from "../order.service";

import {
  ORDER_ID,
  OrderServiceMocks,
  USER_ID,
  makeOrder,
  setupOrderService,
} from "./order-service-test-harness";

describe("OrderService - cancelOrder", () => {
  let service: OrderService;
  let mocks: OrderServiceMocks;

  beforeEach(async () => {
    ({ service, mocks } = await setupOrderService());
  });

  it("delegates to the cancel repository, scoped to the caller (BR-O04)", async () => {
    const cancelled = makeOrder({ status: "CANCELLED" });
    mocks.orderCancelRepository.cancelOrder.mockResolvedValue(cancelled);

    const result = await service.cancelOrder({
      orderId: ORDER_ID,
      userId: USER_ID,
    });

    expect(mocks.orderCancelRepository.cancelOrder).toHaveBeenCalledWith({
      orderId: ORDER_ID,
      userId: USER_ID,
    });
    expect(result).toBe(cancelled);
  });

  it("propagates a 400 when the order is not pending confirmation", async () => {
    const error = { status: 400 };
    mocks.orderCancelRepository.cancelOrder.mockRejectedValue(error);

    const promise = service.cancelOrder({ orderId: ORDER_ID, userId: USER_ID });

    await expect(promise).rejects.toBe(error);
  });

  it("propagates a 404 when the order is not the caller's", async () => {
    const error = { status: 404 };
    mocks.orderCancelRepository.cancelOrder.mockRejectedValue(error);

    const promise = service.cancelOrder({ orderId: ORDER_ID, userId: USER_ID });

    await expect(promise).rejects.toBe(error);
  });
});
