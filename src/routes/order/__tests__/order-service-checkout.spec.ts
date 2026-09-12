import { OrderService } from "../order.service";

import {
  CART_ITEM_ID,
  OrderServiceMocks,
  USER_ID,
  makeOrder,
  setupOrderService,
} from "./order-service-test-harness";

describe("OrderService - checkout", () => {
  let service: OrderService;
  let mocks: OrderServiceMocks;

  beforeEach(async () => {
    ({ service, mocks } = await setupOrderService());
  });

  it("delegates straight to the checkout repository with the same args (BR-O01/O02/O03/O07)", async () => {
    const orders = [makeOrder()];
    mocks.orderCheckoutRepository.checkout.mockResolvedValue(orders);

    const result = await service.checkout({
      cartItemIds: [CART_ITEM_ID],
      userId: USER_ID,
    });

    expect(mocks.orderCheckoutRepository.checkout).toHaveBeenCalledWith({
      cartItemIds: [CART_ITEM_ID],
      userId: USER_ID,
    });
    expect(result).toBe(orders);
  });

  it("propagates a repository rejection (e.g. insufficient stock) unchanged", async () => {
    const error = { status: 400 };
    mocks.orderCheckoutRepository.checkout.mockRejectedValue(error);

    const promise = service.checkout({
      cartItemIds: [CART_ITEM_ID],
      userId: USER_ID,
    });

    await expect(promise).rejects.toBe(error);
  });
});
