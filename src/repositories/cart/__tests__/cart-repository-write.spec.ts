import { Prisma } from "@/generated/prisma/client";
import { CartRepository } from "@/repositories/cart/cart.repository";

import {
  CART_ITEM_ID,
  CartMocks,
  USER_ID,
  containing,
  makeCartItem,
  setupCartRepository,
} from "./cart-repository-test-harness";

const notFoundError = () =>
  new Prisma.PrismaClientKnownRequestError("Record not found.", {
    code: "P2025",
    clientVersion: "6.0.0",
  });

describe("CartRepository - updateCartItem", () => {
  let repository: CartRepository;
  let mocks: CartMocks;

  beforeEach(async () => {
    ({ repository, mocks } = await setupCartRepository());
  });

  it("updates by id and userId together (ownership baked into where)", async () => {
    const cartItem = makeCartItem({ quantity: 5 });
    mocks.prismaService.cartItem.update.mockResolvedValue(cartItem);

    const result = await repository.updateCartItem({
      cartItemId: CART_ITEM_ID,
      userId: USER_ID,
      quantity: 5,
    });

    expect(result).toEqual(cartItem);
    expect(mocks.prismaService.cartItem.update).toHaveBeenCalledWith(
      containing({
        where: { id: CART_ITEM_ID, userId: USER_ID },
        data: { quantity: 5 },
      }),
    );
  });

  it("maps a record-not-found error to a 404 (a foreign id never confirms existence)", async () => {
    mocks.prismaService.cartItem.update.mockRejectedValue(notFoundError());

    const promise = repository.updateCartItem({
      cartItemId: CART_ITEM_ID,
      userId: USER_ID,
      quantity: 5,
    });

    await expect(promise).rejects.toMatchObject({
      status: 404,
      response: { message: "Cart item not found." },
    });
  });

  it("throws internal error on an unexpected database failure", async () => {
    mocks.prismaService.cartItem.update.mockRejectedValue(
      new Error("Database down"),
    );

    const promise = repository.updateCartItem({
      cartItemId: CART_ITEM_ID,
      userId: USER_ID,
      quantity: 5,
    });

    await expect(promise).rejects.toMatchObject({ status: 500 });
  });
});

describe("CartRepository - deleteCartItem", () => {
  let repository: CartRepository;
  let mocks: CartMocks;

  beforeEach(async () => {
    ({ repository, mocks } = await setupCartRepository());
  });

  it("hard-deletes the row (BR-C05: CartItem has no deletedAt)", async () => {
    mocks.prismaService.cartItem.delete.mockResolvedValue(makeCartItem());

    const result = await repository.deleteCartItem({
      cartItemId: CART_ITEM_ID,
      userId: USER_ID,
    });

    expect(result).toEqual({ message: "Cart item removed successfully." });
    expect(mocks.prismaService.cartItem.delete).toHaveBeenCalledWith(
      containing({ where: { id: CART_ITEM_ID, userId: USER_ID } }),
    );
    expect(mocks.prismaService.cartItem.update).not.toHaveBeenCalled();
  });

  it("maps a record-not-found error to a 404 (a foreign id never confirms existence)", async () => {
    mocks.prismaService.cartItem.delete.mockRejectedValue(notFoundError());

    const promise = repository.deleteCartItem({
      cartItemId: CART_ITEM_ID,
      userId: USER_ID,
    });

    await expect(promise).rejects.toMatchObject({
      status: 404,
      response: { message: "Cart item not found." },
    });
  });

  it("throws internal error on an unexpected database failure", async () => {
    mocks.prismaService.cartItem.delete.mockRejectedValue(
      new Error("Database down"),
    );

    const promise = repository.deleteCartItem({
      cartItemId: CART_ITEM_ID,
      userId: USER_ID,
    });

    await expect(promise).rejects.toMatchObject({ status: 500 });
  });
});
