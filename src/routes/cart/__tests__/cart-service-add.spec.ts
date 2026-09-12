import { CartService } from "../cart.service";

import {
  CartServiceMocks,
  SKU_ID,
  USER_ID,
  makeAddableSku,
  makeCartItem,
  setupCartService,
} from "./cart-service-test-harness";

describe("CartService - addCartItem", () => {
  let service: CartService;
  let mocks: CartServiceMocks;

  beforeEach(async () => {
    ({ service, mocks } = await setupCartService());
  });

  it("throws notFound when the SKU is missing, deleted, or unpublished (BR-C02)", async () => {
    mocks.cartRepository.findAddableSku.mockResolvedValue(null);

    const promise = service.addCartItem({
      skuId: SKU_ID,
      quantity: 1,
      userId: USER_ID,
    });

    await expect(promise).rejects.toMatchObject({ status: 404 });
    expect(mocks.cartRepository.upsertCartItem).not.toHaveBeenCalled();
  });

  it("adds a new line when no existing quantity is held (0 + quantity <= stock)", async () => {
    mocks.cartRepository.findAddableSku.mockResolvedValue(
      makeAddableSku({ stock: 10, cartItems: [] }),
    );
    mocks.cartRepository.upsertCartItem.mockResolvedValue(makeCartItem());

    await service.addCartItem({ skuId: SKU_ID, quantity: 3, userId: USER_ID });

    expect(mocks.cartRepository.upsertCartItem).toHaveBeenCalledWith({
      userId: USER_ID,
      skuId: SKU_ID,
      quantity: 3,
    });
  });

  it("checks the resulting quantity against stock, not just the increment (BR-C03)", async () => {
    mocks.cartRepository.findAddableSku.mockResolvedValue(
      makeAddableSku({ stock: 10, cartItems: [{ quantity: 8 }] }),
    );

    const promise = service.addCartItem({
      skuId: SKU_ID,
      quantity: 3,
      userId: USER_ID,
    });

    await expect(promise).rejects.toMatchObject({
      status: 400,
      response: {
        message: [
          expect.objectContaining({
            message: "Only 10 left in stock for this SKU.",
          }),
        ],
      },
    });
    expect(mocks.cartRepository.upsertCartItem).not.toHaveBeenCalled();
  });

  it("allows a resulting quantity exactly at the stock boundary", async () => {
    mocks.cartRepository.findAddableSku.mockResolvedValue(
      makeAddableSku({ stock: 10, cartItems: [{ quantity: 7 }] }),
    );
    mocks.cartRepository.upsertCartItem.mockResolvedValue(makeCartItem());

    await service.addCartItem({ skuId: SKU_ID, quantity: 3, userId: USER_ID });

    expect(mocks.cartRepository.upsertCartItem).toHaveBeenCalledWith(
      expect.objectContaining({ quantity: 3 }),
    );
  });

  it("rejects a resulting quantity one above the stock boundary", async () => {
    mocks.cartRepository.findAddableSku.mockResolvedValue(
      makeAddableSku({ stock: 10, cartItems: [{ quantity: 8 }] }),
    );

    const promise = service.addCartItem({
      skuId: SKU_ID,
      quantity: 3,
      userId: USER_ID,
    });

    await expect(promise).rejects.toMatchObject({ status: 400 });
  });

  it("rejects when the SKU has zero stock", async () => {
    mocks.cartRepository.findAddableSku.mockResolvedValue(
      makeAddableSku({ stock: 0, cartItems: [] }),
    );

    const promise = service.addCartItem({
      skuId: SKU_ID,
      quantity: 1,
      userId: USER_ID,
    });

    await expect(promise).rejects.toMatchObject({ status: 400 });
  });

  it("delegates the one-line-per-SKU guarantee to a single upsert call (BR-C04)", async () => {
    mocks.cartRepository.findAddableSku.mockResolvedValue(
      makeAddableSku({ stock: 10, cartItems: [{ quantity: 2 }] }),
    );
    mocks.cartRepository.upsertCartItem.mockResolvedValue(makeCartItem());

    await service.addCartItem({ skuId: SKU_ID, quantity: 2, userId: USER_ID });

    expect(mocks.cartRepository.upsertCartItem).toHaveBeenCalledTimes(1);
  });
});
