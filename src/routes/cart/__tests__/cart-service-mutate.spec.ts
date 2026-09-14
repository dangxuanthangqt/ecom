import { CartService } from "../cart.service";

import {
  CART_ITEM_ID,
  CartServiceMocks,
  USER_ID,
  makeCartItem,
  setupCartService,
} from "./cart-service-test-harness";

describe("CartService - updateCartItemQuantity", () => {
  let service: CartService;
  let mocks: CartServiceMocks;

  beforeEach(async () => {
    ({ service, mocks } = await setupCartService());
  });

  it("throws notFound (never forbidden) when the cart line belongs to another user (BR-C01)", async () => {
    mocks.cartRepository.findUniqueCartItem.mockResolvedValue(null);

    const promise = service.updateCartItemQuantity({
      cartItemId: CART_ITEM_ID,
      quantity: 1,
      userId: USER_ID,
    });

    await expect(promise).rejects.toMatchObject({ status: 404 });
    expect(mocks.cartRepository.findUniqueCartItem).toHaveBeenCalledWith({
      cartItemId: CART_ITEM_ID,
      userId: USER_ID,
    });
    expect(mocks.cartRepository.updateCartItem).not.toHaveBeenCalled();
  });

  it("checks the absolute quantity against stock (BR-C03)", async () => {
    mocks.cartRepository.findUniqueCartItem.mockResolvedValue(
      makeCartItem({ sku: { ...makeCartItem().sku, stock: 5 } }),
    );

    const promise = service.updateCartItemQuantity({
      cartItemId: CART_ITEM_ID,
      quantity: 6,
      userId: USER_ID,
    });

    await expect(promise).rejects.toMatchObject({
      status: 400,
      response: {
        message: "Only 5 left in stock for this SKU.",
        details: [],
      },
    });
    expect(mocks.cartRepository.updateCartItem).not.toHaveBeenCalled();
  });

  it("allows a quantity exactly at the stock boundary", async () => {
    mocks.cartRepository.findUniqueCartItem.mockResolvedValue(
      makeCartItem({ sku: { ...makeCartItem().sku, stock: 5 } }),
    );
    mocks.cartRepository.updateCartItem.mockResolvedValue(
      makeCartItem({ quantity: 5 }),
    );

    await service.updateCartItemQuantity({
      cartItemId: CART_ITEM_ID,
      quantity: 5,
      userId: USER_ID,
    });

    expect(mocks.cartRepository.updateCartItem).toHaveBeenCalledWith({
      cartItemId: CART_ITEM_ID,
      userId: USER_ID,
      quantity: 5,
    });
  });

  it("returns the updated cart item from the repository", async () => {
    mocks.cartRepository.findUniqueCartItem.mockResolvedValue(makeCartItem());
    const updated = makeCartItem({ quantity: 4 });
    mocks.cartRepository.updateCartItem.mockResolvedValue(updated);

    const result = await service.updateCartItemQuantity({
      cartItemId: CART_ITEM_ID,
      quantity: 4,
      userId: USER_ID,
    });

    expect(result).toBe(updated);
  });
});

describe("CartService - deleteCartItem", () => {
  let service: CartService;
  let mocks: CartServiceMocks;

  beforeEach(async () => {
    ({ service, mocks } = await setupCartService());
  });

  it("delegates ownership enforcement and hard delete to the repository (BR-C01, BR-C05)", async () => {
    const result = { message: "Cart item removed successfully." };
    mocks.cartRepository.deleteCartItem.mockResolvedValue(result);

    const response = await service.deleteCartItem({
      cartItemId: CART_ITEM_ID,
      userId: USER_ID,
    });

    expect(mocks.cartRepository.deleteCartItem).toHaveBeenCalledWith({
      cartItemId: CART_ITEM_ID,
      userId: USER_ID,
    });
    expect(response).toBe(result);
  });

  it("propagates a notFound error from the repository", async () => {
    const error = { status: 404 };
    mocks.cartRepository.deleteCartItem.mockRejectedValue(error);

    const promise = service.deleteCartItem({
      cartItemId: CART_ITEM_ID,
      userId: USER_ID,
    });

    await expect(promise).rejects.toBe(error);
  });
});
