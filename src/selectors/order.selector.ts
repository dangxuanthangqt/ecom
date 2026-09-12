import { Prisma } from "@prisma/client";

import { productSkuSnapshotSelect } from "./product-sku-snapshot.selector";

/** Base shape for list reads — no snapshot items (BR-O08: `deletedAt` filtered by the caller). */
export const orderSelect = Prisma.validator<Prisma.OrderSelect>()({
  id: true,
  userId: true,
  status: true,
  createdAt: true,
  updatedAt: true,
});

/** Detail shape — adds the frozen snapshot lines (BR-O03). */
export const createOrderDetailSelect = () =>
  Prisma.validator<Prisma.OrderSelect>()({
    ...orderSelect,
    items: {
      select: productSkuSnapshotSelect,
    },
  });
