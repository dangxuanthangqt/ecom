import { Prisma } from "@prisma/client";

import { PRODUCTS } from "../data/products.data";
import { defineSeeder } from "../seed-context";
import { translationId, UserId } from "../seed-ids";

/**
 * Products are owned by the demo seller so the seller-scoped endpoints
 * (manage-product, manage-order) have real rows to work against.
 */
export default defineSeeder({
  name: "products",
  tier: "demo",
  run: async ({ prisma, actorId, log }) => {
    const ownerId = UserId.SELLER;
    let skuCount = 0;

    for (const product of PRODUCTS) {
      const { translations, skus, categoryIds, variants, ...productData } =
        product;
      const categories = { set: categoryIds.map((id) => ({ id })) };

      await prisma.product.upsert({
        where: { id: product.id },
        create: {
          ...productData,
          variants: variants as unknown as Prisma.InputJsonValue,
          categories: { connect: categoryIds.map((id) => ({ id })) },
          createdById: ownerId,
        },
        update: {
          name: product.name,
          basePrice: product.basePrice,
          virtualPrice: product.virtualPrice,
          brandId: product.brandId,
          images: product.images,
          publishedAt: product.publishedAt,
          variants: variants as unknown as Prisma.InputJsonValue,
          categories,
          deletedAt: null,
          updatedById: actorId,
        },
      });

      for (const translation of translations) {
        const id = translationId(product.id, translation.languageId);

        await prisma.productTranslation.upsert({
          where: { id },
          create: {
            id,
            productId: product.id,
            ...translation,
            createdById: ownerId,
          },
          update: {
            name: translation.name,
            description: translation.description,
            deletedAt: null,
            updatedById: actorId,
          },
        });
      }

      for (const sku of skus) {
        await prisma.sKU.upsert({
          where: { id: sku.id },
          create: { ...sku, productId: product.id, createdById: ownerId },
          update: {
            value: sku.value,
            price: sku.price,
            stock: sku.stock,
            image: sku.image,
            order: sku.order,
            deletedAt: null,
            updatedById: actorId,
          },
        });
      }

      skuCount += skus.length;
    }

    log(`${PRODUCTS.length} products, ${skuCount} SKUs`);
  },
});
