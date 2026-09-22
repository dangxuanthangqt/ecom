/* eslint-disable no-console */
import { PrismaClient } from "@/generated/prisma/client";

import { assertSeedableEnvironment } from "../seed-environment";
import { UserId } from "../seed-ids";

import { VOLUME_EMAIL_DOMAIN } from "./volume-generators";

/**
 * Removes everything the volume seeder wrote, leaving the fixture seed intact.
 *
 * Identification is by ownership, not by guesswork: every generated row carries
 * `createdById = UserId.VOLUME_ACTOR`, and every generated account sits on the
 * `@volume.local` email domain.
 *
 * Delete order is the reverse of the FK graph. Product and Brand/Category
 * cascade to their SKUs and translations, so those are not deleted explicitly.
 *
 * Brands and categories are removed after products on purpose: `Product.brand`
 * is onDelete NoAction, so the delete would fail if a surviving product still
 * pointed at a volume brand. That cannot happen because volume brands and
 * categories are only ever referenced by volume products, which go first.
 */
export const cleanVolumeData = async (prisma: PrismaClient): Promise<void> => {
  assertSeedableEnvironment("delete volume data");

  const actorId = UserId.VOLUME_ACTOR;
  const volumeUser = { email: { endsWith: `@${VOLUME_EMAIL_DOMAIN}` } };

  const steps: [string, () => Promise<{ count: number }>][] = [
    [
      "reviews",
      () => prisma.review.deleteMany({ where: { user: volumeUser } }),
    ],
    [
      "cart items",
      () => prisma.cartItem.deleteMany({ where: { user: volumeUser } }),
    ],
    [
      "order item snapshots",
      () =>
        prisma.productSKUSnapshot.deleteMany({
          where: { order: { createdById: actorId } },
        }),
    ],
    [
      "orders",
      () => prisma.order.deleteMany({ where: { createdById: actorId } }),
    ],
    [
      "products",
      () => prisma.product.deleteMany({ where: { createdById: actorId } }),
    ],
    [
      "brands",
      () => prisma.brand.deleteMany({ where: { createdById: actorId } }),
    ],
    [
      "categories",
      () => prisma.category.deleteMany({ where: { createdById: actorId } }),
    ],
    ["users", () => prisma.user.deleteMany({ where: volumeUser })],
  ];

  for (const [label, run] of steps) {
    const { count } = await run();

    console.log(`  ✓ removed ${count} ${label}`);
  }
};
