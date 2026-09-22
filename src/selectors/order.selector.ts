import { Prisma } from "@/generated/prisma/client";
import { defineSelect } from "@/shared/utils/prisma-select.util";

import { productSkuSnapshotSelect } from "./product-sku-snapshot.selector";

/** Base shape for list reads — no snapshot items (BR-O08: `deletedAt` filtered by the caller). */
export const orderSelect = defineSelect<Prisma.OrderSelect>()({
  id: true,
  userId: true,
  status: true,
  createdAt: true,
  updatedAt: true,
});

/** Detail shape — adds the frozen snapshot lines (BR-O03). */
export const createOrderDetailSelect = () =>
  defineSelect<Prisma.OrderSelect>()({
    ...orderSelect,
    items: {
      select: productSkuSnapshotSelect,
    },
  });
