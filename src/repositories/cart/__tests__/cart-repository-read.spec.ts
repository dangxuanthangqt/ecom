import { CartRepository } from "@/repositories/cart/cart.repository";

import {
  CART_ITEM_ID,
  CartMocks,
  SKU_ID,
  USER_ID,
  containing,
  makeCartItem,
  setupCartRepository,
} from "./cart-repository-test-harness";

describe("CartRepository - findManyCartItems", () => {
  let repository: CartRepository;
  let mocks: CartMocks;

  beforeEach(async () => {
    ({ repository, mocks } = await setupCartRepository());
    mocks.prismaService.$transaction.mockImplementation(
      (ops: Promise<unknown>[]) => Promise.all(ops),
    );
  });

  it("returns cart items and their count for the given user", async () => {
    const cartItems = [makeCartItem()];
    mocks.prismaService.cartItem.count.mockResolvedValue(1);
    mocks.prismaService.cartItem.findMany.mockResolvedValue(cartItems);

    const result = await repository.findManyCartItems({
      where: { userId: USER_ID },
      take: 10,
      skip: 0,
      orderBy: { createdAt: "desc" },
    });

    expect(result).toEqual({ cartItems, cartItemsCount: 1 });
    expect(mocks.prismaService.cartItem.findMany).toHaveBeenCalledWith(
      containing({ where: { userId: USER_ID } }),
    );
  });

  it("throws internal error on database failure", async () => {
    mocks.prismaService.$transaction.mockRejectedValue(
      new Error("Database down"),
    );

    const promise = repository.findManyCartItems({
      where: { userId: USER_ID },
      take: 10,
      skip: 0,
      orderBy: { createdAt: "desc" },
    });

    await expect(promise).rejects.toMatchObject({
      status: 500,
      response: { message: "Failed to fetch cart items." },
    });
  });
});

describe("CartRepository - findUniqueCartItem", () => {
  let repository: CartRepository;
  let mocks: CartMocks;

  beforeEach(async () => {
    ({ repository, mocks } = await setupCartRepository());
  });

  it("queries by id and userId together (ownership baked into where)", async () => {
    const cartItem = makeCartItem();
    mocks.prismaService.cartItem.findFirst.mockResolvedValue(cartItem);

    const result = await repository.findUniqueCartItem({
      cartItemId: CART_ITEM_ID,
      userId: USER_ID,
    });

    expect(result).toEqual(cartItem);
    expect(mocks.prismaService.cartItem.findFirst).toHaveBeenCalledWith(
      containing({ where: { id: CART_ITEM_ID, userId: USER_ID } }),
    );
  });

  it("returns null (never throws) when the row belongs to another user", async () => {
    mocks.prismaService.cartItem.findFirst.mockResolvedValue(null);

    const result = await repository.findUniqueCartItem({
      cartItemId: CART_ITEM_ID,
      userId: USER_ID,
    });

    expect(result).toBeNull();
  });

  it("throws internal error on database failure", async () => {
    mocks.prismaService.cartItem.findFirst.mockRejectedValue(
      new Error("Database down"),
    );

    const promise = repository.findUniqueCartItem({
      cartItemId: CART_ITEM_ID,
      userId: USER_ID,
    });

    await expect(promise).rejects.toMatchObject({
      status: 500,
      response: { message: "Failed to fetch cart item." },
    });
  });
});

describe("CartRepository - findAddableSku", () => {
  let repository: CartRepository;
  let mocks: CartMocks;

  beforeEach(async () => {
    ({ repository, mocks } = await setupCartRepository());
  });

  it("applies the published-product visibility predicate", async () => {
    mocks.prismaService.sKU.findFirst.mockResolvedValue({
      id: SKU_ID,
      stock: 10,
      cartItems: [],
    });

    await repository.findAddableSku({ skuId: SKU_ID, userId: USER_ID });

    expect(mocks.prismaService.sKU.findFirst).toHaveBeenCalledWith(
      containing({
        where: containing({
          id: SKU_ID,
          deletedAt: null,
          product: containing({ deletedAt: null }),
        }),
      }),
    );
  });

  it("returns null when the SKU is missing or invisible", async () => {
    mocks.prismaService.sKU.findFirst.mockResolvedValue(null);

    const result = await repository.findAddableSku({
      skuId: SKU_ID,
      userId: USER_ID,
    });

    expect(result).toBeNull();
  });

  it("throws internal error on database failure", async () => {
    mocks.prismaService.sKU.findFirst.mockRejectedValue(
      new Error("Database down"),
    );

    const promise = repository.findAddableSku({
      skuId: SKU_ID,
      userId: USER_ID,
    });

    await expect(promise).rejects.toMatchObject({ status: 500 });
  });
});
