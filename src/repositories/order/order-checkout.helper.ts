import throwHttpException from "@/shared/utils/throw-http-exception.util";

/**
 * The shape `order-checkout.repository.ts` selects for each owned cart line
 * inside the interactive transaction — enough to validate, decrement stock,
 * group by seller and freeze a `ProductSKUSnapshot` row (BR-O01..BR-O03).
 */
export interface CheckoutCartItemRow {
  id: string;
  quantity: number;
  sku: {
    id: string;
    value: string;
    price: number;
    stock: number;
    deletedAt: Date | null;
    product: {
      id: string;
      name: string;
      images: string[];
      publishedAt: Date | null;
      deletedAt: Date | null;
      createdById: string | null;
    };
  };
}

export interface SellerGroup {
  sellerId: string | null;
  rows: CheckoutCartItemRow[];
}

/**
 * BR-O01 — splits the checkout by `sku.product.createdById` (the seller),
 * preserving row order within each group. Uses array-based grouping (not a
 * `Map`) so a `null` seller id (an orphaned product) groups correctly
 * instead of colliding under a coerced key.
 */
export function groupBySeller(rows: CheckoutCartItemRow[]): SellerGroup[] {
  const groups: SellerGroup[] = [];

  for (const row of rows) {
    const sellerId = row.sku.product.createdById;
    let group = groups.find((candidate) => candidate.sellerId === sellerId);

    if (!group) {
      group = { sellerId, rows: [] };
      groups.push(group);
    }

    group.rows.push(row);
  }

  return groups;
}

/**
 * BR-O03 — freezes `productName`/`price`/`images`/`skuValue` at purchase
 * time, one snapshot row per order line, carrying its `quantity` verbatim.
 */
export function buildSnapshotRows(rows: CheckoutCartItemRow[]) {
  return rows.map((row) => ({
    productName: row.sku.product.name,
    price: row.sku.price,
    images: row.sku.product.images,
    skuValue: row.sku.value,
    quantity: row.quantity,
    skuId: row.sku.id,
  }));
}

/**
 * BR-O07 — every id in `cartItemIds` must resolve to a row the caller owns;
 * a shortfall fails the whole request (404) rather than skipping the miss.
 */
export function assertAllOwned({
  cartItemIds,
  rows,
}: {
  cartItemIds: string[];
  rows: { id: string }[];
}): void {
  if (rows.length !== cartItemIds.length) {
    throwHttpException({
      type: "notFound",
      message: "One or more cart items were not found.",
    });
  }
}

/**
 * BR-O02 step 3 — a row is purchasable only if its SKU and parent product
 * are both live and the product is currently published.
 */
export function isRowPurchasable(row: CheckoutCartItemRow): boolean {
  const { sku } = row;
  const { product } = sku;

  return (
    sku.deletedAt === null &&
    product.deletedAt === null &&
    product.publishedAt !== null &&
    product.publishedAt <= new Date()
  );
}
