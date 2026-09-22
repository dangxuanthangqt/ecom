import { OrderStatus } from "@/generated/prisma/client";

import { productById } from "../data/products.data";
import { defineSeeder } from "../seed-context";
import { derivedId, OrderId, ProductId, UserId } from "../seed-ids";

interface OrderLine {
  productId: string;
  skuIndex: number;
  quantity: number;
}

interface OrderFixture {
  id: string;
  userId: string;
  status: OrderStatus;
  lines: OrderLine[];
}

/** One order per OrderStatus, so every status filter on the order APIs has data. */
const ORDERS: OrderFixture[] = [
  {
    id: OrderId.DELIVERED,
    userId: UserId.CLIENT,
    status: OrderStatus.DELIVERED,
    lines: [
      { productId: ProductId.IPHONE_15, skuIndex: 0, quantity: 1 },
      { productId: ProductId.AIR_MAX, skuIndex: 1, quantity: 2 },
    ],
  },
  {
    id: OrderId.PENDING_CONFIRMATION,
    userId: UserId.CLIENT_SECONDARY,
    status: OrderStatus.PENDING_CONFIRMATION,
    lines: [{ productId: ProductId.MACBOOK_AIR, skuIndex: 0, quantity: 1 }],
  },
  {
    id: OrderId.PENDING_PICKUP,
    userId: UserId.CLIENT,
    status: OrderStatus.PENDING_PICKUP,
    lines: [{ productId: ProductId.GALAXY_S24, skuIndex: 0, quantity: 1 }],
  },
  {
    id: OrderId.PENDING_DELIVERY,
    userId: UserId.CLIENT,
    status: OrderStatus.PENDING_DELIVERY,
    lines: [
      { productId: ProductId.AIR_MAX, skuIndex: 2, quantity: 1 },
      { productId: ProductId.IPHONE_15, skuIndex: 2, quantity: 1 },
    ],
  },
  {
    id: OrderId.RETURNED,
    userId: UserId.CLIENT_SECONDARY,
    status: OrderStatus.RETURNED,
    lines: [{ productId: ProductId.GALAXY_S24, skuIndex: 1, quantity: 2 }],
  },
  {
    id: OrderId.CANCELLED,
    userId: UserId.CLIENT_SECONDARY,
    status: OrderStatus.CANCELLED,
    lines: [{ productId: ProductId.AIR_MAX, skuIndex: 0, quantity: 1 }],
  },
];

/**
 * Orders store a price/name snapshot rather than a live join, so the fixture
 * copies the product values at seed time exactly like the checkout flow does.
 */
export default defineSeeder({
  name: "orders",
  tier: "demo",
  run: async ({ prisma, actorId, log }) => {
    let snapshotCount = 0;

    for (const order of ORDERS) {
      const productIds = [
        ...new Set(order.lines.map((line) => line.productId)),
      ];

      await prisma.order.upsert({
        where: { id: order.id },
        create: {
          id: order.id,
          userId: order.userId,
          status: order.status,
          products: { connect: productIds.map((id) => ({ id })) },
          createdById: actorId,
        },
        update: {
          status: order.status,
          products: { set: productIds.map((id) => ({ id })) },
          deletedAt: null,
          updatedById: actorId,
        },
      });

      for (const [index, line] of order.lines.entries()) {
        const product = productById(line.productId);
        const sku = product.skus[line.skuIndex];
        const id = derivedId(order.id, index.toString(16).padStart(4, "0"));

        await prisma.productSKUSnapshot.upsert({
          where: { id },
          create: {
            id,
            orderId: order.id,
            skuId: sku.id,
            productName: product.name,
            price: sku.price,
            images: product.images,
            skuValue: sku.value,
            quantity: line.quantity,
          },
          update: {
            price: sku.price,
            quantity: line.quantity,
            skuValue: sku.value,
          },
        });

        snapshotCount += 1;
      }
    }

    log(`${ORDERS.length} orders, ${snapshotCount} snapshots`);
  },
});
