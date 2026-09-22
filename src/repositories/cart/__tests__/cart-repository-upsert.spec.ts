import { Prisma } from "@/generated/prisma/client";
import { CartRepository } from "@/repositories/cart/cart.repository";

import {
  CartMocks,
  SKU_ID,
  USER_ID,
  containing,
  makeCartItem,
  setupCartRepository,
} from "./cart-repository-test-harness";

const uniqueConstraintError = () =>
  new Prisma.PrismaClientKnownRequestError("Unique constraint failed.", {
    code: "P2002",
    clientVersion: "6.0.0",
  });

const foreignKeyError = () =>
  new Prisma.PrismaClientKnownRequestError("Foreign key constraint failed.", {
    code: "P2003",
    clientVersion: "6.0.0",
  });

describe("CartRepository - upsertCartItem", () => {
  let repository: CartRepository;
  let mocks: CartMocks;

  beforeEach(async () => {
    ({ repository, mocks } = await setupCartRepository());
  });

  it("upserts by the (userId, skuId) unique key with an increment update", async () => {
    const cartItem = makeCartItem();
    mocks.prismaService.cartItem.upsert.mockResolvedValue(cartItem);

    const result = await repository.upsertCartItem({
      userId: USER_ID,
      skuId: SKU_ID,
      quantity: 2,
    });

    expect(result).toEqual(cartItem);
    expect(mocks.prismaService.cartItem.upsert).toHaveBeenCalledWith(
      containing({
        where: { userId_skuId: { userId: USER_ID, skuId: SKU_ID } },
        create: { userId: USER_ID, skuId: SKU_ID, quantity: 2 },
        update: { quantity: { increment: 2 } },
      }),
    );
  });

  it("retries as an increment update when the create branch races (P2002)", async () => {
    mocks.prismaService.cartItem.upsert.mockRejectedValue(
      uniqueConstraintError(),
    );
    const cartItem = makeCartItem({ quantity: 4 });
    mocks.prismaService.cartItem.update.mockResolvedValue(cartItem);

    const result = await repository.upsertCartItem({
      userId: USER_ID,
      skuId: SKU_ID,
      quantity: 2,
    });

    expect(result).toEqual(cartItem);
    expect(mocks.prismaService.cartItem.update).toHaveBeenCalledWith(
      containing({
        where: { userId_skuId: { userId: USER_ID, skuId: SKU_ID } },
        data: { quantity: { increment: 2 } },
      }),
    );
  });

  it("surfaces a deterministic 400 (never a 500) when the retried update also fails", async () => {
    mocks.prismaService.cartItem.upsert.mockRejectedValue(
      uniqueConstraintError(),
    );
    mocks.prismaService.cartItem.update.mockRejectedValue(
      new Error("Still racing"),
    );

    const promise = repository.upsertCartItem({
      userId: USER_ID,
      skuId: SKU_ID,
      quantity: 2,
    });

    await expect(promise).rejects.toMatchObject({ status: 400 });
  });

  it("maps a foreign key violation to notFound", async () => {
    mocks.prismaService.cartItem.upsert.mockRejectedValue(foreignKeyError());

    const promise = repository.upsertCartItem({
      userId: USER_ID,
      skuId: SKU_ID,
      quantity: 2,
    });

    await expect(promise).rejects.toMatchObject({
      status: 404,
      response: { message: "SKU not found." },
    });
  });

  it("throws internal error on an unexpected database failure", async () => {
    mocks.prismaService.cartItem.upsert.mockRejectedValue(
      new Error("Database down"),
    );

    const promise = repository.upsertCartItem({
      userId: USER_ID,
      skuId: SKU_ID,
      quantity: 2,
    });

    await expect(promise).rejects.toMatchObject({ status: 500 });
  });
});
