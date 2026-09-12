import { Prisma } from "@prisma/client";

/**
 * The publish predicate a customer-facing (public) product listing must
 * satisfy: not soft-deleted, and its `publishedAt` timestamp has passed.
 *
 * Extracted so cart, order and review flows share one definition instead of
 * re-typing the inline predicate already used by
 * `src/repositories/product/product.repository.ts`. That repository is left
 * untouched in this phase — refactoring it to call this helper is out of
 * scope here.
 */
export function publishedProductWhere(): Prisma.ProductWhereInput {
  return {
    deletedAt: null,
    publishedAt: { lte: new Date(), not: null },
  };
}
