import { CartController } from "../cart.controller";

import {
  ACTIVE_USER_ID,
  CART_ITEM_ID,
  CartControllerMocks,
  SKU_ID,
  containing,
  makeCartItemResponse,
  setupCartController,
} from "./cart-controller-test-harness";

describe("CartController - getCartItems", () => {
  let controller: CartController;
  let mocks: CartControllerMocks;

  beforeEach(async () => {
    ({ controller, mocks } = await setupCartController());
  });

  it("passes the query and active user through and wraps the result in a page", async () => {
    const cartItem = makeCartItemResponse();
    const response = {
      data: [cartItem],
      pagination: { page: 1, pageSize: 10, totalPages: 1, totalItems: 1 },
    };
    mocks.cartService.getCartItems.mockResolvedValue(response);

    const query = { page: 1, pageSize: 10 };

    const result = await controller.getCartItems(query, ACTIVE_USER_ID);

    expect(mocks.cartService.getCartItems).toHaveBeenCalledWith({
      query,
      userId: ACTIVE_USER_ID,
    });
    expect(result.data).toEqual([cartItem]);
    expect(result.pagination).toEqual(response.pagination);
  });

  it("propagates service errors", async () => {
    const error = new Error("Database down");
    mocks.cartService.getCartItems.mockRejectedValue(error);

    await expect(controller.getCartItems({}, ACTIVE_USER_ID)).rejects.toBe(
      error,
    );
  });
});

describe("CartController - addCartItem", () => {
  let controller: CartController;
  let mocks: CartControllerMocks;

  beforeEach(async () => {
    ({ controller, mocks } = await setupCartController());
  });

  it("passes skuId, quantity, and active user through to the service", async () => {
    const cartItem = makeCartItemResponse();
    mocks.cartService.addCartItem.mockResolvedValue(cartItem);

    const body = { skuId: SKU_ID, quantity: 2 };

    const result = await controller.addCartItem(body, ACTIVE_USER_ID);

    expect(mocks.cartService.addCartItem).toHaveBeenCalledWith(
      containing({ skuId: SKU_ID, quantity: 2, userId: ACTIVE_USER_ID }),
    );
    expect(result).toEqual(cartItem);
  });

  it("propagates service errors", async () => {
    const error = new Error("SKU not found.");
    mocks.cartService.addCartItem.mockRejectedValue(error);

    const body = { skuId: SKU_ID, quantity: 2 };

    await expect(controller.addCartItem(body, ACTIVE_USER_ID)).rejects.toBe(
      error,
    );
  });
});

describe("CartController - updateCartItemQuantity", () => {
  let controller: CartController;
  let mocks: CartControllerMocks;

  beforeEach(async () => {
    ({ controller, mocks } = await setupCartController());
  });

  it("passes cartItemId, quantity, and active user through to the service", async () => {
    const cartItem = makeCartItemResponse({ quantity: 5 });
    mocks.cartService.updateCartItemQuantity.mockResolvedValue(cartItem);

    const body = { quantity: 5 };

    const result = await controller.updateCartItemQuantity(
      CART_ITEM_ID,
      body,
      ACTIVE_USER_ID,
    );

    expect(mocks.cartService.updateCartItemQuantity).toHaveBeenCalledWith(
      containing({
        cartItemId: CART_ITEM_ID,
        quantity: 5,
        userId: ACTIVE_USER_ID,
      }),
    );
    expect(result).toEqual(cartItem);
  });

  it("propagates service errors (e.g. another user's cart item, 404)", async () => {
    const error = new Error("Cart item not found.");
    mocks.cartService.updateCartItemQuantity.mockRejectedValue(error);

    const body = { quantity: 5 };

    await expect(
      controller.updateCartItemQuantity(CART_ITEM_ID, body, ACTIVE_USER_ID),
    ).rejects.toBe(error);
  });
});

describe("CartController - deleteCartItem", () => {
  let controller: CartController;
  let mocks: CartControllerMocks;

  beforeEach(async () => {
    ({ controller, mocks } = await setupCartController());
  });

  it("passes cartItemId and active user through to the service", async () => {
    const result = { message: "Cart item removed successfully." };
    mocks.cartService.deleteCartItem.mockResolvedValue(result);

    const response = await controller.deleteCartItem(
      CART_ITEM_ID,
      ACTIVE_USER_ID,
    );

    expect(mocks.cartService.deleteCartItem).toHaveBeenCalledWith({
      cartItemId: CART_ITEM_ID,
      userId: ACTIVE_USER_ID,
    });
    expect(response).toEqual(result);
  });

  it("propagates service errors (e.g. another user's cart item, 404)", async () => {
    const error = new Error("Cart item not found.");
    mocks.cartService.deleteCartItem.mockRejectedValue(error);

    await expect(
      controller.deleteCartItem(CART_ITEM_ID, ACTIVE_USER_ID),
    ).rejects.toBe(error);
  });
});
