import { productById } from "../data/products.data";
import { defineSeeder } from "../seed-context";
import { ProductId, UserId } from "../seed-ids";

const sku = (productId: string, index: number): string =>
  productById(productId).skus[index].id;

const CART_ITEMS = [
  { userId: UserId.CLIENT, skuId: sku(ProductId.IPHONE_15, 0), quantity: 2 },
  { userId: UserId.CLIENT, skuId: sku(ProductId.AIR_MAX, 0), quantity: 1 },
  { userId: UserId.CLIENT, skuId: sku(ProductId.GALAXY_S24, 1), quantity: 1 },
  {
    userId: UserId.CLIENT_SECONDARY,
    skuId: sku(ProductId.MACBOOK_AIR, 0),
    quantity: 1,
  },
  {
    userId: UserId.CLIENT_SECONDARY,
    skuId: sku(ProductId.IPHONE_15, 3),
    quantity: 3,
  },
];

/** CartItem carries a real @@unique([userId, skuId]), so upsert uses it directly. */
export default defineSeeder({
  name: "cart-items",
  tier: "demo",
  run: async ({ prisma, log }) => {
    for (const item of CART_ITEMS) {
      await prisma.cartItem.upsert({
        where: { userId_skuId: { userId: item.userId, skuId: item.skuId } },
        create: item,
        update: { quantity: item.quantity },
      });
    }

    log(`${CART_ITEMS.length} cart items`);
  },
});
