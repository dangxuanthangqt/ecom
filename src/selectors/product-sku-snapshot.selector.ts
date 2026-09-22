import { Prisma } from "@/generated/prisma/client";
import { defineSelect } from "@/shared/utils/prisma-select.util";

/**
 * `ProductSKUSnapshot` is a denormalized copy by design (BR-O03) — reads
 * serve these frozen fields, never a live join back to `Product`/`SKU`.
 * `skuId` is surfaced (nullable per schema) so cancellation can restore
 * stock even though the join is optional.
 */
export const productSkuSnapshotSelect =
  defineSelect<Prisma.ProductSKUSnapshotSelect>()({
    id: true,
    productName: true,
    price: true,
    images: true,
    skuValue: true,
    quantity: true,
    skuId: true,
  });
