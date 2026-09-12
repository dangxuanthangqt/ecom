import { PrismaClient } from "@prisma/client";

import { Seeder } from "./seed-context";
import { UserId } from "./seed-ids";
import brands from "./seeders/brands.seeder";
import carts from "./seeders/carts.seeder";
import categories from "./seeders/categories.seeder";
import demoUsers from "./seeders/demo-users.seeder";
import languages from "./seeders/languages.seeder";
import orders from "./seeders/orders.seeder";
import products from "./seeders/products.seeder";
import reviews from "./seeders/reviews.seeder";
import roles from "./seeders/roles.seeder";
import users from "./seeders/users.seeder";

/**
 * Execution order IS the foreign-key dependency order. Adding a seeder means
 * inserting it after everything it references — nothing here resolves order
 * automatically, on purpose: an explicit list is easier to reason about than a
 * dependency graph, and the failure mode (an FK violation) is immediate.
 */
const SEEDERS: Seeder[] = [
  languages,
  roles,
  users,
  demoUsers,
  brands,
  categories,
  products,
  carts,
  orders,
  reviews,
];

export interface RunSeedOptions {
  /** Skip every `demo` seeder — what staging/production should use. */
  coreOnly: boolean;
}

export const runSeeders = async (
  prisma: PrismaClient,
  { coreOnly }: RunSeedOptions,
): Promise<void> => {
  const selected = SEEDERS.filter(
    (seeder) => !coreOnly || seeder.tier === "core",
  );

  // One transaction for the whole run: a half-seeded database is worse than an
  // empty one, because the next run's upserts would paper over the gap.
  await prisma.$transaction(
    async (tx) => {
      for (const seeder of selected) {
        const startedAt = Date.now();

        await seeder.run({
          prisma: tx as PrismaClient,
          actorId: UserId.ADMIN,
          log: (message) =>
            // eslint-disable-next-line no-console
            console.log(
              `  ✓ ${seeder.name}: ${message} (${Date.now() - startedAt}ms)`,
            ),
        });
      }
    },
    { maxWait: 10_000, timeout: 120_000 },
  );
};
