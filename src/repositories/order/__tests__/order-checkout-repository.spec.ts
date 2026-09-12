import { OrderStatus } from "@prisma/client";

import { OrderCancelRepository } from "../order-cancel.repository";
import { OrderCheckoutRepository } from "../order-checkout.repository";

import {
  CART_ITEM_ID_1,
  CART_ITEM_ID_2,
  OTHER_USER_ID,
  ORDER_ID,
  OrderCancelMocks,
  OrderCheckoutMocks,
  PRODUCT_ID_1,
  PRODUCT_ID_2,
  SELLER_B,
  SKU_ID_1,
  SKU_ID_2,
  USER_ID,
  containing,
  makeCheckoutRow,
  makeOrder,
  setupOrderCancelRepository,
  setupOrderCheckoutRepository,
} from "./order-repository-test-harness";

describe("OrderCheckoutRepository - checkout", () => {
  let repository: OrderCheckoutRepository;
  let mocks: OrderCheckoutMocks;

  beforeEach(async () => {
    ({ repository, mocks } = await setupOrderCheckoutRepository());
    mocks.txMocks.sKU.updateMany.mockResolvedValue({ count: 1 });
    mocks.txMocks.order.create.mockResolvedValue(makeOrder());
    mocks.txMocks.cartItem.deleteMany.mockResolvedValue({ count: 1 });
  });

  it("creates exactly two orders for a two-seller checkout (BR-O01)", async () => {
    const rowA = makeCheckoutRow({ id: CART_ITEM_ID_1 });
    const rowB = makeCheckoutRow({
      id: CART_ITEM_ID_2,
      sku: {
        ...makeCheckoutRow().sku,
        id: SKU_ID_2,
        product: {
          ...makeCheckoutRow().sku.product,
          id: PRODUCT_ID_2,
          createdById: SELLER_B,
        },
      },
    });
    mocks.txMocks.cartItem.findMany.mockResolvedValue([rowA, rowB]);

    await repository.checkout({
      cartItemIds: [CART_ITEM_ID_1, CART_ITEM_ID_2],
      userId: USER_ID,
    });

    expect(mocks.txMocks.order.create).toHaveBeenCalledTimes(2);
  });

  it("connects only its own seller's products/snapshots per order (BR-O01, best-seller intact)", async () => {
    const rowA = makeCheckoutRow({ id: CART_ITEM_ID_1 });
    const rowB = makeCheckoutRow({
      id: CART_ITEM_ID_2,
      sku: {
        ...makeCheckoutRow().sku,
        id: SKU_ID_2,
        product: {
          ...makeCheckoutRow().sku.product,
          id: PRODUCT_ID_2,
          createdById: SELLER_B,
        },
      },
    });
    mocks.txMocks.cartItem.findMany.mockResolvedValue([rowA, rowB]);

    await repository.checkout({
      cartItemIds: [CART_ITEM_ID_1, CART_ITEM_ID_2],
      userId: USER_ID,
    });

    expect(mocks.txMocks.order.create).toHaveBeenNthCalledWith(
      1,
      containing({
        data: containing({
          products: { connect: [{ id: PRODUCT_ID_1 }] },
        }),
      }),
    );
    expect(mocks.txMocks.order.create).toHaveBeenNthCalledWith(
      2,
      containing({
        data: containing({
          products: { connect: [{ id: PRODUCT_ID_2 }] },
        }),
      }),
    );
  });

  it("decrements stock conditionally and asserts count === 1 per SKU (BR-O02)", async () => {
    const row = makeCheckoutRow({ quantity: 3 });
    mocks.txMocks.cartItem.findMany.mockResolvedValue([row]);

    await repository.checkout({
      cartItemIds: [CART_ITEM_ID_1],
      userId: USER_ID,
    });

    expect(mocks.txMocks.sKU.updateMany).toHaveBeenCalledWith({
      where: { id: SKU_ID_1, stock: { gte: 3 }, deletedAt: null },
      data: { stock: { decrement: 3 } },
    });
  });

  it("rolls back (no order create, no cart delete) when the last line fails stock (BR-O02)", async () => {
    const rowA = makeCheckoutRow({ id: CART_ITEM_ID_1 });
    const rowB = makeCheckoutRow({
      id: CART_ITEM_ID_2,
      sku: { ...makeCheckoutRow().sku, id: SKU_ID_2 },
    });
    mocks.txMocks.cartItem.findMany.mockResolvedValue([rowA, rowB]);
    mocks.txMocks.sKU.updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });
    mocks.txMocks.sKU.findUnique.mockResolvedValue({ stock: 1 });

    const promise = repository.checkout({
      cartItemIds: [CART_ITEM_ID_1, CART_ITEM_ID_2],
      userId: USER_ID,
    });

    await expect(promise).rejects.toMatchObject({ status: 400 });
    expect(mocks.txMocks.order.create).not.toHaveBeenCalled();
    expect(mocks.txMocks.cartItem.deleteMany).not.toHaveBeenCalled();
  });

  it("writes snapshot rows with the frozen fields, never selecting from Product (BR-O03)", async () => {
    const row = makeCheckoutRow({ quantity: 5 });
    mocks.txMocks.cartItem.findMany.mockResolvedValue([row]);

    await repository.checkout({
      cartItemIds: [CART_ITEM_ID_1],
      userId: USER_ID,
    });

    expect(mocks.txMocks.order.create).toHaveBeenCalledWith(
      containing({
        data: containing({
          items: {
            create: [
              {
                productName: row.sku.product.name,
                price: row.sku.price,
                images: row.sku.product.images,
                skuValue: row.sku.value,
                quantity: 5,
                skuId: row.sku.id,
              },
            ],
          },
        }),
      }),
    );
  });

  it("fails the whole request with 404 when a cart id does not resolve to a row (BR-O07)", async () => {
    mocks.txMocks.cartItem.findMany.mockResolvedValue([makeCheckoutRow()]);

    const promise = repository.checkout({
      cartItemIds: [CART_ITEM_ID_1, CART_ITEM_ID_2, "missing-id"],
      userId: USER_ID,
    });

    await expect(promise).rejects.toMatchObject({ status: 404 });
    expect(mocks.txMocks.sKU.updateMany).not.toHaveBeenCalled();
    expect(mocks.txMocks.order.create).not.toHaveBeenCalled();
  });

  it("rejects a soft-deleted or unpublished product/SKU with 400 before touching stock", async () => {
    const row = makeCheckoutRow({
      sku: { ...makeCheckoutRow().sku, deletedAt: new Date() },
    });
    mocks.txMocks.cartItem.findMany.mockResolvedValue([row]);

    const promise = repository.checkout({
      cartItemIds: [CART_ITEM_ID_1],
      userId: USER_ID,
    });

    await expect(promise).rejects.toMatchObject({ status: 400 });
    expect(mocks.txMocks.sKU.updateMany).not.toHaveBeenCalled();
  });

  it("deletes only the consumed cart lines scoped to the caller", async () => {
    const row = makeCheckoutRow();
    mocks.txMocks.cartItem.findMany.mockResolvedValue([row]);

    await repository.checkout({
      cartItemIds: [CART_ITEM_ID_1],
      userId: USER_ID,
    });

    expect(mocks.txMocks.cartItem.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: [CART_ITEM_ID_1] }, userId: USER_ID },
    });
  });

  it("throws internal on an unexpected database failure", async () => {
    mocks.txMocks.cartItem.findMany.mockRejectedValue(new Error("db down"));

    const promise = repository.checkout({
      cartItemIds: [CART_ITEM_ID_1],
      userId: USER_ID,
    });

    await expect(promise).rejects.toMatchObject({ status: 500 });
  });
});

describe("OrderCancelRepository - cancelOrder (BR-O04)", () => {
  let repository: OrderCancelRepository;
  let mocks: OrderCancelMocks;

  beforeEach(async () => {
    ({ repository, mocks } = await setupOrderCancelRepository());
  });

  it("cancels a PENDING_CONFIRMATION order and restores stock per snapshot", async () => {
    mocks.txMocks.order.updateMany.mockResolvedValue({ count: 1 });
    mocks.txMocks.productSKUSnapshot.findMany.mockResolvedValue([
      { skuId: SKU_ID_1, quantity: 2 },
      { skuId: SKU_ID_2, quantity: 3 },
    ]);
    mocks.txMocks.order.findUniqueOrThrow.mockResolvedValue(
      makeOrder({ status: OrderStatus.CANCELLED }),
    );

    const result = await repository.cancelOrder({
      orderId: ORDER_ID,
      userId: USER_ID,
    });

    expect(mocks.txMocks.order.updateMany).toHaveBeenCalledWith({
      where: {
        id: ORDER_ID,
        userId: USER_ID,
        status: OrderStatus.PENDING_CONFIRMATION,
        deletedAt: null,
      },
      data: { status: OrderStatus.CANCELLED, updatedById: USER_ID },
    });
    expect(mocks.txMocks.sKU.update).toHaveBeenNthCalledWith(1, {
      where: { id: SKU_ID_1 },
      data: { stock: { increment: 2 } },
    });
    expect(mocks.txMocks.sKU.update).toHaveBeenNthCalledWith(2, {
      where: { id: SKU_ID_2 },
      data: { stock: { increment: 3 } },
    });
    expect(result).toEqual(makeOrder({ status: OrderStatus.CANCELLED }));
  });

  it("skips snapshots whose SKU was hard-deleted (null skuId)", async () => {
    mocks.txMocks.order.updateMany.mockResolvedValue({ count: 1 });
    mocks.txMocks.productSKUSnapshot.findMany.mockResolvedValue([
      { skuId: null, quantity: 2 },
    ]);
    mocks.txMocks.order.findUniqueOrThrow.mockResolvedValue(makeOrder());

    await repository.cancelOrder({ orderId: ORDER_ID, userId: USER_ID });

    expect(mocks.txMocks.sKU.update).not.toHaveBeenCalled();
  });

  it("returns 400 when the order is not PENDING_CONFIRMATION (owned but wrong status)", async () => {
    mocks.txMocks.order.updateMany.mockResolvedValue({ count: 0 });
    mocks.txMocks.order.findFirst.mockResolvedValue({ id: ORDER_ID });

    const promise = repository.cancelOrder({
      orderId: ORDER_ID,
      userId: USER_ID,
    });

    await expect(promise).rejects.toMatchObject({ status: 400 });
  });

  it("returns 404 when the order is not the caller's or does not exist", async () => {
    mocks.txMocks.order.updateMany.mockResolvedValue({ count: 0 });
    mocks.txMocks.order.findFirst.mockResolvedValue(null);

    const promise = repository.cancelOrder({
      orderId: ORDER_ID,
      userId: OTHER_USER_ID,
    });

    await expect(promise).rejects.toMatchObject({ status: 404 });
  });

  it("throws internal on an unexpected database failure", async () => {
    mocks.txMocks.order.updateMany.mockRejectedValue(new Error("db down"));

    const promise = repository.cancelOrder({
      orderId: ORDER_ID,
      userId: USER_ID,
    });

    await expect(promise).rejects.toMatchObject({ status: 500 });
  });
});
