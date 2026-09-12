/* eslint-disable no-console */
import { faker } from "@faker-js/faker";
import { Prisma, PrismaClient } from "@prisma/client";

import { HashingService } from "@/shared/services/hashing.service";

import { RoleId, UserId } from "../seed-ids";

import { VolumeConfig } from "./volume-config";
import * as gen from "./volume-generators";

/** Writes rows in chunks, because one 100k-row INSERT is a memory and lock risk. */
const insertInBatches = async <T>(
  rows: T[],
  batchSize: number,
  write: (chunk: T[]) => Promise<{ count: number }>,
): Promise<number> => {
  let written = 0;

  for (let start = 0; start < rows.length; start += batchSize) {
    const result = await write(rows.slice(start, start + batchSize));

    written += result.count;
  }

  return written;
};

/**
 * Implicit many-to-many join tables have no Prisma model, so they take raw SQL.
 * Values go through `Prisma.sql` placeholders rather than string interpolation:
 * the ids are faker-generated today, but a parameterized query keeps that from
 * mattering if they ever start coming from a flag, an env var or an import.
 * Only the table name is `Prisma.raw`, and it comes from a closed union type.
 */
const linkJoinTable = async (
  prisma: PrismaClient,
  table: "_CategoryToProduct" | "_OrderToProduct",
  pairs: { a: string; b: string }[],
  batchSize: number,
): Promise<number> => {
  let written = 0;

  for (let start = 0; start < pairs.length; start += batchSize) {
    const rows = pairs
      .slice(start, start + batchSize)
      .map((pair) => Prisma.sql`(${pair.a}::uuid, ${pair.b}::uuid)`);

    written += await prisma.$executeRaw`
      INSERT INTO ${Prisma.raw(`"${table}"`)} ("A", "B")
      VALUES ${Prisma.join(rows)}
      ON CONFLICT DO NOTHING
    `;
  }

  return written;
};

const step = async (
  label: string,
  run: () => Promise<number>,
): Promise<void> => {
  const startedAt = Date.now();
  const count = await run();

  console.log(`  ✓ ${label}: ${count} rows (${Date.now() - startedAt}ms)`);
};

export const runVolumeSeed = async (
  prisma: PrismaClient,
  config: VolumeConfig,
): Promise<void> => {
  faker.seed(config.randomSeed);

  const languages = await prisma.language.findMany({ select: { id: true } });
  const clientRole = await prisma.role.findUnique({
    where: { id: RoleId.CLIENT },
  });

  if (languages.length === 0 || !clientRole) {
    throw new Error(
      "Core seed missing. Run `pnpm db:seed:core` before seeding volume data.",
    );
  }

  const languageIds = languages.map((language) => language.id);
  const actorId = UserId.VOLUME_ACTOR;

  // Every generated row is stamped with this actor, which is what `--clean` keys on.
  await prisma.user.upsert({
    where: { id: actorId },
    create: {
      id: actorId,
      email: `volume-actor@${gen.VOLUME_EMAIL_DOMAIN}`,
      name: "Volume Seed Actor",
      phoneNumber: "0000000000",
      password: new HashingService().hash(faker.string.alphanumeric(32)),
      roleId: RoleId.ADMIN,
      status: "INACTIVE",
    },
    update: {},
  });

  const { batchSize } = config;

  const brands = gen.generateBrands(config.brands, actorId);
  await step("brands", () =>
    insertInBatches(brands, batchSize, (data) =>
      prisma.brand.createMany({ data }),
    ),
  );
  await step("brand translations", () =>
    insertInBatches(
      gen.generateTranslations(brands, languageIds, actorId, "brandId"),
      batchSize,
      (data) => prisma.brandTranslation.createMany({ data: data as never }),
    ),
  );

  const categories = gen.generateCategories(config.categories, actorId);
  await step("categories", () =>
    insertInBatches(categories, batchSize, (data) =>
      prisma.category.createMany({ data }),
    ),
  );
  await step("category translations", () =>
    insertInBatches(
      gen.generateTranslations(categories, languageIds, actorId, "categoryId"),
      batchSize,
      (data) => prisma.categoryTranslation.createMany({ data: data as never }),
    ),
  );

  const products = gen.generateProducts(
    config.products,
    brands.map((brand) => brand.id),
    actorId,
  );
  await step("products", () =>
    insertInBatches(products, batchSize, (data) =>
      prisma.product.createMany({ data }),
    ),
  );
  await step("product translations", () =>
    insertInBatches(
      gen.generateTranslations(products, languageIds, actorId, "productId"),
      batchSize,
      (data) => prisma.productTranslation.createMany({ data: data as never }),
    ),
  );
  await step("product ↔ category links", () =>
    linkJoinTable(
      prisma,
      "_CategoryToProduct",
      products.map((product) => ({
        a: faker.helpers.arrayElement(categories).id,
        b: product.id,
      })),
      batchSize,
    ),
  );

  const skus = gen.generateSkus(products, config.skusPerProduct, actorId);
  await step("SKUs", () =>
    insertInBatches(skus, batchSize, (data) => prisma.sKU.createMany({ data })),
  );

  // Hashed once and shared: bcrypt at 10 rounds would otherwise cost ~50s for 500 users.
  const password = new HashingService().hash("Password@123");
  const users = gen.generateUsers(
    config.users,
    clientRole.id,
    password,
    actorId,
  );
  await step("users", () =>
    insertInBatches(users, batchSize, (data) =>
      prisma.user.createMany({ data }),
    ),
  );

  const userIds = users.map((user) => user.id);
  const orders = gen.generateOrders(config.orders, userIds, actorId);
  await step("orders", () =>
    insertInBatches(orders, batchSize, (data) =>
      prisma.order.createMany({ data }),
    ),
  );

  const items = gen.generateOrderItems(orders, skus, config);
  await step("order item snapshots", () =>
    insertInBatches(
      items.map((item) => item.snapshot),
      batchSize,
      (data) => prisma.productSKUSnapshot.createMany({ data }),
    ),
  );
  await step("order ↔ product links", () =>
    linkJoinTable(
      prisma,
      "_OrderToProduct",
      items.map((item) => ({ a: item.orderId, b: item.productId })),
      batchSize,
    ),
  );

  await step("reviews", () =>
    insertInBatches(
      gen.generateReviews(
        config.reviews,
        userIds,
        products.map((product) => product.id),
      ),
      batchSize,
      (data) => prisma.review.createMany({ data, skipDuplicates: true }),
    ),
  );

  await step("cart items", () =>
    insertInBatches(
      gen.generateCartItems(
        config.cartItems,
        userIds,
        skus.map((sku) => sku.id),
      ),
      batchSize,
      (data) => prisma.cartItem.createMany({ data, skipDuplicates: true }),
    ),
  );
};
