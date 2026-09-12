import { CartService } from "../cart.service";

import {
  CartServiceMocks,
  USER_ID,
  containing,
  makeCartItem,
  setupCartService,
} from "./cart-service-test-harness";

describe("CartService - getCartItems", () => {
  let service: CartService;
  let mocks: CartServiceMocks;

  beforeEach(async () => {
    ({ service, mocks } = await setupCartService());
  });

  it("scopes the query to the caller's own cart lines (BR-C01)", async () => {
    mocks.cartRepository.findManyCartItems.mockResolvedValue({
      cartItems: [],
      cartItemsCount: 0,
    });

    await service.getCartItems({ query: {}, userId: USER_ID });

    expect(mocks.cartRepository.findManyCartItems).toHaveBeenCalledWith(
      containing({ where: { userId: USER_ID } }),
    );
  });

  it("applies pagination defaults (pageIndex 1, pageSize 10)", async () => {
    mocks.cartRepository.findManyCartItems.mockResolvedValue({
      cartItems: [],
      cartItemsCount: 0,
    });

    await service.getCartItems({ query: {}, userId: USER_ID });

    expect(mocks.cartRepository.findManyCartItems).toHaveBeenCalledWith(
      containing({ take: 10, skip: 0 }),
    );
  });

  it("computes skip from a custom pageIndex/pageSize", async () => {
    mocks.cartRepository.findManyCartItems.mockResolvedValue({
      cartItems: [],
      cartItemsCount: 0,
    });

    await service.getCartItems({
      query: { pageIndex: 3, pageSize: 20 },
      userId: USER_ID,
    });

    expect(mocks.cartRepository.findManyCartItems).toHaveBeenCalledWith(
      containing({ take: 20, skip: 40 }),
    );
  });

  it("returns paginated cart items with computed totalPages", async () => {
    const cartItems = [makeCartItem()];
    mocks.cartRepository.findManyCartItems.mockResolvedValue({
      cartItems,
      cartItemsCount: 25,
    });

    const result = await service.getCartItems({
      query: { pageIndex: 1, pageSize: 10 },
      userId: USER_ID,
    });

    expect(result).toEqual({
      data: cartItems,
      pagination: {
        pageIndex: 1,
        pageSize: 10,
        totalPages: 3,
        totalItems: 25,
      },
    });
  });

  it("propagates repository errors", async () => {
    const error = new Error("Database down");
    mocks.cartRepository.findManyCartItems.mockRejectedValue(error);

    const promise = service.getCartItems({ query: {}, userId: USER_ID });

    await expect(promise).rejects.toBe(error);
  });
});
